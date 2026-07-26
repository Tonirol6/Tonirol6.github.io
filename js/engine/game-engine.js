import { saveTransactional, loadWithRecovery, clearTransactional, SCHEMA_VERSION } from "./persistence-engine.js";
import { stabilizeGame } from "./health-engine.js";
import { migrateBasketballUniverse, advanceBasketballUniverse } from "./basketball-universe-engine.js";
import { migrateEncyclopedia, recordEncyclopediaSeason } from "./encyclopedia-engine.js";

import { TEAMS } from "../data/teams.js";
import { EVENT_TYPES, addEvent, migrateHistory } from "./story-engine.js";
import { migrateLegacy, updateRecords, finalizeLegacy } from "./legacy-engine.js";
import { migrateLeagueLife, processLeagueSeason } from "./league-life-engine.js";
import { createPlayer, migratePlayer, progressPlayer, trainPlayer, refreshPlayer } from "./player-engine.js";
import { simulatePlayerSeason, simulateTeamSeason, evaluateAwards } from "./simulation-engine.js";
import { migrateBalance, prepareLeagueSeason, normalizeSeasonStats, calculateDevelopmentDelta, recordLeagueSeason } from "./balance-engine.js";
import { migrateCareerProfile, processCareerSeason, applyCareerDecision } from "./career-engine.js";
import { migrateCareerEvents, ensureSeasonObjectives, evaluateSeasonObjectives, generateDynamicEvent, applyDynamicEventChoice } from "./career-events-engine.js";
import { migrateMedia, seedSeasonFeed, generatePressConference, applyPressChoice } from "./media-engine.js";
import { migrateContracts, buildFreeAgencyMarket, counterOffer, signContract, recordSeasonSalary } from "./contract-engine.js";
import { migrateCareerNarrative, buildDocumentary } from "./career-narrative-engine.js";
import { migrateTradeDeadline, generateTradeDeadline, applyTradeDeadlineChoice } from "./trade-deadline-engine.js";
import { migrateFranchiseAI, processOffseason } from "./franchise-ai-engine.js";
import { migratePathway, startPathway, advancePathway } from "./pathway-engine.js";
import { migrateBetaBalance, calculateInjury, finishHealthSeason, calculateMinutes, updateMarketValue, rebalanceFranchises } from "./beta-balance-engine.js";
import { migrateImmersion, recordImmersionSeason } from "./immersion-engine.js";

const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const roll = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
const round1 = n => Math.round(n*10)/10;
const money = n => `${round1(n)} M$`;

const COACH_STYLES = [
  {id:"developer", name:"Formador", development:10, trust:7, pressure:-3},
  {id:"tactician", name:"Estratega", development:3, trust:3, pressure:2},
  {id:"defensive", name:"Especialista defensivo", development:4, trust:2, pressure:1},
  {id:"strict", name:"Disciplinario", development:6, trust:-3, pressure:7},
  {id:"players", name:"Gestor de vestuario", development:3, trust:9, pressure:-5}
];

function randomCoach(team) {
  const style = COACH_STYLES[roll(0,COACH_STYLES.length-1)];
  const first = ["Marcus","David","Erik","James","Mike","Adrian","Chris","Nate","Victor","Sam"][roll(0,9)];
  const last = ["Reed","Coleman","Foster","Hayes","Brooks","Miller","Price","Bennett","Turner","Ward"][roll(0,9)];
  return {...style, name:`${first} ${last}`, teamId:team.id, seasons:0};
}

function rookieContract(pick) {
  const years = pick <= 30 ? 4 : 3;
  const salary = pick <= 5 ? 10 : pick <= 14 ? 6.5 : pick <= 30 ? 3.8 : 1.8;
  return {yearsLeft:years, salary, type:"Rookie", totalYears:years};
}

