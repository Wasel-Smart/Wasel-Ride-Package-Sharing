const fs = require('fs');

const filePath = 'src/features/profile/ProfilePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const matches = content.match(/onClick=\{\(\) => (\w+)\(["'][^"']+["']\)\}/g);
console.log('Matches before: ' + (matches ? matches.length : 0));

const newContent = content.replace(
  /onClick=\{\(\) => (\w+)\(["'][^"']+["']\)\}/g,
  'onClick={() => { void $1(); }}'
);

console.log('Changed: ' + (newContent !== content));
if (newContent !== content) {
  fs.writeFileSync(filePath, newContent);
  const after = fs.readFileSync(filePath, 'utf8');
  console.log('Has void nav: ' + after.includes('void nav'));
}
