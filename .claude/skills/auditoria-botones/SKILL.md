---
name: auditoria-botones
description: Auditoría de recorrido de clics - sigue cada botón, toque o control de punta a punta para encontrar los que "no hacen nada", se deshacen solos o dejan la app en un estado roto. Úsala cuando Emilio diga "este botón no hace nada", "a veces funciona y a veces no", "en el iPhone no responde", "se queda trabado", después de un refactor que toque el estado compartido (el objeto `state` de ERA Studio, el estado de un juego, menús, pausa) y antes de publicar una versión. Complementa a debug-sistematico, no la sustituye.
---

# Auditoría de botones (recorrido de clics)

Basada en la skill `click-path-audit` de ECC (affaan-m/ECC, licencia MIT),
adaptada a los proyectos de Emilio: JavaScript puro, juegos de navegador y
ERA Studio, usados sobre todo en iPhone y iPad.

Encuentra los bugs que leer el código no muestra: cada función funciona sola,
pero juntas se anulan, llegan en mal orden o dejan la pantalla en un estado que
no coincide con lo que promete el botón.

## Cuándo usarla y cuándo no

Úsala cuando:
- un botón "no hace nada", aunque tiene su listener y no hay errores en consola;
- algo funciona con ratón pero no con el dedo, o al revés;
- después de tocar `state`, `save()`, `render()` o la máquina de estados de un juego
  (menú, jugando, pausa, game over);
- antes de publicar, sobre los flujos críticos.

No la uses para errores de consola, crasheos o lag: eso va con
`debug-sistematico`. Tampoco para cosas solo visuales: eso va con `pulido-interfaz`.

## Paso 1: mapa del estado

Antes de auditar un solo botón, apunta cada función que escribe estado
compartido y lo que **resetea de paso**:

```
ESTADO: state (rea-lovable/public/app.js)
  selectProject(id)  → escribe {currentId, currentVersion}  RESETEA {selección, modo edición?}
  save()             → escribe localStorage['rea-studio:projects']
  render()           → reconstruye el DOM (¿borra listeners o el foco del input?)

ESTADO: juego
  setScene('menu')   → escribe {scene}  RESETEA {paused, score?, input}
  resetLevel()       → RESETEA {player, timers, ¿listeners duplicados?}

RESETS PELIGROSOS (funciones que limpian estado que no es suyo):
  ...
```

Este mapa es la clave: casi todos los bugs de "no hace nada" están en un reset
escondido.

## Paso 2: auditar cada control

Para cada botón, toque, gesto, tecla o formulario de la zona:

```
CONTROL: [texto del botón] en [archivo:línea]
  EVENTO: click / pointerdown / touchstart / keydown / submit
  HANDLER:
    1. funcionA() → escribe {x: true}
    2. funcionB() → RESETEA {x: false}   ← CONFLICTO
  ESPERADO: lo que promete el botón
  REAL: lo que pasa en realidad
  VEREDICTO: OK / BUG
```

### Patrones que hay que revisar

1. **Se deshace solo.** Una llamada posterior resetea lo que hizo la anterior.
   Ejemplo: `state.editing = true; selectProject(id)`, y `selectProject` pone
   `editing = false`.
2. **Carrera asíncrona.** Dos `fetch`, `await`, `setTimeout` o lecturas de
   IndexedDB que terminan en distinto orden. El estado final depende de cuál
   llega primero. Revisa sobre todo `backend.js`, `assets.js` y las cargas de niveles.
3. **El render borra lo que acabas de hacer.** `render()` reemplaza
   `innerHTML` y se lleva el listener, el foco, la selección o el scroll que la
   acción acababa de poner.
4. **Transición que falta.** El botón dice "Guardar" pero nunca llama a
   `save()`. Dice "Publicar" pero solo cambia una variable.
5. **Camino muerto.** Un `if (cond)` cuya condición nunca se cumple en ese momento.
6. **Listener duplicado o perdido.** Se agrega un `addEventListener` en cada
   `render()` o en cada reinicio de nivel, y el botón dispara 2, 3, N veces (la
   pausa se activa y se desactiva en el mismo toque). O el listener estaba en
   un nodo que `render()` ya reemplazó.
7. **Táctil en iOS** (siempre, porque Emilio prueba en iPhone y iPad):
   - `touchstart` + `click` disparan **los dos**, así que la acción se ejecuta dos veces.
     Usa `pointerdown`/`pointerup`, o `preventDefault()` en el touch.
   - Un listener `passive: true` no puede llamar a `preventDefault()`, así que la
     página hace scroll o zoom en lugar de saltar o disparar.
   - Un elemento encima (un overlay invisible, un `::before` o el canvas) se
     come el toque. Revisa con `document.elementFromPoint(x, y)`.
   - Hay controles de menos de 44×44 px, o pegados al borde, en la zona de los
     gestos de iOS.
   - `:hover` se queda "pegado" después de tocar.
   - El juego no se pausa con `visibilitychange` al cambiar de app, y regresa
     con un `deltaTime` gigante.
8. **Teclado y foco.** El botón funciona con el dedo pero no con Enter o
   Espacio. La tecla de pausa también dispara la acción del botón que tiene el foco.

## Paso 3: reporte

Para cada bug:

```
BOTON-001 [CRÍTICO / ALTO / MEDIO / BAJO]
  Control: [texto] en [archivo:línea]
  Patrón: [uno de los 8 de arriba]
  Recorrido:
    1. [llamada] → escribe {campo: valor}
    2. [llamada] → RESETEA {campo: valor}  ← CONFLICTO
  Esperado: ...
  Real: ...
  Arreglo: [cambio mínimo y concreto]
  Cómo probarlo: [pasos en iPhone/iPad y a 360 px]
```

Si un hallazgo no se puede confirmar leyendo el código, márcalo como
**sospecha** y dale a Emilio los pasos para reproducirlo. No lo presentes
como bug confirmado.

## Alcance

La auditoría es cara. Elige el tamaño:
- **Un botón o una pantalla:** cuando Emilio reporta un bug concreto.
- **Un módulo de estado:** después de cambiar una función que escribe `state`;
  audita a todos los que la llaman.
- **App o juego completo:** antes de una versión estable. Primero el mapa del
  Paso 1, y después pantalla por pantalla.

## Después

- Arregla con cambios mínimos. No reescribas el sistema (reglas de Emilio).
- Si el proyecto tiene pruebas con Playwright, agrega una por cada bug
  encontrado, que toque el botón y revise el estado final.
- En modo profesor: explícale a Emilio el patrón del bug con sus palabras, para
  que aprenda a verlo él solo la próxima vez.
