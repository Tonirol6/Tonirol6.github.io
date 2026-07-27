import assert from 'node:assert/strict';
import {createGame, runDraft, simulateSeason, applyDecision} from '../../js/engine/game-engine.js';
import {migrateAtlas, atlasHealth, ATLAS_SCHEMA_VERSION} from '../../js/core/universe-core.js';
import {auditAtlasIntegrity, compactAtlasJournal} from '../../js/core/atlas-integrity.js';
import {exportGameV2, importGameV2, SAVE_SCHEMA_VERSION} from '../../js/core/save-engine.js';

let game=createGame({name:'Atlas Closure',position:'PG',archetype:'playmaker',nationality:'España'});
game=runDraft(game);
migrateAtlas(game);
assert.ok(ATLAS_SCHEMA_VERSION>=2);
assert.equal(game.atlas.flags.operationAtlas,'closed');
assert.ok(game.atlas.migrations.some(x=>x.to===2));
for(let i=0;i<60;i++){
  game=simulateSeason(game);
  if(game.pendingDecision?.options?.length) game=applyDecision(game,game.pendingDecision.options[0]);
}
const integrity=auditAtlasIntegrity(game);
assert.equal(integrity.ok,true,integrity.issues.join(','));
assert.equal(atlasHealth(game).ok,true);
assert.equal(SAVE_SCHEMA_VERSION,20);
const restored=importGameV2(exportGameV2(game));
assert.equal(restored.season,game.season);
assert.equal(restored.atlas.schema,ATLAS_SCHEMA_VERSION);
restored.atlas.events=Array.from({length:2505},(_,i)=>({id:i}));
assert.equal(compactAtlasJournal(restored,2000),505);
assert.equal(restored.atlas.events.length,2000);
const duplicate={...restored,universe:{...restored.universe,players:[...(restored.universe?.players??[]),{id:restored.player.id}]}};
assert.equal(auditAtlasIntegrity(duplicate).ok,false);
console.log('✅ Atlas Fase 8: cierre, migración v2, integridad y 60 temporadas OK');
