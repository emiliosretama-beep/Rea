#!/usr/bin/env python3
"""Escenas del video de ERA Factory (Pillow).

Lee un trabajo en JSON por stdin y escribe un PNG por escena. Informa por
stdout una línea JSON por evento (como tts_kokoro.py):
  {"event": "scene", "id": ..., "index": 1, "total": 12}
  {"event": "done"} | {"event": "error", "message": ...}

Trabajo:
  {"width": 1920, "height": 1080,
   "fonts": {"display": ".../Anton-Regular.ttf", "body": ".../AtkinsonHyperlegible-Bold.ttf"},
   "palette": {"bg1": "#..", "bg2": "#..", "text": "#..", "accent": "#..", "accentText": "#.."},
   "scenes": [{"id": "scene-001", "kind": "title|section|point|number|quote|end",
               "text": "...", "context": "...", "out": ".../scene-001.png"}]}

El tercio inferior queda libre para los subtítulos.
"""
import json
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def emit(**event):
    sys.stdout.write(json.dumps(event, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def background(w, h, pal):
    """Degradado diagonal bg1 -> bg2 a resolución completa (sin escalones) y franja de acento."""
    a = np.array(rgb(pal["bg1"]), dtype=np.float32)
    b = np.array(rgb(pal["bg2"]), dtype=np.float32)
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    t = (xs * 0.65 + ys * 0.35)[..., None]
    pixels = a + (b - a) * t
    # Un poco de ruido evita bandas visibles tras la compresión H.264.
    pixels += np.random.default_rng(7).uniform(-1.5, 1.5, pixels.shape).astype(np.float32)
    img = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), "RGB")
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, round(w * 0.012), h], fill=rgb(pal["accent"]))
    return img


def fit(draw, text, font_path, max_w, max_h, max_size, min_size, spacing=1.05, max_lines=4):
    """Mayor tamaño de letra con el que el texto, repartido en líneas, cabe en la caja."""
    words = text.split()
    for size in range(max_size, min_size - 1, -4):
        font = ImageFont.truetype(font_path, size)
        lines, current = [], []
        for word in words:
            test = " ".join(current + [word])
            if current and draw.textlength(test, font=font) > max_w:
                lines.append(" ".join(current))
                current = [word]
            else:
                current.append(word)
        if current:
            lines.append(" ".join(current))
        too_wide = any(draw.textlength(line, font=font) > max_w for line in lines)
        if not too_wide and len(lines) <= max_lines and len(lines) * size * spacing <= max_h:
            return font, lines, size
    font = ImageFont.truetype(font_path, min_size)
    return font, [text], min_size


def draw_lines(draw, lines, font, size, x, y, color, spacing=1.05, stroke=None):
    for i, line in enumerate(lines):
        draw.text((x, y + i * size * spacing), line, font=font, fill=color,
                  stroke_width=round(size * 0.04) if stroke else 0, stroke_fill=stroke)
    return y + len(lines) * size * spacing


def centered_top(top, avail, lines, size, spacing):
    """Centra verticalmente un bloque de líneas dentro de la zona útil."""
    block = len(lines) * size * spacing
    return top + max(0, (avail - block) / 2)


def underline(draw, lines, font, x, y_last, accent, w, h):
    """Raya de acento debajo de la caja REAL de la última línea."""
    bottom = draw.textbbox((x, y_last), lines[-1], font=font)[3]
    gap = round(h * 0.03)
    draw.rectangle([x, bottom + gap, x + round(w * 0.12), bottom + gap + round(h * 0.012)], fill=accent)


def is_light(color):
    r, g, b = rgb(color)
    return 0.299 * r + 0.587 * g + 0.114 * b > 160


def zones(w, h):
    """Zona útil para el texto según la orientación.

    Horizontal: el tercio inferior queda para los subtítulos.
    Vertical (Shorts): arriba va la barra del teléfono, abajo el título y el
    canal que pone YouTube, y a la derecha los botones (me gusta, comentar):
    el texto vive en el centro-izquierda, por encima de los subtítulos.
    """
    if h > w:
        return {"left": round(w * 0.08), "right": round(w * 0.17), "top": round(h * 0.16), "bottom": round(h * 0.58)}
    return {"left": round(w * 0.07), "right": round(w * 0.07), "top": round(h * 0.09), "bottom": round(h * 0.62)}


