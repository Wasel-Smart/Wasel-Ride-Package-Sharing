const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const fs = require('fs');
const f = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src/features/legal/PrivacyPolicy.tsx';
const code = fs.readFileSync(f, 'utf8');
const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function hasAr(s){return /[؀-ۿܐ-ݿ]/.test(s);}
function hasLat(s){return /[A-Za-z]/.test(s);}
const VIS=['placeholder','title','alt','aria-label','aria-placeholder','aria-valuetext','aria-roledescription'];
const ALLOWED=new Set(['Wasel','JOD','KM','OK','App','Web','GPS','SMS','OTP','ID','USD','EUR','AR','EN','UI','UX','AI','JSON','XML','PDF','CSV','API','URL','SSO','2FA','PIN','KG','LB','CO2','iOS','Android','CRM','VAT','IBAN','KYC','RTL','LTR','MFA','Facebook','Google','Apple','Stripe','Visa','Mastercard','WhatsApp','Messenger']);
function allowed(s){const t=s.split(/[^A-Za-z0-9]+/).filter(Boolean);return t.length===0||t.every(x=>ALLOWED.has(x));}
function walk(n,p){
  if(!n)return;
  if(n.kind===ts.SyntaxKind.JsxText){
    const t=n.text.replace(/\s+/g,' ').trim();
    const mixed=hasAr(t)&&hasLat(t);
    const pureEn=hasLat(t)&&!hasAr(t);
    if(mixed) console.log('MIXED', JSON.stringify(t), n.getStart(), n.getEnd());
    else if(pureEn&&!allowed(t)) console.log('PUREEN', JSON.stringify(t), 'start',n.getStart(),'end',n.getEnd());
  } else if(n.kind===ts.SyntaxKind.JsxAttribute){
    const nm=n.name&&n.name.text;
    if(nm&&VIS.includes(nm)&&n.initializer&&n.initializer.kind===ts.SyntaxKind.StringLiteral){
      const t=n.initializer.text; if(t&&hasLat(t)&&!hasAr(t)&&!allowed(t)) console.log('ATTR',nm,JSON.stringify(t));
    }
  }
  ts.forEachChild(n,c=>walk(c,p));
}
walk(sf,null);
// show context around "Review security"
const idx=code.indexOf('Review security');
console.log('indexOf Review security:',idx);
console.log('context:',JSON.stringify(code.slice(idx-30,idx+40)));
