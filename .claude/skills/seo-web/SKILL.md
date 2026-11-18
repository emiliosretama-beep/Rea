---
name: seo-web
description: Auditoría y mejoras de SEO para las webs de clientes de Emilio, las páginas que genera ERA Studio y las páginas de sus juegos (itch.io). Cubre SEO técnico, títulos y descripciones, encabezados, datos estructurados (JSON-LD), negocio local, velocidad (Core Web Vitals), robots, sitemap y vista previa al compartir en WhatsApp y redes. Úsala cuando Emilio pida "que salga en Google", "SEO", "que se vea bien al compartir el link", "metadatos", "schema", o al cerrar una web con web-pro-empresas antes de entregarla.
---

# SEO para webs de clientes

Basada en la skill `seo` de ECC (affaan-m/ECC, licencia MIT), adaptada a lo
que hace Emilio: webs de una o pocas páginas para negocios locales, hechas
casi siempre en HTML/CSS/JS sin framework, y entregadas a clientes.

Complementa a `web-pro-empresas`: esa skill diseña la web y esta la prepara
para que la encuentren. Úsala en su fase de checklist o de publicación.

## Principios

1. Primero lo técnico (que Google pueda leer la página) y después el contenido.
2. Cada página tiene una intención de búsqueda clara ("taquería en Monterrey
   centro", no "comida").
3. Nada de trucos: ni texto escondido, ni relleno de palabras clave, ni schema
   que no coincida con lo que se ve en la página.
4. Mobile-first: Google indexa la versión para celular.
5. Cada recomendación va atada a un archivo y a un cambio concreto.

## Checklist técnico

**Rastreo e indexación**
- `robots.txt` no bloquea páginas importantes. No hay `noindex` puesto por accidente.
- Hay `<link rel="canonical">` con la URL final (con o sin `www`, siempre igual).
- Hay `sitemap.xml` si hay más de una página. Para una landing de una sola
  página es opcional.
- `<html lang="es">` (o `es-MX`, según el cliente).
- Si el contenido importante solo aparece después de ejecutar JS, avísale a
  Emilio: es más difícil de indexar. Que el texto clave esté en el HTML.

**Velocidad (Core Web Vitals)**
- LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- Arreglos típicos: imagen hero en WebP/AVIF con `width`/`height`,
  `fetchpriority="high"` en la imagen principal y `loading="lazy"` en las
  demás, fuentes con `font-display: swap`, nada de librerías pesadas para un
  efecto pequeño.
- Mídelo con Lighthouse en modo móvil (Chromium ya viene instalado en las
  sesiones en la nube) y reporta los números reales, no estimaciones.

**Datos estructurados (JSON-LD)**
- Negocio local: `LocalBusiness` o el subtipo exacto (`Restaurant`,
  `Dentist`, `AutoRepair`, `BeautySalon`...) con nombre, dirección, teléfono,
  horario, `geo` y `url`. Los datos deben coincidir con su perfil de Google
  Business.
- Menú o servicios: `Menu` o `Service` solo si de verdad están en la página.
- `FAQPage` solo si hay una sección de preguntas visible.
- Juegos: `VideoGame` con nombre, descripción, `gamePlatform` ("Web browser")
  y captura.
- Valida en el Rich Results Test de Google antes de entregar.

## On-page

- **Título:** 50 a 60 caracteres, con lo principal al frente.
  Fórmula: `Qué es + dónde/diferencial | Marca`.
  Ejemplo: `Taquería al pastor en Monterrey Centro | Tacos Don Beto`.
- **Meta description:** 120 a 160 caracteres, honesta, con una llamada a la acción.
  Fórmula: `Acción + tema + propuesta de valor + un detalle`.
- **Un solo `<h1>`.** Los `<h2>` y `<h3>` siguen la estructura real. No uses
  encabezados solo para hacer texto grande.
- **Imágenes:** `alt` que describa la imagen ("Tacos al pastor con piña en
  plato de barro"), no "imagen1". Nombres de archivo descriptivos.
- **Enlaces internos** con texto descriptivo ("ver el menú completo", no "clic aquí").
- **NAP** (nombre, dirección y teléfono) idéntico en la web, el pie de página y
  Google Business. El teléfono debe ser un `<a href="tel:...">`.

## Vista previa al compartir (lo que más nota el cliente)

Los clientes comparten el link por WhatsApp e Instagram. Siempre incluye:

```html
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://.../og.jpg"> <!-- 1200×630, URL absoluta -->
<meta property="og:url" content="https://...">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png"> <!-- 180×180 -->
```

## Palabras clave (versión ligera para negocio local)

1. Define la intención: qué buscaría el cliente del negocio y dónde.
2. Junta de 5 a 10 variantes realistas ("dentista en San Pedro", "limpieza
   dental precio Monterrey"). Si tienes búsqueda web, revisa qué páginas
   salen hoy para esas búsquedas.
3. Asigna una búsqueda principal por página. No pongas a dos páginas a
   competir por lo mismo.
4. Úsala de forma natural en el título, el h1, el primer párrafo y un `alt`.

## Formato del reporte

```
[ALTO] Falta og:image: el link en WhatsApp sale sin imagen
Dónde: index.html <head>
Arreglo: agregar og:image de 1200×630 con URL absoluta
Cómo probarlo: pegar el link en un chat de WhatsApp contigo mismo
```

Ordena por impacto. Lo técnico que bloquea va primero.

## Fuera de lo que esta skill puede hacer

Sé honesto con Emilio y con el cliente: el SEO no da resultados inmediatos ni
garantiza el primer lugar. Para un negocio local, lo que más pesa suele ser el
perfil de Google Business (reseñas, fotos, horario), que no está en la web.
Recomiéndalo como parte de la entrega, porque es valor que puede cobrar.

## Modo profesor

Explica cada cambio en una línea ("el `og:image` es la foto que aparece al
compartir el link"), para que Emilio pueda explicárselo a su cliente.
