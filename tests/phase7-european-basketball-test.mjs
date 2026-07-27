import assert from 'node:assert/strict';
import {migrateEuropeanBasketball,processEuropeanSeason,getEuropeanDashboard} from '../js/engine/european-basketball-engine.js';
const game={season:2029,world:{}};migrateEuropeanBasketball(game);let d=getEuropeanDashboard(game);
assert.equal(d.clubs.length,18);assert.ok(d.currentClass.players.length>=3&&d.currentClass.players.length<=8);
const season=processEuropeanSeason(game);assert.ok(season.champion);assert.equal(season.finalFour.length,4);assert.ok(season.acbChampion);assert.ok(season.cupWinner);assert.ok(season.mvp);assert.ok(season.wonderkids.length>=3);
d=getEuropeanDashboard(game);assert.equal(d.seasons.length,1);assert.ok(d.wonderkids.length>=3);assert.ok(d.marketHistory[0].moves.length>=2);
game.season=2030;migrateEuropeanBasketball(game);assert.equal(getEuropeanDashboard(game).currentClass.season,2030);
console.log('✓ European Basketball: Euroliga, ACB, mercado, academias y wonderkids');
