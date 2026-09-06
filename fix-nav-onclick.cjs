const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix onClick={() => nav('...')} -> onClick={() => { void nav('...'); }}
  content = content.replace(/onClick=\{\(\) => nav\('([^']+)'\)\}/g, "onClick={() => { void nav('$1'); }}");

  // Fix onChange={handleX} -> onChange={() => { void handleX(); }}
  content = content.replace(/onChange=\{(\w+)\}/g, (match, fn) => {
    if (fn === 'handlePhotoSelection' || fn === 'handleInputChange') {
      return `onChange={() => { void ${fn}(); }}`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed: ' + filePath);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'mobile' && entry !== 'supabase') {
      walkDir(full);
    } else if (stat.isFile() && entry.endsWith('.tsx')) {
      fixFile(full);
    }
  }
}

walkDir('src');
console.log('Done');
