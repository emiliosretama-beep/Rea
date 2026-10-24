// Modo demo: genera webs a partir de plantillas locales cuando no hay API key.
// No es IA: detecta palabras clave del prompt para elegir tema, nombre y colores.
// Devuelve el mismo formato que el modelo (explicación + bloque ```html).

const THEMES = [
  {
    match: /restaurante|comida|cocina|taquer|pizz|sushi|bar\b/i,
    kind: "restaurante",
    name: "La Mesa",
    tagline: "Cocina de temporada, hecha con calma.",
    accent: "#e2572b",
    seed: "food",
    sections: [
      [
        "Menú del día",
        "Platos frescos que cambian cada semana según el mercado.",
      ],
      ["Reservas", "Aparta tu mesa en segundos y te confirmamos por mensaje."],
      [
        "Eventos privados",
        "Celebra cumpleaños y cenas de empresa en nuestro salón.",
      ],
    ],
    cta: "Reservar mesa",
  },
  {
    match: /caf[eé]|cafeter|panader|reposter/i,
    kind: "cafetería",
    name: "Grano & Horno",
    tagline: "Café de especialidad y pan recién salido del horno.",
    accent: "#a0663a",
    seed: "coffee",
    sections: [
      ["Café de origen", "Granos seleccionados de pequeños productores."],
      ["Pan artesanal", "Masa madre con 24 horas de fermentación."],
      ["Para llevar", "Pide desde tu móvil y recoge sin hacer fila."],
    ],
    cta: "Ver la carta",
  },
  {
    match: /gimnasio|gym|fitness|entrena|crossfit|yoga/i,
    kind: "gimnasio",
    name: "Pulso Gym",
    tagline: "Entrena con propósito. Resultados que se notan.",
    accent: "#16a34a",
    seed: "gym",
    sections: [
      ["Clases grupales", "HIIT, spinning y funcional todos los días."],
      [
        "Entrenador personal",
        "Un plan hecho a tu medida y seguimiento semanal.",
      ],
      ["Abierto 24/7", "Entra cuando quieras con tu acceso digital."],
    ],
    cta: "Prueba gratis 7 días",
  },
  {
    match: /videojuego|juego|game|gamer|indie/i,
    kind: "videojuego",
    name: "Nova Rift",
    tagline: "Un mundo abierto que reacciona a cada decisión.",
    accent: "#8b5cf6",
    seed: "galaxy",
    sections: [
      ["Explora", "Biomas generados a mano con secretos en cada rincón."],
      ["Combate", "Sistema de habilidades combinables y jefes únicos."],
      ["Cooperativo", "Juega con hasta 4 amigos en línea."],
    ],
    cta: "Únete a la beta",
  },
  {
    match:
      /portafolio|portfolio|personal|curr[ií]culum|freelance|dise[ñn]ador/i,
    kind: "portafolio",
    name: "Estudio Propio",
    tagline: "Diseño y desarrollo de productos digitales.",
    accent: "#0ea5e9",
    seed: "studio",
    sections: [
      [
        "Proyectos",
        "Una selección de trabajos recientes para marcas y startups.",
      ],
      ["Servicios", "Branding, sitios web y prototipos interactivos."],
      ["Contacto", "Cuéntame tu idea y te respondo en menos de 24 horas."],
    ],
    cta: "Hablemos",
  },
  {
    match: /tienda|ecommerce|venta|ropa|producto|shop/i,
    kind: "tienda",
    name: "Bazar Norte",
    tagline: "Productos bien hechos, a precio justo.",
    accent: "#db2777",
    seed: "shop",
    sections: [
      ["Novedades", "Nuevos productos cada semana, en cantidades limitadas."],
      ["Envío rápido", "Recíbelo en 24-48 horas en toda la ciudad."],
      [
        "Devoluciones fáciles",
        "30 días para cambiar de opinión, sin preguntas.",
      ],
    ],
    cta: "Comprar ahora",
  },
];

