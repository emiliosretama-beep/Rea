// Paneles de Tareas y Memoria. En pantallas anchas van fijos a la derecha; en
// el teléfono se abren como hoja sobre el chat (un panel a la vez).
import { $, el, icon } from "./ui.js";

const WIDE = "(min-width: 960px)";

const SYNC_NOTES = {
  loading: "Cargando…",
  late: "No alcanzo tu memoria todavía. Lo que ves puede estar desactualizado.",
  error: "Perdí la conexión con tu memoria.",
  session: "En esta vista nada se guarda al cerrar.",
};

const EMPTY = {
  tasks:
    "Sin tareas. Escribe una arriba o dile a Jarvis «anota comprar cartulina».",
  memories:
    "Jarvis todavía no recuerda nada. Dile «recuerda que…» o escríbelo arriba.",
};

function taskRow(task) {
  const box = el("input", {
    type: "checkbox",
    id: `task-${task.id}`,
    checked: task.done,
  });
  const main = el(
    "label",
    { class: "row-main" },
    box,
    el("span", { text: task.text }),
  );
  const remove = el("button", {
    type: "button",
    class: "row-del",
    "data-del": true,
    "aria-label": `Borrar tarea: ${task.text}`,
    html: icon("close"),
  });
  return el(
    "li",
    { class: task.done ? "row row--done" : "row", "data-id": task.id },
    main,
    remove,
  );
}

function memoryRow(memory) {
  const remove = el("button", {
    type: "button",
    class: "row-del",
    "data-del": true,
    "aria-label": `Borrar recuerdo: ${memory.text}`,
    html: icon("close"),
  });
  return el(
    "li",
    { class: "row", "data-id": memory.id },
    el("p", { class: "row-main", text: memory.text }),
    remove,
  );
}

function bindForm(form, input, add) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    // El campo se vacía ya, para poder escribir la siguiente mientras se
    // guarda; si el guardado falla, el texto vuelve.
    input.value = "";
    input.focus();
    if (!(await add(value)) && !input.value) input.value = value;
  });
}

function bindList(list, { onToggle, onRemove }) {
  list.addEventListener("change", (event) => {
    const row = event.target.closest(".row");
    if (row && event.target.type === "checkbox")
      onToggle?.(row.dataset.id, event.target.checked);
  });
  list.addEventListener("click", (event) => {
    const row = event.target.closest("[data-del]")?.closest(".row");
    if (row) onRemove(row.dataset.id);
  });
}

// Repinta una lista y conserva el foco si estaba en uno de sus controles.
function fill(list, rows, emptyText) {
  const focusedId = list.contains(document.activeElement)
    ? document.activeElement.id
    : "";
  list.replaceChildren(
    ...(rows.length ? rows : [el("li", { class: "empty", text: emptyText })]),
  );
  if (focusedId) document.getElementById(focusedId)?.focus();
}

// Los cambios hechos a mano en los paneles. `save(change)` ejecuta el cambio
// sobre el almacén y devuelve null si falla; al borrar se ofrece deshacer.
export function storeHandlers(save, toast) {
  const undo = (label, restore) =>
    toast.show(label, { action: "Deshacer", onAction: restore });
  return {
    onAddTask: async (text) =>
      Boolean(await save((store) => store.addTask(text))),
    onToggleTask: (id, done) => save((store) => store.setTaskDone(id, done)),
    async onRemoveTask(id) {
      const task = await save((store) => store.removeTask(id));
      if (task)
        undo("Tarea borrada", () => save((store) => store.restoreTask(task)));
    },
    onAddMemory: async (text) =>
      Boolean(await save((store) => store.addMemory(text))),
    async onRemoveMemory(id) {
      const memory = await save((store) => store.removeMemory(id));
      if (memory)
        undo("Recuerdo borrado", () =>
          save((store) => store.restoreMemory(memory)),
        );
    },
  };
}

// `handlers`: onAddTask(text), onToggleTask(id, done), onRemoveTask(id),
// onAddMemory(text), onRemoveMemory(id), onRetry(). Los "add" resuelven true
// si se guardó, para limpiar el campo.
export function createPanels(handlers) {
  const app = $("#app");
  const shell = $("#shell");
  const side = $("#side");
  const wide = globalThis.matchMedia(WIDE);
  let opener = null;

  function showPane(name) {
    app.dataset.panel = name;
    for (const tab of side.querySelectorAll("[data-pane]"))
      tab.setAttribute("aria-pressed", String(tab.dataset.pane === name));
  }

  function close() {
    if (!app.dataset.panel) return;
    app.dataset.panel = "";
    shell.inert = false;
    opener?.focus();
    opener = null;
  }

  function open(name, trigger) {
    if (wide.matches) return;
    opener = trigger ?? document.activeElement;
    showPane(name);
    shell.inert = true;
    $("#closeSide").focus();
  }

  // En ancho el panel es una columna más; en teléfono, un diálogo.
  function fitLayout() {
    if (wide.matches) {
      app.dataset.panel = "";
      shell.inert = false;
      side.removeAttribute("role");
      side.removeAttribute("aria-modal");
    } else {
      side.setAttribute("role", "dialog");
      side.setAttribute("aria-modal", "true");
    }
  }

  bindForm($("#taskForm"), $("#taskInput"), handlers.onAddTask);
  bindForm($("#memoryForm"), $("#memoryInput"), handlers.onAddMemory);
  bindList($("#taskList"), {
    onToggle: handlers.onToggleTask,
    onRemove: handlers.onRemoveTask,
  });
  bindList($("#memoryList"), { onRemove: handlers.onRemoveMemory });
  $("#closeSide").addEventListener("click", close);
  $("#syncRetry").addEventListener("click", () => handlers.onRetry());
  for (const tab of side.querySelectorAll("[data-pane]"))
    tab.addEventListener("click", () => showPane(tab.dataset.pane));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !app.dataset.panel) return;
    // Sin esto, el mismo Escape también cortaría una lectura en voz alta.
    event.preventDefault();
    close();
  });
  wide.addEventListener("change", fitLayout);
  fitLayout();

  return {
    open,
    close,
    // `store` es null mientras la vista todavía no responde.
    render(store) {
      const tasks = store?.tasks ?? [];
      const memories = store?.memories ?? [];
      const pending = tasks.filter((task) => !task.done).length;
      const done = tasks.length - pending;
      $("#taskTotal").textContent = [
        pending && `${pending} ${pending === 1 ? "pendiente" : "pendientes"}`,
        done && `${done} ${done === 1 ? "hecha" : "hechas"}`,
      ]
        .filter(Boolean)
        .join(" · ");
      $("#memoryTotal").textContent = memories.length
        ? `${memories.length} ${memories.length === 1 ? "recuerdo" : "recuerdos"}`
        : "";
      const waiting =
        !store ||
        (store.sync === "loading" && !tasks.length && !memories.length);
      fill(
        $("#taskList"),
        tasks.map(taskRow),
        waiting ? SYNC_NOTES.loading : EMPTY.tasks,
      );
      fill(
        $("#memoryList"),
        memories.map(memoryRow),
        waiting ? SYNC_NOTES.loading : EMPTY.memories,
      );
      const key = !store ? "" : !store.persistent ? "session" : store.sync;
      const note = SYNC_NOTES[key] && key !== "loading" ? SYNC_NOTES[key] : "";
      $("#syncNote").hidden = !note;
      $("#syncText").textContent = note;
      $("#syncRetry").hidden = key !== "error";
    },
  };
}
