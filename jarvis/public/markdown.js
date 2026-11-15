// Markdown mínimo y seguro para las respuestas de Jarvis.
// Todo el texto del modelo se escapa y solo se generan etiquetas de una lista
// fija, así que nada de lo que escriba puede colarse como HTML ejecutable.
// Tolera texto a medias (un bloque de código sin cerrar) porque se llama en
// cada trozo del streaming.

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// Marcas privadas para apartar código y enlaces mientras se aplican negritas.
const HOLD_OPEN = "\uE000";
const HOLD_CLOSE = "\uE001";
const HOLD = /\uE000(\d+)\uE001/g;
const RESERVED = /[\uE000\uE001]/g;

const INLINE_TOKEN =
  /`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'`]+)/g;

function anchor(url, labelHtml) {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${labelHtml}</a>`;
}

// Recibe texto ya escapado.
function emphasis(text) {
  return text
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, "$1<em>$2</em>")
    .replace(
      /(^|[^\w_])__(?=\S)([\s\S]*?\S)__(?![\w_])/g,
      "$1<strong>$2</strong>",
    )
    .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?![\w_])/g, "$1<em>$2</em>")
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
}

function renderInline(raw) {
  const held = [];
  const hold = (html) => `${HOLD_OPEN}${held.push(html) - 1}${HOLD_CLOSE}`;
  const marked = raw.replace(INLINE_TOKEN, (match, ...groups) => {
    const [code, label, href, bare] = groups;
    if (code !== undefined) return hold(`<code>${escapeHtml(code)}</code>`);
    if (href !== undefined)
      return hold(anchor(href, emphasis(escapeHtml(label))));
    const url = bare.replace(/[.,;:!?)\]]+$/, "");
    return hold(anchor(url, escapeHtml(url))) + bare.slice(url.length);
  });
  return emphasis(escapeHtml(marked)).replace(
    HOLD,
    (_, index) => held[Number(index)],
  );
}

const FENCE_OPEN = /^\s*(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function isTableStart(lines, i) {
  return (
    lines[i].includes("|") &&
    i + 1 < lines.length &&
    lines[i + 1].includes("-") &&
    TABLE_DIVIDER.test(lines[i + 1])
  );
}

function startsBlock(lines, i) {
  const line = lines[i];
  return (
    FENCE_OPEN.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    LIST_ITEM.test(line) ||
    isTableStart(lines, i)
  );
}

function codeBlock(lang, code) {
  const label = lang ? escapeHtml(lang) : "código";
  return (
    `<div class="code"><div class="code-head"><span>${label}</span>` +
    `<button type="button" class="code-copy" data-copy>Copiar</button></div>` +
    `<pre><code>${escapeHtml(code)}</code></pre></div>`
  );
}

// Devuelve [html, índiceSiguiente]. Sin cierre, el bloque llega hasta el final.
function readFence(lines, start) {
  const [, marker, lang] = lines[start].match(FENCE_OPEN);
  const close = new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`);
  const indent = lines[start].match(/^\s*/)[0].length;
  const code = [];
  let i = start + 1;
  while (i < lines.length && !close.test(lines[i])) {
    const line = lines[i];
    const lead = line.match(/^\s*/)[0].length;
    code.push(line.slice(Math.min(indent, lead)));
    i++;
  }
  return [codeBlock(lang, code.join("\n")), Math.min(i + 1, lines.length)];
}

// Parte una fila de tabla por "|" y respeta los "\|" escapados. Sin
// "lookbehind" en la expresión regular: en Safari antiguo rompe toda la página.
function splitRow(line) {
  const text = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cell = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && text[i + 1] === "|") {
      cell += "|";
      i++;
    } else if (text[i] === "|") {
      cells.push(cell.trim());
      cell = "";
    } else cell += text[i];
  }
  cells.push(cell.trim());
  return cells;
}

