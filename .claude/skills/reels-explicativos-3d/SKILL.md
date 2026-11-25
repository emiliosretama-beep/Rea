---
name: reels-explicativos-3d
description: >
  Convierte una idea en un reel explicativo 3D terminado, estilo "¿por qué pasa esto?":
  guion con gancho y datos verificados con fuentes, voz en español gratis (Piper) u opcional
  ElevenLabs, animación 3D con Remotion + three.js, subtítulos palabra por palabra, efectos de
  sonido sintetizados, portada y texto del post. Entrega reel.mp4 (1080x1920, 30 fps, 30-60 s),
  portada.jpg y texto-del-post.txt. Úsala siempre que Emilio pida "un reel de por qué...",
  "explícame en un reel", "video explicativo 3D", "reel de ciencia / curiosidades / datos",
  "hazme un reel viral que explique...", "reel cinematográfico", "esto no es una grabación",
  presentar un juego o producto con look de cine, o mencione crearvideoviral, aunque no diga
  "3D" ni "skill". Tiene dos estilos: explicativo y escritorio cinematográfico. Nunca publica
  sola en Instagram ni en ninguna red.
---

# Reels explicativos 3D

Emilio da una idea ("¿por qué el cielo es azul?") y recibe el reel listo para subir. Es la
alternativa propia y gratis a productos de pago como crearvideoviral.com: todo corre en la
sesión con herramientas libres. Responde en español, corto y claro.

Es complementaria de `videos-verticales-ia` (guiones, prompts para IA de video, Remotion 2D):
esta skill es solo para reels explicativos con 3D, voz y subtítulos automáticos. No la
modifiques desde aquí.

## Reglas que no se rompen

1. **Nunca publicar.** No abras Instagram, TikTok ni ningún navegador para subir el reel. Los
   productos que publican controlando el navegador pueden hacer que bloqueen la cuenta. Se
   entrega el archivo y Emilio lo sube él mismo desde su iPhone.
2. **El dato tiene que ser cierto.** Antes de escribir el guion, verifica cada afirmación con
   WebSearch en fuentes serias (NASA, NOAA, universidades, enciclopedias, artículos
   científicos). Si algo es dudoso, quítalo o dilo con cuidado ("casi", "alrededor de").
   Las fuentes van en `reel.json` y salen al final del texto del post.
3. **Claves nunca en el chat.** Si quiere ElevenLabs, usa `request_credential` para el host
   `api.elevenlabs.io` con `header_name` `xi-api-key` (sin prefijo). Nunca pidas que pegue la
   clave ni la guardes en archivos.
4. **Animar solo con el fotograma.** Todo movimiento sale de `useCurrentFrame()` /
   `interpolate()` / helpers del kit. Nada de `Math.random()`, `Date`, `setTimeout` ni
   animaciones CSS: Remotion renderiza fotogramas en paralelo y desordenados.
5. **Ser honesto con la calidad.** Antes de entregar mira los fotogramas (paso 6). Si algo se
   ve simple o feo, dilo y propón cómo mejorarlo; no digas "quedó perfecto" sin haberlo visto.
6. **Nada de audio descargado con licencia dudosa.** Los efectos y la música salen de
   `scripts/generar_sonidos.py` (síntesis pura, son de Emilio).

## Archivos de la skill

```
reels-explicativos-3d/
  SKILL.md
  scripts/preparar.sh        instala el taller (Remotion+three, Piper y la voz)
  scripts/hacer_reel.py      reel.json + escena.tsx -> reel.mp4, portada.jpg, post, revisión
  scripts/vistazo.mjs        renderiza solo unos fotogramas (pruebas rápidas)
  scripts/generar_sonidos.py whoosh, pop, ding, riser, impacto, tic y música de fondo
  scripts/fuente_a_typeface.py convierte una fuente a JSON para texto 3D
  sonidos/*.wav              los efectos ya generados
  plantilla/                 proyecto Remotion (kit 3D en src/kit, estilo cine en src/kit/cine)
  ejemplos/cielo-azul/       estilo explicativo: reel.json + escena.tsx
  ejemplos/eragames-cine/    estilo escritorio cinematográfico: reel.json + escena.tsx
```

