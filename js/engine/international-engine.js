import { Random } from "../core/random-engine.js";
import { createUniversalSimulationEngine } from './universal-simulation-engine.js';
import { createUniverseRepository } from '../core/universe-repository.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Random.next()*(max-min+1))+min;
const universalSimulation=createUniversalSimulationEngine();
const pick=a=>a[roll(0,a.length-1)];

export const NATIONAL_TEAMS=Object.freeze([
 {id:'ESP',name:'España',region:'Europe',rating:88,prestige:92,coach:'Sergio Valdés'},
 {id:'USA',name:'Estados Unidos',region:'Americas',rating:96,prestige:100,coach:'Mike Carter'},
 {id:'FRA',name:'Francia',region:'Europe',rating:91,prestige:91,coach:'Laurent Moreau'},
 {id:'SRB',name:'Serbia',region:'Europe',rating:92,prestige:94,coach:'Milan Jovic'},
 {id:'CAN',name:'Canadá',region:'Americas',rating:90,prestige:86,coach:'Daniel Brooks'},
 {id:'GER',name:'Alemania',region:'Europe',rating:88,prestige:84,coach:'Tobias Klein'},
 {id:'AUS',name:'Australia',region:'Oceania',rating:87,prestige:86,coach:'Andrew Mills'},
 {id:'ARG',name:'Argentina',region:'Americas',rating:84,prestige:89,coach:'Mateo García'},
 {id:'GRE',name:'Grecia',region:'Europe',rating:86,prestige:88,coach:'Nikos Pappas'},
 {id:'SLO',name:'Eslovenia',region:'Europe',rating:89,prestige:85,coach:'Marko Kranjc'},
 {id:'LTU',name:'Lituania',region:'Europe',rating:87,prestige:91,coach:'Jonas Petrauskas'},
 {id:'ITA',name:'Italia',region:'Europe',rating:84,prestige:84,coach:'Luca Romano'},
 {id:'TUR',name:'Turquía',region:'Europe',rating:84,prestige:82,coach:'Emre Aydin'},
 {id:'BRA',name:'Brasil',region:'Americas',rating:82,prestige:81,coach:'Rafael Costa'},
 {id:'CRO',name:'Croacia',region:'Europe',rating:84,prestige:88,coach:'Ivan Kovac'},
 {id:'LAT',name:'Letonia',region:'Europe',rating:85,prestige:79,coach:'Janis Berzins'},
 {id:'JPN',name:'Japón',region:'Asia',rating:78,prestige:72,coach:'Kenji Sato'},
 {id:'PUR',name:'Puerto Rico',region:'Americas',rating:79,prestige:78,coach:'Carlos Rivera'}
]);

const aliases={
 'España':'ESP','Estados Unidos':'USA','Francia':'FRA','Serbia':'SRB','Canadá':'CAN','Alemania':'GER','Australia':'AUS','Argentina':'ARG','Grecia':'GRE','Eslovenia':'SLO','Lituania':'LTU','Italia':'ITA','Turquía':'TUR','Brasil':'BRA','Croacia':'CRO','Letonia':'LAT','Japón':'JPN','Puerto Rico':'PUR'
};

function tournamentForSeason(season,region){
 if((season-2028)%4===0)return {id:`olympics-${season}`,type:'olympics',name:'Juegos Olímpicos',season,scope:'world'};
 if((season-2027)%4===0)return {id:`worldcup-${season}`,type:'worldCup',name:'Mundial FIBA',season,scope:'world'};
 if(region==='Europe' && season%2===1)return {id:`eurobasket-${season}`,type:'euroBasket',name:'EuroBasket',season,scope:'Europe'};
 if(region==='Americas' && season%2===1)return {id:`americup-${season}`,type:'ameriCup',name:'AmeriCup',season,scope:'Americas'};
 return null;
}

function ensureTeamState(team){
 return {...team,ranking:0,points:1000+team.rating*12,medals:{gold:0,silver:0,bronze:0},history:[]};
}