export function migrateGame(game) {
  if (!game) return null;
  game.version = SCHEMA_VERSION;
  migrateHistory(game);
  game.league ??= {};
  game.league.coaches ??= Object.fromEntries(TEAMS.map(t=>[t.id,randomCoach(t)]));
  const p = migratePlayer(game.player);
  p.contract ??= p.teamId ? rookieContract(p.draftPick || 30) : null;
  p.tradeRequests ??= 0;
  p.injuryHistory ??= [];
  p.currentInjury ??= null;
  p.role ??= "Rotación";
  p.coachTrust ??= 55;
  migrateCareerProfile(p);
  migrateContracts(p);
  p.seasonsWithTeam ??= 0;
  p.teamsPlayed ??= p.teamId ? [p.teamId] : [];
  migrateLegacy(game);
  migrateLeagueLife(game);
  migrateBalance(game);
  migrateCareerEvents(game);
  migrateMedia(game);
  migrateCareerNarrative(game);
  migrateTradeDeadline(game);
  migrateFranchiseAI(game);
  migratePathway(game);
  migrateBasketballUniverse(game);
  migrateEncyclopedia(game);
  migrateBetaBalance(game);
  migrateImmersion(game);
  if(game.phase==="season")ensureSeasonObjectives(game);
  return stabilizeGame(game);
}

export function createGame({name, position, archetype, nationality="España"}) {
  const player=createPlayer({name,position,archetype,age:19,baseOvr:roll(70,76)});
  Object.assign(player,{nationality,morale:75,teamId:null,draftPick:null,championships:0,mvps:0,allStars:0,career:[],contract:null,tradeRequests:0,injuryHistory:[],currentInjury:null,role:"Prospecto",coachTrust:55,seasonsWithTeam:0,teamsPlayed:[],hidden:{workEthic:player.dna.workEthic,durability:clamp(100-player.dna.injuryRisk*1.4,55,95),clutch:player.dna.clutch,scoring:0,assists:0,rebounds:0,loyalty:roll(45,95),ego:roll(35,90)}});
  const game=migrateGame({version:16,season:2026,phase:"pathway",league:{coaches:Object.fromEntries(TEAMS.map(t=>[t.id,randomCoach(t)]))},player,pendingDecision:null,lastSummary:null});
  return startPathway(game);
}

export function runDraft(game) {
  game = migrateGame(game);
  const p=refreshPlayer(game.player);
  const pathwayStock=p.preDraft?.stock??50;
  const draftScore=p.ovr*.58+p.potential*.24+pathwayStock*.18+roll(-5,5);
  const projected=p.preDraft?.mockPick;
  const pick=clamp(projected?Math.round(projected+roll(-4,4)):Math.round(61-(draftScore-65)*2.4),1,60);
  const candidates=TEAMS.map((team,index)=>{
    const needBonus=team.need===p.position?12:0;
    const developmentBonus=(team.development-65)/5;
    const pickFit=-Math.abs((index*2+1)-pick)/8;
    return {team,score:needBonus+developmentBonus+pickFit+Math.random()*8};
  }).sort((a,b)=>b.score-a.score);
  const team=candidates[0].team;
  p.teamId=team.id; p.draftPick=pick; p.contract=rookieContract(pick);
  p.teamsPlayed=[team.id]; p.role=pick<=14?"Rotación":"Proyecto";
  game.phase="season";
  ensureSeasonObjectives(game);
  addEvent(game,{type:EVENT_TYPES.PLAYER_DRAFTED,season:game.season,teamId:team.id,data:{playerName:p.name,pick,teamName:team.name,contractYears:p.contract.totalYears,salary:p.contract.salary}});
  game.lastSummary=`${p.name} ha sido elegido en el pick ${pick} por ${team.name}. Firma un contrato rookie de ${p.contract.totalYears} años por ${money(p.contract.salary)} por temporada.`;
  saveGame(game); return game;
}

function injuryFor(game, context) { return calculateInjury(game,context); }

function updateRole(p) {
  p.role = p.ovr>=90?"Superestrella":p.ovr>=84?"Titular":p.ovr>=78?"Sexto hombre":p.ovr>=73?"Rotación":"Proyecto";
}

function possibleCoachChange(game,team) {
  const coach=game.league.coaches[team.id];
  coach.seasons++;
  if(roll(1,100)<=10 || coach.seasons>=7){
    const old=coach.name;
    game.league.coaches[team.id]=randomCoach(team);
    return `${old} deja el banquillo. El nuevo entrenador es ${game.league.coaches[team.id].name}.`;
  }
  return "";
}