## Paso 0: preparar el taller (una vez por sesión)

```bash
bash <skill>/scripts/preparar.sh ~/reels-3d
```

Crea `~/reels-3d/proyecto` (con node_modules, fuera del repo), `~/reels-3d/voces` y
`~/reels-3d/reels`. Si ya existe, solo actualiza el código del kit. Tarda 1-3 min la primera
vez. Si falla la descarga de la voz, revisa que `huggingface.co` esté permitido en la red.

Necesita Node 18+, Python 3, ffmpeg y un Chromium. En la nube de Claude Code se usa el
Chromium preinstalado (`/opt/pw-browsers`) con GL por software (`angle`): funciona, pero es lento.

## Paso 1: idea y guion

Pregunta solo si falta el tema. Decide tú el resto con buen criterio:

- **Duración:** 30-60 s (≈ 90-150 palabras de narración). Mejor 40 s que 60.
- **Gancho (0-2 s):** la pregunta o el dato más sorprendente, dicho ya. Nada de "hola,
  hoy vamos a...". Ejemplos: "¿Por qué el cielo es azul… pero el atardecer naranja?",
  "Tu cuerpo brilla en la oscuridad. Literalmente."
- **Desarrollo:** 4-6 escenas de 4-10 s, una idea por escena, cada una con su imagen 3D.
- **Cierre:** remate que conecte con el gancho + llamado ("Sígueme para más porqués").
- Frases cortas, de hablar, sin paréntesis ni siglas raras (la voz las lee mal). Números
  escritos en letra si la voz pudiera trabarse.
- Signos al final de cada frase: el script usa la puntuación y los silencios de la voz para
  sincronizar los subtítulos.

Muéstrale a Emilio el guion como tabla (escena, narración, visual) con las fuentes, y sigue
salvo que quiera cambiar algo.

## Paso 2: reel.json

Crea `~/reels-3d/reels/<id>/reel.json` (copia la forma de `ejemplos/cielo-azul/reel.json`):

```json
{
  "id": "cielo-azul",                       // minúsculas y guiones; igual que la carpeta
  "titulo": "¿Por qué el cielo es azul?",
  "voz": { "motor": "piper", "modelo": "es_MX-claude-high", "velocidad": 1.0 },
  "musica": true,                            // pad suave sintetizado; volumen_musica opcional
  "marca": "@usuario",                       // opcional, se ve arriba
  "portada": { "escena": "gancho", "segundo": 2.2, "titulo": "...", "subtitulo": "..." },
  "escenas": [
    { "id": "gancho", "visual": "gancho", "narracion": "...", "efecto": "whoosh" },
    { "id": "choque", "visual": "choque", "narracion": "...",
      "efecto": [{ "nombre": "impacto", "en": 0.7, "volumen": 0.5 },
                 { "nombre": "riser", "antes": true }],   // "antes": termina justo al empezar
      "pausa": 0.3, "extra": { "color": "#3d8bff" } }
  ],
  "post": { "texto": "...", "hashtags": ["#ciencia"] },
  "fuentes": ["NASA Space Place: https://spaceplace.nasa.gov/blue-sky/"]
}
```

Efectos disponibles: `whoosh` (cambio de escena), `pop` (algo aparece), `ding` (dato clave),
`riser` (tensión antes de la revelación), `impacto` (golpe), `tic`. Uno por escena basta;
demasiados cansan.

**Voces Piper** (gratis, de `rhasspy/piper-voices`): `es_MX-claude-high` (por defecto, la más
natural), `es_MX-ald-medium`. Para otra, `REELS_VOZ=<voz> bash preparar.sh`. Sube o baja
`velocidad` (1.05-1.1 suena más "reel").

**ElevenLabs** (opcional, de pago, voz más expresiva y tiempos exactos por palabra):
`"voz": { "motor": "elevenlabs", "voz_id": "<id>", "modelo": "eleven_multilingual_v2" }`.
Primero `request_credential` (ver reglas). Si la clave no está, el script lo dice y paras.