export function migrateInternational(game){
 game.international??={version:1,teams:NATIONAL_TEAMS.map(ensureTeamState),tournaments:[],medalTable:{},rankings:[],moments:[],pendingInvitation:null,lastTournament:null};
 game.international.version=1;
 game.international.teams??=NATIONAL_TEAMS.map(ensureTeamState);
 game.international.tournaments??=[];
 game.international.medalTable??={};
 game.international.rankings??=[];
 game.international.moments??=[];
 game.international.pendingInvitation??=null;
 const p=game.player;
 if(p){
  p.international??={teamId:aliases[p.nationality]||null,prestige:0,caps:0,points:0,medals:{gold:0,silver:0,bronze:0},mvps:0,allTournament:0,tournaments:[],declined:0,fatigue:0};
  p.international.medals??={gold:0,silver:0,bronze:0};
  p.international.tournaments??=[];
 }
 updateRankings(game);
 return game;
}

function teamById(game,id){return createUniverseRepository(game).getNationalTeam(id);}
function eligibleTeams(game,tournament){return game.international.teams.filter(t=>tournament.scope==='world'||t.region===tournament.scope);}
function strength(team,playerBoost=0){return universalSimulation.scoreParticipant(team,{competition:'international',boost:playerBoost,variance:9});}

function simulateBracket(game,tournament,userTeamId,userBoost){
 const entrants=[...eligibleTeams(game,tournament)].sort((a,b)=>strength(b,userTeamId===b.id?userBoost:0)-strength(a,userTeamId===a.id?userBoost:0)).slice(0,tournament.scope==='world'?12:10);
 const scored=entrants.map(t=>({team:t,score:strength(t,userTeamId===t.id?userBoost:0)})).sort((a,b)=>b.score-a.score);
 const champion=scored[0].team,finalist=scored[1].team,bronze=scored[2].team;
 return {champion,finalist,bronze,entrants:scored.map(x=>({teamId:x.team.id,score:Math.round(x.score)}))};
}

function medal(game,team,kind){
 team.medals[kind]++;
 game.international.medalTable[team.id]??={gold:0,silver:0,bronze:0};
 game.international.medalTable[team.id][kind]++;
}

function updateRankings(game){
 const ordered=[...game.international.teams].sort((a,b)=>b.points-a.points);
 ordered.forEach((t,i)=>t.ranking=i+1);
 game.international.rankings=ordered.map(t=>({teamId:t.id,name:t.name,ranking:t.ranking,points:Math.round(t.points)}));
}

export function prepareInternationalInvitation(game,seasonData){
 migrateInternational(game);
 const p=game.player,team=teamById(game,p.international.teamId);
 if(!team||p.age<18||p.currentInjury?.severe)return null;
 const tournament=tournamentForSeason(game.season,team.region);
 if(!tournament||game.international.tournaments.some(t=>t.id===tournament.id))return null;
 const form=(p.ovr||70)+(seasonData?.allStar?8:0)+(seasonData?.mvp?12:0)+(seasonData?.champion?5:0);
 const called=form>=72||roll(1,100)<=clamp(form-35,20,95);
 if(!called)return simulateInternationalTournament(game,tournament,{participates:false,aiOnly:true});
 const invitation={type:'internationalInvitation',title:`Convocatoria de ${team.name}`,text:`${team.name} te convoca para disputar ${tournament.name} ${game.season}. Participar puede aumentar tu legado internacional, pero añade fatiga y riesgo de lesión.`,tournament,teamId:team.id,options:[{id:'accept_international',title:'Aceptar la convocatoria',text:`Representar a ${team.name} en ${tournament.name}`},{id:'decline_international',title:'Rechazar y descansar',text:'Recuperar energía, pero perder prestigio internacional'}]};
 game.international.pendingInvitation=invitation;
 return invitation;
}

