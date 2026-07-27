import { Random } from "../core/random-engine.js";
import { TEAMS } from "../data/teams.js";
import { createUniverseRepository } from "../core/universe-repository.js";

const FIRST=["Nikola","Mateo","Luka","Jayden","Marcus","Noah","Elias","Dario","Alex","Sergio","Theo","Jamal","Milan","Rui","Leo","Adrian","Victor","Jonas","Malik","Tomas","Carlos","Bruno","Iker","Derrick"];
const LAST=["Petrovic","Johnson","Williams","Garcia","Martin","Brown","Diallo","Kovac","Smith","Lopez","Miller","Jovic","Anderson","Santos","Nakamura","Popovic","Taylor","Silva","Wilson","Doncic","Ortega","Green","Moreau","Okafor"];
const COUNTRIES=["España","Estados Unidos","Francia","Serbia","Canadá","Alemania","Grecia","Lituania","Italia","Australia","Eslovenia","Turquía","Brasil","Argentina","Croacia","Letonia","Japón"];
const EURO=["Real Madrid","FC Barcelona","Olympiacos","Panathinaikos","Fenerbahçe","AS Monaco","Paris Basketball","Partizan","Crvena zvezda","Žalgiris Kaunas","Virtus Bologna","Olimpia Milano","Bayern Munich","Joventut Badalona","Gran Canaria"];
const NCAA=["Duke","North Carolina","Kentucky","Kansas","UConn","Gonzaga","UCLA","Houston","Arizona","Purdue","Michigan State","Illinois"];
const POSITIONS=["PG","SG","SF","PF","C"];
const STYLES=["Creador total","Anotador explosivo","Especialista defensivo","Alero versátil","Interior dominante","Tirador de élite","Director cerebral","Energía y rebote"];
const COMPS=["un base cerebral","un anotador imparable","un alero completo","un defensor generacional","un interior moderno","un tirador de época"];
const pick=a=>a[Math.floor(Random.next()*a.length)];
const roll=(a,b)=>Math.floor(Random.next()*(b-a+1))+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round1=n=>Math.round(n*10)/10;
const nbaNames=()=>TEAMS.map(t=>t.name);