function readTable(lines, start) {
  const head = splitRow(lines[start]);
  const rows = [];
  let i = start + 2;
  while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
    rows.push(splitRow(lines[i]));
    i++;
  }
  const cells = (row, tag) =>
    `<tr>${row.map((cell) => `<${tag}>${renderInline(cell)}</${tag}>`).join("")}</tr>`;
  const html =
    `<div class="table-wrap"><table><thead>${cells(head, "th")}</thead>` +
    `<tbody>${rows.map((row) => cells(row, "td")).join("")}</tbody></table></div>`;
  return [html, i];
}

function readQuote(lines, start) {
  const inner = [];
  let i = start;
  while (i < lines.length && QUOTE.test(lines[i])) {
    inner.push(lines[i].replace(QUOTE, ""));
    i++;
  }
  return [`<blockquote>${renderBlocks(inner)}</blockquote>`, i];
}

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

// Junta las líneas de un elemento de lista: su primera línea y lo que venga
// más sangrado (párrafos, sublistas, bloques de código).
function readListItem(lines, start, baseIndent) {
  const [whole, , , content] = lines[start].match(LIST_ITEM);
  const contentIndent = whole.length - content.length;
  const body = [content];
  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      const next = lines.slice(i + 1).find((later) => later.trim());
      if (next === undefined || indentOf(next) < baseIndent + 2) break;
      body.push("");
      i++;
      continue;
    }
    const indent = indentOf(line);
    const lazy =
      indent <= baseIndent + 1 && body.at(-1) !== "" && !startsBlock(lines, i);
    if (indent < baseIndent + 2 && !lazy) break;
    body.push(line.slice(Math.min(indent, contentIndent)));
    i++;
  }
  return [body, i];
}

function readList(lines, start) {
  const [, lead, marker] = lines[start].match(LIST_ITEM);
  const baseIndent = lead.length;
  const ordered = /\d/.test(marker);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const item = lines[i].match(LIST_ITEM);
    if (!item || Math.abs(item[1].length - baseIndent) > 1) break;
    if (/\d/.test(item[2]) !== ordered) break;
    const [body, next] = readListItem(lines, i, baseIndent);
    // Un elemento de un solo párrafo va sin <p> para que la lista quede compacta.
    items.push(renderBlocks(body).replace(/^<p>([\s\S]*?)<\/p>/, "$1"));
    i = next;
    while (i < lines.length && !lines[i].trim()) i++;
  }
  const first = Number.parseInt(marker, 10);
  const open = ordered
    ? first > 1
      ? `<ol start="${first}">`
      : "<ol>"
    : "<ul>";
  const html = `${open}${items.map((item) => `<li>${item}</li>`).join("")}</${ordered ? "ol" : "ul"}>`;
  return [html, i];
}

function readParagraph(lines, start) {
  const text = [lines[start].trim()];
  let i = start + 1;
  while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
    text.push(lines[i].trim());
    i++;
  }
  return [`<p>${text.map(renderInline).join("<br>")}</p>`, i];
}

function readBlock(lines, i) {
  const line = lines[i];
  if (FENCE_OPEN.test(line)) return readFence(lines, i);
  const heading = line.match(HEADING);
  if (heading) {
    const tag = heading[1].length <= 2 ? "h3" : "h4";
    return [`<${tag}>${renderInline(heading[2])}</${tag}>`, i + 1];
  }
  if (RULE.test(line)) return ["<hr>", i + 1];
  if (QUOTE.test(line)) return readQuote(lines, i);
  if (isTableStart(lines, i)) return readTable(lines, i);
  if (LIST_ITEM.test(line)) return readList(lines, i);
  return readParagraph(lines, i);
}

function renderBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    const [html, next] = readBlock(lines, i);
    out.push(html);
    i = Math.max(next, i + 1);
  }
  return out.join("");
}

export function renderMarkdown(source) {
  const lines = String(source ?? "")
    .replace(RESERVED, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  return renderBlocks(lines);
}
