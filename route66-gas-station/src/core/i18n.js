import { STRINGS } from '../data/strings.js';

const KEY = 'route66:lang';
let lang = 'es';
const listeners = [];

export function initI18n() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* sin almacenamiento */ }
  if (saved && STRINGS[saved]) lang = saved;
  else lang = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  applyDom();
}

// t('promptCharge', { m: '$3.10' }) reemplaza {m} en el texto
export function t(key, params) {
  let s = STRINGS[lang][key] ?? STRINGS.es[key] ?? key;
  if (params) for (const k in params) s = s.replace(`{${k}}`, params[k]);
  return s;
}

export function getLang() { return lang; }

export function setLang(next) {
  if (!STRINGS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, lang); } catch { /* sin almacenamiento */ }
  applyDom();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) { listeners.push(fn); }

// Rellena los elementos marcados con data-i18n / data-i18n-aria
export function applyDom() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