export function simulateSeason(game) {
  game=migrateGame(game);
  const deadline=generateTradeDeadline(game);
  if(deadline){ game.pendingDecision=deadline; game.phase="decision"; game.lastSummary="La temporada se detiene en la fecha límite de traspasos."; saveGame(game); return game; }
  const p=refreshPlayer(game.player), team=TEAMS.find(t=>t.id===p.teamId), coach=game.league.coaches[p.teamId];
  updateRole(p);
  const projectedMinutes=calculateMinutes(p,team,coach);
  const injury=injuryFor(game,{minutes:projectedMinutes,games:82});
  const missed=injury?injury.games:roll(0,4);
  const games=clamp(82-missed,14,82);
  if(injury){
    p.currentInjury=injury; p.injuryHistory.push({...injury,season:game.season});
    addEvent(game,{type:EVENT_TYPES.PLAYER_INJURY,season:game.season,teamId:team.id,importance:injury.severe?82:46,data:{playerName:p.name,name:injury.name,games:injury.games,severe:injury.severe,teamName:team.name}});
  }
  else p.currentInjury=null;

  const leagueContext=prepareLeagueSeason(game,TEAMS);
  const minutes=round1(clamp(projectedMinutes+roll(-2,2),7,39));
  const chemistry=clamp((p.morale+p.coachTrust)/2,25,100);
  const advanced=normalizeSeasonStats(simulatePlayerSeason({player:p,team,coach,injury,games,minutes,chemistry}),p);
  const teamResult=simulateTeamSeason({player:p,team,coach,stats:advanced,chemistry,strategy:leagueContext.strategy});
  const {wins:teamWins,playoffs,champion}=teamResult;
  const {allStar,mvp}=evaluateAwards({player:p,stats:advanced,teamResult});
  const {ppg,rpg,apg}=advanced;
  if(champion){
    p.championships++;
    addEvent(game,{type:EVENT_TYPES.PLAYER_CHAMPION,season:game.season,teamId:team.id,data:{playerName:p.name,teamName:team.name,championships:p.championships}});
  }
  if(allStar){
    p.allStars++;
    addEvent(game,{type:EVENT_TYPES.PLAYER_ALL_STAR,season:game.season,teamId:team.id,data:{playerName:p.name,teamName:team.name,allStars:p.allStars,ppg}});
  }
  if(mvp){
    p.mvps++;
    addEvent(game,{type:EVENT_TYPES.PLAYER_MVP,season:game.season,teamId:team.id,data:{playerName:p.name,teamName:team.name,mvps:p.mvps,ppg,wins:teamWins}});
  }

  const progress=calculateDevelopmentDelta({player:p,coach,minutes,games,role:p.role,injury});
  progressPlayer(p,{amount:progress,severeInjury:!!injury?.severe});
  if(injury?.ovrPenalty)progressPlayer(p,{amount:injury.ovrPenalty,severeInjury:true});
  finishHealthSeason(game,{minutes,games,injury});
  p.coachTrust=clamp(p.coachTrust+roll(-3,4)+(allStar?4:0)+(ppg<10?-3:0)+coach.trust/5,20,100);
  p.seasonsWithTeam++;
  recordSeasonSalary(p);
  p.contract.yearsLeft--;

  const coachNews=possibleCoachChange(game,team);
  const seasonData={
    season:game.season,age:p.age,team:team.name,teamId:team.id,games,minutes,ppg,rpg,apg,
    spg:advanced.spg,bpg:advanced.bpg,turnovers:advanced.turnovers,fgPct:advanced.fgPct,
    threePct:advanced.threePct,ftPct:advanced.ftPct,threesMade:advanced.threesMade,
    usage:advanced.usage,per:advanced.per,wins:teamWins,playoffs,roundsWon:teamResult.roundsWon,
    playoffExit:teamResult.playoffExit,playoffPpg:teamResult.playoffPpg,champion,allStar,mvp,
    ovrAfter:p.ovr,role:p.role,injury:injury?.name||null,contractYears:p.contract.yearsLeft,coach:coach.name,
    teamStrategy:leagueContext.strategy.label,draftClass:leagueContext.draftClass.label,developmentChange:progress
  };
  p.career.push(seasonData);
  updateMarketValue(game,seasonData);
    processCareerSeason(p,seasonData);
  if(p.career.length===1){
    addEvent(game,{type:EVENT_TYPES.PLAYER_DEBUT,season:game.season,teamId:team.id,data:{playerName:p.name,teamName:team.name,games,ppg}});
  }
  addEvent(game,{type:EVENT_TYPES.SEASON_FINISHED,season:game.season,teamId:team.id,data:{playerName:p.name,teamName:team.name,games,ppg,rpg,apg,spg:advanced.spg,bpg:advanced.bpg,per:advanced.per,wins:teamWins,playoffs,playoffExit:teamResult.playoffExit,champion,allStar,mvp}});
  if(coachNews){
    addEvent(game,{type:EVENT_TYPES.COACH_CHANGED,season:game.season,teamId:team.id,data:{teamName:team.name,summary:coachNews}});
  }
  updateRecords(game,game.season);
  processLeagueSeason(game,seasonData);
  advanceBasketballUniverse(game);
  recordEncyclopediaSeason(game,game.season);
  const offseason=processOffseason(game,seasonData);
  rebalanceFranchises(game);
  seasonData.offseason={moves:offseason.moves.length,coachChanges:offseason.coachChanges.length,retirements:offseason.retirements.length,strategyChanges:offseason.strategyChanges.length};
  recordLeagueSeason(game,{teamId:team.id,wins:teamWins,strategy:leagueContext.strategy,draftClass:leagueContext.draftClass});
  const objectiveResults=evaluateSeasonObjectives(game,seasonData);
  seedSeasonFeed(game,seasonData);
  recordImmersionSeason(game,seasonData);
  seasonData.objectives=objectiveResults.map(o=>({title:o.title,status:o.status,value:o.value,target:o.target,unit:o.unit}));
  game.lastSummary=buildSummary(p,seasonData,coachNews)+` Offseason: ${seasonData.offseason.moves} movimientos, ${seasonData.offseason.coachChanges} cambios de entrenador y ${seasonData.offseason.retirements} retiradas. Objetivos: ${objectiveResults.filter(o=>o.status==="completed").length}/${objectiveResults.length} completados.`;
  game.pendingDecision=generatePressConference(game,seasonData);
  game.phase="decision";
  saveGame(game); return game;
}

