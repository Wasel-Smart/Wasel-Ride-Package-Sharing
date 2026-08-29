const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src';
const TRANS = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src/locales/translations.ts';
const SCRIPTS_DIR = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts';

function safeResolve(baseDir, filePath) {
  const resolved = path.resolve(baseDir, filePath);
  if (!resolved.startsWith(baseDir)) {
    throw new Error(`Path traversal detected: ${filePath} resolves outside ${baseDir}`);
  }
  return resolved;
}

const NEW_TRANS = JSON.parse(fs.readFileSync(safeResolve(SCRIPTS_DIR, 'new-translations.json'), 'utf8'));

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
const normTrans = {};
for (const k of Object.keys(NEW_TRANS)) {
  normTrans[k.replace(/…/g, '...').trim().toLowerCase()] = NEW_TRANS[k];
}
function lookupAr(s) {
  return normTrans[s.replace(/…/g, '...').trim().toLowerCase()];
}

const DRY = process.argv.includes('--dry');

// ---------- load current translations ----------
function loadTrans() {
  const source = fs.readFileSync(TRANS, 'utf8');
  const sanitized = source.replace(/export type Language[^;]*;/g, '').replace(/export const translations: Record<Language, any> =/, 'var translations =');
  const sf = ts.createSourceFile('translations.ts', sanitized, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const result = {};
  sf.statements.forEach((stmt) => {
    if (ts.isVariableStatement(stmt)) {
      stmt.declarationList.declarations.forEach((decl) => {
        if (decl.name.getText() === 'translations') {
          const init = decl.initializer;
          if (init && ts.isObjectLiteralExpression(init)) {
            init.properties.forEach((prop) => {
              if (ts.isPropertyAssignment(prop) && prop.name && ts.isIdentifier(prop.name)) {
                const keyName = prop.name.text;
                const initializer = prop.initializer;
                if (initializer && ts.isObjectLiteralExpression(initializer)) {
                  result[keyName] = {};
                  initializer.properties.forEach((subProp) => {
                    if (ts.isPropertyAssignment(subProp) && subProp.name && ts.isIdentifier(subProp.name)) {
                      const subKey = subProp.name.text;
                      const subInit = subProp.initializer;
                      if (subInit && ts.isStringLiteral(subInit)) {
                        result[keyName][subKey] = subInit.text;
                      } else if (subInit && ts.isObjectLiteralExpression(subInit)) {
                        result[keyName][subKey] = {};
                        subInit.properties.forEach((leafProp) => {
                          if (ts.isPropertyAssignment(leafProp) && leafProp.name && ts.isIdentifier(leafProp.name)) {
                            const leafInit = leafProp.initializer;
                            if (leafInit && ts.isStringLiteral(leafInit)) {
                              result[keyName][subKey][leafProp.name.text] = leafInit.text;
                            }
                          }
                        });
                      }
                    }
                  });
                }
              }
            });
          }
        }
      });
    }
  });
  return result;
}
const translations = loadTrans();

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], key, out);
    else out[key] = obj[k];
  }
  return out;
}
const enFlat = flatten(translations.en);
const enReverse = {};
for (const k of Object.keys(enFlat)) {
  const v = enFlat[k];
  if (typeof v === 'string' && v.trim()) (enReverse[v] ||= []).push(k);
}

// ---------- helpers ----------
function camelCase(seg) {
  return seg
    .replace(/\.[^.]*$/, '') // strip ext already done by caller
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p[0].toLowerCase() + p.slice(1) : p[0].toUpperCase() + p.slice(1)))
    .join('');
}
function namespaceFor(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const base = rel.replace(/\.[^.]*$/, '');
  const parts = base.split('/');
  const last = parts[parts.length - 1] || 'app';
  return camelCase(last);
}
function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function hasAr(s) { return /[؀-ۿܐ-ݿ]/.test(s); }
function hasLat(s) { return /[A-Za-z]/.test(s); }
function isVisibleAttr(name) {
  if (name === 'aria-label' || name === 'aria-placeholder' || name === 'aria-valuetext' || name === 'aria-roledescription') return true;
  return ['placeholder', 'title', 'alt', 'aria-label'].includes(name);
}
function extractArabic(mixedText) {
  // split on bullet separators
  const parts = mixedText.split(/[·•]/).map((p) => p.trim());
  const ar = parts.find((p) => hasAr(p));
  return ar || mixedText;
}

