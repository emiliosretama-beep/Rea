// De dónde sale la IA. Hay tres modos con la misma interfaz:
// - "server": app local (npm start); el servidor llama a Claude con tu API key.
// - "cloud": versión online publicada en claude.ai; usa la cuenta de Claude de
//   quien la abre (capability `sample`), sin API key.
// - "demo": sin IA, plantillas locales (en el servidor o en el navegador).
import { buildDemoSite } from "./demo.js";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";

const SAMPLE_ERRORS = {
  not_granted:
    "No diste permiso para usar Claude. Recarga la página y acéptalo para usar la IA.",
  sampling_disabled: "Claude no está disponible en esta cuenta.",
  rate_limited:
    "Llegaste al límite de uso. Espera un poco y vuelve a intentarlo.",
  session_expired: "Tu sesión caducó. Vuelve a iniciar sesión en Claude.",
  prompt_too_large:
    "La página es demasiado grande para editarla de una vez. Pide algo más pequeño.",
  refused: "Claude no puede hacer esta petición. Prueba a reformularla.",
  empty_completion: "No llegó respuesta. Prueba a pedirlo de otra forma.",
};

// Errores que significan "esta vista no puede usar Claude": se pasa a demo.
const SAMPLE_GONE = new Set([
  "not_granted",
  "sampling_disabled",
  "not_declared",
  "capability_disabled",
  "capability_removed",
]);

async function simulateStream(text, { signal, onText }) {
  for (let i = 180; i < text.length + 180; i += 180) {
    if (signal?.aborted)
      throw Object.assign(new Error("Generación detenida."), {
        cancelled: true,
      });
    onText(text.slice(0, i));
    await new Promise((r) => setTimeout(r, 12));
  }
  return { truncated: false };
}

function demoBackend(label, title) {
  return {
    mode: "demo",
    label,
    title,
    generate: (body, opts) =>
      simulateStream(buildDemoSite(body.prompt, body.currentHtml || ""), opts),
  };
}

function serverBackend(status) {
  return {
    mode: status.mode === "ai" ? "server" : "demo",
    label: status.mode === "ai" ? "● IA conectada" : "Modo demo",
    title:
      status.mode === "ai"
        ? `Modelo: ${status.model}`
        : "Añade ANTHROPIC_API_KEY en .env para usar IA real",
    async generate(body, { signal, onText }) {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `El servidor respondió ${res.status}`);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let full = "";
      let failed = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let sep;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const event = raw.match(/^event: (.*)$/m)?.[1];
          const dataLine = raw.match(/^data: (.*)$/m)?.[1];
          const data = dataLine ? JSON.parse(dataLine) : {};
          if (event === "delta") full += data.text;
          else if (event === "error") failed = data.message;
        }
        onText(full);
      }
      if (failed) throw new Error(failed);
      return { truncated: false };
    },
  };
}

function cloudBackend(sample, onGone) {
  return {
    mode: "cloud",
    label: "● IA con tu cuenta de Claude",
    title: "Cada petición usa el plan de Claude de quien abre la página",
    async generate(body, { signal, onText }) {
      try {
        const { truncated } = await sample(
          `${SYSTEM_PROMPT}\n\n---\n\n${buildUserMessage(body)}`,
          {
            signal,
            cache: false,
            onText: ({ text }) => onText(text),
          },
        );
        return { truncated };
      } catch (e) {
        if (e?.code === "cancelled")
          throw Object.assign(new Error("Generación detenida."), {
            cancelled: true,
          });
        if (SAMPLE_GONE.has(e?.code)) onGone();
        if (typeof e?.text === "string") onText(e.text);
        throw new Error(
          SAMPLE_ERRORS[e?.code] ||
            "Se cortó la conexión con Claude. Vuelve a intentarlo.",
        );
      }
    },
  };
}

// Guardar el HTML como archivo. En claude.ai las descargas pasan por la
// capability `downloads` (un <a download> no funciona dentro del visor).
function makeSaver(downloads) {
  if (downloads) {
    return async (filename, html) => {
      try {
        await downloads.save({ filename, data: html });
        return "saved";
      } catch (e) {
        return e?.code === "declined" ? "declined" : "failed";
      }
    };
  }
  return async (filename, html) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return "saved";
  };
}

export async function createBackend(onChange) {
  if (window.claude?.use) {
    const [sample, downloads] = await Promise.all([
      window.claude.use("sample").catch(() => null),
      window.claude.use("downloads").catch(() => null),
    ]);
    const demo = demoBackend(
      "Modo demo",
      "Esta vista no puede usar Claude: se usan plantillas",
    );
    const backend = sample
      ? cloudBackend(sample, () => onChange?.(demo))
      : demo;
    return {
      ...backend,
      online: true,
      save: makeSaver(downloads),
      canSave: Boolean(downloads),
    };
  }
  try {
    const status = await fetch("/api/status").then((r) => r.json());
    return {
      ...serverBackend(status),
      online: false,
      save: makeSaver(null),
      canSave: true,
    };
  } catch {
    return {
      ...demoBackend("Modo demo", "No hay servidor: se usan plantillas"),
      online: false,
      save: makeSaver(null),
      canSave: true,
    };
  }
}
