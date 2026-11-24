#!/usr/bin/env python3
"""Sintetiza los efectos de sonido del reel (sin descargar nada con licencia dudosa).

Uso: python3 generar_sonidos.py <carpeta-destino> [--musica SEGUNDOS]
Crea whoosh, pop, ding, riser, impacto, tic y (opcional) musica.wav, un pad suave.
Todo es matematica pura con numpy: es tuyo y lo puedes usar en reels comerciales.
"""
import sys, wave, pathlib
import numpy as np

SR = 44100
rng = np.random.default_rng(7)  # semilla fija: siempre suena igual


def guardar(ruta, x, estereo=False):
    x = np.asarray(x, dtype=np.float64)
    pico = np.max(np.abs(x)) or 1.0
    x = x / pico * 0.89
    datos = (x * 32767).astype(np.int16)
    canales = 1
    if estereo:
        canales = 2
        datos = datos.reshape(-1, 2) if datos.ndim == 1 else datos
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(canales)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(datos.tobytes())


def t(seg):
    return np.arange(int(SR * seg)) / SR


def pasabajos(x, corte):
    """Filtro de un polo con corte variable (array o numero)."""
    corte = np.broadcast_to(np.asarray(corte, dtype=np.float64), x.shape)
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev
        y[i] = prev
    return y


def fundidos(x, ent=0.005, sal=0.02):
    n1, n2 = int(SR * ent), int(SR * sal)
    x = x.copy()
    if n1:
        x[:n1] *= np.linspace(0, 1, n1)
    if n2:
        x[-n2:] *= np.linspace(1, 0, n2)
    return x


def whoosh(dur=0.7):
    tt = t(dur)
    ruido = rng.standard_normal(len(tt))
    fase = tt / dur
    corte = 300 + 5200 * np.sin(np.pi * fase) ** 2      # el filtro abre y cierra
    env = np.sin(np.pi * fase) ** 1.6
    x = pasabajos(ruido, corte) - 0.6 * pasabajos(ruido, corte * 0.25)
    return fundidos(x * env)


def pop(dur=0.16):
    tt = t(dur)
    f = 900 * np.exp(-tt * 28) + 180                     # caida rapida de tono
    fase = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-tt * 30)
    return fundidos(np.sin(fase) * env, 0.001, 0.01)


def ding(dur=1.6):
    tt = t(dur)
    base = 1318.5  # Mi6
    x = np.zeros_like(tt)
    for mult, amp, caida in [(1, 1, 3.2), (2.76, 0.45, 5), (5.4, 0.25, 8), (8.93, 0.12, 11)]:
        x += amp * np.sin(2 * np.pi * base * mult * tt) * np.exp(-tt * caida)
    return fundidos(x, 0.001, 0.1)


def riser(dur=1.8):
    tt = t(dur)
    fase = tt / dur
    f = 180 * (2 ** (fase * 3))                          # sube 3 octavas
    tono = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
    ruido = pasabajos(rng.standard_normal(len(tt)), 400 + 7000 * fase ** 2)
    env = fase ** 2.2
    return fundidos((pasabajos(tono, 2500) + ruido) * env, 0.01, 0.015)


def impacto(dur=1.2):
    tt = t(dur)
    f = 110 * np.exp(-tt * 6) + 38
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4)
    golpe = pasabajos(rng.standard_normal(len(tt)), 1800) * np.exp(-tt * 35)
    return fundidos(cuerpo + 0.8 * golpe, 0.001, 0.1)


def tic(dur=0.05):
    tt = t(dur)
    return fundidos(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 120), 0.0005, 0.005)


def musica(dur=60.0):
    """Pad ambiental: acordes lentos Am - F - C - G, estereo, muy suave."""
    tt = t(dur)
    acordes = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63],
               [196.0, 261.63, 329.63], [196.0, 246.94, 293.66]]
    largo = 4.0
    izq = np.zeros_like(tt)
    der = np.zeros_like(tt)
    for i, ini in enumerate(np.arange(0, dur, largo)):
        notas = acordes[i % len(acordes)]
        m = (tt >= ini - 0.8) & (tt < ini + largo + 0.8)
        local = tt[m] - ini
        env = np.clip(np.minimum((local + 0.8) / 1.6, (largo + 0.8 - local) / 1.6), 0, 1)
        for k, f in enumerate(notas):
            for det, lado in [(-0.6, 0), (0.6, 1)]:
                onda = np.sin(2 * np.pi * (f + det) * tt[m] + k) + 0.3 * np.sin(2 * np.pi * 2 * (f + det) * tt[m])
                (izq if lado == 0 else der)[m] += onda * env * 0.2
    graves = 0.35 * np.sin(2 * np.pi * 55 * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 8))
    izq, der = izq + graves, der + graves
    izq, der = pasabajos(izq, 1600), pasabajos(der, 1600)
    st = np.stack([fundidos(izq, 1.5, 2.0), fundidos(der, 1.5, 2.0)], axis=1).reshape(-1)
    return st


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    destino = pathlib.Path(sys.argv[1])
    destino.mkdir(parents=True, exist_ok=True)
    for nombre, fn in [("whoosh", whoosh), ("pop", pop), ("ding", ding),
                       ("riser", riser), ("impacto", impacto), ("tic", tic)]:
        guardar(destino / f"{nombre}.wav", fn())
        print("OK", nombre)
    if "--musica" in sys.argv:
        seg = float(sys.argv[sys.argv.index("--musica") + 1])
        guardar(destino / "musica.wav", musica(seg), estereo=True)
        print("OK musica", seg, "s")
