const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src';

// Props that carry visible text to users
const VISIBLE_PROPS = new Set([
  'placeholder', 'title', 'alt', 'aria-label', 'aria-placeholder', 'aria-valuetext',
  'aria-label', 'aria-description', 'label', 'legend', 'caption', 'tooltip',
  'ariaLabelledby', 'aria-label',
]);

// Props that are NEVER user-visible text
const IGNORE_PROPS = new Set([
  'className', 'class', 'id', 'style', 'data', 'data-testid', 'data-*', 'key', 'type',
  'role', 'viewBox', 'd', 'xmlns', 'width', 'height', 'fill', 'stroke', 'cx', 'cy', 'r',
  'x', 'y', 'href', 'src', 'rel', 'target', 'htmlFor', 'lang', 'dir', 'loading',
  'tabIndex', 'name', 'autoComplete', 'autoCompleteType', 'step', 'min', 'max', 'pattern',
  'colSpan', 'rowSpan', 'scope', 'method', 'action', 'encType', 'accept', 'multiple',
  'disabled', 'readOnly', 'required', 'checked', 'defaultValue', 'value', 'defaultChecked',
  'rel', 'rev', 'ping', 'translate', 'spellCheck', 'contentEditable', 'draggable',
  'hidden', 'itemProp', 'itemScope', 'itemType', 'prefix', 'property', 'about', 'datatype',
  'inlist', 'vocab', 'typeof', 'for', 'httpEquiv', 'charSet', 'media', 'color',
  'crossOrigin', 'referrerPolicy', 'sizes', 'srcSet', 'useMap', 'wrap', 'cols', 'rows',
  'accessKey', 'inputMode', 'enterKeyHint', 'autoFocus', 'controls', 'loop', 'muted',
  'playsInline', 'poster', 'preload', 'capture', 'form', 'list', 'maxLength', 'minLength',
  'size', 'placeholderText', 'number', 'transition', 'transform', 'opacity', 'zIndex',
]);

// Allowed Latin tokens (brands / loanwords / units that stay English)
const ALLOWED = new Set([
  'Wasel', 'WaselApp', 'WaselSupport', 'Google', 'Facebook', 'Apple', 'Stripe',
  'Visa', 'Mastercard', 'WhatsApp', 'Messenger', 'GPS', 'SMS', 'OTP', 'API', 'URL',
  'SSO', '2FA', 'PIN', 'ID', 'JOD', 'USD', 'EUR', 'IQD', 'GBP', 'JO', 'EN', 'AR',
  'OK', 'KM', 'MI', 'KG', 'LB', 'CO2', 'iOS', 'Android', 'App', 'Web', 'CRM',
  'PDF', 'CSV', 'JSON', 'XML', 'AI', 'UI', 'UX', 'JWT', 'RSC', 'VAT', 'IBAN',
  'KYC', 'PL', 'PR', 'PS', 'RTL', 'LTR', 'MFA',
]);

function isAllowed(s) {
  // split on non-letters
  const tokens = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => ALLOWED.has(t));
}

function hasLatin(s) {
  return /[A-Za-z]/.test(s);
}

function isMostlyBrand(s) {
  return isAllowed(s.trim());
}

function walk(node, filePath, results) {
  if (!node) return;
  switch (node.kind) {
    case ts.SyntaxKind.JsxText: {
      const raw = node.text;
      const text = raw.replace(/\s+/g, ' ').trim();
      if (!text) break;
      if (!hasLatin(text)) break;
      if (isMostlyBrand(text)) break;
      results.push({ kind: 'jsx-text', file: filePath, line: node.getStart ? undefined : undefined, text, pos: node.getSourceFile ? node.getStart() : 0 });
      break;
    }
    case ts.SyntaxKind.JsxAttribute: {
      const name = node.name && node.name.text;
      if (!name) break;
      const isAria = name.startsWith('aria-');
      const visible = VISIBLE_PROPS.has(name) || isAria;
      if (!visible || IGNORE_PROPS.has(name)) break;
      const init = node.initializer;
      if (init) {
        if (init.kind === ts.SyntaxKind.StringLiteral) {
          const text = init.text;
          if (hasLatin(text) && !isMostlyBrand(text)) {
            results.push({ kind: 'attr:' + name, file: filePath, text, pos: init.getStart() });
          }
        }
      }
      break;
    }
    default:
      break;
  }
  ts.forEachChild(node, (child) => walk(child, filePath, results));
}

const results = [];
function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'locales' || entry.name === 'node_modules') continue;
      out.push(...collectFiles(full));
    } else if (entry.isFile() && /\.(tsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = collectFiles(ROOT);
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  walk(sf, f, results);
}

// Deduplicate by file+text
const seen = new Set();
const uniq = [];
for (const r of results) {
  const key = r.file + '::' + r.kind + '::' + r.text;
  if (seen.has(key)) continue;
  seen.add(key);
  uniq.push(r);
}

console.log('Files scanned:', files.length);
console.log('Hardcoded UI strings found:', uniq.length);
console.log('\n=== BY KIND ===');
const byKind = {};
for (const r of uniq) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log(JSON.stringify(byKind, null, 2));

console.log('\n=== SAMPLES (first 200) ===');
uniq.slice(0, 200).forEach((r) => {
  console.log(`${path.relative(ROOT, r.file)} [${r.kind}] => "${r.text}"`);
});

// Save full list as JSON for later processing
fs.writeFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/hardcoded-findings.json', JSON.stringify(uniq, null, 2));
