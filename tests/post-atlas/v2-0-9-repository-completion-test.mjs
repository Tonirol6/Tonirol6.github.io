import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createUniverseRepository } from "../../js/core/universe-repository.js";
import { migrateAtlas, ATLAS_SCHEMA_VERSION, ATLAS_GAME_VERSION } from "../../js/core/universe-core.js";
import { migrateNcaaDraft, getProspect } from "../../js/engine/ncaa-draft-engine.js";
import { migrateEuropeanBasketball } from "../../js/engine/european-basketball-engine.js";
import { migrateInternational } from "../../js/engine/international-engine.js";

const game={season:2032,player:{id:"player-user",name:"Repository Test",nationality:"España"},world:{},league:{coaches:{}},universe:{players:[],hallOfFame:[]},seasonResults:[]};
migrateNcaaDraft(game);migrateEuropeanBasketball(game);migrateInternational(game);migrateAtlas(game);
const Universe=createUniverseRepository(game);
const university=game.world.ncaaDraft.universities[0];
const draftClass=game.world.ncaaDraft.classes[0];
const prospect=draftClass.prospects[0];
const club=game.world.europe.clubs[0];
const wonderkidClass=game.world.europe.wonderkidClasses[0];
const wonderkid=wonderkidClass.players[0];
const nationalTeam=game.international.teams[0];

assert.equal(Universe.getUniversity(university.id),university);
assert.equal(Universe.getDraftClass(draftClass.season),draftClass);
assert.equal(Universe.getProspect(prospect.id),prospect);
assert.equal(getProspect(game,prospect.id),prospect);
assert.equal(Universe.getEuropeanClub(club.id),club);
assert.equal(Universe.getWonderkidClass(wonderkidClass.season),wonderkidClass);
assert.equal(Universe.getWonderkid(wonderkid.id),wonderkid);
assert.equal(Universe.getNationalTeam(nationalTeam.id),nationalTeam);
assert.equal(Universe.europeanClubs.info(club.id).source,"game.world.europe.clubs");
assert.equal(game.atlas.schema,ATLAS_SCHEMA_VERSION);
assert.equal(game.atlas.gameVersion,ATLAS_GAME_VERSION);
assert.ok(game.atlas.migrations.some(m=>m.id==="repository-completion"));

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"../..");
const engineDir=path.join(root,"js","engine");
const forbidden=[/TEAMS\.find\s*\(/,/world\.universities\.find\s*\(/,/world\.clubs\.find\s*\(/,/international\.teams\.find\s*\(/,/universe\.players\.find\s*\(/];
const violations=[];
for(const file of fs.readdirSync(engineDir).filter(f=>f.endsWith('.js'))){
 const text=fs.readFileSync(path.join(engineDir,file),'utf8');
 for(const pattern of forbidden)if(pattern.test(text))violations.push(`${file}: ${pattern}`);
}
assert.deepEqual(violations,[]);
console.log("✅ NBA Glory 2.0.9: Repository Completion y entidades persistentes indexadas OK");