// ---------- scan ----------
const VISIBLE = ['placeholder', 'title', 'alt', 'aria-label', 'aria-placeholder', 'aria-valuetext', 'aria-roledescription'];
function collectFiles(dir, out = []) {
  const baseDir = path.resolve(dir);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const resolvedFull = path.resolve(dir, e.name);
    if (!resolvedFull.startsWith(baseDir)) continue;
    if (e.isDirectory()) {
      if (e.name === 'locales' || e.name === 'node_modules') continue;
      if (e.name === '__tests__') continue;
      collectFiles(resolvedFull, out);
    } else if (e.isFile() && /\.(tsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      out.push(resolvedFull);
    }
  }
  return out;
}

const findings = []; // {file, kind, text, start, end, isMixed, arValue, key?}
const files = collectFiles(ROOT);

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function walk(node) {
    if (!node) return;
    if (node.kind === ts.SyntaxKind.JsxText) {
      const t = node.text.replace(/\s+/g, ' ').trim();
      if (!t) return;
      const mixed = hasAr(t) && hasLat(t);
      const pureEn = hasLat(t) && !hasAr(t);
      if (mixed) {
        const ar = extractArabic(t);
        findings.push({ file: f, kind: 'jsx-text', text: t, start: node.getStart(), end: node.getEnd(), isMixed: true, arValue: ar });
      } else if (pureEn && !isAllowed(t)) {
        findings.push({ file: f, kind: 'jsx-text', text: t, start: node.getStart(), end: node.getEnd(), isMixed: false, arValue: lookupAr(t) });
      }
    } else if (node.kind === ts.SyntaxKind.JsxAttribute) {
      const name = node.name && node.name.text;
      if (!name || !isVisibleAttr(name)) return;
      const init = node.initializer;
      if (init && init.kind === ts.SyntaxKind.StringLiteral) {
        const t = init.text;
        if (!t || !hasLat(t)) return;
        const mixed = hasAr(t) && hasLat(t);
        const pureEn = hasLat(t) && !hasAr(t);
        if (mixed) {
          findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.getStart(), end: init.getEnd(), isMixed: true, arValue: extractArabic(t) });
        } else if (pureEn && !isAllowed(t)) {
          findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.getStart(), end: init.getEnd(), isMixed: false, arValue: lookupAr(t) });
        }
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
  fs.writeFileSync(safeResolve(SCRIPTS_DIR, '_fc.json'), JSON.stringify({files: files.length, findings: findings.length}));
}

// ---------- assign keys ----------
const usedKeys = new Set(Object.keys(enFlat));
const newKeys = {}; // key -> {en, ar}
const missingAr = [];
for (const fnd of findings) {
  const ns = namespaceFor(fnd.file);
  let key;
  if (!fnd.isMixed && enReverse[fnd.text]) {
    key = enReverse[fnd.text][0]; // existing key
  } else {
    let base = ns + '.' + slug(fnd.text);
    let cand = base;
    let i = 2;
    while (usedKeys.has(cand)) {
      if (translations.en && getPath(translations.en, cand) === fnd.text) { cand = base; break; }
      cand = base + '_' + i++;
    }
    if (cand !== base && getPath(translations.en, cand) === fnd.text) cand = base;
    key = cand;
    usedKeys.add(key);
    if (fnd.arValue == null) {
      missingAr.push(fnd.text);
    } else {
      const enVal = fnd.isMixed ? fnd.arValue : fnd.text;
      newKeys[key] = { en: enVal, ar: fnd.arValue };
    }
  }
  fnd.key = key;
}

function getPath(obj, dotted) {
  let cur = obj;
  for (const p of dotted.split('.')) { cur = cur?.[p]; if (cur == null) return undefined; }
  return cur;
}
function setPath(obj, dotted, val) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
}

if (missingAr.length) {
  console.log('!! MISSING AR TRANSLATIONS for', missingAr.length, 'strings:');
  missingAr.slice(0, 30).forEach((m) => console.log('   ' + m));
}

// ---------- apply to files ----------
const editsByFile = {};
for (const fnd of findings) {
  (editsByFile[fnd.file] ||= []).push(fnd);
}
let changedFiles = 0;
const injectReport = [];

