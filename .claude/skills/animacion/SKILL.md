---
name: animacion
description: Todas las skills de animación y video de Emilio en una sola. Monitos (stick-figure), 3D tipo Zack D. Films, kurzgesagt, mapa con ruta, gráfica que crece, despiece 3D, minimalista, low-poly, Minecraft, Dan Koe, Remotion o IA para reels, y videos horizontales de lecciones. Úsala siempre que Emilio pida un video, reel, short, TikTok, animación, explicación animada o convertir una lección en video, que mande un guion, o que escriba /animacion, /stick-figure, /zach-d-films, /zach-3d-films, /map-route, /graph, /breakdown, /minimalistic-graphics, /low-poly, /minecraft, /kurzgesagt, /dan-koe o /videos-verticales-ia, aunque lo dicte por voz.
argument-hint: "estilo (opcional) y tema o guion"
---

# Animación (todas las skills en una)

Responde en español, corto y fácil de leer en iPhone. Cada estilo vive en
`estilos/<estilo>/GUIA.md` (en inglés, tal como lo escribió su autor, salvo
`remotion-ia`). Esta página solo dice cuál usar y cómo arrancarlo.

## 1. Preguntar el estilo (siempre)

Nunca elijas el estilo tú. Pregúntale a Emilio con AskUserQuestion, aunque
el guion "pida" uno. Puede mezclar varios en un mismo video. Si escribió un
comando como `/graph`, ese es el estilo: confírmalo y sigue.

| Estilo | Qué es | Tarda | Guía |
|---|---|---|---|
| stick-figure | Monitos en mundo de caricatura, explicación "¿y si…?" de 30-45 s con voz | Largo | `estilos/stick-figure` |
| zach-d-films (= zach-3d-films) | Gente 3D de caricatura, impactos en cámara lenta, short "¿podría X parar Y?" | Largo | `estilos/zach-d-films` |
| kurzgesagt | Espacio vectorial plano, planetas y estrellas | ~10 s | `estilos/kurzgesagt` |
| map-route | Ciudad 3D blanca con ruta que se dibuja hasta un pin | ~1.5 min | `estilos/map-route` |
| graph | Línea que crece y número que cuenta (0 a 100K) | ~10 s | `estilos/graph` |
| breakdown | Despiece 3D de un teléfono capa por capa | ~1.5 min | `estilos/breakdown` |
| minimalistic-graphics | Línea blanca sobre negro: escalones, punto, órbita | ~10 s | `estilos/minimalistic-graphics` |
| low-poly | 3D estilo PS1/N64 con píxeles gruesos | ~1.5 min | `estilos/low-poly` |
| minecraft | Casa de bloques que se construye sola | ~1.5 min | `estilos/minecraft` |
| dan-koe | Árbol de líneas finas sobre negro | ~10 s | `estilos/dan-koe` |
| remotion-ia | Reels 9:16 con Remotion o con video de IA (Veo, Runway…), guion y gancho | Varía | `estilos/remotion-ia` |
| lección horizontal | Video 1920x1080 de ≈4 min para estudiar una lección de un curso | Largo | `/home/user/Rea/videos/lecciones/README.md` |

## 2. Preparar el contenedor (una vez por sesión)

```bash
bash /home/user/Rea/videos/setup.sh
```
Instala los paquetes de Node en `kit/`, Playwright 1.63.0 (el del Chromium de
`/opt/pw-browsers`), GSAP y la voz Kokoro con el alineador Parakeet (~1 GB la
primera vez). **No corras `kit/setup.sh`** en la nube: ejecuta
`playwright install`, que aquí está prohibido. Si una guía dice
"`|| bash "$KIT/setup.sh"`", la condición ya se cumple tras este paso.

## 3. Seguir la guía del estilo

Las guías dicen `SKILL_DIR="<base directory of this skill>"`. Aquí es:
```bash
A="<directorio base de esta skill>"          # .claude/skills/animacion
SKILL_DIR="$A/estilos/<estilo>"
KIT="$A/kit"
```
Lee `$SKILL_DIR/GUIA.md` entera y síguela con ese `SKILL_DIR`. Las rutas
relativas (`../../kit`, `../stick-figure/...`) ya funcionan con esta
estructura. Trabaja en el scratchpad y guarda en el repo solo lo que valga la
pena conservar.

## 4. Voz en español

- Kokoro con `lang="es"` y las voces `ef_dora`, `em_alex` o `em_santa`.
  `estilos/stick-figure/engine/tools/tts_kokoro.py` viene fijo en inglés:
  cambia el idioma o usa `videos/lecciones/plantilla/tts_es.py` como base.
- El alineador Parakeet es inglés: usa sus tiempos, pero toma el texto de los
  subtítulos del guion.
- Nombres en inglés: cambia su pronunciación solo para la voz (lista `SAY` de
  `tts_es.py`).

## 5. Agregar un estilo nuevo

Toda skill nueva de animación o video entra **aquí**, no como skill aparte:

1. Revísala antes con la skill `skills-scout` (licencia, auditorías, que no
   descargue y ejecute código ni pida claves).
2. Cópiala en `estilos/<nombre>/`, renombrando su `SKILL.md` a `GUIA.md`.
   Si usa el kit compartido, sus rutas `../../kit` funcionan sin cambios.
3. Agrega su fila a la tabla del paso 1, su comando a la `description` de
   arriba y su origen a `ORIGEN.txt`.
4. Prueba un render corto (`--snap`) antes de subirla.
