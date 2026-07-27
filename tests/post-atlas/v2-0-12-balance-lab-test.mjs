import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}clear(){this.m.clear()}}
globalThis.localStorage=new MemoryStorage();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const fixture=path.join(__dirname,'balance-lab-fixture.mjs');
const run=()=>JSON.parse(execFileSync(process.execPath,[fixture],{encoding:'utf8'}));
const first=run(), second=run();
const {aggregateBalanceCareers, evaluateBalance, BALANCE_LAB_VERSION}=await import('../../js/engine/balance-lab-engine.js');
assert.ok(BALANCE_LAB_VERSION.startsWith('1.'),`Versión Balance Lab incompatible: ${BALANCE_LAB_VERSION}`);
assert.equal(first.careers.length,3);
assert.deepEqual(first.metrics,second.metrics,'El laboratorio debe ser reproducible entre ejecuciones limpias');
assert.deepEqual(first.careers,second.careers,'Las carreras deben coincidir con la misma semilla');
assert.ok(first.metrics.careerSeasons>0);
const synthetic=aggregateBalanceCareers([{seasons:1,retirementAge:20,peakOvr:99,finalOvr:99,teamsPlayed:9,allStars:20,mvps:10,championships:10,injuries:0,severeInjuries:0,draftPick:1,hallOfFame:true}]);
assert.equal(evaluateBalance(synthetic.metrics).ok,false);
console.log('✅ NBA Glory 2.0.12: Balance Lab reproducible y diagnósticos OK');
