#!/usr/bin/env python3
"""Prepara un video del estudio a partir de su voz.

    python3 tools/preparar.py <video>

Lee  videos/<video>/audio/vo.json  (tiempos por palabra de scripts/generar-voz.mjs)
y    videos/<video>/audio/vo.wav
Escribe:
  videos/<video>/captions.js   CAPTIONS (1 a 3 palabras) y DURATION
  videos/<video>/audio/boca.js BOCA: apertura de boca por cuadro (0..1) según el volumen de la voz
"""
import json
import pathlib
import re
import subprocess
import sys

import numpy as np

FPS = 30
CORTAS = {
    'a', 'al', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'e', 'en',
    'con', 'que', 'lo', 'le', 'les', 'te', 'tu', 'tus', 'su', 'sus', 'se', 'si', 'sin', 'por', 'para',
    'como', 'es', 'ese', 'esa', 'esto', 'mi', 'me', 'no', 'ya', 'muy', 'más',
}


def grupos(palabras, maximo=3):
    """Grupos de hasta 3 palabras; corta en la puntuación y no deja palabras cortas colgando."""
    salida, actual = [], []
    for i, p in enumerate(palabras):
        actual.append(p)
        fin_frase = re.search(r'[.,?!;:]$', p['w'])
        if fin_frase or len(actual) == maximo:
            limpia = re.sub(r'[¿¡]', '', actual[-1]['w']).lower()
            if not fin_frase and len(actual) > 1 and limpia in CORTAS and i + 1 < len(palabras):
                siguiente = actual.pop()
                salida.append(actual)
                actual = [siguiente]
            else:
                salida.append(actual)
                actual = []
    if actual:
        salida.append(actual)
    return salida


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    base = pathlib.Path(__file__).resolve().parent.parent / 'videos' / sys.argv[1]
    datos = json.load(open(base / 'audio' / 'vo.json', encoding='utf-8'))
    palabras = [{'w': p['texto'], 's': p['inicio'], 'e': p['fin']} for p in datos['palabras']]

    gs = grupos(palabras)
    lineas = []
    for i, g in enumerate(gs):
        texto = re.sub(r'[.,;:]+$', '', ' '.join(x['w'] for x in g)).replace("'", "\\'")
        fin = f", {g[-1]['e'] + 0.3:.2f}" if i == len(gs) - 1 else ''
        lineas.append(f"  [{g[0]['s']:.2f}, '{texto}'{fin}],")
    duracion = round(palabras[-1]['e'] + 0.9, 2)
    (base / 'captions.js').write_text(
        '// Generado por tools/preparar.py desde la voz real. No editar a mano.\n'
        'export const CAPTIONS = [\n' + '\n'.join(lineas) + '\n];\n'
        f'export const DURATION = {duracion};\n',
        encoding='utf-8',
    )

    # Boca: volumen de la voz por cuadro, suavizado y normalizado.
    sr = 16000
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(base / 'audio' / 'vo.wav'),
                          '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = int(np.ceil(duracion * FPS))
    paso = sr // FPS
    rms = np.array([np.sqrt(np.mean(a[i * paso:(i + 1) * paso] ** 2)) if i * paso < len(a) else 0 for i in range(n)])
    rms = np.convolve(rms, [0.25, 0.5, 0.25], mode='same')
    tope = np.percentile(rms[rms > 0], 95) if np.any(rms > 0) else 1
    boca = np.clip(rms / tope, 0, 1)
    (base / 'audio' / 'boca.js').write_text(
        '// Apertura de boca por cuadro (30 fps), sacada del volumen de la voz.\n'
        'export const BOCA = [' + ','.join(f'{v:.2f}' for v in boca) + '];\n',
        encoding='utf-8',
    )
    print(f'{sys.argv[1]}: {len(gs)} subtítulos, duración {duracion} s, {n} cuadros de boca')
    for linea in lineas:
        print(linea)


if __name__ == '__main__':
    main()
