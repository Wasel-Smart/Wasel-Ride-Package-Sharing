const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src';

// --- load translations for reverse map ---
let srcT = fs.readFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/src/locales/translations.ts', 'utf8');
srcT = srcT.replace(/export type Language[^;]*;/g, '');
srcT = srcT.replace(/export const translations: Record<Language, any> =/, 'var translations =');
const transFn = new Function('var module={exports:{}};' + srcT + '\nreturn translations;');
const translations = transFn();

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], key, out);
    else out[key] = obj[k];
  }
  return out;
}
const en = flatten(translations.en);
const enReverse = {}; // value -> [keys]
for (const k of Object.keys(en)) {
  const v = en[k];
  if (typeof v === 'string' && v.trim()) {
    (enReverse[v] ||= []).push(k);
  }
}

// --- scan ---
const VISIBLE_PROPS = new Set([
  'placeholder', 'title', 'alt', 'aria-label', 'aria-placeholder', 'aria-valuetext',
  'aria-roledescription',
]);
const IGNORE_PROPS = new Set([
  'className', 'class', 'id', 'style', 'data', 'data-testid', 'key', 'type',
  'role', 'viewBox', 'd', 'xmlns', 'width', 'height', 'fill', 'stroke', 'cx', 'cy', 'r',
  'x', 'y', 'href', 'src', 'rel', 'target', 'htmlFor', 'lang', 'dir', 'loading',
  'tabIndex', 'name', 'autoComplete', 'step', 'min', 'max', 'pattern',
  'colSpan', 'rowSpan', 'scope', 'method', 'action', 'encType', 'accept', 'multiple',
  'disabled', 'readOnly', 'required', 'checked', 'defaultValue', 'value', 'defaultChecked',
  'rev', 'ping', 'translate', 'spellCheck', 'contentEditable', 'draggable', 'hidden',
  'itemProp', 'itemScope', 'itemType', 'prefix', 'property', 'about', 'datatype',
  'inlist', 'vocab', 'typeof', 'for', 'httpEquiv', 'charSet', 'media', 'color',
  'crossOrigin', 'referrerPolicy', 'sizes', 'srcSet', 'useMap', 'wrap', 'cols', 'rows',
  'accessKey', 'inputMode', 'enterKeyHint', 'autoFocus', 'controls', 'loop', 'muted',
  'playsInline', 'poster', 'preload', 'capture', 'form', 'list', 'maxLength', 'minLength',
  'size', 'number', 'transition', 'transform', 'opacity', 'zIndex', 'placeholderText',
  // aria STATE attributes (not text)
  'aria-hidden', 'aria-live', 'aria-modal', 'aria-haspopup', 'aria-expanded',
  'aria-selected', 'aria-checked', 'aria-disabled', 'aria-pressed', 'aria-current',
  'aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns',
  'aria-activedescendant', 'aria-invalid', 'aria-busy', 'aria-atomic', 'aria-autocomplete',
  'aria-multiline', 'aria-multiselectable', 'aria-orientation', 'aria-readonly',
  'aria-required', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
  'aria-flowto', 'aria-keyshortcuts', 'aria-relevant', 'aria-dropeffect',
]);

const ALLOWED = new Set([
  'Wasel', 'WaselApp', 'WaselSupport', 'Google', 'Facebook', 'Apple', 'Stripe',
  'Visa', 'Mastercard', 'WhatsApp', 'Messenger', 'GPS', 'SMS', 'OTP', 'API', 'URL',
  'SSO', '2FA', 'PIN', 'ID', 'JOD', 'USD', 'EUR', 'IQD', 'GBP', 'JO', 'EN', 'AR',
  'OK', 'KM', 'MI', 'KG', 'LB', 'CO2', 'iOS', 'Android', 'App', 'Web', 'CRM',
  'PDF', 'CSV', 'JSON', 'XML', 'AI', 'UI', 'UX', 'JWT', 'RSC', 'VAT', 'IBAN',
  'KYC', 'PL', 'PR', 'PS', 'RTL', 'LTR', 'MFA',
]);
function isAllowed(s) {
  const tokens = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => ALLOWED.has(t));
}
function hasLatin(s) { return /[A-Za-z]/.test(s); }
function isPureEnglish(s) {
  // only latin letters, digits, common punctuation; no arabic
  return /^[A-Za-z0-9\s\.\,\!\?\'\’\"\-\:\(\)\/\%\&\+\=\[\]\*\#\@\~\;]+$/.test(s);
}
function containsArabic(s) { return /[؀-ۿܐ-ݿ]/.test(s); }

const results = [];
function walk(node, filePath) {
  if (!node) return;
  if (node.kind === ts.SyntaxKind.JsxText) {
    const text = node.text.replace(/\s+/g, ' ').trim();
    if (text && hasLatin(text) && !isAllowed(text) && !containsArabic(text) && isPureEnglish(text)) {
      results.push({ kind: 'jsx-text', file: filePath, text, start: node.getStart(), end: node.getEnd() });
    }
  } else if (node.kind === ts.SyntaxKind.JsxAttribute) {
    const name = node.name && node.name.text;
    if (!name) return;
    const isAria = name.startsWith('aria-');
    const visible = VISIBLE_PROPS.has(name) || (isAria && (name === 'aria-label' || name === 'aria-placeholder' || name === 'aria-valuetext' || name === 'aria-roledescription'));
    if (!visible || IGNORE_PROPS.has(name)) return;
    const init = node.initializer;
    if (init && init.kind === ts.SyntaxKind.StringLiteral) {
      const text = init.text;
      if (hasLatin(text) && !isAllowed(text) && !containsArabic(text) && isPureEnglish(text)) {
        results.push({ kind: 'attr:' + name, file: filePath, text, start: init.getStart(), end: init.getEnd() });
      }
    }
  }
  ts.forEachChild(node, (c) => walk(c, filePath));
}

function collectFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'locales' || e.name === 'node_modules') continue;
      out.push(...collectFiles(full));
    } else if (e.isFile() && /\.(tsx?)$/.test(e.name)) out.push(full);
  }
  return out;
}
const files = collectFiles(ROOT);
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  walk(sf, f);
}

// match
const matchable = [];
const unmatched = [];
const seen = new Set();
for (const r of results) {
  const key = r.file + '::' + r.text;
  if (seen.has(key)) continue;
  seen.add(key);
  const keys = enReverse[r.text];
  if (keys && keys.length) {
    matchable.push({ ...r, keys });
  } else {
    unmatched.push(r);
  }
}

console.log('Files scanned:', files.length);
console.log('Hardcoded pure-English UI strings:', results.length);
console.log('  Uniquely:', seen.size);
console.log('  Matchable to existing en key:', matchable.length);
console.log('  NOT matchable (need new keys):', unmatched.length);
console.log('\n=== UNMATCHED SAMPLES (need new keys) ===');
unmatched.slice(0, 80).forEach((r) => console.log(`${path.relative(ROOT, r.file)} [${r.kind}] => "${r.text}"`));

fs.writeFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/hardcoded-matchable.json', JSON.stringify(matchable, null, 2));
fs.writeFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/hardcoded-unmatched.json', JSON.stringify(unmatched, null, 2));
