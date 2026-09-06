const re = /onClick=\{\(\) => (\w+)\(["'][^"']+["']\)\}/g;
const str = 'onClick={() => nav("/app/trust")}';
console.log('Match:', str.match(re));
