const fs=require('fs');
const p='README.md';
let c=fs.readFileSync(p,'utf8');
c=c.replace('MIT License','NEURAL AURORA SOURCE-AVAILABLE LICENSE');
c=c.replace('MIT © 2026 Amit Kumar — Techhackontime999','Copyright (c) 2026 Amit Kumar (Techhackontime999)');
fs.writeFileSync(p,c);
console.log('ok');
