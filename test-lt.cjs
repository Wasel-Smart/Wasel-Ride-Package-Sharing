const fs = require('fs');
const content = fs.readFileSync('src/components/LiveTripTracking.tsx', 'utf8');
const re = /onClick=\{\(\) => (\w+)\(["'][^"']+["']\)\}/g;
const matches = content.match(re);
console.log('Matches: ' + (matches ? matches.length : 0));
if (matches) {
  matches.forEach((m, i) => {
    if (i < 5) console.log('  ' + m);
  });
}
