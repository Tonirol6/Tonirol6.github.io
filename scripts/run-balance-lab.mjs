import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
globalThis.localStorage=new MemoryStorage();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const {runBalanceLab}=await import('../js/engine/balance-lab-engine.js');
const careers=Math.max(10,Number(process.argv[2]||50));
const report=runBalanceLab({careers,includeCareers:false,seedPrefix:'nba-glory-2.0.13'});
const jsonPath=path.join(root,'reports','balance-lab-tuned.json');
fs.writeFileSync(jsonPath,JSON.stringify(report,null,2));
const lines=[
  '# NBA Glory v2.0.13 — Balance Tuning', '',
  `Muestra: ${report.sampleSize} carreras reproducibles.`,
  `Generado: ${report.generatedAt}.`, '',
  '## Métricas', '',
  ...Object.entries(report.metrics).map(([key,value])=>`- ${key}: ${value}`), '',
  '## Diagnóstico', '',
  ...(report.evaluation.diagnostics.length?report.evaluation.diagnostics.map(x=>`- ${x.severity.toUpperCase()} ${x.key}: ${x.value} (${x.status}; rango ${x.expected[0]}–${x.expected[1]})`):['- Sin alertas fuera de rango.'])
];
fs.writeFileSync(path.join(root,'reports','BALANCE_LAB_TUNED.md'),lines.join('\n'));
console.log(JSON.stringify({ok:true,careers:report.sampleSize,metrics:report.metrics,diagnostics:report.evaluation.diagnostics.length,jsonPath},null,2));
