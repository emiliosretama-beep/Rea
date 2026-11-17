// Punto de entrada de la versión online: arranca el backend local (datos,
// IA y coordinador dentro de la página) y después la misma interfaz.
import { startApp } from "../../public/app.js";
import { bootCloud } from "./boot.js";

const view = document.getElementById("view");
try {
  globalThis.__ERA_BACKEND__ = await bootCloud();
  await startApp();
} catch (err) {
  console.error(err);
  view.innerHTML =
    '<div class="banner error"><div><strong>ERA Factory no pudo arrancar.</strong><p>Recarga la página. Si sigue pasando, avísame con este mensaje: ' +
    String(err?.message || err).replace(/[<>&]/g, "") +
    "</p></div></div>";
}