function buildSummary(p,s,coachNews) {
  const achievement=s.champion?"La temporada terminó con un campeonato."
    :s.mvp?"Tu rendimiento te convirtió en MVP de la liga."
    :s.allStar?"Fuiste seleccionado para el All-Star."
    :s.playoffs?`El equipo terminó su camino en ${s.playoffExit.toLowerCase()}.`:"El equipo quedó fuera de los Playoffs.";
  const injury=s.injury?` Una ${s.injury.toLowerCase()} limitó tu temporada.`:"";
  return `${p.name} disputó ${s.games} partidos como ${s.role} y promedió ${s.ppg} puntos, ${s.rpg} rebotes y ${s.apg} asistencias, con ${s.fgPct}% en tiros y ${s.per} de eficiencia.${injury} ${achievement} El equipo afrontó el año en modo ${s.teamStrategy.toLowerCase()} y la próxima camada fue catalogada como ${s.draftClass.toLowerCase()}.${coachNews?` ${coachNews}`:""}`;
}

function makeDecision(game) {
  const p=refreshPlayer(game.player), team=TEAMS.find(t=>t.id===p.teamId);
  if(p.contract.yearsLeft<=0){
    const offers=buildFreeAgencyMarket(p,team.id);
    return {type:"freeAgencyMarket",title:"Agencia libre",text:"Compara proyectos, rol, encaje y valor total antes de abrir una negociación.",offers,options:offers.filter(o=>o.status!=="withdrawn").map(o=>({id:`review_${o.teamId}`,title:o.teamName,text:`${o.years} años · ${money(o.salary)}/año · ${o.role} · Encaje ${o.fit}%`,offerId:o.id}))};
  }
  const base=[
    {id:"shooting",title:"Entrenar tiro",text:"+ anotación, ligera fatiga",apply:{scoring:1,workEthic:1,morale:-1}},
    {id:"body",title:"Mejorar el físico",text:"+ rebote y durabilidad",apply:{rebounds:1,durability:2,morale:-1}},
    {id:"vision",title:"Trabajar la visión",text:"+ asistencias y confianza del entrenador",apply:{assists:1,coachTrust:4,morale:0}},
    {id:"rest",title:"Descansar",text:"+ moral y durabilidad",apply:{durability:1,morale:5}},
    {id:"coach",title:"Hablar con el entrenador",text:"+ confianza, riesgo de tensión",apply:{coachTrust:roll(2,7),morale:roll(-2,2)}}
  ];
  if(p.seasonsWithTeam>=3 && (p.morale<80 || p.hidden.ego>70))base.push({id:"trade",title:"Pedir un traspaso",text:"Puedes cambiar de equipo, pero dañará tu reputación interna",special:"trade"});
  const shuffled=base.sort(()=>Math.random()-.5),trade=shuffled.find(o=>o.special==="trade");
  const selected=shuffled.filter(o=>o.special!=="trade").slice(0,trade?2:3);if(trade)selected.push(trade);
  return {type:"summer",title:"Decisión de verano",options:selected};
}

