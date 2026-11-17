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

## Agregar la voz más adelante

La plantilla ya acepta dos props opcionales:

```ts
audio: 'voz/pulpo.wav',          // archivo dentro de public/
palabras: [{ texto: 'Este', inicio: 0.12, fin: 0.31 }, ...] // tiempos reales
```

Con `palabras`, los subtítulos y los dibujos se sincronizan con la voz real
en lugar del tiempo del guion. Los tiempos se pueden sacar con un modelo de
transcripción con marcas por palabra (por ejemplo Whisper).

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
