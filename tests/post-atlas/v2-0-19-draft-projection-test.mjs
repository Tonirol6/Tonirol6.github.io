import assert from 'node:assert/strict';
import {createGame} from '../../js/engine/game-engine.js';
import {advancePathway} from '../../js/engine/pathway-engine.js';
import {ATLAS_SCHEMA_VERSION,migrateAtlas} from '../../js/core/universe-core.js';

function reachCollege(game){advancePathway(game,'play_highschool');advancePathway(game,'rest');advancePathway(game,'route_college');const offer=game.player.preDraft.offers[0];advancePathway(game,`program_${offer.id}`);}
const freshman=createGame({name:'Freshman',position:'PG',archetype:'Floor General',difficulty:'normal',seed:'draft-projection'});
reachCollege(freshman);freshman.player.hidden.truePotential=96;freshman.player.potential=96;advancePathway(freshman,'play_season');
const firstPick=freshman.player.preDraft.mockPick;
const senior=structuredClone(freshman);senior.player.preDraft.stage='preDraftSeason';senior.player.preDraft.year=3;senior.player.preDraft.draftProfile.collegeYears=3;senior.player.age=21;senior.player.ovr=Math.max(senior.player.ovr,82);advancePathway(senior,'play_season');
assert.ok(senior.player.ovr>=freshman.player.ovr,'senior should be at least as ready');
assert.ok(senior.player.preDraft.mockPick>firstPick,`freshman ${firstPick}, senior ${senior.player.preDraft.mockPick}`);
assert.ok(senior.player.preDraft.draftProfile.agePenalty>freshman.player.preDraft.draftProfile.agePenalty);
const legacy={player:{},atlas:{schema:13,migrations:[]}};migrateAtlas(legacy);assert.equal(legacy.atlas.schema,ATLAS_SCHEMA_VERSION);assert.ok(legacy.atlas.migrations.some(x=>x.id==='draft-projection'));
console.log('✓ NBA Glory 2.0.19 Draft Projection');
