import { migrateBasketballUniverse, advanceBasketballUniverse, getLatestDraftClass, getUniverseStars, getUniverseTimeline, getCoachHistory } from '../js/engine/basketball-universe-engine.js';
import { TEAMS } from '../js/data/teams.js';
let seed=1337;Math.random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
const coaches=Object.fromEntries(TEAMS.map((t,i)=>[t.id,{name:`Coach ${i}`,style:i%2?'Defensivo':'Ofensivo',trust:50,seasons:1}]));
const game={season:2027,player:{teamId:'MIA'},league:{coaches},universe:null};
migrateBasketballUniverse(game);
for(let y=2027;y<=2048;y++){game.season=y;if(y===2032)game.league.coaches.MIA={name:'Nuevo Coach',style:'Equilibrado',trust:58,seasons:0};advanceBasketballUniverse(game,{version:2,nba:{champion:y%2?'Miami Heat':'Boston Celtics',mvp:'Estrella IA',playoffSeries:[]},europe:{champion:'Real Madrid'},ncaa:{champion:'Duke'}});}
const draft=getLatestDraftClass(game),stars=getUniverseStars(game),timeline=getUniverseTimeline(game),coachHistory=getCoachHistory(game);
if(!draft?.players?.length)throw new Error('No se generó clase de Draft');
if(!draft.players.every(p=>p.potentialGrade&&p.style&&p.comparison))throw new Error('Prospectos incompletos');
if(!stars.some(p=>p.careerStats?.seasons>0))throw new Error('Las estrellas no guardan carrera');
if(!timeline.some(e=>['retirement','draft','injury','award'].includes(e.type)))throw new Error('Cronología poco variada');
if(!coachHistory.length)throw new Error('No se registró cambio de entrenador');
console.log(JSON.stringify({ok:true,draft:draft.label,prospects:draft.players.length,activeStars:stars.length,hallOfFame:game.universe.hallOfFame.length,coachChanges:coachHistory.length,timelineTypes:[...new Set(timeline.map(e=>e.type))]}));