export function simulateInternationalTournament(game,tournament,{participates=false,aiOnly=false}={}){
 migrateInternational(game);
 const p=game.player,userTeam=teamById(game,p.international.teamId);
 const playerBoost=participates?clamp((p.ovr-70)*.55,0,17):0;
 const result=simulateBracket(game,tournament,participates?userTeam?.id:null,playerBoost);
 medal(game,result.champion,'gold');medal(game,result.finalist,'silver');medal(game,result.bronze,'bronze');
 result.champion.points+=85;result.finalist.points+=55;result.bronze.points+=35;
 const userFinish=userTeam?.id===result.champion.id?'gold':userTeam?.id===result.finalist.id?'silver':userTeam?.id===result.bronze.id?'bronze':null;
 const internationalSimulation=participates?universalSimulation.simulatePlayerCompetition({competition:'international',player:p,team:userTeam,coach:{name:userTeam.coach,development:84,trust:82},minutes:30,chemistry:82,games:roll(5,8)}):null;
 const playerStats=internationalSimulation?{...internationalSimulation.stats,games:internationalSimulation.games,simulationEngine:internationalSimulation.simulationEngine,competitionProfile:internationalSimulation.competitionProfile}:null;
 let mvp=null;
 if(participates&&result.champion.id===userTeam.id&&(playerStats.ppg>=18||p.ovr>=91))mvp=p.name;
 else mvp=`${pick(['Alex','Nikola','Marcus','Victor','Daniel','Luka','Mateo'])} ${pick(['Johnson','Petrovic','Williams','Martin','Kovac','Brown','Silva'])}`;
 const record={simulationEngine:'2.1.0',competitionProfile:'international',universalSimulation:'1.0.0',...tournament,championId:result.champion.id,champion:result.champion.name,finalistId:result.finalist.id,finalist:result.finalist.name,bronzeId:result.bronze.id,bronze:result.bronze.name,mvp,playerParticipated:participates,playerTeamId:userTeam?.id||null,playerFinish:userFinish,playerStats,createdAt:new Date().toISOString()};
 game.international.tournaments.push(record);game.international.lastTournament=record;game.international.pendingInvitation=null;
 if(participates){
  const intl=p.international;intl.caps+=playerStats.games;intl.points+=Math.round(playerStats.ppg*playerStats.games);intl.prestige=clamp(intl.prestige+8+(userFinish==='gold'?18:userFinish==='silver'?11:userFinish==='bronze'?7:2)+(mvp===p.name?12:0),0,100);
  intl.fatigue=clamp(intl.fatigue+roll(8,18),0,40);intl.tournaments.push({id:tournament.id,name:tournament.name,season:tournament.season,finish:userFinish||'eliminado',stats:playerStats,mvp:mvp===p.name});
  if(userFinish)intl.medals[userFinish]++;if(mvp===p.name)intl.mvps++;
  if(roll(1,100)<=Math.max(3,Math.round(intl.fatigue/4))){p.currentInjury={name:'Sobrecarga internacional',games:roll(3,10),severe:false};p.injuryHistory??=[];p.injuryHistory.push({...p.currentInjury,season:game.season,international:true});}
 }
 updateRankings(game);
 game.international.moments.push({season:game.season,type:'international',importance:userFinish==='gold'?96:74,text:`${result.champion.name} gana ${tournament.name}${participates&&userFinish?`. ${p.name} conquista el ${userFinish==='gold'?'oro':userFinish==='silver'?'plata':'bronce'} con ${userTeam.name}`:''}.`});
 return record;
}

export function applyInternationalChoice(game,choiceId){
 migrateInternational(game);const inv=game.international.pendingInvitation||game.pendingDecision;const p=game.player;
 if(!inv?.tournament)return 'No había una convocatoria activa.';
 if(choiceId==='decline_international'){
  p.international.declined++;p.international.prestige=clamp(p.international.prestige-5,0,100);p.morale=clamp((p.morale||70)+3,0,100);
  const rec=simulateInternationalTournament(game,inv.tournament,{participates:false});
  return `Has rechazado la convocatoria. ${rec.champion} gana ${rec.name}.`;
 }
 const rec=simulateInternationalTournament(game,inv.tournament,{participates:true});
 const finish=rec.playerFinish?` y consigues ${rec.playerFinish==='gold'?'el oro':rec.playerFinish==='silver'?'la plata':'el bronce'}`:' y el equipo queda eliminado';
 return `Has disputado ${rec.name} con ${teamById(game,p.international.teamId)?.name}${finish}. ${rec.mvp===p.name?'Además, eres elegido MVP.':''}`;
}

export function getInternationalDashboard(game){
 migrateInternational(game);const p=game.player,team=teamById(game,p.international.teamId);
 return {team,career:p.international,lastTournament:game.international.lastTournament,tournaments:[...game.international.tournaments].reverse(),rankings:game.international.rankings.slice(0,12),medalTable:Object.entries(game.international.medalTable).map(([id,m])=>({team:teamById(game,id)?.name||id,...m})).sort((a,b)=>(b.gold-a.gold)||(b.silver-a.silver)||(b.bronze-a.bronze)),moments:[...game.international.moments].reverse()};
}
