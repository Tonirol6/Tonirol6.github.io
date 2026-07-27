class MemoryStorage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
globalThis.localStorage=new MemoryStorage();
const {createGame,migrateGame}=await import('../js/engine/game-engine.js');
const {evaluateAwards,simulateTeamSeason}=await import('../js/engine/simulation-engine.js');
const {createSeasonResult}=await import('../js/engine/season-result-engine.js');
const {advanceBasketballUniverse}=await import('../js/engine/basketball-universe-engine.js');
const {recordEncyclopediaSeason,getEncyclopediaSeason}=await import('../js/engine/encyclopedia-engine.js');
const {TEAMS}=await import('../js/data/teams.js');
let game=migrateGame(createGame({name:'Toni Test',position:'PG',archetype:'Floor General',nationality:'España'}));
const team=TEAMS.find(t=>t.id==='MIA');game.player.teamId=team.id;game.player.age=27;game.player.ovr=95;game.player.career=[];
const stats={ppg:32.8,rpg:7.1,apg:10.4,spg:1.8,bpg:.5,per:31.2,games:78};
const teamResult={wins:61,playoffs:true,roundsWon:4,champion:true,playoffExit:'Campeón NBA',playoffPpg:34.1};
const awards=evaluateAwards({player:game.player,stats,teamResult,games:78,isRookie:false});
if(!awards.mvp)throw new Error('Una temporada histórica no recibió MVP');
if(!awards.finalsMvp)throw new Error('Un campeón dominante no recibió Finals MVP');
if(awards.allNba!=='First Team')throw new Error('All-NBA incoherente');
const result=createSeasonResult(game,{team,teamResult,stats,awards,games:78,minutes:36});
advanceBasketballUniverse(game,result);recordEncyclopediaSeason(game,game.season,result);
const enc=getEncyclopediaSeason(game,game.season);
const hist=game.universe.seasonHistory.find(x=>x.season===game.season);
if(result.nba.champion!==team.name||enc.nba.champion!==team.name||hist.nbaChampion!==team.name)throw new Error('Fuentes de campeón incoherentes');
// Verifica que una racha larga reduzca las probabilidades y no garantice el título.
game.player.career=Array.from({length:5},(_,i)=>({season:2021+i,champion:true}));
const coach=game.league.coaches[team.id];
const playoff=simulateTeamSeason({player:game.player,team,coach,stats:{...stats,fgPct:52,threePct:40,ftPct:88},chemistry:90,strategy:{winBonus:2,chemistryBonus:2},career:game.player.career});
if(playoff.dynastyPenalty<18)throw new Error('La penalización de dinastía no está activa');
if(!Array.isArray(playoff.series))throw new Error('No hay simulación por series');
console.log(JSON.stringify({ok:true,champion:enc.nba.champion,mvp:enc.nba.mvp,mvpScore:awards.mvpScore,dynastyPenalty:playoff.dynastyPenalty}));
