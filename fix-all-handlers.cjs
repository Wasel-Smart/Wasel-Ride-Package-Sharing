const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix onClick={() => fn('...')} -> onClick={() => { void fn('...'); }}
  content = content.replace(
    /onClick=\{\(\) => (\w+)\(["'][^"']+["']\)\}/g,
    (match, fn) => `onClick={() => { void ${fn}(); }}`
  );

  // Fix onClick={() => fn(...)} -> onClick={() => { void fn(...); }}
  content = content.replace(
    /onClick=\{\(\) => (\w+)\(([^)]*)\)\}/g,
    (match, fn, args) => `onClick={() => { void ${fn}(${args}); }}`
  );

  // Fix direct function references like onClick={fn} -> onClick={() => { void fn(); }}
  content = content.replace(
    /onClick=\{(\w+)\}/g,
    (match, fn) => `onClick={() => { void ${fn}(); }}`
  );

  // Fix onConfirm={fn} -> onConfirm={() => { void fn(); }}
  content = content.replace(
    /onConfirm=\{(\w+)\}/g,
    (match, fn) => `onConfirm={() => { void ${fn}(); }}`
  );

  // Fix onSubmit={fn} -> onSubmit={() => { void fn(); }}
  content = content.replace(
    /onSubmit=\{(\w+)\}/g,
    (match, fn) => `onSubmit={() => { void ${fn}(); }}`
  );

  // Fix onChange={fn} -> onChange={() => { void fn(); }}
  content = content.replace(
    /onChange=\{(\w+)\}/g,
    (match, fn) => `onChange={() => { void ${fn}(); }}`
  );

  // Fix onClose={fn} -> onClose={() => { void fn(); }}
  content = content.replace(
    /onClose=\{(\w+)\}/g,
    (match, fn) => `onClose={() => { void ${fn}(); }}`
  );

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
