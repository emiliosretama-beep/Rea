#!/usr/bin/env python3
"""De reel.json + escena.tsx a reel.mp4, portada.jpg y texto-del-post.txt.

Uso:
  python3 hacer_reel.py <carpeta-del-reel> [--proyecto DIR] [--voces DIR]
                        [--solo-datos] [--sin-portada] [--concurrencia N]

La carpeta del reel tiene reel.json (guion) y escena.tsx (los visuales 3D).
El proyecto es la plantilla instalada por preparar.sh (por defecto ~/reels-3d/proyecto).

Pasos: voz por escena -> mide la duracion con ffprobe -> reparte escenas y palabras en
fotogramas -> datos.json -> render con Remotion -> volumen a -14 LUFS -> portada ->
texto del post -> fotogramas de revision (revision/hoja.jpg).
"""
import argparse, base64, hashlib, json, os, re, shutil, subprocess, sys, urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SKILL = AQUI.parent
FPS = 30
VOL_SFX = {"whoosh": 0.35, "pop": 0.5, "ding": 0.35, "riser": 0.4, "impacto": 0.45, "tic": 0.4}


def sh(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:], sep="\n")
        raise SystemExit(f"ERROR al ejecutar: {' '.join(map(str, cmd[:4]))} ...")
    return r


def navegador():
    """Chromium ya instalado (nube de Claude Code) para que Remotion no intente descargar el suyo."""
    for p in (os.environ.get("REMOTION_CHROME"), "/opt/pw-browsers/chromium_headless_shell"):
        if p and Path(p).exists():
            return [f"--browser-executable={p}"]
    return []


def duracion(archivo):
    r = sh(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(archivo)])
    return float(r.stdout.strip())


def silencios(archivo, umbral_db=-38, minimo=0.14):
    """Lista de (inicio, fin) de silencios, usando silencedetect de ffmpeg."""
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(archivo), "-af",
         f"silencedetect=noise={umbral_db}dB:d={minimo}", "-f", "null", "-"],
        capture_output=True, text=True)
    ini = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    fin = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return list(zip(ini, fin + [None] * (len(ini) - len(fin))))


# ------------------------------------------------------------------ voz

def voz_piper(texto, salida, cfg, voces_dir):
    modelo = Path(voces_dir) / f"{cfg.get('modelo', 'es_MX-claude-high')}.onnx"
    if not modelo.exists():
        raise SystemExit(f"ERROR: falta la voz {modelo}. Ejecuta preparar.sh")
    escala = 1.0 / float(cfg.get("velocidad", 1.0))  # length_scale: menor = mas rapido
    r = subprocess.run([sys.executable, "-m", "piper", "-m", str(modelo), "-f", str(salida),
                        "--length-scale", f"{escala:.3f}", "--sentence-silence", "0.18"],
                       input=texto, capture_output=True, text=True)
    if r.returncode != 0 or not Path(salida).exists():
        print(r.stderr[-2000:])
        raise SystemExit("ERROR: Piper no pudo generar la voz")
    return None  # Piper no da tiempos por palabra: se calculan con silencios


