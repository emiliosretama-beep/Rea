// Coordinador central. Cada producción (un video) es una cadena de tareas, una
// por agente, en el orden del registro. El coordinador:
//   - asigna la siguiente tarea cuando la anterior termina (sin intervención),
//   - entrega a cada agente los resultados de los agentes de los que depende,
//   - revisa cada resultado (agent.validate) antes de dejar pasar al siguiente,
//   - repite la tarea con las correcciones cuando la revisión falla,
//   - se detiene en las tareas que necesitan aprobación humana,
//   - publica cada cambio en el bus de eventos (progreso en tiempo real).
//
// Estados de tarea:   pending → running → done
//                                     ↘ awaiting_approval → done (aprobada)
//                                     ↘ failed | cancelled
// Estados de producción: queued, running, awaiting_approval, failed, cancelled, completed
import { LLMError } from "./llm.js";

export class OrchestratorError extends Error {
  constructor(message, { status = 400, details } = {}) {
    super(message);
    this.name = "OrchestratorError";
    this.status = status;
    this.details = details;
  }
}

const RETRY_BACKOFF_MS = 2000;

export function createOrchestrator({ db, bus, registry, services, config }) {
  const { maxAttempts, concurrency } = config.orchestrator;
  const running = new Map(); // taskId -> AbortController
  const waiting = []; // productionIds esperando un hueco
  const timers = new Set();
  let stopped = false;

  const agentOf = (id) => {
    const agent = registry.get(id);
    if (!agent) throw new OrchestratorError(`Agente desconocido: ${id}`, { status: 500 });
    return agent;
  };

  function log(task, level, message) {
    const entry = db.addLog({
      productionId: task?.productionId ?? null,
      taskId: task?.id ?? null,
      agentId: task?.agentId ?? null,
      level,
      message,
    });
    bus.publish("log", entry);
    return entry;
  }

  function saveTask(id, patch) {
    const task = db.updateTask(id, patch);
    bus.publish("task", task);
    return task;
  }

  function setProductionStatus(productionId, status) {
    const current = db.getProduction(productionId);
    if (!current || current.status === status) return current;
    const production = db.updateProduction(productionId, { status });
    bus.publish("production", production);
    return production;
  }

  // Estado de la producción derivado de sus tareas (una sola regla, aquí).
  function deriveStatus(tasks) {
    if (tasks.some((t) => t.status === "running")) return "running";
    if (tasks.some((t) => t.status === "awaiting_approval")) return "awaiting_approval";
    if (tasks.some((t) => t.status === "failed")) return "failed";
    if (tasks.some((t) => t.status === "cancelled")) return "cancelled";
    if (tasks.every((t) => t.status === "done")) return "completed";
    return "queued";
  }

  function schedule(productionId, delayMs = 0) {
    if (stopped) return;
    if (delayMs) {
      const t = setTimeout(() => {
        timers.delete(t);
        schedule(productionId);
      }, delayMs);
      timers.add(t);
      return;
    }
    if (!waiting.includes(productionId)) waiting.push(productionId);
    queueMicrotask(pump);
  }

  function pump() {
    while (!stopped && running.size < concurrency && waiting.length) {
      const productionId = waiting.shift();
      const next = nextRunnable(productionId);
      if (next) void runTask(next);
    }
  }

  // La siguiente tarea a ejecutar, o null si la cadena está detenida o completa.
  function nextRunnable(productionId) {
    const production = db.getProduction(productionId);
    if (!production || production.status === "cancelled") return null;
    const tasks = db.listTasks(productionId);
    for (const task of tasks) {
      if (task.status === "done") continue;
      if (task.status === "pending" && !running.has(task.id)) return task;
      break; // running, esperando aprobación, fallida o cancelada: la cadena espera
    }
    setProductionStatus(productionId, deriveStatus(tasks));
    return null;
  }

  function buildContext(task, controller) {
    const production = db.getProduction(task.productionId);
    const channel = db.getChannel(production.channelId);
    const agent = agentOf(task.agentId);
    const tasks = db.listTasks(task.productionId);
    const inputs = {};
    for (const dep of agent.dependsOn) {
      const upstream = tasks.find((t) => t.agentId === dep);
      if (!upstream || upstream.status !== "done")
        throw new OrchestratorError(`Falta el resultado de ${dep} para ${agent.id}.`, { status: 500 });
      inputs[dep] = upstream.output;
    }
    return {
      channel,
      production,
      inputs,
      insights: db.listInsights(channel.id),
      feedback: task.feedback,
      attempt: task.attempt,
      services,
      signal: controller.signal,
      log: (message, level = "info") => log(task, level, message),
    };
  }

  async function runTask(pending) {
    const agent = agentOf(pending.agentId);
    const controller = new AbortController();
    running.set(pending.id, controller);
    const attempt = pending.attempt + 1;
    let task = saveTask(pending.id, {
      status: "running",
      attempt,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });
    setProductionStatus(task.productionId, "running");
    log(task, "info", `${agent.name}: comienza (intento ${attempt} de ${maxAttempts}).`);

    try {
      const ctx = buildContext(task, controller);
      const output = await agent.run(ctx);
      if (controller.signal.aborted) throw new LLMError("Tarea cancelada.", { kind: "cancelled" });
      const review = { ...agent.validate(output, ctx), checkedAt: new Date().toISOString() };

      if (review.issues.length) {
        const detail = review.issues.join(" · ");
        if (attempt < maxAttempts) {
          log(task, "warn", `Revisión rechazada, se repite con correcciones: ${detail}`);
          saveTask(task.id, { status: "pending", output, review, feedback: correctionNote(review.issues) });
          return; // finally reprograma la cadena
        }
        log(task, "error", `Revisión rechazada tras ${attempt} intentos: ${detail}`);
        saveTask(task.id, {
          status: "failed",
          output,
          review,
          error: `No pasó la revisión de calidad: ${detail}`,
          finishedAt: new Date().toISOString(),
        });
        return;
      }

      for (const w of review.warnings) log(task, "warn", w);
      const title = agent.titleFrom?.(output);
      if (title) bus.publish("production", db.updateProduction(task.productionId, { title }));
      const status = task.requiresApproval ? "awaiting_approval" : "done";
      saveTask(task.id, { status, output, review, finishedAt: new Date().toISOString() });
      log(
        task,
        "success",
        status === "done"
          ? `${agent.name}: terminado y revisado.`
          : `${agent.name}: listo. Esperando tu aprobación.`,
      );
    } catch (raw) {
      const err = raw instanceof LLMError || raw instanceof OrchestratorError ? raw : new LLMError(raw.message);
      const finishedAt = new Date().toISOString();
      if (err.kind === "cancelled" || controller.signal.aborted) {
        saveTask(task.id, { status: "cancelled", error: "Cancelada por el usuario.", finishedAt });
        log(task, "warn", `${agent.name}: cancelado.`);
      } else if (err.retryable && attempt < maxAttempts) {
        saveTask(task.id, { status: "pending", error: err.message });
        log(task, "warn", `${agent.name}: ${err.message} Reintento automático.`);
        schedule(task.productionId, RETRY_BACKOFF_MS * attempt);
      } else {
        saveTask(task.id, { status: "failed", error: err.message, finishedAt });
        log(task, "error", `${agent.name}: ${err.message}`);
        if (!(err instanceof LLMError)) console.error(raw);
      }
    } finally {
      running.delete(pending.id);
      const current = db.getTask(pending.id);
      // Si sigue pendiente por un reintento con espera, ya está programada.
      if (current?.status !== "pending" || !current.error) schedule(pending.productionId);
      queueMicrotask(pump);
    }
  }

  function correctionNote(issues) {
    return `La revisión automática encontró estos problemas. Corrígelos:\n- ${issues.join("\n- ")}`;
  }

  function requireTask(taskId) {
    const task = db.getTask(taskId);
    if (!task) throw new OrchestratorError("Tarea no encontrada.", { status: 404 });
    return task;
  }

  // Al rehacer una tarea, lo que dependía de ella queda obsoleto.
  function resetDownstream(task) {
    for (const t of db.listTasks(task.productionId)) {
      if (t.position <= task.position || t.status === "pending") continue;
      saveTask(t.id, { status: "pending", attempt: 0, output: null, review: null, feedback: null, error: null, editedByUser: false });
    }
  }

  return {
    steps: () => registry.pipeline().map((a) => ({ agentId: a.id, requiresApproval: a.requiresApproval })),

    startProduction({ channelId, topicHint }) {
      const channel = db.getChannel(channelId);
      if (!channel) throw new OrchestratorError("Canal no encontrado.", { status: 404 });
      const steps = this.steps();
      if (!steps.length) throw new OrchestratorError("No hay agentes disponibles.", { status: 500 });
      const production = db.createProduction({
        channelId,
        title: topicHint ? topicHint.slice(0, 120) : `Nuevo video · ${channel.name}`,
        topicHint: topicHint || null,
        steps,
      });
      bus.publish("production", production);
      log({ productionId: production.id }, "info", `Producción creada para «${channel.name}». Asignando agentes.`);
      schedule(production.id);
      return production;
    },

    approve(taskId, { output } = {}) {
      const task = requireTask(taskId);
      if (task.status !== "awaiting_approval")
        throw new OrchestratorError("Esta tarea no está esperando aprobación.", { status: 409 });
      const patch = { status: "done", finishedAt: new Date().toISOString() };
      if (output !== undefined) {
        const agent = agentOf(task.agentId);
        if (!output || typeof output !== "object" || Array.isArray(output))
          throw new OrchestratorError("La versión editada no tiene el formato esperado.", { status: 422 });
        if (agent.normalize) output = agent.normalize(output);
        const review = agent.validate(output, { inputs: inputsFor(task), edited: true });
        if (review.issues.length)
          throw new OrchestratorError("Tu versión editada tiene problemas.", { status: 422, details: review.issues });
        Object.assign(patch, { output, review: { ...review, checkedAt: new Date().toISOString() }, editedByUser: true });
        const title = agent.titleFrom?.(output);
        if (title) bus.publish("production", db.updateProduction(task.productionId, { title }));
      }
      const saved = saveTask(task.id, patch);
      log(saved, "success", output !== undefined ? "Aprobado con tus cambios." : "Aprobado.");
      schedule(task.productionId);
      return saved;
    },

    requestChanges(taskId, notes) {
      const task = requireTask(taskId);
      if (!["awaiting_approval", "done", "failed"].includes(task.status))
        throw new OrchestratorError("Esta tarea no se puede rehacer ahora.", { status: 409 });
      const clean = String(notes || "").trim();
      if (!clean) throw new OrchestratorError("Escribe qué quieres cambiar.");
      resetDownstream(task);
      const saved = saveTask(task.id, {
        status: "pending",
        attempt: 0,
        error: null,
        feedback: `El productor humano pidió estos cambios sobre tu versión anterior:\n${clean}`,
        editedByUser: false,
      });
      log(saved, "info", `Cambios solicitados: ${clean}`);
      setProductionStatus(task.productionId, "queued");
      schedule(task.productionId);
      return saved;
    },

    retry(taskId) {
      const task = requireTask(taskId);
      if (!["failed", "cancelled"].includes(task.status))
        throw new OrchestratorError("Solo se reintentan tareas fallidas o canceladas.", { status: 409 });
      const saved = saveTask(task.id, { status: "pending", attempt: 0, error: null });
      // Al reanudar una producción cancelada, las tareas siguientes también vuelven a la cola.
      for (const t of db.listTasks(task.productionId))
        if (t.position > task.position && t.status === "cancelled")
          saveTask(t.id, { status: "pending", attempt: 0, error: null });
      log(saved, "info", "Reintento manual.");
      setProductionStatus(task.productionId, "queued");
      schedule(task.productionId);
      return saved;
    },

    cancel(productionId) {
      const production = db.getProduction(productionId);
      if (!production) throw new OrchestratorError("Producción no encontrada.", { status: 404 });
      for (const task of db.listTasks(productionId)) {
        const controller = running.get(task.id);
        if (controller) controller.abort();
        else if (task.status === "pending") saveTask(task.id, { status: "cancelled", error: "Cancelada por el usuario." });
      }
      return setProductionStatus(productionId, "cancelled");
    },

    // Tareas que quedaron "running" porque el servidor se apagó: vuelven a la cola.
    recover() {
      for (const task of db.listTasksByStatus("running")) {
        saveTask(task.id, { status: "pending", attempt: Math.max(0, task.attempt - 1) });
        log(task, "warn", "El servidor se reinició durante esta tarea; se reanuda.");
      }
      for (const p of db.listProductions()) if (["queued", "running"].includes(p.status)) schedule(p.id);
    },

    activity: () => [...running.keys()].map((id) => db.getTask(id)).filter(Boolean),

    async stop() {
      stopped = true;
      for (const t of timers) clearTimeout(t);
      for (const c of running.values()) c.abort();
      while (running.size) await new Promise((r) => setTimeout(r, 10));
    },

    // Espera a que no quede nada ejecutándose ni en cola (tests).
    async idle() {
      while (running.size || waiting.length || timers.size) await new Promise((r) => setTimeout(r, 5));
    },
  };

  function inputsFor(task) {
    const agent = agentOf(task.agentId);
    const tasks = db.listTasks(task.productionId);
    return Object.fromEntries(agent.dependsOn.map((dep) => [dep, tasks.find((t) => t.agentId === dep)?.output]));
  }
}