## Paso 3: escena.tsx (los visuales 3D)

Crea `~/reels-3d/reels/<id>/escena.tsx`. Exporta por defecto un objeto
`{ nombreDelVisual: Componente }`, con un componente por cada `visual` del reel.json. Cada
componente recibe `{ frames, extra }` (frames = duración de su escena). Empieza copiando
`ejemplos/cielo-azul/escena.tsx`, que usa todos los bloques.

Bloques del kit (`import { ... } from "../kit"`):

| Bloque | Para qué |
|---|---|
| `Escena3D` | Lienzo 9:16 con fondo degradado, luces de estudio, reflejos, bloom y fundido. Props: `fondo` (`FONDOS.noche/cielo/atardecer/estudio/laboratorio` o `{arriba, abajo, brillo}`), `bloom` (0.6-1.3), `frente` (capas 2D encima). |
| `Camara` | `tipo`: `fija`, `orbita` (radio, altura, vueltas), `dolly` (desde→hasta), `grua` (también mueve a dónde mira). Siempre pon una: la cámara quieta se ve barata. |
| `Flecha` | Flecha 3D que crece (`progreso` 0→1). |
| `Rayo` | Haz de luz con núcleo y halo. |
| `Onda` | Onda senoidal en 3D (longitud de onda, sonido, señales). |
| `Particulas` | Cientos de esferas rápidas. `modo`: flotar, caer, orbitar, explotar, o `posicion={(i, f, r) => [x,y,z]}` propia. |
| `Brillo` | Halo luminoso (soles, focos, impactos). |
| `Globo`, `Atmosfera` | Planeta con textura generada y halo de atmósfera (sirve para burbujas, campos). |
| `Etiqueta3D` | Texto que flota en 3D y siempre se lee nítido (se dibuja después del bloom). |
| `Titular`, `Etiqueta2D` | Texto 2D grande para `frente` (gancho, CTA). |
| `progreso`, `entraYSale`, `rebote`, `respira`, `azar` | Tiempos y curvas. `azar(semilla)` en lugar de Math.random. |

Reglas de composición (aprendidas en el ejemplo):

- La cámara a distancia 10 ve unas 4 x 7.3 unidades. Mantén lo importante entre x = ±1.6.
- Los subtítulos ocupan la franja de pantalla ~1180-1400 px (y ≈ -1 en 3D): pon objetos y
  etiquetas de y = 0 hacia arriba, o apunta la cámara más abajo (`mira`).
- Arriba (~0-250 px) y abajo (~1500-1920 px) Instagram tapa con su interfaz.
- Colores > 1 o `toneMapped={false}` brillan con el bloom. Úsalo en lo que debe llamar la
  atención (rayos, partículas clave), no en todo: si todo brilla, nada destaca.
- Una idea visual por escena, con algo que se mueva desde el primer fotograma.
- Usa el mismo lenguaje visual en todo el reel (colores de cada concepto, tipo de cámara).

## Estilos

Elige el estilo según el tema y ponlo en `reel.json` (`"estilo"`, informativo) y en los
componentes que uses en `escena.tsx`.

### Estilo "explicativo" (por defecto)

El de `ejemplos/cielo-azul`: fondos degradados, objetos simbólicos brillantes (rayos,
ondas, planetas), bloom fuerte y subtítulos grandes. Ideal para ciencia y "¿por qué...?".

### Estilo "escritorio cinematográfico" (`ejemplos/eragames-cine`)

Una habitación real al atardecer: escritorio de madera, computadora CRT beige, taza, planta,
teclado, hoja de notas, y la luz del sol entrando por una persiana. Cada escena es otro plano
de cámara sobre el mismo decorado. Sirve para presentar un producto, un juego o "cómo se hizo"
con look de cine, y para ganchos tipo "Esto no es una grabación".

Reglas de cine (ya vienen aplicadas por defecto en los bloques):

- Lente de 35 mm (planos generales) o 50 mm (detalles): `mm={35}` / `mm={50}`.
- Profundidad de campo física: `enfoque` = distancia en metros de la cámara al sujeto;
  `apertura` más alta = fondo más desenfocado (0.002 casi todo nítido, 0.03 muy desenfocado).
