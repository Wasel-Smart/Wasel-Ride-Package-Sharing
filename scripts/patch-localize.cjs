const fs = require('fs');
const p = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/localize.cjs';
let s = fs.readFileSync(p, 'utf8');

// 1) JsxText: use raw pos/end offsets instead of node.text/getStart
s = s.replace(
  "      const t = node.text.replace(/\\s+/g, ' ').trim();",
  "      const t = code.substring(node.pos, node.end).replace(/\\s+/g, ' ').trim();"
);
s = s.replace(
  "findings.push({ file: f, kind: 'jsx-text', text: t, start: node.getStart(), end: node.getEnd(), isMixed: true, arValue: ar });",
  "findings.push({ file: f, kind: 'jsx-text', text: t, start: node.pos, end: node.end, isMixed: true, arValue: ar });"
);
s = s.replace(
  "findings.push({ file: f, kind: 'jsx-text', text: t, start: node.getStart(), end: node.getEnd(), isMixed: false, arValue: lookupAr(t) });",
  "findings.push({ file: f, kind: 'jsx-text', text: t, start: node.pos, end: node.end, isMixed: false, arValue: lookupAr(t) });"
);

// 2) remove PrivacyPolicy debug line in JsxText branch
s = s.replace(
  "      if (f.includes('PrivacyPolicy')) fs.appendFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/_push.json', JSON.stringify({ t, mixed, pureEn, isAllowed: isAllowed(t) }) + '\\n');\n",
  ''
);

// 3) remove _edits.json debug block
s = s.replace(
  "const ppKey = Object.keys(editsByFile).find((k) => k.includes('PrivacyPolicy'));\nfs.writeFileSync('C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/_edits.json', JSON.stringify((editsByFile[ppKey] || []).map((e) => ({ text: e.text, key: e.key, start: e.start, end: e.end })), null, 2));\n\n",
  ''
);

// 4) JsxAttribute string literal: use pos/end too
s = s.replace(
  "findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.getStart(), end: init.getEnd(), isMixed: true, arValue: extractArabic(t) });",
  "findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.pos, end: init.end, isMixed: true, arValue: extractArabic(t) });"
);
s = s.replace(
  "findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.getStart(), end: init.getEnd(), isMixed: false, arValue: lookupAr(t) });",
  "findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.pos, end: init.end, isMixed: false, arValue: lookupAr(t) });"
);

fs.writeFileSync(p, s);
console.log('patched localize.cjs');
// sanity: count remaining getStart usages
const rem = (s.match(/node\.getStart\(\)/g) || []).length;
console.log('remaining node.getStart() in scan:', rem);