const FALLBACK = {
  kind: "negocio",
  name: "Tu Marca",
  tagline: "Una web clara para contar lo que haces.",
  accent: "#f04e23",
  seed: "city",
  sections: [
    [
      "Qué hacemos",
      "Explica en una frase el valor que ofreces a tus clientes.",
    ],
    ["Cómo funciona", "Tres pasos simples para empezar a trabajar juntos."],
    ["Opiniones", "Lo que dicen las personas que ya confiaron en nosotros."],
  ],
  cta: "Empezar",
};

const COLORS = {
  azul: "#2563eb",
  rojo: "#dc2626",
  verde: "#16a34a",
  morado: "#7c3aed",
  violeta: "#7c3aed",
  naranja: "#ea580c",
  rosa: "#db2777",
  amarillo: "#ca8a04",
  negro: "#111827",
  dorado: "#b8860b",
};

function escapeHtml(s) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

function pickName(prompt, fallback) {
  const quoted = prompt.match(/["“«']([^"”»']{2,40})["”»']/);
  if (quoted) return quoted[1].trim();
  const called = prompt.match(
    /(?:llamad[oa]|se llama|nombre)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&]*){0,3})/,
  );
  return called ? called[1].trim() : fallback;
}

function pickColor(prompt) {
  const lower = prompt.toLowerCase();
  for (const [word, hex] of Object.entries(COLORS))
    if (lower.includes(word)) return hex;
  return null;
}