- Cámara nunca fija: `CamaraCine` siempre tiene una deriva leve, aunque `desde` = `hasta`.
- UNA sola luz motivada: `SolDePersiana` (sombras reales de los listones y una ventana que
  limita el parche de rayas) + un rebote muy suave. No agregues luces de estudio.
- Neblina (`niebla`), `HacesDeLuz`, `Polvo`, bloom cálido (halation), grano y viñeta.
- Tone mapping ACES (`THREE.ACESFilmicToneMapping`).
- Movimientos con easing suave: `Easing.bezier(0.2, 0.8, 0.2, 1)`.
- Escala en metros: la mesa está en y = 0 y la pared en z = -0.62. El parche de sol cae en la
  pared hacia x ≈ 0, y ≈ 0.65 (`SOL_POR_DEFECTO`).

Bloques del estilo (`import { ... } from "../kit"`):

| Bloque | Para qué |
|---|---|
| `EscenaCine` | Lienzo del estilo: sombras, ACES, neblina, DOF (`BokehPass`), bloom, grano. Prop `modo`: `"final"` o `"wire"` (maqueta de líneas blancas sobre fondo claro). |
| `PantallaPartida` | La misma escena mitad wireframe y mitad terminada; `corte` 0→1 la barre (transición wireframe → render). Dibuja dos lienzos solo mientras hace falta. |
| `CamaraCine` | `desde`/`hasta`, `mira`/`miraHasta`, `mm`, `deriva`. |
| `Pieza` | Cualquier objeto: en `final` es un mesh con sombras; en `wire` su contorno (`EdgesGeometry` con líneas gruesas). Usa `caja()`, `cilindro()`, `geo()` para no recrear geometrías. |
| `Texto3D` | Letras gruesas extruidas con bisel que reciben luz y sombra (fuente `inter-black.typeface.json`, con acentos). |
| `EtiquetaCodigo` | Etiqueta monoespaciada pegada a un objeto con una línea fina: `car.drift({ angle: 32 })`. |
| `SolDePersiana`, `HacesDeLuz`, `Polvo` | La luz del atardecer por la persiana, los haces en la neblina y las motas de polvo. |
| `Habitacion`, `CRT` (con terminal que escribe sola), `Teclado`, `Taza`, `Planta`, `Hoja`, `LenteCamara`, `AutoRally` | Decorado low-poly listo. |
| `bezier()`, `CurvaVisible` | Curva bezier visible para explicar movimiento; `curva.getPointAt(t)` y `getTangentAt(t)` para mover objetos por ella. |
| `TituloMono`, `EtiquetaPasada`, `ContadorFrames` | HUD 2D: título de concepto en mono naranja, "FRAME 0001 · PASS: WIRE" y contador de fotogramas. |

En `reel.json` usa `"subtitulos": "cine"` (más pequeños y discretos) o `"ninguno"`. Cada
componente de escena recibe también `desde` (fotograma donde empieza) para el contador.

Para texto 3D con otra fuente: `python3 scripts/fuente_a_typeface.py fuente.otf salida.json`
(necesita `pip install fonttools`).

Límites honestos del estilo: es low-poly (cajas y cilindros con buen material y luz), no
fotorrealista; el desenfoque es un efecto de posproceso (BokehPass), no un trazado de rayos,
y en la nube renderiza a ~4-8 s por segundo de video (más durante la pantalla partida).

## Paso 4: probar rápido antes del render completo

```bash
cd ~/reels-3d
python3 <skill>/scripts/hacer_reel.py reels/<id> --proyecto proyecto --voces voces --solo-datos
cd proyecto && npx tsc && node vistazo.mjs ../reels/<id>/vistazo
```

`--solo-datos` genera la voz, mide su duración con ffprobe, calcula escenas y palabras en
fotogramas y escribe `datos.json`, sin renderizar. `vistazo.mjs` saca un fotograma por escena
(~25 s). Míralos con Read, corrige y repite. Es mucho más barato que renderizar todo.
Para fotogramas concretos: `node vistazo.mjs salida 120 450 900`.

