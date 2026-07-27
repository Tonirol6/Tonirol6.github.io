class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
globalThis.localStorage=new MemoryStorage();
const {createGame,saveGame,loadGame,migrateGame}=await import('../js/engine/game-engine.js');
const {advanceBasketballUniverse}=await import('../js/engine/basketball-universe-engine.js');
const {recordEncyclopediaSeason}=await import('../js/engine/encyclopedia-engine.js');
const {diagnoseGame}=await import('../js/engine/health-engine.js');
let game=createGame({name:'Beta Tester',position:'PG',archetype:'playmaker',nationality:'España'});
if(!saveGame(game).ok)throw new Error('No se pudo guardar');
let loaded=loadGame();if(!loaded?.player)throw new Error('No se pudo cargar');
loaded=migrateGame(loaded);
for(let season=2026;season<=2060;season++){loaded.season=season;advanceBasketballUniverse(loaded);recordEncyclopediaSeason(loaded,season);}
const health=diagnoseGame(loaded);
if(!health.ok)throw new Error(health.issues.join(', '));
if(health.historicalSeasons<30)throw new Error('Historial incompleto');
if(loaded.universe.timeline.length>180)throw new Error('Timeline sin límite');
console.log(JSON.stringify({ok:true,seasons:health.historicalSeasons,players:health.universePlayers,bytes:health.bytes}));
