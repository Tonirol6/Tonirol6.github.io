import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Random, RandomEngine, initializeRandom, persistRandomState} from "../../js/core/random-engine.js";
import {createGame, runDraft, simulateSeason} from "../../js/engine/game-engine.js";
import {ATLAS_SCHEMA_VERSION} from "../../js/core/universe-core.js";

const sequenceA=new RandomEngine("atlas-seed");
const valuesA=Array.from({length:20},()=>sequenceA.next());
const sequenceB=new RandomEngine("atlas-seed");
assert.deepEqual(valuesA,Array.from({length:20},()=>sequenceB.next()));

const snapshot=sequenceA.snapshot();
const continuationA=Array.from({length:10},()=>sequenceA.next());
const restoredEngine=new RandomEngine(1).restore(snapshot);
assert.deepEqual(continuationA,Array.from({length:10},()=>restoredEngine.next()));

let first=createGame({name:"Seed Player",position:"PG",archetype:"Floor General",nationality:"España",seed:"career-208"});
let second=createGame({name:"Seed Player",position:"PG",archetype:"Floor General",nationality:"España",seed:"career-208"});
first=runDraft(first); second=runDraft(second);
assert.equal(first.player.draftPick,second.player.draftPick);
assert.equal(first.player.teamId,second.player.teamId);
first=simulateSeason(first); second=simulateSeason(second);
assert.deepEqual(
  {summary:first.lastSummary,decision:first.pendingDecision?.type,random:first.atlas.random},
  {summary:second.lastSummary,decision:second.pendingDecision?.type,random:second.atlas.random}
);
assert.equal(first.atlas.schema,ATLAS_SCHEMA_VERSION);
assert.equal(first.atlas.random.version,"1.0.0");
assert.ok(first.atlas.random.calls>0);

const portable=JSON.parse(JSON.stringify(first));
initializeRandom(portable);
const expected=[Random.next(),Random.next(),Random.next()];
initializeRandom(first);
assert.deepEqual(expected,[Random.next(),Random.next(),Random.next()]);
persistRandomState(first);

const here=path.dirname(fileURLToPath(import.meta.url));
const jsRoot=path.resolve(here,"../../js");
const files=[];
const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);entry.isDirectory()?walk(full):entry.name.endsWith(".js")&&files.push(full);}};
walk(jsRoot);
const directRandom=files.filter(file=>file!==path.join(jsRoot,"core/random-engine.js")&&fs.readFileSync(file,"utf8").includes("Math.random"));
assert.deepEqual(directRandom,[]);
console.log("✅ NBA Glory 2.0.8: Random Engine global, persistente y reproducible OK");