// Ilustración SVG abstracta y determinista (sin imágenes externas: funciona
// sin conexión y dentro de la vista previa aislada).
function art(seed, accent, w, h) {
  let x = 0;
  for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296;
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const r = (0.18 + rnd() * 0.3) * Math.min(w, h);
    const op = (0.25 + rnd() * 0.5).toFixed(2);
    const fill = i % 2 ? "#ffffff" : accent;
    return `<circle cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * h).toFixed(0)}" r="${r.toFixed(0)}" fill="${fill}" opacity="${op}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#1b1b24"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${shapes}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Texto alternativo a partir del nombre del archivo: "born-to-rally_01.png" -> "born to rally 01".
function altFromName(name) {
  return (
    name
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Imagen"
  );
}

// Galería con las imágenes del usuario; estilos propios para que funcione
// también dentro de páginas hechas por la IA, que no tienen .grid ni .card.
function gallery(images, id = "galeria") {
  const items = images
    .map(
      (img) =>
        `<img src="rea-asset:${img.id}" alt="${escapeHtml(altFromName(img.name))}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px" />`,
    )
    .join("\n        ");
  return `
    <section id="${id}" style="padding:56px 0">
      <h2>Galería</h2>
      <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
        ${items}
      </div>
    </section>`;
}

function page({ name, tagline, accent, seed, sections, cta, dark, images }) {
  // La primera imagen del usuario va en la portada y las siguientes en las tarjetas.
  const imageSrc = (i, fallback) =>
    images[i] ? `rea-asset:${images[i].id}` : fallback;
  const bg = dark ? "#0d0f14" : "#fbfaf8";
  const fg = dark ? "#f2f2f5" : "#16171d";
  const muted = dark ? "#a3a6b3" : "#5d6070";
  const card = dark ? "#171a22" : "#ffffff";
  const n = escapeHtml(name);
  const cards = sections
    .map(
      ([t, d], i) => `
      <article class="card">
        <img src="${imageSrc(i + 1, art(seed + i, accent, 640, 420))}" alt="${escapeHtml(images[i + 1] ? altFromName(images[i + 1].name) : t)}" loading="lazy" />
        <h3>${escapeHtml(t)}</h3>
        <p>${escapeHtml(d)}</p>
      </article>`,
    )
    .join("");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${n} — ${escapeHtml(tagline)}</title>
  <meta name="description" content="${escapeHtml(tagline)}" />
  <meta property="og:title" content="${n}" />
  <meta property="og:description" content="${escapeHtml(tagline)}" />
  <meta property="og:type" content="website" />
  <link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${accent}"/><text x="32" y="44" font-family="system-ui" font-size="34" font-weight="800" text-anchor="middle" fill="#fff">${escapeHtml(name.trim().charAt(0).toUpperCase() || "W")}</text></svg>`)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: ${bg};
      --fg: ${fg};
      --muted: ${muted};
      --card: ${card};
      --accent: ${accent};
      --radius: 18px;
    }
    * { box-sizing: border-box; margin: 0; }
    body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.6; }
    a { color: inherit; }
    .wrap { width: min(1100px, 100% - 32px); margin-inline: auto; }
    header { position: sticky; top: 0; backdrop-filter: blur(10px); background: color-mix(in srgb, var(--bg) 82%, transparent); z-index: 10; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; }
    .logo { font-weight: 800; font-size: 1.2rem; text-decoration: none; }
    .logo span { color: var(--accent); }
    .links { display: flex; gap: 22px; list-style: none; padding: 0; }
    .links a { text-decoration: none; color: var(--muted); font-weight: 600; }
    .btn { display: inline-block; background: var(--accent); color: #fff; padding: 12px 22px; border-radius: 999px; font-weight: 700; text-decoration: none; border: 0; cursor: pointer; transition: transform .15s; }
    .btn:hover { transform: translateY(-2px); }
    .hero { padding: 88px 0 64px; display: grid; gap: 40px; grid-template-columns: 1.1fr 1fr; align-items: center; }
    .hero h1 { font-size: clamp(2.3rem, 6vw, 4rem); line-height: 1.05; letter-spacing: -0.03em; }
    .hero p { color: var(--muted); font-size: 1.15rem; margin: 18px 0 28px; }
    .hero img { width: 100%; border-radius: calc(var(--radius) * 1.4); aspect-ratio: 4/3; object-fit: cover; }
    section { padding: 56px 0; }
    h2 { font-size: clamp(1.7rem, 4vw, 2.4rem); letter-spacing: -0.02em; margin-bottom: 28px; }
    .grid { display: grid; gap: 22px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .card { background: var(--card); border-radius: var(--radius); padding: 14px 14px 22px; box-shadow: 0 1px 2px rgb(0 0 0 / .06), 0 10px 30px -18px rgb(0 0 0 / .3); }
    .card img { width: 100%; border-radius: 12px; aspect-ratio: 16/10; object-fit: cover; margin-bottom: 14px; }
    .card h3 { margin-bottom: 6px; }
    .card p { color: var(--muted); }
    .cta { background: var(--accent); color: #fff; border-radius: calc(var(--radius) * 1.4); padding: 48px 32px; text-align: center; }
    .cta p { opacity: .9; margin: 10px 0 24px; }
    .cta .privacy { font-size: .85rem; margin: 16px 0 0; opacity: .85; }
    .cta .btn { background: #fff; color: var(--accent); }
    form { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    input { padding: 12px 16px; border-radius: 999px; border: 0; min-width: 240px; font: inherit; }
    footer { padding: 36px 0; color: var(--muted); text-align: center; font-size: .9rem; }
    @media (max-width: 760px) {
      .hero { grid-template-columns: 1fr; padding-top: 48px; }
      .links { display: none; }
    }
  </style>
</head>
<body>
  <header id="inicio">
    <nav class="wrap">
      <a class="logo" href="#inicio">${n}<span>.</span></a>
      <ul class="links">
        <li><a href="#servicios">Servicios</a></li>
        <li><a href="#contacto">Contacto</a></li>
      </ul>
      <a class="btn" href="#contacto">${escapeHtml(cta)}</a>
    </nav>
  </header>
  <main class="wrap">
    <section class="hero">
      <div>
        <h1>${escapeHtml(tagline)}</h1>
        <p>${n} es el lugar para quienes buscan calidad sin complicaciones. Conoce lo que ofrecemos y da el primer paso hoy.</p>
        <a class="btn" href="#contacto">${escapeHtml(cta)}</a>
      </div>
      <img src="${imageSrc(0, art(seed + "hero", accent, 900, 680))}" alt="${images[0] ? escapeHtml(altFromName(images[0].name)) : `Imagen principal de ${n}`}" />
    </section>
    <section id="servicios">
      <h2>Lo que ofrecemos</h2>
      <div class="grid">${cards}
      </div>
    </section>
    <section id="contacto">
      <div class="cta">
        <h2>¿Listo para empezar?</h2>
        <p>Déjanos tu correo y te escribimos con todos los detalles.</p>
        <form onsubmit="event.preventDefault(); this.innerHTML = '<p>¡Gracias! Te escribiremos pronto.</p>';">
          <label for="email" hidden>Correo electrónico</label>
          <input id="email" type="email" placeholder="tu@correo.com" required />
          <button class="btn" type="submit">${escapeHtml(cta)}</button>
        </form>
        <p class="privacy">Usaremos tu correo solo para responderte. Consulta nuestro <a href="#contacto">[Aviso de privacidad]</a>.</p>
      </div>
    </section>
${images.length > sections.length + 1 ? gallery(images.slice(sections.length + 1)) : ""}
  </main>
  <footer>© ${new Date().getFullYear()} ${n}. Hecho con ERA Studio.</footer>
</body>
</html>`;
}

function editExisting(prompt, html, images) {
  let out = html;
  const changes = [];
  if (images.length) {
    let id = "galeria";
    for (let n = 2; out.includes(`id="${id}"`); n++) id = `galeria-${n}`;
    const section = gallery(images, id);
    out = /<\/main>/i.test(out)
      ? out.replace(/<\/main>/i, `${section}\n  </main>`)
      : out.replace(/<\/body>/i, `${section}\n</body>`);
    changes.push(
      images.length === 1
        ? "agregué tu imagen en una galería"
        : `agregué tus ${images.length} imágenes en una galería`,
    );
  }
  const color = pickColor(prompt);
  if (color) {
    out = out.replace(/--accent:\s*[^;]+;/, `--accent: ${color};`);
    changes.push("cambié el color principal");
  }
  if (/oscur|dark|noche|negro/i.test(prompt)) {
    out = out
      .replace(/--bg:\s*[^;]+;/, "--bg: #0d0f14;")
      .replace(/--fg:\s*[^;]+;/, "--fg: #f2f2f5;")
      .replace(/--muted:\s*[^;]+;/, "--muted: #a3a6b3;")
      .replace(/--card:\s*[^;]+;/, "--card: #171a22;");
    changes.push("activé el tema oscuro");
  } else if (/clar|light|blanco/i.test(prompt)) {
    out = out
      .replace(/--bg:\s*[^;]+;/, "--bg: #fbfaf8;")
      .replace(/--fg:\s*[^;]+;/, "--fg: #16171d;")
      .replace(/--muted:\s*[^;]+;/, "--muted: #5d6070;")
      .replace(/--card:\s*[^;]+;/, "--card: #ffffff;");
    changes.push("activé el tema claro");
  }
  if (/redond/i.test(prompt)) {
    out = out.replace(/--radius:\s*[^;]+;/, "--radius: 28px;");
    changes.push("hice las esquinas más redondeadas");
  }
  if (/cuadrad|recto|sin redond/i.test(prompt)) {
    out = out.replace(/--radius:\s*[^;]+;/, "--radius: 4px;");
    changes.push("hice las esquinas más rectas");
  }
  if (!changes.length) {
    return `En modo demo solo puedo cambiar colores (azul, rojo, verde…), tema claro/oscuro y esquinas. Para cambios libres como "${prompt}", añade tu ANTHROPIC_API_KEY en el archivo .env.\n\n\`\`\`html\n${html}\n\`\`\``;
  }
  return `Listo (modo demo): ${changes.join(", ")}.\n\n\`\`\`html\n${out}\n\`\`\``;
}

export function buildDemoSite(prompt, currentHtml, images = []) {
  if (currentHtml) return editExisting(prompt, currentHtml, images);
  const theme = THEMES.find((t) => t.match.test(prompt)) || FALLBACK;
  const name = pickName(prompt, theme.name);
  const accent = pickColor(prompt) || theme.accent;
  const dark = /oscur|dark|noche/i.test(prompt);
  const html = page({ ...theme, name, accent, dark, images });
  return `Creé una web de ${theme.kind} para "${name}" (modo demo, sin IA). Pide cambios en el chat o añade tu API key para resultados a medida.\n\n\`\`\`html\n${html}\n\`\`\``;
}
