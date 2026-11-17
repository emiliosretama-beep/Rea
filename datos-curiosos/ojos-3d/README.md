# Operación de ojos con láser (3D)

Video vertical 3D (1080x1920, 30 fps, 30 s) hecho con la skill **`zach-d-films`**
(`artemnovitckii/claude-animation-skills`, licencia MIT, ver
`LICENSE-motor-zach-d-films.txt`). El motor es three.js: todo se modela en código,
sin imágenes ni video externos. "Estilo Zack D. Films" se refiere solo al formato
(gancho, creencia, giro "Pero", pasos y cierre); no usa nada de ese canal.

## Guion (verificado)

1. Si te operas los ojos con láser, esto le pasa a tu ojo.
2. Mucha gente cree que el láser lo quema.
3. Pero ese láser es frío: deshace el tejido sin calentarlo.
4. Primero, unas gotas duermen el ojo y un aparato lo deja abierto.
5. Otro láser corta una tapa finísima en la córnea y el doctor la levanta.
6. El láser frío le da nueva forma a la córnea. Si mueves el ojo, te sigue.
7. La tapa vuelve a su lugar y sirve como su propia venda. ¿Te operarías?

Fuentes: FDA (qué esperar en LASIK), MedlinePlus, All About Vision (láser excimer
de 193 nm, "frío", fotoablación sin daño térmico; seguimiento del ojo) y Eye Clinic
London. No se afirma "sin puntos" ni "olor a quemado" porque no se encontró en una
fuente confiable. Es información general, no consejo médico.

## Cómo se hizo

- **Voz**: M5 de Supertonic-3 en VoiceStudio (OpenRAIL-M), 29,1 s a x1.11, con
  `../scripts/generar-voz.mjs --guion=ojos-3d/script.json --id=Ojos --audio=ojos-3d/audio --json=ojos-3d/audio --duracion=33 --objetivo=29`.
  Tiempos reales por palabra con Whisper small (87/87 palabras alineadas).
- **Subtítulos**: `captions.py audio/vo.words.json` (con palabras cortas en español)
  y ajuste a mano para dejar siempre 1 a 3 palabras. Contorno oscuro para que se
  lean sobre el blanco del ojo.
- **Tomas** (`src/shots.js`): 13 tomas cortadas en los tiempos de la voz. Props
  nuevos en `src/props.js`: ojo gigante (esclerótica, iris, córnea, tapa con
  bisagra, lecho que se remodela, párpados), gotero, separador, espátula, equipo
  de láser y camilla.

## Render

```
ln -s <kit>/node_modules node_modules   # three.js + fuente del kit de la skill
GL=swiftshader node render.mjs stills 3.2,16.5 stills   # sin GPU (CPU)
GL=swiftshader node render.mjs video silent.mp4 30
ffmpeg -i silent.mp4 -i audio/vo.wav -map 0:v -map 1:a -vf scale=1080:1920:flags=lanczos \
  -c:v libx264 -crf 17 -pix_fmt yuv420p -af "apad,loudnorm=I=-14:TP=-1.5" -c:a aac -b:a 192k -shortest Ojos.mp4
```

En CPU tarda ~2 s por cuadro (unos 30 min). Con GPU, mucho menos (sin `GL=swiftshader`).

Al publicar, activa la etiqueta de contenido generado con IA (lo pide la licencia
de la voz).
