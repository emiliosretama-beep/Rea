// Lanzar programas externos (Python, ffmpeg) para la voz y el video: lee su
// salida línea a línea (progreso), los mata si se cancela la tarea y
// conserva el final de stderr para explicar los fallos.
import { spawn } from "node:child_process";
import { LLMError } from "../errors.js";

export class MediaError extends LLMError {}

const KEEP = 8000;

export function run(cmd, args, { input, signal, onLine, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], cwd });
    let stdout = "";
    let stderr = "";
    let buffer = "";
    const abort = () => child.kill("SIGKILL");
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-KEEP);
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) onLine?.(line);
      }
    });
    child.stderr.on("data", (chunk) => (stderr = (stderr + chunk).slice(-KEEP)));
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) reject(new MediaError("Tarea cancelada.", { kind: "cancelled" }));
      else if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(`${cmd} terminó con código ${code}`), { stdout, stderr }));
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

// Última línea útil de un error de un programa externo.
export const lastLine = (err) => err.stderr?.trim().split("\n").at(-1) || err.message;
