import assert from 'node:assert/strict';
import { createUniversalSimulationEngine, UNIVERSAL_SIMULATION_VERSION } from '../../js/engine/universal-simulation-engine.js';
import { processNcaaDraftSeason } from '../../js/engine/ncaa-draft-engine.js';
import { processEuropeanSeason } from '../../js/engine/european-basketball-engine.js';
import { createGame } from '../../js/engine/game-engine.js';
import { migrateInternational, simulateInternationalTournament } from '../../js/engine/international-engine.js';

let seed=19;const random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
const universal=createUniversalSimulationEngine({random});
const player={name:'Atlas Prospect',ovr:80,age:20,attributes:{handle:78,finishing:80,threePoint:77,midRange:76,iq:82,passing:79,rebounding:70,strength:75,steals:74,blocks:64,perimeterDefense:76,interiorDefense:68}};
for(const competition of ['ncaa','euroleague','gleague','international']){
 const result=universal.simulatePlayerCompetition({competition,player,team:{name:'Atlas Team',strength:84},coach:{name:'Atlas Coach',development:88,trust:80},minutes:29,chemistry:80});
 assert.equal(result.competitionProfile,competition);
 assert.equal(result.universalVersion,UNIVERSAL_SIMULATION_VERSION);
 assert.ok(result.stats.ppg>0);
}
const ranked=universal.rankParticipants([{id:'a',rating:92},{id:'b',rating:70}],{competition:'international',variance:0});
assert.equal(ranked[0].participant.id,'a');

const ncaaGame={season:2030,world:{}};
const ncaa=processNcaaDraftSeason(ncaaGame);
assert.ok(ncaa.prospects.every(p=>p.stats?.competitionProfile==='ncaa'));

const europeGame={season:2030,world:{}};
const europe=processEuropeanSeason(europeGame);
assert.equal(europe.competitionProfile,'euroleague');
assert.equal(europe.universalSimulation,UNIVERSAL_SIMULATION_VERSION);

const intlGame=createGame({name:'Atlas International',position:'SF',archetype:'Point Forward',nationality:'España'});
intlGame.player.age=25;intlGame.player.ovr=90;intlGame.season=2031;migrateInternational(intlGame);
const record=simulateInternationalTournament(intlGame,{id:'world-2031',type:'worldCup',name:'Mundial',season:2031,scope:'world'},{participates:true});
assert.equal(record.competitionProfile,'international');
assert.equal(record.playerStats.competitionProfile,'international');
console.log('✅ Atlas Fase 6 Simulación universal: NCAA, Europa, G League e internacional OK');