function openContractNegotiation(game,offer){
  return {type:"contractNegotiation",title:`Negociación con ${offer.teamName}`,text:`${offer.pitch}. Te ofrecen ${offer.years} años por ${money(offer.salary)} anuales (${money(offer.totalValue)} totales), con rol de ${offer.role} y ${offer.promisedMinutes} minutos prometidos.`,offer,options:[
    {id:"accept_contract",title:"Aceptar la oferta",text:`Firmar por ${offer.totalValue} M$ totales`},
    ...(offer.negotiable?[{id:"counter_contract",title:"Presentar contraoferta",text:"Pedir más salario. El equipo puede mejorar, mantener o retirar la oferta."}]:[]),
    {id:"back_market",title:"Comparar otras ofertas",text:"Volver al mercado sin cerrar esta propuesta"}
  ]};
}

export function applyDecision(game,id) {
  game=migrateGame(game);
  const p=game.player, choice=game.pendingDecision.options.find(o=>o.id===id);
  if(!choice)return game;
  let decisionText=choice.title;

  if(game.pendingDecision.type==="tradeDeadline"){
    decisionText=applyTradeDeadlineChoice(game,choice);
    game.pendingDecision=null; game.phase="season"; game.lastSummary=decisionText+" La temporada continúa.";
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="pressConference"){
    decisionText=applyPressChoice(game,choice);
    game.pendingDecision=generateDynamicEvent(game)||makeDecision(game);
    game.lastSummary=`Has respondido: ${decisionText}. Ahora decide cómo afrontar el verano.`;
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="dynamicEvent"){
    decisionText=applyDynamicEventChoice(game,choice);
  } else if(game.pendingDecision.type==="freeAgencyMarket"){
    const offer=game.pendingDecision.offers.find(o=>o.id===choice.offerId);
    game.pendingDecision=openContractNegotiation(game,offer);
    game.lastSummary=`Has abierto negociaciones con ${offer.teamName}.`;
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="contractNegotiation"){
    const offer=game.pendingDecision.offer;
    if(id==="back_market"){
      const offers=buildFreeAgencyMarket(p,p.teamId);
      game.pendingDecision={type:"freeAgencyMarket",title:"Agencia libre",text:"Compara proyectos, rol, encaje y valor total.",offers,options:offers.map(o=>({id:`review_${o.teamId}`,title:o.teamName,text:`${o.years} años · ${money(o.salary)}/año · ${o.role} · Encaje ${o.fit}%`,offerId:o.id}))};
      saveGame(game); return game;
    }
    if(id==="counter_contract"){
      const updated=counterOffer(p,offer);
      if(updated.status==="withdrawn"){
        const offers=buildFreeAgencyMarket(p,p.teamId).filter(o=>o.teamId!==updated.teamId);
        game.pendingDecision={type:"freeAgencyMarket",title:"Agencia libre",text:updated.negotiationMessage,offers,options:offers.map(o=>({id:`review_${o.teamId}`,title:o.teamName,text:`${o.years} años · ${money(o.salary)}/año · ${o.role} · Encaje ${o.fit}%`,offerId:o.id}))};
      } else game.pendingDecision=openContractNegotiation(game,updated);
      game.lastSummary=updated.negotiationMessage; saveGame(game); return game;
    }
    const old=p.teamId;
    p.teamId=offer.teamId;p.contract=signContract(p,offer,game.season);p.morale=clamp(p.morale+(offer.renewal?4:2),0,100);
    p.role=offer.role;p.seasonsWithTeam=offer.renewal?p.seasonsWithTeam:0;p.coachTrust=offer.renewal?p.coachTrust:55;
    if(old!==p.teamId&&!p.teamsPlayed.includes(p.teamId))p.teamsPlayed.push(p.teamId);
    decisionText=`Firmar con ${offer.teamName} por ${money(offer.totalValue)} totales`;
    addEvent(game,{type:EVENT_TYPES.PLAYER_SIGNED,season:game.season,teamId:p.teamId,data:{playerName:p.name,teamName:offer.teamName,years:p.contract.totalYears,salary:p.contract.salary,totalValue:p.contract.totalValue,role:p.contract.rolePromised,renewal:old===p.teamId}});
  } else if(game.pendingDecision.type==="freeAgency"){
    const old=p.teamId;
    p.teamId=choice.teamId; p.contract=choice.contract; p.morale=clamp(p.morale+choice.morale,0,100);
    p.seasonsWithTeam=0; p.coachTrust=55;
    if(old!==p.teamId && !p.teamsPlayed.includes(p.teamId))p.teamsPlayed.push(p.teamId);
    addEvent(game,{type:EVENT_TYPES.PLAYER_SIGNED,season:game.season,teamId:p.teamId,data:{playerName:p.name,teamName:TEAMS.find(t=>t.id===p.teamId)?.name,years:p.contract.totalYears,salary:p.contract.salary,renewal:old===p.teamId}});
  } else if(choice.special==="trade"){
    const options=TEAMS.filter(t=>t.id!==p.teamId).sort((a,b)=>(b.development+b.strength)-(a.development+a.strength)+roll(-20,20));
    const destination=options[0], old=TEAMS.find(t=>t.id===p.teamId);
    p.teamId=destination.id; p.tradeRequests++; p.seasonsWithTeam=0; p.coachTrust=45; p.morale=70;
    p.contract={...p.contract}; if(!p.teamsPlayed.includes(destination.id))p.teamsPlayed.push(destination.id);
    decisionText=`Traspasado de ${old.name} a ${destination.name}`;
    addEvent(game,{type:EVENT_TYPES.PLAYER_TRADED,season:game.season,teamId:destination.id,data:{playerName:p.name,fromTeamId:old.id,fromTeamName:old.name,toTeamId:destination.id,toTeamName:destination.name,tradeRequests:p.tradeRequests}});
  } else {
    Object.entries(choice.apply||{}).forEach(([key,value])=>{
      if(key==="morale")p.morale=clamp(p.morale+value,0,100);
      else if(key==="coachTrust")p.coachTrust=clamp(p.coachTrust+value,0,100);
      else p.hidden[key]=clamp((p.hidden[key]||0)+value,0,99);
      if(["shooting","body","vision","defense"].includes(id))trainPlayer(p,id);
    });
  }
  applyCareerDecision(p,{type:game.pendingDecision.type,choiceId:id,special:choice.special,changedTeam:game.pendingDecision.type==="freeAgency"&&choice.teamId!==undefined});
  p.age++; refreshPlayer(p); game.season++; game.pendingDecision=null;
  game.phase=p.age>=38||p.ovr<=62?"retired":"season";
  if(game.phase==="retired"){
    addEvent(game,{type:EVENT_TYPES.PLAYER_RETIRED,season:game.season,teamId:p.teamId,data:{playerName:p.name,seasons:p.career.length,teams:p.teamsPlayed.length,allStars:p.allStars,mvps:p.mvps,championships:p.championships}});
    finalizeLegacy(game);
    buildDocumentary(game);
  }
  if(game.phase==="season")ensureSeasonObjectives(game);
  game.lastSummary=game.phase==="retired"
    ?`${p.name} se retira tras ${p.career.length} temporadas y haber jugado en ${p.teamsPlayed.length} franquicias.`
    :`Has elegido: ${decisionText}. Comienza la temporada ${game.season}.`;
  saveGame(game); return game;
}

export function saveGame(game){const result=saveTransactional(stabilizeGame(game));game.system??={};game.system.lastSaveOk=result.ok;game.system.lastSaveError=result.ok?null:result.reason;return result;}
export function loadGame(){const result=loadWithRecovery();if(!result.game)return null;const game=migrateGame(result.game);game.system??={};game.system.recoveredFromBackup=!!result.recovered;return game;}
export function clearGame(){clearTransactional();}
export function getTeam(id){return TEAMS.find(t=>t.id===id);}
export function getCoach(game,id){return migrateGame(game).league.coaches[id];}
export function formatMoney(value){return money(value);}

export function advancePreDraft(game,choice){ game=migrateGame(game); advancePathway(game,choice); saveGame(game); return game; }