for (const f of Object.keys(editsByFile)) {
  const edits = editsByFile[f];
  const code = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const usesUseLanguage = /useLanguage/.test(code);

  // token: use existing `t` from useLanguage if present, else module-level `tx`
  const token = usesUseLanguage ? 't' : 'tx';

  // Build string replacements.
  const repls = edits.map((ed) => ({
    start: ed.start,
    end: ed.end,
    text: '{' + token + "('" + ed.key + "')}",
  }));

  // add import of tx if the file does not already use useLanguage
  if (!usesUseLanguage) {
    let importInsert = null;
    ts.forEachChild(sf, (n) => {
      if (n.kind === ts.SyntaxKind.ImportDeclaration) importInsert = n.getEnd();
    });
    if (importInsert == null) importInsert = 0;
    const txPath = safeResolve(SCRIPTS_DIR, '../src/locales/tx.ts');
    const rel = path.relative(path.dirname(f), txPath).replace(/\\/g, '/').replace(/\.tsx?$/, '');
    const stmt = "\nimport { tx } from '" + rel + "';";
    repls.push({ start: importInsert, end: importInsert, text: stmt });
    injectReport.push('INJECT tx import: ' + f);
  }

  if (DRY) continue;

  // apply edits sorted descending
  repls.sort((a, b) => b.start - a.start);
  let newCode = code;
  for (const r of repls) {
    newCode = newCode.slice(0, r.start) + r.text + newCode.slice(r.end);
  }
  fs.writeFileSync(safeResolve(SCRIPTS_DIR, f), newCode);
  changedFiles++;
}

// ---------- merge new keys into translations and write ----------
function deepSet(obj, dotted, val) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
}
let addedEn = 0, addedAr = 0;
for (const key of Object.keys(newKeys)) {
  const { en, ar } = newKeys[key];
  deepSet(translations.en, key, en); addedEn++;
  deepSet(translations.ar, key, ar); addedAr++;
}

// ensure the 6 previously-missing ar keys exist (fix case/path mismatches)
const ensureAr = [
  ['support.livechat', 'دردشة مباشرة'],
  ['support.liveChat', 'دردشة مباشرة'],
  ['system.pageNotFound', 'الصفحة غير موجودة'],
  ['system.loading', 'جارٍ التحميل...'],
  ['trustCenterExpanded.eachCardShowsState', 'كل بطاقة أدناه توضح حالة الخطوة: لم تبدأ، قيد التنفيذ، مكتملة، أو فشلت.'],
  ['trustCenterExpanded.failedStepsDetail', 'الخطوات الفاشلة تعرض السبب بدل البقاء عالقة.'],
  ['trustCenterExpanded.walletDetail', 'حالة المحفظة السليمة تُبقي العمليات متاحة.'],
];
for (const [k, v] of ensureAr) {
  if (getPath(translations.ar, k) == null) { deepSet(translations.ar, k, v); addedAr++; }
}

if (!DRY) {
  fs.writeFileSync(TRANS, serializeTranslations(translations));
}

console.log('\n=== SUMMARY ===');
console.log('Files scanned:', files.length);
console.log('Findings (strings to localize):', findings.length);
console.log('New keys added -> en:', addedEn, 'ar:', addedAr);
console.log('Missing AR translations:', missingAr.length);
console.log('Files changed:', changedFiles);
console.log('Injection report count:', injectReport.length);
if (DRY) console.log('(DRY RUN — no files written)');

function serializeTranslations(trans) {
  const esc = (s) => {
    return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + "'";
  };
  const serObj = (obj, indent) => {
    const pad = '    '.repeat(indent);
    const pad2 = '    '.repeat(indent + 1);
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    let out = '{\n';
    for (const k of keys) {
      const v = obj[k];
      const keyStr = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : "'" + k.replace(/'/g, "\\'") + "'";
      if (v && typeof v === 'object') {
        out += pad2 + keyStr + ': ' + serObj(v, indent + 1) + ',\n';
      } else {
        out += pad2 + keyStr + ': ' + esc(v) + ',\n';
      }
    }
    out += pad + '}';
    return out;
  };
  let s = '';
  s += "export type Language = 'en' | 'ar';\n\n";
  s += "export const translations: Record<Language, any> = {\n";
  s += '  en: ' + serObj(trans.en, 1) + ',\n';
  s += '  ar: ' + serObj(trans.ar, 1) + ',\n';
  s += '};\n';
  return s;
}
