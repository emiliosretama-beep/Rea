# Emprende City

Juego de navegador de ERAGames: eres una persona emprendedora en una ciudad viva de mundo abierto. Empiezas con $800, abres un puesto de limonada y lo atiendes tú mismo, contratas empleados y gerentes, y creces hasta tener hoteles y startups.

Hay dos versiones con la misma simulación y el mismo guardado:

- **`3d.html`** (DEV): ciudad en 3D con Three.js r149, cargado desde jsDelivr, así que necesita internet. Cámara en tercera persona que gira de 90° en 90° y tiene zoom, sombras, edificios combinados por manzana y peatones, autos, árboles y pájaros con instancias. Los textos van en una capa 2D encima. Si los primeros 5 segundos van a menos de 40 FPS, apaga las sombras sola (Ajustes › Gráficos).
- **`index.html`** (estable): la versión 2D vista desde arriba, con Canvas 2D y sin librerías. Queda como respaldo.

## Cómo se juega

- **Moverte**: desliza en la mitad izquierda de la pantalla (joystick) o usa WASD o las flechas. En 3D, "arriba" es hacia donde mira la cámara.
- **Interiores (3D)**: camina hacia la puerta de un negocio (tuyo o de la competencia) o toca **Entrar** (F). La cámara pasa a una vista casi desde arriba, sin techo, y ves el mostrador, a tus empleados, la fila, los clientes sentados y los muebles de cada tipo de negocio. Estar adentro cuenta como atender. Sales caminando por la puerta o con **Salir**.
- **Tu departamento (3D)**: el edificio con 🏠 junto a donde empiezas (punto azul en el mapa; Móvil › 🏠 Ir a casa). Adentro, de 8 p.m. a 5 a.m., toca **😴 Dormir** para despertar a las 7:00. Mientras duermes la economía sigue: tus negocios venden, se cobran los sueldos a medianoche y salen las noticias de la mañana.
- **Cámara (3D)**: ⟲ ⟳ la giran 90° (o Q/R) y la lupa cambia el zoom (o Z). Si la puerta de tu negocio queda de espaldas, el edificio se vuelve transparente para que veas la fila.
- **Comprar**: acércate a un terreno con el letrero verde **Se vende** y toca **Comprar**. Cada negocio funciona distinto en cada distrito (puntos de encaje).
- **Atender**: sin empleados, tu negocio solo vende cuando estás ahí. Los clientes hacen fila y tú los atiendes con el botón verde (o Espacio). Si esperan demasiado se van y baja tu reputación.
- **Cobrar**: la caja se cobra sola cuando pasas por la puerta. Si se llena, el negocio deja de vender; un gerente la cobra por ti.
- **Móvil** (P): tus negocios, metas, banco (préstamos), vehículos y ajustes.
- **Mapa** (M): toca un punto para marcar un destino con flecha.

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
- Solo en español (es un juego personal): los textos están en las tablas `I18N`, `NAMES`, `CHAT`, `EVENTS` y `GOALS`.
