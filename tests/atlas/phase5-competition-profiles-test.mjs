import assert from "node:assert/strict";
import {
  CompetitionProfileRegistry, getCompetitionProfile, listCompetitionProfiles,
  validateCompetitionProfile, NBA_PROFILE, NCAA_PROFILE, EUROLEAGUE_PROFILE,
  GLEAGUE_PROFILE, INTERNATIONAL_PROFILE
} from "../../js/engine/competition-profiles.js";
import { createSimulationEngine, SIMULATION_ENGINE_VERSION } from "../../js/engine/simulation-engine.js";

function seededRandom(seed=1){let value=seed>>>0;return ()=>{value=(1664525*value+1013904223)>>>0;return value/4294967296;};}
const player={id:"p",name:"Atlas",age:22,ovr:84,archetype:"Floor General",coachTrust:72,attributes:{handle:88,finishing:78,threePoint:82,midRange:80,iq:89,passing:91,rebounding:58,strength:67,steals:76,perimeterDefense:79,blocks:45,interiorDefense:53},hidden:{},dna:{},health:{}};
const team={id:"T",name:"Team",strength:84};
const coach={id:"c",name:"Coach",development:82,trust:80,pressure:60};
const input={player,team,coach,injury:null,games:30,minutes:34,chemistry:75,strategy:{},career:[],isRookie:false};

assert.equal(listCompetitionProfiles().length,5);
assert.equal(getCompetitionProfile("europe"),EUROLEAGUE_PROFILE);
assert.equal(getCompetitionProfile("g-league"),GLEAGUE_PROFILE);
assert.equal(getCompetitionProfile("fiba"),INTERNATIONAL_PROFILE);
assert.equal(NBA_PROFILE.gamesPerSeason,82);
assert.equal(NCAA_PROFILE.playoffRounds,6);
assert.ok(Object.isFrozen(NBA_PROFILE));
assert.ok(Object.isFrozen(NBA_PROFILE.awardRules));
assert.equal(validateCompetitionProfile({}).ok,false);
assert.throws(()=>getCompetitionProfile("unknown"),/Unknown competition profile/);

const nba=createSimulationEngine({random:seededRandom(10)});
assert.equal(nba.profile.id,"nba");
assert.equal(nba.rules.regularSeasonGames,82);
const euro=createSimulationEngine({random:seededRandom(10),competition:"euroleague"});
assert.equal(euro.rules.regularSeasonGames,34);
assert.equal(euro.rules.playoffRounds,3);
const result=euro.simulateSeason(input);
assert.equal(result.engineVersion,SIMULATION_ENGINE_VERSION);
assert.equal(result.competitionProfile,"euroleague");
assert.ok(result.stats.ppg<=43);
assert.ok(result.teamResult.wins<=EUROLEAGUE_PROFILE.maxTeamWins);

const registry=new CompetitionProfileRegistry({});
const custom=registry.register({...NBA_PROFILE,id:"atlas-cup",name:"Atlas Cup",gamesPerSeason:12,playoffRounds:2,playoffRoundNames:["Semifinal","Final"]});
assert.equal(registry.require("atlas-cup"),custom);
assert.throws(()=>registry.register({id:"bad",name:"Bad"}),/Invalid competition profile/);

console.log("✅ Atlas Fase 5 Competition Profiles: OK");
