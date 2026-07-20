const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src';

function collectFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['locales', 'node_modules', '__tests__'].includes(e.name)) continue;
      collectFiles(full, out);
    } else if (e.isFile() && /\.(tsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}
const ALLOWED = new Set(['Wasel','JOD','KM','OK','App','Web','GPS','SMS','OTP','ID','USD','EUR','AR','EN','UI','UX','AI','JSON','XML','PDF','CSV','API','URL','SSO','2FA','PIN','KG','LB','CO2','iOS','Android','CRM','VAT','IBAN','KYC','RTL','LTR','MFA','Facebook','Google','Apple','Stripe','Visa','Mastercard','WhatsApp','Messenger']);
function isAllowed(s){const t=s.split(/[^A-Za-z0-9]+/).filter(Boolean);return t.length===0||t.every(x=>ALLOWED.has(x));}
function hasAr(s){return /[؀-ۿܐ-ݿ]/.test(s);}
function hasLat(s){return /[A-Za-z]/.test(s);}
const files = collectFiles(ROOT);
let findings = 0;
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
      if (mixed) findings++;
      else if (pureEn && !isAllowed(t)) findings++;
    } else if (node.kind === ts.SyntaxKind.JsxAttribute) {
      const name = node.name && node.name.text;
      const VIS=['placeholder','title','alt','aria-label','aria-placeholder','aria-valuetext','aria-roledescription'];
      if (name && VIS.includes(name) && node.initializer && node.initializer.kind === ts.SyntaxKind.StringLiteral) {
        const t = node.initializer.text;
        if (t && hasLat(t) && !hasAr(t) && !isAllowed(t)) findings++;
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
}
console.log('standalone findings:', findings);
