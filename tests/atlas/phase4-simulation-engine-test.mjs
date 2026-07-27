import assert from "node:assert/strict";
import {
  SimulationEngine,
  createSimulationEngine,
  simulatePlayerSeason,
  SIMULATION_ENGINE_VERSION
} from "../../js/engine/simulation-engine.js";

function seededRandom(seed=123456789){
  let value=seed>>>0;
  return ()=>{
    value=(1664525*value+1013904223)>>>0;
    return value/4294967296;
  };
}

const player={
  id:"atlas-player",name:"Atlas Player",age:23,ovr:84,archetype:"Floor General",coachTrust:72,
  attributes:{handle:88,finishing:78,threePoint:82,midRange:80,iq:89,passing:91,rebounding:58,strength:67,steals:76,perimeterDefense:79,blocks:45,interiorDefense:53},
  hidden:{scoring:1,assists:1,rebounds:0},dna:{clutch:81,workEthic:88,hiddenTraits:["Clutch"]},health:{fatigue:20,wear:4}
};
const team={id:"BOS",name:"Boston Celtics",strength:88};
const coach={id:"coach-bos",teamId:"BOS",name:"Coach Atlas",development:87,trust:82,pressure:64};
const input={player,team,coach,injury:null,games:80,minutes:35,chemistry:78,strategy:{winBonus:2,chemistryBonus:1},career:[],isRookie:true};

const first=createSimulationEngine({random:seededRandom(42)}).simulateSeason(input);
const second=createSimulationEngine({random:seededRandom(42)}).simulateSeason(input);
assert.deepEqual(first,second,"La misma semilla debe producir la misma temporada");
assert.equal(first.engineVersion,SIMULATION_ENGINE_VERSION);
assert.ok(first.stats.ppg>=2&&first.stats.ppg<=39);
assert.ok(first.teamResult.wins>=14&&first.teamResult.wins<=68);
assert.equal(typeof first.awards.mvp,"boolean");
assert.ok(Object.isFrozen(first));

const custom=new SimulationEngine({random:seededRandom(7),rules:{playoffWinsThreshold:70}}).simulateSeason(input);
assert.equal(custom.teamResult.playoffs,false,"Las reglas configurables deben aplicarse desde un único motor");

const stats={ppg:20,rpg:5,apg:7,spg:1.2,bpg:.4,per:20};
const copy={...stats};
createSimulationEngine({random:seededRandom(9)}).evaluateAwards({player,stats,teamResult:{wins:50,champion:false,playoffPpg:22},games:61});
assert.deepEqual(stats,copy,"El motor no debe mutar las estadísticas recibidas");

const legacy=simulatePlayerSeason(input);
assert.ok(legacy.ppg,"La API heredada debe seguir operativa");

console.log("✅ Atlas Fase 4 Simulation Engine 2.0: OK");
