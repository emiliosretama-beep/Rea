---
name: "videos-verticales-ia"
description: "Crear videos verticales 9:16 para Instagram Reels, TikTok y YouTube Shorts: guiones, prompts para video con IA y videos hechos con código (Remotion). Úsala cuando Emilio pida un reel, short, TikTok o video para redes."
---

# Videos verticales con IA (Reels, TikTok, Shorts)

Emilio trabaja desde iPhone/iPad y publica juegos como ERAGames. Responde en español, corto y claro. Esta skill junta dos fuentes, reescritas y adaptadas a su caso:
- Guía de video de coreyhaines31/marketingskills (semáforo verde, 3 auditorías pasadas).
- Buenas prácticas oficiales de Remotion (remotion-dev/skills, semáforo verde con Agent Trust Hub en SAFE).
Ambas fueron revisadas antes de usarlas: sin comandos curl|sh, sin pedir credenciales ni enviar datos ocultos.

## Paso 0: elegir el camino

Pregunta una sola cosa si no está claro: ¿qué muestra el video? Luego elige:

| Camino | Para qué | Herramientas |
|---|---|---|
| Código (Remotion) | Texto animado, subtítulos, tráiler de un juego con capturas, plantillas que se repiten | Remotion (React), se renderiza a MP4 |
| Generación con IA | Escenas que no se pueden filmar, B-roll, tomas llamativas de 3 a 10 s | Veo, Runway, Kling, Seedance, Pika |
| Avatar con IA | Presentador hablando sin filmarse | HeyGen, Synthesia |
| Recorte de video largo | Sacar clips de un video que ya existe | Descript, Opus Clip, CapCut |

Regla práctica: lo que lleva texto legible, logo o UI va por código; lo que es ambiente o escena imaginada va por IA. Los modelos de video fallan escribiendo texto, así que el texto siempre se agrega después.

Para mostrar un juego de ERAGames lo mejor suele ser grabar la pantalla del juego y ponerle encima título, subtítulos y llamado a la acción por código, con una o dos tomas de IA solo de gancho.

## Formato vertical

- Proporción 9:16, resolución 1080x1920. Reels, TikTok y Shorts usan el mismo archivo.
- Duración: Shorts hasta 60 s; para empezar apunta a 15 a 30 s.
- Los primeros 2 segundos son el gancho: algo se mueve o se promete algo ya.
- Deja margen arriba y abajo: la interfaz de cada app tapa los bordes, así que el texto importante va en el centro.
- Siempre subtítulos: mucha gente ve sin sonido.
- Un solo mensaje por video. Mejor tres videos cortos que uno largo.

## Estructura del guion (15 a 30 s)

1. Gancho (0-2 s): la imagen o frase más fuerte.
2. Desarrollo (3-20 s): 2 o 3 momentos rápidos, cambio cada 2 a 4 segundos.
3. Cierre (últimos 3 s): llamado claro ("juégalo gratis en itch.io").
Escribe el guion como tabla: tiempo, imagen, texto en pantalla, sonido.

## Camino A: video con IA generativa

Elección rápida de modelo (los precios y límites cambian, verifícalos antes):
- Mejor calidad y audio sincronizado: Veo.
- Control de cámara y consistencia entre cuadros: Runway.
- Barato y para volumen o borradores: Kling o Seedance.
- Personajes que se parezcan entre tomas: Hailuo/MiniMax.
- Efectos rápidos desde una imagen: Pika.
- Gratis pero necesita GPU propia: Hunyuan Video o Wan 2 (no es práctico en iPhone).

Fórmula del prompt: sujeto + acción + cámara + estilo + luz o ambiente + formato. Ejemplo para un gancho de rally:
"Un auto de rally derrapando en una curva de tierra al atardecer, polvo naranja, cámara baja siguiéndolo, estilo cinematográfico, luz dorada, vertical 9:16".

Vocabulario de cámara que entienden los modelos: estática, paneo, tilt, dolly in/out, órbita, seguimiento, aérea, cámara en mano, zoom.

