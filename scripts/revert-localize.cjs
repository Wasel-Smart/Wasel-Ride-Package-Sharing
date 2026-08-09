const fs = require('fs');
const p = 'C:/Users/user/OneDrive/Desktop/Wdoubleme/scripts/localize.cjs';
let s = fs.readFileSync(p, 'utf8');

s = s.split("      const t = code.substring(node.pos, node.end).replace(/\\s+/g, ' ').trim();").join("      const t = node.text.replace(/\\s+/g, ' ').trim();");
s = s.split("findings.push({ file: f, kind: 'jsx-text', text: t, start: node.pos, end: node.end, isMixed: true, arValue: ar });").join("findings.push({ file: f, kind: 'jsx-text', text: t, start: node.getStart(), end: node.getEnd(), isMixed: true, arValue: ar });");
s = s.split("findings.push({ file: f, kind: 'jsx-text', text: t, start: node.pos, end: node.end, isMixed: false, arValue: lookupAr(t) });").join("findings.push({ file: f, kind: 'jsx-text', text: t, start: node.getStart(), end: node.getEnd(), isMixed: false, arValue: lookupAr(t) });");
s = s.split("findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.pos, end: init.end, isMixed: true, arValue: extractArabic(t) });").join("findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.getStart(), end: init.getEnd(), isMixed: true, arValue: extractArabic(t) });");
s = s.split("findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.pos, end: init.end, isMixed: false, arValue: lookupAr(t) });").join("findings.push({ file: f, kind: 'attr:' + name, text: t, start: init.getStart(), end: init.getEnd(), isMixed: false, arValue: lookupAr(t) });");

fs.writeFileSync(p, s);
console.log('reverted localize.cjs');
