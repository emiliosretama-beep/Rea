#!/usr/bin/env python3
"""Convierte una fuente .otf/.ttf al formato JSON "typeface" que usa three.js (FontLoader)
para hacer texto 3D extruido (TextGeometry). Solo incluye los caracteres que hacen falta
en español, asi el archivo queda chico.

Uso: python3 fuente_a_typeface.py <fuente.otf> <salida.json> [--invertir]
Requiere: pip install fonttools
--invertir cambia el sentido de los contornos (si las letras salen "rellenas" o con
los huecos al reves).
"""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen

CARACTERES = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    "ÁÉÍÓÚÜÑáéíóúüñ¿¡?!.,:;·-–—_'\"()[]{}<>/\\@#$%&*+=|~^°«»… "
)


def convertir(origen, destino, invertir=False):
    f = TTFont(origen)
    upm = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    glifos = {}
    xmin = ymin = 10**9
    xmax = ymax = -10**9
    for ch in CARACTERES:
        nombre = cmap.get(ord(ch))
        if not nombre:
            continue
        rec = RecordingPen()
        gs[nombre].draw(ReverseContourPen(rec) if invertir else rec)
        partes = []
        actual = None
        for op, pts in rec.value:
            if op == "moveTo":
                (x, y), = pts
                partes += ["m", x, y]
                actual = (x, y)
            elif op == "lineTo":
                (x, y), = pts
                partes += ["l", x, y]
            elif op == "curveTo":  # cubica: fin, control1, control2 (orden de three)
                (c1, c2, p) = pts[-3:]
                partes += ["b", p[0], p[1], c1[0], c1[1], c2[0], c2[1]]
            elif op == "qCurveTo":  # TrueType: puede traer varios puntos implicitos
                ctrl = list(pts[:-1])
                fin = pts[-1]
                for k, c in enumerate(ctrl):
                    if k < len(ctrl) - 1:
                        n = ctrl[k + 1]
                        p = ((c[0] + n[0]) / 2, (c[1] + n[1]) / 2)
                    else:
                        p = fin
                    partes += ["q", p[0], p[1], c[0], c[1]]
            elif op == "closePath" or op == "endPath":
                if actual:
                    partes += ["l", actual[0], actual[1]]
        xs = [v for i, v in enumerate(partes) if isinstance(v, (int, float))][0::2]
        ys = [v for i, v in enumerate(partes) if isinstance(v, (int, float))][1::2]
        if xs:
            xmin, xmax = min(xmin, *xs), max(xmax, *xs)
            ymin, ymax = min(ymin, *ys), max(ymax, *ys)
        o = " ".join(str(round(v)) if isinstance(v, (int, float)) else v for v in partes)
        glifos[ch] = {"ha": hmtx[nombre][0], "x_min": round(min(xs)) if xs else 0,
                      "x_max": round(max(xs)) if xs else 0, "o": o}
    datos = {
        "glyphs": glifos,
        "familyName": f["name"].getDebugName(1),
        "ascender": f["hhea"].ascent,
        "descender": f["hhea"].descent,
        "underlinePosition": f["post"].underlinePosition,
        "underlineThickness": f["post"].underlineThickness,
        "boundingBox": {"xMin": round(xmin), "yMin": round(ymin), "xMax": round(xmax), "yMax": round(ymax)},
        "resolution": upm,
        "original_font_information": {"license": "SIL Open Font License 1.1"},
    }
    with open(destino, "w") as out:
        json.dump(datos, out, ensure_ascii=False, separators=(",", ":"))
    print(f"OK {len(glifos)} caracteres -> {destino}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    convertir(sys.argv[1], sys.argv[2], "--invertir" in sys.argv)
