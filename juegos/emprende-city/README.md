# Tycoon City 3D (antes Emprende City)

Juego de navegador de ERAGames, en español e inglés: eres una persona emprendedora en una ciudad viva de mundo abierto. Empiezas con $800, abres un puesto de limonada y lo atiendes tú mismo, contratas empleados y gerentes, y creces hasta tener hoteles y startups.

Hay dos versiones con la misma simulación y el mismo guardado:

- **`3d.html`** (DEV): ciudad en 3D con Three.js r149, cargado desde jsDelivr, así que necesita internet. Cámara en tercera persona que gira de 90° en 90° y tiene zoom, sombras, edificios combinados por manzana y peatones, autos, árboles y pájaros con instancias. Los textos van en una capa 2D encima. Si los primeros 5 segundos van a menos de 40 FPS, apaga las sombras sola (Ajustes › Gráficos).
- **`index.html`** (estable): la versión 2D vista desde arriba, con Canvas 2D y sin librerías. Queda como respaldo.

## Cómo se juega

- **Moverte**: desliza en la mitad izquierda de la pantalla (joystick) o usa WASD o las flechas. En 3D, "arriba" es hacia donde mira la cámara.
- **Interiores (3D)**: camina hacia la puerta de un negocio (tuyo o de la competencia) o toca **Entrar** (F). Pasas a un local **más grande por dentro**: de 7 a 13 tiles según el tipo, y crece con cada mejora. Tiene paredes altas con ventanas, mostrador, bodega, pasillo para la fila y mobiliario que llena el espacio (mesas, pasillos, máquinas, butacas, escritorios…). Estar adentro cuenta como atender. Sales caminando por la puerta o con **Salir**.
- **Ciudad (3D)**: 8×8 manzanas con 7 distritos, incluidos la **Ciudad Universitaria** y el **Puerto**. Tiene Universidad con torre del reloj, Hospital, Estadio, Puerto con grúas y barcos, parque con lago, y en la playa un muelle con rueda de la fortuna y un faro. En la calle hay paradas de autobús, hidrantes, botes de basura, espectaculares y camiones de reparto. Las partidas de la ciudad anterior se migran solas.
- **Tu departamento (3D)**: el edificio con 🏠 junto a donde empiezas (punto azul en el mapa; Móvil › 🏠 Ir a casa). Adentro, de 8 p.m. a 5 a.m., toca **😴 Dormir** para despertar a las 7:00. Mientras duermes la economía sigue: tus negocios venden, se cobran los sueldos a medianoche y salen las noticias de la mañana.
- **Antro (3D)**: negocio de noche (10 p.m. a 4 a.m.), el mejor en la Playa y el Centro. Afuera tiene neones, fila y cadenero; adentro, pista de colores que late con la música, bola disco, zona VIP y gente bailando. En Gestionar eliges DJ local (+30 % de demanda) o famoso (+65 %).
- **Encargos (3D)**: gente con **!** te pide favores. Pueden ser entregas contra reloj o clientes VIP que te siguen hasta tu negocio (+5 de reputación). Pagan más mientras más grande es tu imperio, y varios seguidos dan bono de racha (hasta +50 %).
- **Ladrones (3D)**: a veces, sobre todo de noche, asaltan la caja de un negocio **sin gerente** cerca de ti. Si alcanzas al ladrón recuperas el dinero más una recompensa; si se escapa (45 s o muy lejos), lo pierdes.
- **Tu casa (3D)**: cada nivel está en un barrio distinto: Departamento en el Residencial (junto al inicio), Loft en el Distrito Tech ($25k), Casa con alberca en el Residencial sur ($120k) y Mansión frente al mar ($600k). Las que aún no tienes se ven con un letrero de "En venta"; al comprar te mudas y te marca la ruta. Cada nivel cambia el edificio y el interior, y al despertar te da más ventas hasta las 7 p.m. (+5, +10, +15 o +25 %).
- **La ciudad crece (3D)**: cada mañana la competencia puede abrir un local en un terreno en venta o ampliarse. Siempre quedan al menos 30 terrenos libres.
- **Música (3D)**: generada en vivo, tranquila de día y lo-fi de noche. Se apaga en Ajustes.
- **Bolsa (3D)**: en Móvil › Bolsa operas 8 empresas de la ciudad y la cripto EmprendeCoin. Las acciones abren de lunes a viernes de 9:00 a 17:00 y la cripto 24/7. Las noticias de la mañana mueven sectores, y si pasan con el mercado cerrado hay salto al abrir. Hay dividendos diarios, comisión de 0.25 % y una gráfica de 2 días que se puede tocar. El portafolio cuenta en el patrimonio.
- **Isla Coral (3D)**: se llega en ferry ($15) desde el muelle de la playa. Tiene 12 manzanas peatonales con 40 terrenos, palmeras, sombrillas y un parque de diversiones (montaña rusa, carrusel y torre de caída). Hay negocios nuevos: Mariscos, Escuela de Buceo y Resort.
- **Cámara (3D)**: ⟲ ⟳ la giran 90° (o Q/R) y la lupa cambia el zoom (o Z). Si la puerta de tu negocio queda de espaldas, el edificio se vuelve transparente para que veas la fila.
- **Comprar**: acércate a un terreno con el letrero verde **Se vende** y toca **Comprar**. Cada negocio funciona distinto en cada distrito (puntos de encaje).
- **Atender**: sin empleados, tu negocio solo vende cuando estás ahí. Los clientes hacen fila y tú los atiendes con el botón verde (o Espacio). Si esperan demasiado se van y baja tu reputación.
- **Cobrar**: la caja se cobra sola cuando pasas por la puerta. Si se llena, el negocio deja de vender; un gerente la cobra por ti.
- **Móvil** (P): tus negocios, metas, banco (préstamos), vehículos y ajustes.
- **Mapa** (M): toca un punto para marcar un destino con flecha.
- **Pausa y guía (3D)**: Ⅱ (o Esc) pausa el reloj y te deja guardar a mano; **? Guía** (o H) explica los primeros pasos y tiene **Buscar un local asequible**, que te marca el terreno más cercano que puedes pagar. La guía sale al empezar una partida, y si ya tenías una te pregunta antes de reemplazarla. Bajo la meta, una barra muestra cuántas metas llevas.