def render(scene, job):
    w, h = job["width"], job["height"]
    u = min(w, h)  # el tamaño de letra se mide contra el lado corto
    vertical = h > w
    pal = job["palette"]
    fonts = job["fonts"]
    img = background(w, h, pal)
    draw = ImageDraw.Draw(img)
    z = zones(w, h)
    pad = z["left"]
    box_w = w - z["left"] - z["right"]
    text_color = rgb(pal["text"])
    accent = rgb(pal["accent"])
    outline = (255, 255, 255) if is_light(pal["bg1"]) else (0, 0, 0)
    top = z["top"]
    kind = scene["kind"]
    text = scene.get("text", "").strip()
    context = scene.get("context", "").strip()

    if context:
        small = ImageFont.truetype(fonts["body"], round(u * 0.035 * (1.4 if vertical else 1)))
        draw.text((pad, top), context.upper(), font=small, fill=accent)
        top += round(u * 0.075 * (1.4 if vertical else 1))

    avail = z["bottom"] - top
    if kind in ("title", "section", "end"):
        room = avail - round(u * 0.06)
        font, lines, size = fit(draw, text.upper(), fonts["display"], box_w, room, round(u * 0.17 * (1.25 if vertical else 1)), 48,
                                max_lines=6 if vertical else 4)
        y0 = centered_top(top, room, lines, size, 1.05)
        draw_lines(draw, lines, font, size, pad, y0, text_color, stroke=outline)
        underline(draw, lines, font, pad, y0 + (len(lines) - 1) * size * 1.05, accent, w, h)
    elif kind == "number":
        match = re.match(r"^\s*([\d.,%]+)\s*(.*)$", text)
        number, rest = (match.group(1), match.group(2)) if match else (text, "")
        if vertical:
            # Cifra arriba y texto debajo: en vertical no caben de lado.
            nfont, nlines, nsize = fit(draw, number, fonts["display"], box_w, avail * 0.5, round(u * 0.5), 80, max_lines=1)
            rfont, rlines, rsize = (fit(draw, rest, fonts["body"], box_w, avail * 0.4, round(u * 0.11), 36, spacing=1.15) if rest else (None, [], 0))
            block = nsize + len(rlines) * rsize * 1.15
            y0 = top + max(0, (avail - block) / 2)
            draw_lines(draw, nlines, nfont, nsize, pad, y0 - nsize * 0.08, accent, stroke=outline)
            if rest:
                draw_lines(draw, rlines, rfont, rsize, pad, y0 + nsize, text_color, spacing=1.15)
        else:
            nfont, nlines, nsize = fit(draw, number, fonts["display"], box_w * 0.45, avail, round(u * 0.42), 80, max_lines=1)
            top = centered_top(top, avail, nlines, nsize, 1.0)
            draw_lines(draw, nlines, nfont, nsize, pad, top - nsize * 0.08, accent, stroke=outline)
            x = pad + draw.textlength(nlines[0], font=nfont) + round(w * 0.03)
            if rest:
                font, lines, size = fit(draw, rest, fonts["body"], w - z["right"] - x, avail, round(u * 0.1), 36)
                draw_lines(draw, lines, font, size, x, top + (nsize - len(lines) * size * 1.05) / 2, text_color)
    elif kind == "quote":
        room = avail - round(u * 0.08)
        font, lines, size = fit(draw, text, fonts["body"], box_w * 0.92, room, round(u * 0.11 * (1.15 if vertical else 1)), 36, spacing=1.15,
                                max_lines=7 if vertical else 4)
        y0 = centered_top(top + round(u * 0.08), room, lines, size, 1.15)
        qfont = ImageFont.truetype(fonts["display"], round(u * 0.26))
        draw.text((pad - round(u * 0.01), y0 - round(u * 0.13)), "“", font=qfont, fill=accent)
        draw_lines(draw, lines, font, size, pad + round(u * 0.05), y0, text_color, spacing=1.15)
    else:  # point
        font, lines, size = fit(draw, text, fonts["body"], box_w, avail, round(u * 0.115 * (1.15 if vertical else 1)), 36, spacing=1.15,
                                max_lines=7 if vertical else 4)
        draw_lines(draw, lines, font, size, pad, centered_top(top, avail, lines, size, 1.15), text_color, spacing=1.15)
    img.save(scene["out"], "PNG", optimize=False)


def main():
    job = json.load(sys.stdin)
    scenes = job["scenes"]
    for index, scene in enumerate(scenes, start=1):
        render(scene, job)
        emit(event="scene", id=scene["id"], index=index, total=len(scenes))
    emit(event="done")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        emit(event="error", message=f"{type(exc).__name__}: {exc}")
        sys.exit(1)
