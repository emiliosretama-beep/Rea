// Imágenes que el usuario sube a un proyecto.
// - Se reducen en el navegador (máx. 1600 px, WebP o JPEG) para que pesen poco.
// - Se guardan en IndexedDB, no en localStorage: así el HTML de cada versión
//   solo lleva una referencia corta `rea-asset:<id>` y no se llena el espacio.
// - Al mostrar o descargar la página, `resolveAssets` cambia esas referencias
//   por la imagen real (data URI), así el .html descargado funciona solo.

const DB_NAME = "rea-studio";
const STORE = "assets";
const MAX_SIDE = 1600;
export const ASSET_SCHEME = "rea-asset:";
const TOKEN_RE = /rea-asset:([a-z0-9]{6,32})/g;
const DATA_URI_RE = /data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/g;

// Si IndexedDB no está disponible (modo privado, visor que lo bloquea), las
// imágenes viven solo en memoria hasta recargar.
const memory = new Map();
let persistent = true;
let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("projectId", "projectId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    persistent = false;
    throw err;
  });
  return dbPromise;
}

function tx(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const result = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(result?.result ?? result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export function assetsArePersistent() {
  return persistent;
}

export async function putAsset(asset) {
  memory.set(asset.id, asset);
  try {
    await tx("readwrite", (s) => s.put(asset));
  } catch {
    persistent = false;
  }
}

// Devuelve Map id -> dataUrl con las imágenes de un proyecto.
export async function loadProjectAssets(projectId) {
  const map = new Map();
  for (const a of memory.values())
    if (a.projectId === projectId) map.set(a.id, a.dataUrl);
  try {
    const rows = await tx("readonly", (s) =>
      s.index("projectId").getAll(projectId),
    );
    for (const a of rows) {
      memory.set(a.id, a);
      map.set(a.id, a.dataUrl);
    }
  } catch {
    persistent = false;
  }
  return map;
}

export async function deleteProjectAssets(projectId) {
  for (const [id, a] of memory)
    if (a.projectId === projectId) memory.delete(id);
  try {
    const keys = await tx("readonly", (s) =>
      s.index("projectId").getAllKeys(projectId),
    );
    await tx("readwrite", (s) => keys.forEach((k) => s.delete(k)));
  } catch {
    // Nada que limpiar si IndexedDB no está disponible.
  }
}

// iOS a veces entrega fotos sin tipo MIME (o como HEIC): se acepta también
// por extensión, y es createImageBitmap quien decide si se puede leer.
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic|heif|avif|bmp)$/i;
export function isImageFile(file) {
  return (
    file.type.startsWith("image/") || (!file.type && IMAGE_EXT.test(file.name))
  );
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Convierte un archivo de imagen en un asset listo para guardar.
// Lanza Error con un mensaje para el usuario si no es una imagen válida.
export async function prepareImage(file, projectId) {
  if (!isImageFile(file)) throw new Error(`"${file.name}" no es una imagen.`);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      `No se pudo leer "${file.name}". Prueba con una foto en JPG o PNG.`,
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // WebP conserva transparencia (logos); si el navegador no sabe crear WebP,
  // usa PNG para imágenes con transparencia probable y JPEG para fotos.
  let blob = await canvasToBlob(canvas, "image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") {
    const keepAlpha = file.type === "image/png" || file.type === "image/gif";
    blob = await canvasToBlob(
      canvas,
      keepAlpha ? "image/png" : "image/jpeg",
      0.85,
    );
  }
  if (!blob) throw new Error(`No se pudo procesar "${file.name}".`);

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return {
    id,
    projectId,
    name: file.name || "imagen",
    type: blob.type,
    width,
    height,
    blob,
    dataUrl: await blobToDataUrl(blob),
  };
}

// Cambia `rea-asset:<id>` por la imagen real. Las referencias desconocidas
// se dejan tal cual (se verán como imagen rota, no se inventa nada).
export function resolveAssets(html, map) {
  if (!html || !map?.size) return html;
  return html.replace(TOKEN_RE, (m, id) => map.get(id) ?? m);
}

// Clave corta que identifica un data URI sin compararlo entero.
function dataUriKey(uri) {
  return `${uri.length}:${uri.slice(0, 160)}`;
}

// Lo contrario de resolveAssets, para el HTML que el Inspector saca de la
// vista previa (donde las imágenes ya están resueltas).
export function tokenizeDataUris(html, map) {
  if (!map?.size) return html;
  const byKey = new Map(
    [...map].map(([id, uri]) => [dataUriKey(uri), ASSET_SCHEME + id]),
  );
  return html.replace(DATA_URI_RE, (m) => byKey.get(dataUriKey(m)) ?? m);
}