## Qué hace que la ciudad se sienta viva

- 5 distritos (Residencial, Centro, Tech, Industrial y Playa), cada uno con su estilo de edificios.
- Peatones con rutinas que entran a las tiendas, hacen fila, hablan, usan paraguas y pasean perros.
- Tráfico con taxis y autobuses que gira en las intersecciones y frena por ti.
- Ciclo de día y noche con faroles, ventanas iluminadas y faros de los autos.
- Clima (sol, nubes y lluvia) que cambia la demanda.
- Noticias diarias que mueven la economía (ola de calor, festival en la playa, final de fútbol…).
- Competencia que puedes comprar, palomas que vuelan cuando te acercas, barcos, fuente, humo de fábricas.

## Datos técnicos

- Simulación con paso fijo de 1/30 s. Un segundo real equivale a 2 minutos de juego, así que un día dura 12 minutos.
- Peatones y autos solo existen alrededor de la cámara, así que el costo no crece con el tamaño del mapa.
- Guardado en `localStorage` (`emprende-city:save:v1`, con versión) cada 20 s y al salir; si no se puede guardar, el juego sigue funcionando.
- **Entrada (3D)**: al abrir el juego sale la intro animada de ERA Games (la de Emilio, en SVG, justo después de `<body>`): dura unos 2.6 s, espera a que cargue el juego (máximo 8 s) y se salta tocando o con una tecla. No se repite al cambiar de idioma.
- **Idiomas (3D)**: español e inglés. El idioma se elige en la pantalla de inicio, en la pausa o en Ajustes, y se guarda aparte (`emprende-city:lang`); la primera vez se toma el del teléfono. Cambiarlo guarda la partida y recarga, porque los letreros 3D se dibujan al cargar. Los textos están en las tablas `I18N`, `NAMES`, `CHAT`, `EVENTS` y `GOALS`, y los sueltos en `L('español', 'english')`. La 2D (`index.html`) sigue solo en español.
- La carpeta y la clave de guardado siguen llamándose `emprende-city` para no perder partidas.

## Versión para itch.io

- `itch/build.py` arma `itch/tycoon-city-3d-itch-vX.zip` a partir de `3d.html`: `python3 itch/build.py 1.1`.
- El zip trae `index.html` en la raíz, Three.js r149 y las fuentes en local (`itch/vendor/`, con sus licencias MIT y OFL), así que no necesita internet.
- `itch/pagina/` tiene la portada y las capturas en inglés (`en/`) y en español (`es/`), y el texto y los ajustes de la página (`pagina-itch.md`).
- Cada zip se queda en el repo como respaldo: v1.0 (Emprende City, solo español), v1.1 (Tycoon City 3D, español e inglés) v1.2 (primera entrada de ERAGames) y v1.3 (intro oficial de ERA Games).
