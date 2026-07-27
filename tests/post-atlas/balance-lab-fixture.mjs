class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
globalThis.localStorage=new MemoryStorage();
const {runBalanceLab}=await import('../../js/engine/balance-lab-engine.js');
const report=runBalanceLab({careers:3,maxSeasons:6,seedPrefix:'test-balance',includeCareers:true});
process.stdout.write(JSON.stringify({metrics:report.metrics,careers:report.careers}));
