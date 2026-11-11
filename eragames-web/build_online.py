#!/usr/bin/env python3
"""Genera online/eragames.html: la misma página sin la envoltura <html>/<head>/<body>,
que es como la pide el visor de artifacts de claude.ai. No edites online/ a mano."""
import pathlib
here = pathlib.Path(__file__).parent
s = (here / "index.html").read_text(encoding="utf-8")
for tag in ['<!doctype html>\n', '<html lang="es">\n', '<head>\n', '<meta charset="utf-8">\n',
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n',
            '</head>\n', '<body>\n', '</body>\n', '</html>\n']:
    assert tag in s, f"No encontré {tag!r} en index.html"
    s = s.replace(tag, '', 1)
(here / "online").mkdir(exist_ok=True)
(here / "online" / "eragames.html").write_text(s, encoding="utf-8")
print("online/eragames.html listo")
