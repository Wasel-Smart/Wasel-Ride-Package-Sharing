const fs = require('fs');
const path = require('path');

const file = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src/locales/translations.ts';
let src = fs.readFileSync(file, 'utf8');

// Strip export type declarations and the type annotation on the const
src = src.replace(/export type [^=;]+=[^;]+;/g, '');
src = src.replace(/export type Language[^;]*;/g, '');
src = src.replace(/export const translations:[^=]+=/, 'var translations =');
src = src.replace(/export const translations =/, 'var translations =');

const sandbox = { module: { exports: {} } };
const fn = new Function('var module = arguments[0];' + src + '\nreturn translations;');
const translations = fn(sandbox.module);

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], key, out);
    else out[key] = obj[k];
  }
  return out;
}

const en = flatten(translations.en);
const ar = flatten(translations.ar);

const enKeys = Object.keys(en);
const arKeys = Object.keys(ar);

const missing = enKeys.filter((k) => !(k in ar));
const empty = arKeys.filter((k) => ar[k] === undefined || ar[k] === null || ar[k] === '');
const extra = arKeys.filter((k) => !(k in en));

console.log('EN keys:', enKeys.length);
console.log('AR keys:', arKeys.length);
console.log('Missing in AR (present in EN):', missing.length);
console.log('Extra in AR (not in EN):', extra.length);
console.log('Empty AR values:', empty.length);

console.log('\n=== MISSING IN AR ===');
for (const m of missing) console.log('  ' + m);

console.log('\n=== EMPTY AR VALUES ===');
for (const e of empty) console.log('  ' + e);

console.log('\n=== EXTRA IN AR ===');
for (const e of extra) console.log('  ' + e);
