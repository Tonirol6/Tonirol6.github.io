import assert from 'node:assert/strict';
class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
globalThis.localStorage=new MemoryStorage();
const {runBalanceLab,BALANCE_LAB_VERSION}=await import('../../js/engine/balance-lab-engine.js');
const {SIMULATION_ENGINE_VERSION}=await import('../../js/engine/simulation-engine.js');
const {migrateAtlas,ATLAS_SCHEMA_VERSION}=await import('../../js/core/universe-core.js');
assert.equal(BALANCE_LAB_VERSION,'1.1.0');
assert.equal(SIMULATION_ENGINE_VERSION,'2.2.0');
assert.ok(ATLAS_SCHEMA_VERSION>=8);
const report=runBalanceLab({careers:96,seedPrefix:'v2.0.13-balance-test',includeCareers:false});
assert.ok(report.metrics.superstarRate>=0.08&&report.metrics.superstarRate<=0.55,`superstarRate ${report.metrics.superstarRate}`);
assert.ok(report.metrics.allStars>=1&&report.metrics.allStars<=8,`allStars ${report.metrics.allStars}`);
assert.ok(report.metrics.mvps>=0.05&&report.metrics.mvps<=2.5,`mvps ${report.metrics.mvps}`);
assert.ok(report.metrics.championships>=0.08&&report.metrics.championships<=3.5,`championships ${report.metrics.championships}`);
assert.ok(report.metrics.hallOfFameRate>=0.08&&report.metrics.hallOfFameRate<=0.6,`hallOfFameRate ${report.metrics.hallOfFameRate}`);
assert.ok(report.metrics.retirementAge>=34&&report.metrics.retirementAge<=38.5,`retirementAge ${report.metrics.retirementAge}`);
const old={player:{},atlas:{schema:7,migrations:[]}};migrateAtlas(old);assert.equal(old.atlas.schema,ATLAS_SCHEMA_VERSION);assert.ok(old.atlas.migrations.some(x=>x.id==='balance-tuning'));
console.log('✅ NBA Glory 2.0.13: Balance Tuning dentro de rangos y migración Atlas compatible OK');