def voz_elevenlabs(texto, salida, cfg):
    """Voz de ElevenLabs con tiempos por letra. La clave la pone el proxy de la sesion
    (request_credential) o la variable ELEVENLABS_API_KEY. Nunca en el chat ni en archivos."""
    voz = cfg.get("voz_id", "21m00Tcm4TlvDq8ikWAM")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voz}/with-timestamps?output_format=mp3_44100_128"
    cuerpo = json.dumps({
        "text": texto,
        "model_id": cfg.get("modelo", "eleven_multilingual_v2"),
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3},
    }).encode()
    req = urllib.request.Request(url, data=cuerpo, method="POST", headers={
        "Content-Type": "application/json",
        "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "la-pone-el-proxy"),
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            datos = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ERROR ElevenLabs {e.code}: {e.read()[:300]!r}. Revisa la clave (request_credential).")
    Path(salida).write_bytes(base64.b64decode(datos["audio_base64"]))
    al = datos.get("alignment") or datos.get("normalized_alignment")
    return al


# ------------------------------------------------------------------ palabras

def silabas(p):
    p = p.lower()
    n = len(re.findall(r"[aeiouáéíóúü]+", p))
    n += len(re.findall(r"\d", p))  # los numeros se leen largos
    return max(1, n)


def repartir(palabras, ini, fin):
    pesos = [silabas(p) + (0.6 if re.search(r"[,.;:!?…]$", p) else 0) for p in palabras]
    total = sum(pesos) or 1
    t, salida = ini, []
    for p, w in zip(palabras, pesos):
        d = (fin - ini) * w / total
        salida.append((p, t, t + d))
        t += d
    return salida


def tiempos_por_silencios(texto, audio, dur):
    """Divide en frases por la puntuacion y las encaja en los tramos de voz entre silencios."""
    palabras = texto.split()
    sil = [(a, b if b is not None else dur) for a, b in silencios(audio)]
    # tramos con voz
    tramos, cursor = [], 0.0
    for a, b in sil:
        if a - cursor > 0.05:
            tramos.append([cursor, a])
        cursor = b
    if dur - cursor > 0.05:
        tramos.append([cursor, dur])
    if not tramos:
        tramos = [[0.0, dur]]
    # frases segun puntuacion
    frases, actual = [], []
    for p in palabras:
        actual.append(p)
        if re.search(r"[,.;:!?…]$", p):
            frases.append(actual)
            actual = []
    if actual:
        frases.append(actual)
    # si sobran tramos, une los que tienen la pausa mas corta
    while len(tramos) > len(frases):
        huecos = [tramos[i + 1][0] - tramos[i][1] for i in range(len(tramos) - 1)]
        i = huecos.index(min(huecos))
        tramos[i] = [tramos[i][0], tramos[i + 1][1]]
        del tramos[i + 1]
    resultado = []
    if len(tramos) == len(frases):
        for f, (a, b) in zip(frases, tramos):
            resultado += repartir(f, a, b)
    else:  # menos pausas que frases: reparto global entre inicio y fin de voz
        resultado = repartir(palabras, tramos[0][0], tramos[-1][1])
    return resultado


def tiempos_elevenlabs(texto, al):
    chars, ini, fin = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    resultado, palabra, t0 = [], "", None
    for c, a, b in zip(chars, ini, fin):
        if c.isspace():
            if palabra:
                resultado.append((palabra, t0, ultimo))
            palabra, t0 = "", None
        else:
            if t0 is None:
                t0 = a
            palabra += c
            ultimo = b
    if palabra:
        resultado.append((palabra, t0, ultimo))
    return resultado


# ------------------------------------------------------------------ principal

def generar_indice(escenas_dir):
    archivos = sorted(p for p in escenas_dir.glob("*.tsx"))
    lineas = ["// ARCHIVO GENERADO por scripts/hacer_reel.py: no lo edites a mano.",
              'import type React from "react";', 'import type { PropsEscena } from "../tipos";']
    for i, a in enumerate(archivos):
        lineas.append(f'import r{i} from "./{a.stem}";')
    lineas.append("")
    lineas.append("export const VISUALES: Record<string, Record<string, React.FC<PropsEscena>>> = {")
    for i, a in enumerate(archivos):
        lineas.append(f'  "{a.stem}": r{i},')
    lineas.append("};")
    (escenas_dir / "index.ts").write_text("\n".join(lineas) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("carpeta")
    ap.add_argument("--proyecto", default=os.environ.get("REELS_PROYECTO", str(Path.home() / "reels-3d" / "proyecto")))
    ap.add_argument("--voces", default=os.environ.get("REELS_VOCES", str(Path.home() / "reels-3d" / "voces")))
    ap.add_argument("--solo-datos", action="store_true", help="no renderiza (para probar en remotion studio)")
    ap.add_argument("--sin-portada", action="store_true")
    ap.add_argument("--concurrencia", type=int, default=max(1, (os.cpu_count() or 2)))
    a = ap.parse_args()

    carpeta = Path(a.carpeta).resolve()
    proyecto = Path(a.proyecto).resolve()
    reel = json.loads((carpeta / "reel.json").read_text())
    rid = reel["id"]
    if not re.fullmatch(r"[a-z0-9-]+", rid):
        raise SystemExit("ERROR: el id del reel solo puede tener minusculas, numeros y guiones")
    if not (proyecto / "node_modules").exists():
        raise SystemExit(f"ERROR: no encuentro el proyecto instalado en {proyecto}. Ejecuta preparar.sh")

    # 1. escena.tsx -> src/escenas/<id>.tsx e indice
    escenas_dir = proyecto / "src" / "escenas"
    shutil.copy(carpeta / "escena.tsx", escenas_dir / f"{rid}.tsx")
    generar_indice(escenas_dir)

    pub = proyecto / "public"
    destino = pub / "reel" / rid
    (destino / "voz").mkdir(parents=True, exist_ok=True)
    cfg = reel.get("voz", {"motor": "piper"})
    motor = cfg.get("motor", "piper")

    # 2-4. voz, duraciones y linea de tiempo
    escenas, voces, sonidos, palabras = [], [], [], []
    t = 0.0
    n = len(reel["escenas"])
    for i, e in enumerate(reel["escenas"]):
        texto = " ".join(e["narracion"].split())
        ext = "mp3" if motor == "elevenlabs" else "wav"
        clave = hashlib.sha1(json.dumps([texto, cfg], sort_keys=True).encode()).hexdigest()[:10]
        audio = destino / "voz" / f"{i + 1:02d}-{clave}.{ext}"
        al_json = audio.with_suffix(".tiempos.json")
        if not audio.exists():
            print(f"  voz {i + 1}/{n}: {texto[:60]}")
            if motor == "elevenlabs":
                al = voz_elevenlabs(texto, audio, cfg)
                al_json.write_text(json.dumps(al))
            else:
                voz_piper(texto, audio, cfg, a.voces)
        dur = duracion(audio)
        if motor == "elevenlabs" and al_json.exists():
            pal = tiempos_elevenlabs(texto, json.loads(al_json.read_text()))
        else:
            pal = tiempos_por_silencios(texto, audio, dur)

        entrada = 0.08 if i == 0 else 0.22   # aire antes de hablar (el gancho arranca ya)
        pausa = float(e.get("pausa", 0.3))
        if i == n - 1:
            pausa = max(pausa, 1.2)          # deja respirar el final
        largo = entrada + dur + pausa
        desde_f = round(t * FPS)
        frames = round((t + largo) * FPS) - desde_f
        escenas.append({"id": e["id"], "visual": e.get("visual", e["id"]), "desde": desde_f, "frames": frames,
                        "narracion": texto, "extra": e.get("extra", {})})
        voces.append({"archivo": str(audio.relative_to(pub)), "desde": round((t + entrada) * FPS), "volumen": 1.0})
        for p, a0, b0 in pal:
            palabras.append({"texto": p, "desde": round((t + entrada + a0) * FPS), "hasta": max(round((t + entrada + b0) * FPS), round((t + entrada + a0) * FPS) + 2)})

        efectos = e.get("efecto") or []
        if isinstance(efectos, str):
            efectos = [{"nombre": efectos}]
        for ef in efectos:
            nombre = ef["nombre"]
            archivo = pub / "sonidos" / f"{nombre}.wav"
            if not archivo.exists():
                print(f"  aviso: no existe el sonido {nombre}, lo salto")
                continue
            en = float(ef.get("en", 0.0))
            if ef.get("antes"):
                en = -duracion(archivo) + 0.05   # termina justo al empezar la escena
            sonidos.append({"archivo": f"sonidos/{nombre}.wav", "desde": max(0, round((t + en) * FPS)),
                            "volumen": float(ef.get("volumen", VOL_SFX.get(nombre, 0.4)))})
        t += largo

    total = round(t * FPS)
    musica = None
    if reel.get("musica"):
        m = destino / "musica.wav"
        if not m.exists() or duracion(m) < t + 1:
            sh([sys.executable, str(AQUI / "generar_sonidos.py"), str(destino), "--musica", f"{t + 2:.1f}"])
        musica = {"archivo": str(m.relative_to(pub)), "volumen": float(reel.get("volumen_musica", 0.13))}

    port = reel.get("portada", {})
    esc_port = next((x for x in escenas if x["id"] == port.get("escena")), escenas[0])
    datos = {
        "id": rid, "fps": FPS, "ancho": 1080, "alto": 1920, "duracionFrames": total,
        "escenas": escenas, "voces": voces, "sonidos": sonidos, "musica": musica, "palabras": palabras,
        "portada": {"escena": esc_port["id"], "frame": min(esc_port["frames"] - 1, round(float(port.get("segundo", 1.5)) * FPS)),
                    "titulo": port.get("titulo", reel.get("titulo", "")), "subtitulo": port.get("subtitulo")},
        "marca": reel.get("marca") or None,
    }
    props = pub / "reel" / "datos.json"
    props.write_text(json.dumps(datos, ensure_ascii=False, indent=1))
    shutil.copy(props, carpeta / "datos.json")
    print(f"OK datos: {len(escenas)} escenas, {len(palabras)} palabras, {t:.1f} s ({total} fotogramas)")
    for x in escenas:
        print(f"   {x['id']:<14} {x['desde'] / FPS:6.2f}s  {x['frames'] / FPS:5.2f}s")
    if not 25 <= t <= 65:
        print(f"  aviso: el reel dura {t:.1f} s; lo ideal es 30-60 s")

    # 5. texto del post
    post = reel.get("post", {})
    texto_post = post.get("texto", reel.get("titulo", "")).strip()
    if post.get("hashtags"):
        texto_post += "\n\n" + " ".join(post["hashtags"])
    if reel.get("fuentes"):
        texto_post += "\n\nFuentes:\n" + "\n".join("- " + f for f in reel["fuentes"])
    (carpeta / "texto-del-post.txt").write_text(texto_post + "\n")

    if a.solo_datos:
        print("Listo (solo datos). Abre el proyecto con: npm run studio")
        return

    # 6. render
    crudo = carpeta / "reel-sin-normalizar.mp4"
    print(f"  renderizando con {a.concurrencia} hilos... (en la nube tarda 2-4 min por cada 10 s)")
    sh(["npx", "remotion", "render", "src/index.ts", "Reel", str(crudo), f"--props={props}",
        f"--concurrency={a.concurrencia}", "--log=error", *navegador()], cwd=proyecto)
    # 7. volumen estandar de Instagram/TikTok (-14 LUFS)
    sh(["ffmpeg", "-y", "-v", "error", "-i", str(crudo), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(carpeta / "reel.mp4")])
    crudo.unlink()
    print(f"OK video: {carpeta / 'reel.mp4'} ({duracion(carpeta / 'reel.mp4'):.1f} s)")

    if not a.sin_portada:
        sh(["npx", "remotion", "still", "src/index.ts", "Portada", str(carpeta / "portada.jpg"), f"--props={props}",
            "--jpeg-quality=92", "--log=error", *navegador()], cwd=proyecto)
        print(f"OK portada: {carpeta / 'portada.jpg'}")

    # 8. revision: un fotograma por escena + hoja de contactos
    rev = carpeta / "revision"
    shutil.rmtree(rev, ignore_errors=True)
    rev.mkdir()
    for k, x in enumerate(escenas):
        for etiqueta, frac in (("a", 0.3), ("b", 0.8)):
            seg = (x["desde"] + x["frames"] * frac) / FPS
            sh(["ffmpeg", "-y", "-v", "error", "-ss", f"{seg:.2f}", "-i", str(carpeta / "reel.mp4"), "-frames:v", "1",
                "-q:v", "3", str(rev / f"{k + 1:02d}{etiqueta}-{x['id']}.jpg")])
    cols = 4
    filas = -(-len(escenas) * 2 // cols)
    sh(["ffmpeg", "-y", "-v", "error", "-pattern_type", "glob", "-i", str(rev / "*.jpg"), "-vf",
        f"scale=360:640,tile={cols}x{filas}:padding=8:color=white", "-frames:v", "1", str(rev / "hoja.jpg")])
    print(f"OK revision: {rev / 'hoja.jpg'} (miralo antes de entregar)")


if __name__ == "__main__":
    main()