## Paso 5: render completo

```bash
python3 <skill>/scripts/hacer_reel.py reels/<id> --proyecto proyecto --voces voces
```

Hace todo: voz (con caché: si no cambias el texto no la regenera), sincronía, música, render
con Remotion, volumen a -14 LUFS (el estándar de Instagram/TikTok), `portada.jpg`,
`texto-del-post.txt` y `revision/hoja.jpg`. En la nube con 4 CPU y GL por software tarda
bastante (unos 10-20 min para 50 s); en una Mac con GPU es mucho más rápido. Lánzalo en
segundo plano y avisa a Emilio.

Cómo se sincroniza: cada escena dura lo que dura su voz (medida con ffprobe) + una pausa.
Las palabras de los subtítulos se reparten por sílabas dentro de cada frase, y las frases se
encajan en los tramos de voz que detecta `silencedetect` de ffmpeg. Con Piper queda bien
(±0.1 s); con ElevenLabs los tiempos son exactos porque la API los devuelve.

## Paso 6: revisar antes de entregar (obligatorio)

1. Mira `revision/hoja.jpg` (2 fotogramas por escena) y abre sueltos los que dudes.
2. Revisa: textos cortados o tapados, subtítulos encima de etiquetas, cosas fuera de cuadro,
   escenas vacías o demasiado oscuras, el gancho se entiende en el primer segundo.
3. Comprueba duración y audio: `ffprobe reel.mp4` y que haya voz desde el principio.
4. Si algo falla, corrige `escena.tsx` y vuelve al paso 4 (la voz ya está en caché).

## Paso 7: entregar

- Manda `reel.mp4` y `portada.jpg` con `SendUserFile` y pega el texto del post en el chat
  listo para copiar.
- Dile en 2-3 líneas qué se ve bien y qué es mejorable (honesto).
- Recuérdale: subirlo él desde la app de Instagram, elegir la portada, y que el audio original
  es libre (voz y sonidos generados).
- Guarda los reels buenos en el repo solo si Emilio lo pide (el mp4 pesa); el `reel.json` y
  `escena.tsx` sí conviene guardarlos para reutilizar escenas.

## Calidad realista (dilo si pregunta)

- El kit da un 3D limpio tipo "explainer" (formas simples, luz de estudio, bloom, partículas).
  Se ve profesional para divulgación, pero no es cine ni modelos realistas: no hay modelos
  3D descargados (personas, animales, máquinas detalladas). Para eso habría que importar
  modelos `.glb` con licencia clara (ej. de Poly Pizza o Sketchfab CC0) y cargarlos con
  `GLTFLoader` de three; hazlo solo si el tema lo necesita y revisa la licencia.
- Piper suena claro pero algo robótico frente a ElevenLabs. Para reels serios de marca, vale
  la pena ElevenLabs.
- El render por software en la nube es lento; en local con GPU, usa `--gl=angle` o quita la
  opción para que Chrome use la GPU.

## Problemas comunes

| Síntoma | Causa y arreglo |
|---|---|
| `Could not download Chrome Headless Shell` | No hay red a remotion.media. El script usa `/opt/pw-browsers/chromium_headless_shell`; en otra máquina exporta `REMOTION_CHROME=/ruta/al/chrome`. |
| Fondo negro en vez del degradado | El fondo debe ir por `Escena3D` (`FondoGL`), no con CSS detrás del lienzo: el bloom lo tapa. |
| Texto 3D borroso o quemado | Usa `Etiqueta3D` (capa de texto sin bloom), no un `mesh` con textura. |
| Algo se mueve "un fotograma tarde" o salta | Lo actualizaste en un `useEffect`. Usa props calculadas en el render o `useFrame` (como `Particulas`). |
| Subtítulos desfasados | Revisa la puntuación del guion; frases sin signos se reparten a ojo. O usa ElevenLabs. |
| `Falta el visual "x"` en rojo | El `visual` del reel.json no existe en el objeto exportado por `escena.tsx`. |