function potentialGrade(value){return value>=94?"A+":value>=89?"A":value>=84?"A-":value>=79?"B+":value>=74?"B":"C+";}
function makeCareerStats(){return {seasons:0,games:0,points:0,rebounds:0,assists:0,allStars:0,mvps:0,titles:0,dpoys:0};}
function prospect(season){
  const age=roll(17,20),country=pick(COUNTRIES),route=country==="Estados Unidos"&&Random.next()>.22?"NCAA":"Europa";
  const potential=roll(75,98),position=pick(POSITIONS);
  return {id:`u_${season}_${Random.next().toString(36).slice(2,9)}`,name:`${pick(FIRST)} ${pick(LAST)}`,country,age,position,ovr:roll(59,76),potential,potentialGrade:potentialGrade(potential),route,currentTeam:route==="NCAA"?pick(NCAA):pick(EURO),career:[],careerStats:makeCareerStats(),awards:[],status:"prospect",draftYear:season+roll(1,3),draftPick:null,legacy:0,style:pick(STYLES),comparison:pick(COMPS),injuries:[],retiredSeason:null};
}
function event(universe,season,text,type="world",importance=50,data={}){
  universe.timeline.unshift({season,text,type,importance,data,id:`${season}_${Random.next().toString(36).slice(2,8)}`});
  universe.timeline=universe.timeline.slice(0,180);
}
function seasonLine(p,season){
  const base=Math.max(5,(p.ovr-60)*.72),games=roll(58,82);
  const ppg=round1(base+roll(-20,30)/10),rpg=round1((p.position==="C"||p.position==="PF"?6:3)+(p.ovr-70)*.16+roll(-10,15)/10),apg=round1((p.position==="PG"?5:2)+(p.ovr-70)*.14+roll(-10,15)/10);
  return {season,team:p.currentTeam,status:p.status,age:p.age,ovr:p.ovr,games,ppg,rpg,apg};
}
function recordSeason(p,season){
  if(!["NBA","Europe"].includes(p.status))return;
  const line=seasonLine(p,season);p.career.push(line);p.career=p.career.slice(-25);
  const c=p.careerStats;c.seasons++;c.games+=line.games;c.points+=Math.round(line.ppg*line.games);c.rebounds+=Math.round(line.rpg*line.games);c.assists+=Math.round(line.apg*line.games);
}
function awardPlayer(p,season,universe){
  if(p.status==="NBA"&&p.ovr>=84&&Random.next()<clamp((p.ovr-78)/25,.12,.72)){p.careerStats.allStars++;p.awards.push(`${season}: All-Star`);}
  if(p.ovr>=90&&Random.next()<.20){const award=p.status==="NBA"?"MVP NBA":"MVP EuroLeague";p.awards.push(`${season}: ${award}`);p.careerStats.mvps++;event(universe,season,`${p.name} conquista el ${award} con ${p.currentTeam}.`,"award",84,{playerId:p.id});}
  if(p.status==="NBA"&&p.ovr>=87&&Random.next()<.07){p.careerStats.dpoys++;p.awards.push(`${season}: DPOY`);event(universe,season,`${p.name} es elegido mejor defensor de la NBA.`,"award",76,{playerId:p.id});}
}
function evolveOverall(p){
  const gap=Math.max(0,p.potential-p.ovr);
  let delta=p.age<=22?roll(1,3)+(gap>15?1:0):p.age<=26?roll(0,2):p.age<=30?roll(-1,1):p.age<=33?roll(-2,0):-roll(1,3);
  if(Random.next()<.08){const severe=Random.next()<.25;const games=severe?roll(25,65):roll(5,22);p.injuries.push({season:null,name:severe?"lesión grave de rodilla":"lesión muscular",games,severe});delta-=severe?roll(2,4):1;}
  p.ovr=clamp(p.ovr+delta,52,99);
}
function advancePlayer(p,season,universe){
  p.age++;evolveOverall(p);if(p.injuries.at(-1)?.season===null){p.injuries.at(-1).season=season;event(universe,season,`${p.name} se perderá ${p.injuries.at(-1).games} partidos por una ${p.injuries.at(-1).name}.`,"injury",p.injuries.at(-1).severe?82:58,{playerId:p.id});}
  if(p.status==="prospect"&&season>=p.draftYear){
    const draftScore=p.ovr+p.potential*.25+roll(-8,8);
    if(draftScore>91){p.status="NBA";p.currentTeam=pick(nbaNames());p.draftPick=clamp(Math.round(65-draftScore*.45+roll(-5,7)),1,60);event(universe,season,`${p.name} (${p.country}, ${p.position}) es elegido con el pick #${p.draftPick} por ${p.currentTeam}.`,"draft",78,{playerId:p.id});}
    else{p.status="Europe";p.currentTeam=pick(EURO);event(universe,season,`${p.name} continúa su desarrollo profesional en ${p.currentTeam}.`,"market",46,{playerId:p.id});}
  } else if(p.status==="NBA"&&Random.next()<.11){const old=p.currentTeam;p.currentTeam=pick(nbaNames().filter(x=>x!==old));event(universe,season,`${p.name} cambia ${old} por ${p.currentTeam}.`,"market",55,{playerId:p.id});}
  else if(p.status==="NBA"&&p.age>31&&Random.next()<.12){p.status="Europe";p.currentTeam=pick(EURO);event(universe,season,`${p.name} deja la NBA y firma por ${p.currentTeam}.`,"market",58,{playerId:p.id});}
  else if(p.status==="Europe"&&p.ovr>=82&&p.age<=29&&Random.next()<.17){p.status="NBA";p.currentTeam=pick(nbaNames());event(universe,season,`${p.name}, referente europeo, da el salto a ${p.currentTeam}.`,"market",68,{playerId:p.id});}
  recordSeason(p,season);awardPlayer(p,season,universe);
  p.legacy=Math.round(p.careerStats.points/110+p.careerStats.allStars*24+p.careerStats.mvps*75+p.careerStats.titles*85+p.careerStats.dpoys*35);
  if((p.age>=35&&Random.next()<clamp((p.age-34)*.16,.16,.85))||p.age>=41||p.ovr<=57){p.status="retired";p.retiredSeason=season;event(universe,season,`${p.name} anuncia su retirada tras ${p.careerStats.seasons} temporadas, ${p.careerStats.allStars} All-Star y ${p.careerStats.mvps} MVP.`,"retirement",74,{playerId:p.id});if(p.legacy>=260||p.careerStats.allStars>=6||p.careerStats.mvps>=1)universe.hallOfFame.unshift({...p,inducted:season+5});}
}
function buildDraftClass(universe,season){
  const players=universe.players.filter(p=>p.status==="prospect"&&p.draftYear===season).sort((a,b)=>(b.potential+b.ovr)-(a.potential+a.ovr)).slice(0,12);
  const draft={season,label:`Draft ${season}`,strength:players.length?round1(players.reduce((s,p)=>s+p.potential,0)/players.length):0,players:players.map((p,i)=>({id:p.id,rank:i+1,name:p.name,country:p.country,age:p.age,position:p.position,team:p.currentTeam,ovr:p.ovr,potential:p.potential,potentialGrade:p.potentialGrade,style:p.style,comparison:p.comparison}))};
  universe.draftClasses=[draft,...(universe.draftClasses||[]).filter(d=>d.season!==season)].slice(0,12);
}
function updateTeamRivalries(game,seasonResult,universe){
  const userTeam=game.player?.teamId,series=seasonResult?.nba?.playoffSeries||seasonResult?.playoffSeries||[];
  if(!userTeam||!Array.isArray(series))return;
  for(const s of series){const opponentId=s.opponentId||s.teamId||s.opponent;if(!opponentId)continue;const key=[userTeam,opponentId].sort().join("_");const r=universe.rivalries[key]||{key,teamA:userTeam,teamB:opponentId,meetings:0,userSeriesWins:0,opponentSeriesWins:0,intensity:0,lastSeason:null};r.meetings++;if(s.won||s.result==="win")r.userSeriesWins++;else r.opponentSeriesWins++;r.intensity=clamp(r.intensity+14+(s.games===7?8:0),0,100);r.lastSeason=game.season;universe.rivalries[key]=r;if(r.intensity>=50&&!r.announced){r.announced=true;const Repository=createUniverseRepository(game);event(universe,game.season,`Nace una rivalidad de Playoffs entre ${Repository.getTeam(userTeam)?.name||userTeam} y ${Repository.getTeam(opponentId)?.name||opponentId}.`,"rivalry",80,{key});}}
}
function updateCoaches(game,universe){
  const coaches=game.league?.coaches||{};universe.coachHistory??=[];
  for(const [teamId,coach] of Object.entries(coaches)){const current=universe.coachRegistry[teamId];if(!current||current.name!==coach.name){if(current)universe.coachHistory.unshift({season:game.season,teamId,from:current.name,to:coach.name});universe.coachRegistry[teamId]={name:coach.name,style:coach.style||coach.philosophy||"Equilibrado",trust:coach.trust??50,seasons:coach.seasons??0};}}
  universe.coachHistory=universe.coachHistory.slice(0,40);
}
export function migrateBasketballUniverse(game){
  game.universe??={};const u=game.universe;u.version=2;u.players??=[];u.timeline??=[];u.seasonHistory??=[];u.hallOfFame??=[];u.draftClasses??=[];u.rivalries??={};u.coachRegistry??={};u.coachHistory??=[];u.lastAdvancedSeason??=null;
  while(u.players.length<36)u.players.push(prospect(game.season));for(const p of u.players){p.careerStats??=makeCareerStats();p.career??=[];p.awards??=[];p.injuries??=[];p.potentialGrade??=potentialGrade(p.potential||80);p.style??=pick(STYLES);p.comparison??=pick(COMPS);}
  return u;
}
export function advanceBasketballUniverse(game,seasonResult=null){
  const u=migrateBasketballUniverse(game);if(u.lastAdvancedSeason===game.season)return u;u.lastAdvancedSeason=game.season;
  u.players.filter(p=>p.status!=="retired").forEach(p=>advancePlayer(p,game.season,u));for(let i=0;i<roll(6,10);i++)u.players.push(prospect(game.season));buildDraftClass(u,game.season+1);updateCoaches(game,u);updateTeamRivalries(game,seasonResult,u);
  const result=seasonResult||game.seasonResults?.find(s=>s.season===game.season)||null,active=u.players.filter(p=>p.status!=="retired"),nbaStars=active.filter(p=>p.status==="NBA").sort((a,b)=>b.ovr-a.ovr),euroStars=active.filter(p=>p.status==="Europe").sort((a,b)=>b.ovr-a.ovr);
  const history={season:game.season,nbaChampion:result?.nba?.champion||pick(nbaNames()),euroChampion:result?.europe?.champion||pick(EURO),ncaaChampion:result?.ncaa?.champion||pick(NCAA),nbaMvp:result?.nba?.mvp||nbaStars[0]?.name||"—",euroMvp:result?.europe?.mvp||euroStars[0]?.name||"—",seasonResultVersion:result?.version||1};
  const idx=u.seasonHistory.findIndex(x=>x.season===game.season);if(idx>=0)u.seasonHistory[idx]=history;else u.seasonHistory.unshift(history);event(u,game.season,`${history.nbaChampion} gana la NBA; ${history.euroChampion} conquista Europa y ${history.ncaaChampion} gana el March Madness.`,"champions",88);
  return u;
}
export function getUniverseStars(game){return migrateBasketballUniverse(game).players.filter(p=>p.status!=="retired").sort((a,b)=>(b.legacy+b.ovr*4)-(a.legacy+a.ovr*4)).slice(0,12);}
export function getUniverseTimeline(game){return migrateBasketballUniverse(game).timeline.slice(0,16);}
export function getUniverseHistory(game){return migrateBasketballUniverse(game).seasonHistory.slice(0,10);}
export function getUniverseHallOfFame(game){return migrateBasketballUniverse(game).hallOfFame.slice(0,10);}
export function getDraftClasses(game){return migrateBasketballUniverse(game).draftClasses;}
export function getLatestDraftClass(game){return migrateBasketballUniverse(game).draftClasses[0]||null;}
export function getUniverseRivalries(game){return Object.values(migrateBasketballUniverse(game).rivalries).sort((a,b)=>b.intensity-a.intensity);}
export function getCoachHistory(game){return migrateBasketballUniverse(game).coachHistory;}
export function getUniversePlayer(game,id){migrateBasketballUniverse(game);return createUniverseRepository(game).getPlayer(id);}
