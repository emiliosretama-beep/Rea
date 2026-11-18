---
name: pulido-interfaz
description: Pase de pulido fino para que una interfaz se sienta profesional - radios concéntricos, alineación óptica, sombras y bordes, texto que no se corta feo, números que no brincan, animaciones de entrada, salida y presión, transiciones específicas y áreas táctiles de 44 px. Úsala cuando Emilio diga que algo "se ve genérico", "se siente plano", "le falta algo", "se ve amateur", "brinca", al revisar el HUD o el menú de un juego, la interfaz de ERA Studio, o como último paso de web-pro-empresas antes de entregar.
---

# Pulido de interfaz

Basada en la skill `make-interfaces-feel-better` de ECC (affaan-m/ECC,
licencia MIT), adaptada a Emilio: webs de clientes, ERA Studio (naranja ERA
`#f04e23` y azul noche) y menús y HUD de juegos de navegador, probados en
iPhone y iPad.

**Relación con `web-pro-empresas`:** esa skill decide la identidad, la
estructura y el diseño completo. Esta llega al final y pule los detalles. No
cambia la paleta, la tipografía ni la marca que ya se decidieron.

## Principios

### Radios concéntricos
En superficies redondeadas anidadas: `radio exterior = radio interior + padding`.
Si el padding es grande, trátalas como superficies separadas. Lo que importa es
que se vea coherente, no la fórmula exacta.

### Alineación óptica
El centro geométrico no siempre se ve centrado. El triángulo de "play", las
flechas y las estrellas necesitan moverse 1 o 2 px. Si se puede, corrige el SVG;
si no, ajusta el padding.

### Sombras y bordes
- Borde para separar y para el foco. Sombra en capas para dar profundidad
  (tarjetas, botones, popovers).
- Sombras transparentes y suaves que funcionen en modo claro y oscuro. En
  oscuro, a veces es mejor un borde sutil que una sombra.

### Texto
- `text-wrap: balance` en títulos y textos cortos. `text-wrap: pretty` en
  párrafos cortos, descripciones y listas. Ninguno de los dos en textos largos
  ni en código.
- `font-variant-numeric: tabular-nums` en **todo número que cambia**:
  puntuación, tiempo, vidas, velocímetro, precios y contadores. Así el HUD no
  "baila" con cada dígito.
- `-webkit-font-smoothing: antialiased` en la raíz si el proyecto no lo tiene.

### Imágenes
Contorno interior neutro para que no se fundan con el fondo:
```css
img { outline: 1px solid rgb(0 0 0 / .1); outline-offset: -1px; }
@media (prefers-color-scheme: dark) { img { outline-color: rgb(255 255 255 / .1); } }
```
Siempre negro o blanco con transparencia, nunca del color de la marca.

### Movimiento
- Para cambios de estado interactivos usa transiciones CSS, porque se pueden
  revertir a medio camino. Guarda los `@keyframes` para entradas únicas y
  para las cargas.
- **Entrada:** opacidad + `translateY` pequeño (4 a 8 px), y opcionalmente blur.
- **Salida:** más corta y discreta que la entrada (unos 150 ms).
- **Presión:** `scale(.96)` en `:active`. En táctil es la respuesta que el dedo
  necesita. iOS no siempre aplica `:active`: agrega
  `ontouchstart` vacío en `body` o usa una clase con `pointerdown`.
- **Cambio de icono:** fundido con opacidad, escala y blur, no un cambio de golpe.
- Respeta `prefers-reduced-motion: reduce`: quita los desplazamientos y deja
  solo los fundidos.
- **En juegos:** el menú y el HUD pueden animarse con CSS, pero nunca
  animes propiedades que causen layout (`top`, `width`) encima del canvas
  mientras se juega. Solo `transform` y `opacity`.

### Transiciones específicas
Nunca `transition: all`. Declara las propiedades:
```css
.btn {
  transition-property: transform, background-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
```
`will-change` solo para corregir un tirón en el primer frame, y solo con
`transform`, `opacity` o `filter`. Nunca `will-change: all`.

### Áreas táctiles (prioridad alta para Emilio)
- Mínimo 44×44 px en todo control. Si el icono es más chico, agranda el área
  con un pseudo-elemento, sin que se encime con otro control.
- Separa los controles al menos 8 px.
- Respeta `env(safe-area-inset-*)` en iPhone: nada pegado al notch ni a la
  barra de inicio. Esto aplica también a los botones táctiles de los juegos.
- `touch-action: manipulation` en los botones, para quitar el retraso del doble toque.
- Cuida que `:hover` no se quede pegado en táctil: ponlo dentro de `@media (hover: hover)`.

### Estados
Cada control tiene todos sus estados: normal, hover (solo con puntero),
`:active`, `:focus-visible` (anillo visible y con buen contraste),
deshabilitado y cargando. Las listas y los paneles tienen estado vacío
("Aún no tienes proyectos. Crea el primero"), no un hueco en blanco.

## Formato del reporte

Solo lo que cambiaste, en filas de antes y después:

| Principio | Antes | Después | Archivo |
| --- | --- | --- | --- |
| Números tabulares | El marcador brinca al cambiar de dígito | `tabular-nums` en `.score` | styles.css |
| Área táctil | Botón de pausa de 28 px | 44 px con `::before` | hud.css |
| Transición | `transition: all .3s` | Propiedades explícitas, 150 ms | styles.css |

## Checklist

- [ ] Radios anidados coherentes
- [ ] Iconos ópticamente centrados
- [ ] Bordes y sombras usados con intención, y bien en claro y en oscuro
- [ ] Títulos sin cortes feos y números que cambian con `tabular-nums`
- [ ] Imágenes con contorno neutro donde haga falta
- [ ] Entradas y salidas sutiles, con `prefers-reduced-motion` respetado
- [ ] Respuesta de presión en botones, que también funciona en iOS
- [ ] Sin `transition: all` ni `will-change: all`
- [ ] Controles de 44 px o más, con safe areas respetadas, y probados a 360 px
- [ ] Todos los estados: hover, active, focus, deshabilitado, cargando y vacío

## Comprobar

Toma capturas antes y después a 360 px (iPhone) y en tamaño iPad con
Playwright, y enséñaselas a Emilio. No digas que "se ve mejor" sin mostrarlo.
