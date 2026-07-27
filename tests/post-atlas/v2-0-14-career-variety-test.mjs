import assert from 'node:assert/strict';
import { createGame, migrateGame, simulateSeason } from '../../js/engine/game-engine.js';
import { getDifficultyProfile, migrateDifficulty, listDifficulties } from '../../js/engine/difficulty-engine.js';

assert.deepEqual(listDifficulties().map(x=>x.id),['easy','normal','hard']);
const easy=createGame({name:'Easy',position:'PG',archetype:'Floor General',difficulty:'easy',seed:'difficulty-test'});
const normal=createGame({name:'Normal',position:'PG',archetype:'Floor General',difficulty:'normal',seed:'difficulty-test'});
const hard=createGame({name:'Hard',position:'PG',archetype:'Floor General',difficulty:'hard',seed:'difficulty-test'});
assert.equal(easy.settings.difficulty,'easy');
assert.equal(normal.settings.difficulty,'normal');
assert.equal(hard.settings.difficulty,'hard');
assert.ok(easy.player.dna.potential>hard.player.dna.potential);
assert.equal(easy.player.hidden.truePotential,easy.player.dna.potential);
assert.equal(getDifficultyProfile('unknown').id,'normal');
const legacy=migrateGame({player:{name:'Legacy',position:'SG',archetype:'Shot Creator',age:20,ovr:72},season:2026,phase:'pathway'});
assert.equal(legacy.settings.difficulty,'normal');
assert.ok(legacy.atlas.schema>=9);
assert.ok(legacy.atlas.migrations.some(m=>m.id==='difficulty-and-career-variety'));
for(const game of [easy,normal,hard]){
  game.player.teamId='BOS'; game.player.contract={yearsLeft:4,salary:4,type:'Rookie',totalYears:4}; game.phase='season';
  migrateDifficulty(game);
  // Difficulty must survive normal season migration and expose pressure state.
  const before=game.settings.difficulty;
  const out=simulateSeason(game);
  assert.equal(out.settings.difficulty,before);
  assert.ok(out.careerMode.difficulty.pressure>=0&&out.careerMode.difficulty.pressure<=100);
}
console.log('✓ v2.0.14 difficulty and career variety');
