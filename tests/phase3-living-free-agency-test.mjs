class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
globalThis.localStorage=new MemoryStorage();
const {createGame,migrateGame}=await import('../js/engine/game-engine.js');
const {buildFreeAgencyMarket,recordMarketOutcome}=await import('../js/engine/contract-engine.js');
let game=migrateGame(createGame({name:'Market Tester',position:'SF',archetype:'Two Way Wing',nationality:'España'}));
game.season=2032;game.player.teamId='MIA';game.player.age=27;game.player.ovr=92;game.player.allStars=5;game.player.mvps=1;
for(const [id,state] of Object.entries(game.league.franchiseAI.teams)){
 state.lastWins=28+(id.charCodeAt(0)+id.charCodeAt(id.length-1))%34;
 state.salaryFlex=20+(id.charCodeAt(1)||65)%70;
 state.strategy=state.lastWins>=52?'winNow':state.lastWins>=42?'contender':state.lastWins<=27?'tank':'rebuild';
}
const first=buildFreeAgencyMarket(game.player,game.player.teamId,game);
if(first.length<4)throw new Error('El mercado genera pocas ofertas');
if(new Set(first.map(o=>o.teamId)).size!==first.length)throw new Error('Hay equipos duplicados');
if(!first.every(o=>o.capRoom!=null&&o.strategyLabel&&o.reasons?.length>=3))throw new Error('Falta contexto de mercado');
const same=buildFreeAgencyMarket(game.player,game.player.teamId,game);
if(first.map(o=>o.teamId).join(',')!==same.map(o=>o.teamId).join(','))throw new Error('Volver al mercado regenera las ofertas');
const signed=first[0];recordMarketOutcome(game.player,game.season,signed.teamId,first);
game.season++;
const second=buildFreeAgencyMarket(game.player,signed.teamId,game,{forceNew:true});
const rejected=new Set(first.slice(1).map(o=>o.teamId));
if(second.some(o=>rejected.has(o.teamId)))throw new Error('Los equipos rechazados reaparecen inmediatamente');
if(second.length<4)throw new Error('El segundo mercado no mantiene variedad suficiente');
console.log(JSON.stringify({ok:true,first:first.map(o=>o.teamId),second:second.map(o=>o.teamId),signed:signed.teamId}));
