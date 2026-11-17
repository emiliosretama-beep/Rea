# Datos curiosos (videos verticales con Remotion)

Tres videos de 1080x1920, 30 fps y 20 s, hechos con **una sola plantilla**
(`src/plantilla/DatoCurioso.tsx`) que recibe los datos por props:

| Composición | Tema | Paleta |
|---|---|---|
| `Pulpo` | 3 corazones y sangre azul | azul oscuro |
| `Saltar` | 8 mil millones saltando a la vez | naranja y morado |
| `Boligrafo` | el agujero de la tapa | verde y amarillo |

Los textos, duraciones y colores están en `src/datos.ts`. Para un video nuevo
copia un bloque, cambia el texto y la paleta, y elige los dibujos con `tema`.

## Comandos

```
npm install
npm run dev              # Remotion Studio (vista previa)
npm run render:pulpo     # out/Pulpo.mp4
npm run render:saltar    # out/Saltar.mp4
npm run render:boligrafo # out/Boligrafo.mp4
```

## Cómo está hecho

- Todo se anima con `useCurrentFrame` + `interpolate` (nada de transiciones CSS).
- Cada 2 s la cámara corta a otro encuadre con un golpe de zoom (`Camara.tsx`).
- Subtítulos grandes, centrados, palabra por palabra, con contorno oscuro;
  la palabra que se dice va en color. Están entre y=1120 y y=1450, lejos de
  la barra de arriba y de la descripción y botones de TikTok/Reels.
- El tamaño de letra se calcula con los anchos reales de Montserrat Black
  para que ninguna línea pase de 840 px.
- Fondo y dibujos hechos solo con formas (SVG); sin imágenes externas.
- Los dibujos cambian justo cuando aparece la palabra clave (por ejemplo,
  el "Fe" se tacha cuando se lee "hierro").

## Voz

Narración en español generada con [VoiceStudio](https://github.com/debpalash/VoiceStudio)
(backend local, solo CPU) usando el motor **Supertonic-3** y su voz incluida
**M5** (masculina, no es la voz clonada de ninguna persona). Velocidad entre
x1.08 y x1.24 para que cada narración dure unos 18 s. Volumen normalizado a
-14 LUFS.

`npm run voz` (con el backend de VoiceStudio corriendo en `127.0.0.1:3900`):

1. Genera la voz a partir del texto de cada escena; los números se dicen en
   palabras ("3" -> "tres", "#2" -> "número dos").
2. La transcribe con Whisper small (`Systran/faster-whisper-small`, MIT) para
   sacar el tiempo real de cada palabra y la alinea con el guion.
3. Si Whisper marca una palabra dentro de una pausa, la mueve al final de la pausa.
4. Guarda `public/voz/<id>.wav` y `src/voz/<id>.json` (tiempos por palabra y
   duración de cada escena según la voz).

`npm run voz -- --reusar-voz` vuelve a medir los tiempos sin generar voz nueva.

Las escenas duran lo que dura su frase en la voz (no 2/6/7/5 s fijos): decir el
gancho de forma clara toma unos 3,4 s, y forzarlo a 2 s no se entendía.

### Licencias de la voz

- Supertonic-3: **OpenRAIL-M**, permite uso comercial y monetizar. Su
  restricción (e) obliga a **avisar claramente que el contenido está hecho con
  IA**: por eso el video lleva "VOZ CREADA CON IA" y al publicar hay que
  activar la etiqueta de contenido generado con IA de cada red.
- Whisper small: MIT (solo se usa para medir tiempos; no va en el video).
- VoiceStudio: AGPL-3.0 (es la herramienta; no cambia la licencia del audio).
- OmniVoice, el motor por defecto de VoiceStudio, es CC-BY-NC (no comercial):
  **no se usó**.

## Datos verificados

- Pulpo: 3 corazones (2 branquiales y 1 sistémico), sangre azul por la
  hemocianina (cobre). El corazón principal deja de latir mientras nada a
  chorro; por eso nadar lo cansa y prefiere arrastrarse.
  [Live Science](https://www.livescience.com/how-many-hearts-does-an-octopus-have).
  Matiz: el paro es durante el impulso, no un apagado largo
  ([ScienceBlog](https://scienceblog.com/t-octopus-three-hearts-jet-swimming-systemic-heart-stops/)).
- Saltar: la Tierra (6x10^24 kg) pesa unas 10 billones (10^13) de veces más
  que toda la humanidad (~5x10^11 kg); se movería menos que el ancho de un
  átomo. [Live Science](https://www.livescience.com/33383-everyone-on-earth-jumping-at-once.html),
  [Mental Floss](https://www.mentalfloss.com/science/physics/what-would-happen-if-everyone-jumped-once).
  El guion original decía "millones de veces"; se corrigió a "billones".
- Bolígrafo: el agujero de la **tapa** cumple la norma ISO 11540 (pasar al
  menos 8 L/min de aire si se traga). El agujerito del **tubo** es otro:
  iguala la presión para que la tinta fluya y no se salga.
  [Mental Floss](https://www.mentalfloss.com/article/545682/surprising-reason-why-pen-caps-have-tiny-holes-top),
  [Make Tech Easier (cita a Snopes y BIC)](https://maketecheasier.com/bic-cristal-cap-hole-iso-11540/).

## Licencias

- Fuente Montserrat: SIL Open Font License (`public/fonts/LICENSE-Montserrat-OFL.txt`).
- Remotion: gratis para personas y empresas de hasta 3 empleados; revisa
  <https://www.remotion.dev/docs/license> si algún día haces videos para clientes con una empresa más grande.
