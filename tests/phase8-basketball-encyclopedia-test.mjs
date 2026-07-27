import assert from 'node:assert/strict';
import { createGame, advancePreDraft, runDraft, simulateSeason, applyDecision } from '../js/engine/game-engine.js';
import { getEncyclopediaDashboard, getDraftArchive, getCompetitionArchive, getClubArchive, getClubBiography, getNationalTeamArchive, getTimelineArchive, searchEncyclopedia } from '../js/engine/encyclopedia-engine.js';
let game=createGame({name:'Toni Rol',position:'PG',archetype:'Director',nationality:'España'});
while(game.phase==='pathway')game=advancePreDraft(game,'train');
if(game.phase==='draft')game=runDraft(game);
for(let i=0;i<8;i++){
 if(game.phase==='season')game=simulateSeason(game);
 while(game.phase==='decision')game=applyDecision(game,game.pendingDecision?.options?.[0]?.id||'continue');
 if(game.phase==='retired')break;
}
const dashboard=getEncyclopediaDashboard(game);assert.ok(dashboard.stats.seasons>=1);assert.ok(dashboard.stats.players>=30);assert.ok(dashboard.stats.clubs>=18);
assert.ok(getDraftArchive(game).length>=1);const comps=getCompetitionArchive(game);assert.ok(comps.nba.length>=1);assert.ok(comps.europe.length>=1);
const clubs=getClubArchive(game);assert.equal(clubs.length,18);assert.equal(getClubBiography(game,clubs[0].id).id,clubs[0].id);
assert.ok(getNationalTeamArchive(game).length>=18);assert.ok(getTimelineArchive(game).length>=1);assert.ok(searchEncyclopedia(game,clubs[0].name).some(x=>x.type==='club'));
console.log('✅ v1.5.5 Basketball Encyclopedia: OK');
