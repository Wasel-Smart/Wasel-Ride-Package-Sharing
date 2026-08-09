const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src';

function safeResolve(baseDir, filePath) {
  const resolved = path.resolve(baseDir, filePath);
  if (!resolved.startsWith(baseDir)) {
    throw new Error(`Path traversal detected: ${filePath} resolves outside ${baseDir}`);
  }
  return resolved;
}

const ALLOWED = new Set(['Wasel','Google','Facebook','Apple','Stripe','Visa','Mastercard','WhatsApp','Messenger','GPS','SMS','OTP','API','URL','SSO','2FA','PIN','ID','JOD','USD','EUR','IQD','GBP','JO','EN','AR','OK','KM','MI','KG','LB','CO2','iOS','Android','App','Web','CRM','PDF','CSV','JSON','XML','AI','UI','UX','JWT','RSC','VAT','IBAN','KYC','PL','PR','PS','RTL','LTR','MFA']);
function allowed(s){const t=s.split(/[^A-Za-z0-9]+/).filter(Boolean);return t.length===0||t.every(x=>ALLOWED.has(x));}
function hasAr(s){return /[؀-ۿܐ-ݿ]/.test(s);}
function hasLat(s){return /[A-Za-z]/.test(s);}
const VIS=['placeholder','title','alt','aria-label','aria-placeholder','aria-valuetext','aria-roledescription'];
function collect(dir,o=[]){
  const baseDir = path.resolve(dir);
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);const rf=path.resolve(dir,e.name);if(!rf.startsWith(baseDir))continue;if(e.isDirectory()){if(['locales','node_modules','__tests__'].includes(e.name))continue;collect(rf,o);}else if(e.isFile()&&/\.(tsx?)$/.test(e.name)&&!/\.(test|spec)\./.test(e.name))o.push(rf);}return o;
}
const out=[];
for(const f of collect(ROOT)){
  const sf=ts.createSourceFile(f,fs.readFileSync(f,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function walk(n){if(!n)return;
    if(n.kind===ts.SyntaxKind.JsxText){const t=n.text.replace(/\s+/g,' ').trim();if(t&&hasLat(t)&&!hasAr(t)&&!allowed(t))out.push({file:path.relative(ROOT,f),text:t});}
    else if(n.kind===ts.SyntaxKind.JsxAttribute){const nm=n.name&&n.name.text;if(nm&&VIS.includes(nm)&&n.initializer&&n.initializer.kind===ts.SyntaxKind.StringLiteral){const t=n.initializer.text;if(t&&hasLat(t)&&!hasAr(t)&&!allowed(t))out.push({file:path.relative(ROOT,f),text:t});}}
    ts.forEachChild(n,walk);}
  walk(sf);
}
console.log('Remaining pure-English UI strings:',out.length);
out.forEach(o=>console.log(o.file+' => "'+o.text+'"'));
