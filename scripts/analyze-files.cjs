const fs = require('fs');
const un = JSON.parse(fs.readFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/hardcoded-unmatched.json', 'utf8'));
const files = [...new Set(un.map((r) => r.file))];
let needInjection = 0, alreadyHave = 0;
const needList = [];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  if (/useLanguage/.test(c)) alreadyHave++;
  else { needInjection++; needList.push(f); }
}
console.log('Unique files:', files.length);
console.log('Already use useLanguage:', alreadyHave);
console.log('Need t injection:', needInjection);
console.log('\n=== Files needing injection ===');
needList.forEach((f) => console.log(f));

// Also detect mixed (arabic + latin) jsx-text / attr strings across src
const ts = require('C:/Users/user/OneDrive/Desktop/Wdoubleme/node_modules/typescript');
const path = require('path');
const ROOT = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/src';
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
function hasAr(s){return /[؀-ۿܐ-ݿ]/.test(s);}
function hasLat(s){return /[A-Za-z]/.test(s);}
const VISIBLE=['placeholder','title','alt','aria-label','aria-placeholder','aria-valuetext','aria-roledescription'];
const mixed=[];
function walk(node, fp){
  if(!node)return;
  if(node.kind===ts.SyntaxKind.JsxText){
    const t=node.text.replace(/\s+/g,' ').trim();
    if(t && hasAr(t) && hasLat(t)) mixed.push({kind:'jsx-text',file:fp,text:t});
  } else if(node.kind===ts.SyntaxKind.JsxAttribute){
    const name=node.name&&node.name.text;
    if(name && VISIBLE.includes(name) && node.initializer && node.initializer.kind===ts.SyntaxKind.StringLiteral){
      const t=node.initializer.text;
      if(t && hasAr(t) && hasLat(t)) mixed.push({kind:'attr:'+name,file:fp,text:t});
    }
  }
  ts.forEachChild(node,(c)=>walk(c,fp));
}
for(const f of collectFiles(ROOT)){
  const sf=ts.createSourceFile(f, fs.readFileSync(f,'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  walk(sf,f);
}
const seen=new Set(); const uniq=[];
for(const m of mixed){const k=m.file+'::'+m.text; if(seen.has(k))continue; seen.add(k); uniq.push(m);}
console.log('\n=== MIXED (arabic+latin) strings:', uniq.length, '===');
uniq.forEach((m)=>console.log(`${m.file} [${m.kind}] => "${m.text}"`));
fs.writeFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/mixed-findings.json', JSON.stringify(uniq,null,2));
