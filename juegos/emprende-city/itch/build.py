#!/usr/bin/env python3
"""Arma el zip de Tycoon City 3D (antes Emprende City) para itch.io.

Toma ../3d.html (la versión DEV), cambia Three.js y las fuentes de Google por
copias locales de vendor/ (así el juego no depende de otros servidores) y deja
index.html en la raíz del zip, como lo pide itch.io.

Uso:  python3 build.py 1.1   ->  tycoon-city-3d-itch-v1.1.zip
"""
import pathlib, re, sys, zipfile

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / '3d.html'
VENDOR = HERE / 'vendor'
version = sys.argv[1] if len(sys.argv) > 1 else 'dev'

html = SRC.read_text(encoding='utf-8')

def swap(pattern, repl):
    global html
    html, n = re.subn(pattern, lambda _: repl, html)
    if n != 1:
        sys.exit(f'build.py: esperaba 1 coincidencia de {pattern!r} y hubo {n}')

# Fuentes: los dos preconnect y la hoja de Google -> fonts.css local
swap(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n', '')
swap(r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n', '')
swap(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?[^"]*">', '<link rel="stylesheet" href="fonts.css">')
# Motor 3D local
swap(r'<script src="https://cdn\.jsdelivr\.net/npm/three@0\.149\.0/build/three\.min\.js"></script>', '<script src="three.min.js"></script>')
# En esta versión ya no hace falta internet: la pausa deja de pedir conexión
swap(r'const CDN_ENGINE = true;', 'const CDN_ENGINE = false;')
swap(r'<title>Tycoon City 3D</title>', f'<title>Tycoon City 3D</title>\n<meta name="version" content="{version}">')

if re.search(r'(src|href)="https?://', html):
    sys.exit('build.py: quedó un recurso externo en el HTML')

out = HERE / f'tycoon-city-3d-itch-v{version}.zip'
files = {'index.html': html.encode('utf-8')}
for p in ['three.min.js', 'fonts.css', 'LICENSE-three.txt', 'OFL-BricolageGrotesque.txt', 'OFL-Figtree.txt']:
    files[p] = (VENDOR / p).read_bytes()
for p in sorted((VENDOR / 'fonts').glob('*.woff2')):
    files[f'fonts/{p.name}'] = p.read_bytes()

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, data in files.items():
        z.writestr(name, data)
print(f'{out.name}: {out.stat().st_size / 1024:.0f} KB, {len(files)} archivos')