Reglas:
- Una toma, una idea, por cada generación. Los modelos fallan en historias con varios cortes.
- Prompts de 50 a 100 palabras. Más largos pierden foco.
- Nunca pidas texto ni logos dentro de la toma.
- No sirve para lugares reales reconocibles ni para tu producto exacto: para eso usa capturas reales.
- Siempre indica el formato vertical en el prompt o en los ajustes.

Flujo recomendado:
1. Busca un video de referencia y descríbelo (sujeto, acción, cámara, estilo).
2. Genera 3 o 4 variantes de la misma idea.
3. Afina la mejor.
4. Mezcla las tomas de IA con texto, subtítulos y música por código o en CapCut.
Ahorro: prueba borradores con el modelo más barato y usa el caro solo para la versión final; si ya tienes una imagen, el modo imagen-a-video gasta menos créditos y sale más fiel.

Aviso: estos servicios mandan tus prompts e imágenes a empresas externas y casi todos son de pago o piden clave de API. Dile a Emilio el costo antes de usarlos y no pidas ni guardes claves en archivos del proyecto.

## Camino B: video con código (Remotion)

Remotion convierte componentes de React en un MP4. Requiere Node, así que corre en Claude Code o en un entorno con terminal, no solo en el teléfono. Si Emilio no tiene dónde ejecutarlo, dilo desde el principio y propón el Camino A o CapCut.

Arranque (solo si no existe un proyecto):
```
npx create-video@latest --yes --blank --no-tailwind mi-video
```
Si la carpeta ya tiene cosas importantes (.git, .env), crea una subcarpeta en vez de usar la carpeta actual. Abre la vista previa (Remotion Studio) antes de editar y manténla abierta para que Emilio vea los cambios.

Reglas técnicas que evitan que el video salga roto:
- Toda animación se calcula con el número de cuadro (useCurrentFrame) e interpolate. Las transiciones o animaciones CSS y las clases de animación de Tailwind NO se renderizan bien.
- Los tiempos en segundos se convierten con fps de useVideoConfig, por ejemplo `from={2 * fps}`. Así no se rompe si cambia el fps.
- Mantén useCurrentFrame en el componente más pequeño que lo necesite.
- Deja el interpolate dentro del style del elemento para poder editarlo en Studio. Usa scale, translate y rotate en vez de transform.
- Configura la composición en 1080 de ancho por 1920 de alto, 30 fps.
- Para varias escenas usa Sequence con duraciones claras; las transiciones entre escenas son cortas (unos 12 a 15 cuadros).
- El texto en vertical va grande (se lee en un celular): tamaños altos y buen contraste.
- Si Emilio edita código por su cuenta, no sobrescribas cambios que no hiciste: pregunta.
- Subtítulos: genera el texto con tiempos y píntalo palabra por palabra; es lo que más retiene en Shorts y TikTok.
- Para música o voz, importa el audio y controla el volumen por cuadro; verifica que la música tenga licencia para usarse.
- Revisa la licencia de Remotion en remotion.dev si algún día cobra por videos a clientes.

Plantilla útil: crea una composición con props (título, 3 frases, imagen del juego) y renderiza varias versiones cambiando solo los datos. Sirve para sacar un video por cada juego de ERAGames.

## Copiar el estilo de un video que le gusta

Si Emilio ve un video viral y quiere algo parecido, describe su estilo en una tabla por momento (ritmo de cortes, subtítulos, zooms, texto en pantalla, sonido) y aplica solo esa estructura a su propio material. Nunca copies el video, el guion ni la música de otra persona. Muéstrale la tabla antes de producir.

## Antes de entregar

- ¿Es 9:16 y se ve bien en el centro de la pantalla?
- ¿Hay subtítulos y se leen?
- ¿El gancho aparece en los primeros 2 s?
- ¿Hay texto o logo generado por IA dentro de una toma? Quítalo y ponlo por código.
- ¿Dura lo que debe? Recorta lo sobrante.
- Explica qué falta probar en su teléfono: exporta, mira el video en el iPhone con el volumen apagado y confirma que se entiende.

## Qué decirle a Emilio al terminar

Resume en 2 líneas qué camino usaste y por qué, el costo si hubo herramientas de pago, y la siguiente prueba concreta (por ejemplo, subir el video como borrador a TikTok y revisar cómo se ve).