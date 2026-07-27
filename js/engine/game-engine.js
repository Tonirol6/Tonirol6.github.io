import { Random, createSeed, initializeRandom, persistRandomState } from "../core/random-engine.js";
import { saveTransactional, loadWithRecovery, clearTransactional, SCHEMA_VERSION } from "./persistence-engine.js";
import { stabilizeGame } from "./health-engine.js";
import { migrateBasketballUniverse, advanceBasketballUniverse } from "./basketball-universe-engine.js";
import { migrateEncyclopedia, recordEncyclopediaSeason } from "./encyclopedia-engine.js";
import { migrateSeasonResults, createSeasonResult } from "./season-result-engine.js";

import { TEAMS } from "../data/teams.js";
import { EVENT_TYPES, addEvent, migrateHistory } from "./story-engine.js";
import { migrateLegacy, updateRecords, finalizeLegacy } from "./legacy-engine.js";
import { migrateLeagueLife, processLeagueSeason } from "./league-life-engine.js";
import { createPlayer, migratePlayer, progressPlayer, trainPlayer, refreshPlayer } from "./player-engine.js";
import { createSimulationEngine } from "./simulation-engine.js";
import { migrateBalance, prepareLeagueSeason, normalizeSeasonStats, calculateDevelopmentDelta, recordLeagueSeason } from "./balance-engine.js";
import { migrateCareerProfile, processCareerSeason, applyCareerDecision } from "./career-engine.js";
import { migrateCareerEvents, ensureSeasonObjectives, evaluateSeasonObjectives, generateDynamicEvent, applyDynamicEventChoice } from "./career-events-engine.js";
import { migrateMedia, seedSeasonFeed, generatePressConference, applyPressChoice } from "./media-engine.js";
import { migrateContracts, buildFreeAgencyMarket, counterOffer, signContract, recordSeasonSalary, recordMarketOutcome } from "./contract-engine.js";
import { migrateCareerNarrative, buildDocumentary } from "./career-narrative-engine.js";
import { migrateTradeDeadline, generateTradeDeadline, applyTradeDeadlineChoice } from "./trade-deadline-engine.js";
import { migrateFranchiseAI, processOffseason } from "./franchise-ai-engine.js";
import { migratePathway, startPathway, advancePathway } from "./pathway-engine.js";
import { migrateBetaBalance, calculateInjury, finishHealthSeason, calculateMinutes, updateMarketValue, rebalanceFranchises } from "./beta-balance-engine.js";
import { migrateImmersion, recordImmersionSeason } from "./immersion-engine.js";
import { migrateInternational, prepareInternationalInvitation, applyInternationalChoice } from "./international-engine.js";
import { migrateNcaaDraft, processNcaaDraftSeason, resolveUserDraft } from "./ncaa-draft-engine.js";
import { migrateEuropeanBasketball, processEuropeanSeason } from "./european-basketball-engine.js";
import { getDifficultyProfile, migrateDifficulty, applyDifficultyToPlayer, updateFranchisePressure } from "./difficulty-engine.js";
import { migrateFranchiseConsequences, processFranchiseConsequences, applyFranchiseConsequenceChoice } from "./franchise-consequences-engine.js";
import { migrateCoachingSystems, prepareCoachingSeason, createCoachingMeeting, applyCoachingMeetingChoice, changeCoachSystem } from "./coaching-systems-engine.js";
import { migrateClutchMoments, shouldCreateClutchMoment, createClutchMoment, applyClutchChoice } from "./clutch-moments-engine.js";
import { migrateAtlas, createAtlasContext } from "../core/universe-core.js";
import { createUniverseRepository } from "../core/universe-repository.js";

const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const roll = (min,max) => Random.int(min,max);
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
  initializeRandom(game);
  game.version = SCHEMA_VERSION;
  migrateHistory(game);
  game.league ??= {};
  game.league.coaches ??= Object.fromEntries(TEAMS.map(t=>[t.id,randomCoach(t)]));
  const p = migratePlayer(game.player);
  p.contract ??= p.teamId ? rookieContract(p.draftPick || 30) : null;
  p.tradeRequests ??= 0;
  p.injuryHistory ??= [];
  p.currentInjury ??= null;
  p.finalsMvps ??= 0;
  p.allNbaSelections ??= 0;
  p.dpoys ??= 0;
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
  migrateSeasonResults(game);
  migrateEncyclopedia(game);
  migrateBetaBalance(game);
  migrateImmersion(game);
  migrateInternational(game);
  migrateNcaaDraft(game);
  migrateEuropeanBasketball(game);
  migrateDifficulty(game);
  migrateFranchiseConsequences(game);
  migrateCoachingSystems(game);
  migrateClutchMoments(game);
  migrateAtlas(game);
  if(game.phase==="season")ensureSeasonObjectives(game);
  persistRandomState(game);
  return stabilizeGame(game);
}

export function createGame({name, position, archetype, nationality="España", difficulty="normal", seed=null}) {
  const gameSeed=seed ?? createSeed(`${name}|${position}|${archetype}`);
  Random.seed(gameSeed);
  const difficultyProfile=getDifficultyProfile(difficulty);
  const startingOvr=roll(55+difficultyProfile.baseOvr,60+difficultyProfile.baseOvr);
  const player=createPlayer({name,position,archetype,age:16,baseOvr:startingOvr,seed:`${gameSeed}|player`});
  // Archetype bonuses define the profile, but must not inflate the starting level.
  for(let guard=0;guard<20&&player.ovr!==startingOvr;guard++){
    const direction=player.ovr>startingOvr?-1:1;
    Object.keys(player.attributes).forEach(key=>player.attributes[key]=clamp(player.attributes[key]+direction,25,99));
    refreshPlayer(player);
  }
  applyDifficultyToPlayer(player,difficultyProfile);
  Object.assign(player,{nationality,morale:75,teamId:null,draftPick:null,championships:0,mvps:0,finalsMvps:0,allStars:0,allNbaSelections:0,dpoys:0,career:[],contract:null,tradeRequests:0,injuryHistory:[],currentInjury:null,role:"Prospecto",coachTrust:55,seasonsWithTeam:0,teamsPlayed:[],hidden:{workEthic:player.dna.workEthic,durability:clamp(100-player.dna.injuryRisk*1.4,55,95),clutch:player.dna.clutch,scoring:0,assists:0,rebounds:0,loyalty:roll(45,95),ego:roll(35,90),truePotential:player.dna.potential,potentialBand:difficultyProfile.id==="easy"?"favorable":difficultyProfile.id==="hard"?"uncertain":"balanced"}});
  const game=migrateGame({version:16,season:2026,phase:"pathway",settings:{difficulty:difficultyProfile.id},atlas:{random:{...Random.snapshot()}},league:{coaches:Object.fromEntries(TEAMS.map(t=>[t.id,randomCoach(t)]))},player,pendingDecision:null,lastSummary:null});
  return startPathway(game);
}

export function runDraft(game) {
  game = migrateGame(game);
  const p=refreshPlayer(game.player);
  const pathwayStock=p.preDraft?.stock??50;
  const draftAge=p.age??19, collegeYears=p.preDraft?.route==='college'?(p.preDraft?.year??0):0;
  const truePotential=p.hidden?.truePotential??p.potential??75;
  const agePenalty=Math.max(0,draftAge-19)*4.5+Math.max(0,collegeYears-1)*5.5;
  const draftScore=truePotential*.50+pathwayStock*.30+p.ovr*.20-agePenalty+roll(-3,3);
  const projected=p.preDraft?.mockPick;
  const draftWorld=resolveUserDraft(game,{score:draftScore,projected,position:p.position});
  const pick=draftWorld.pick;
  const candidates=TEAMS.map((team,index)=>{
    const needBonus=team.need===p.position?12:0;
    const developmentBonus=(team.development-65)/5;
    const pickFit=-Math.abs((index*2+1)-pick)/8;
    return {team,score:needBonus+developmentBonus+pickFit+Random.next()*8};
  }).sort((a,b)=>b.score-a.score);
  const team=candidates[0].team;
  p.teamId=team.id; p.draftPick=pick; p.contract=rookieContract(pick);
  p.teamsPlayed=[team.id]; p.role=pick<=14?"Rotación":"Proyecto";
  game.phase="season";
  ensureSeasonObjectives(game);
  addEvent(game,{type:EVENT_TYPES.PLAYER_DRAFTED,season:game.season,teamId:team.id,data:{playerName:p.name,pick,teamName:team.name,contractYears:p.contract.totalYears,salary:p.contract.salary}});
  createAtlasContext(game).emit("PLAYER_DRAFTED", {playerId:p.id,teamId:team.id,pick});
  game.lastSummary=`${p.name} ha sido elegido en el pick ${pick} por ${team.name}. Firma un contrato rookie de ${p.contract.totalYears} años por ${money(p.contract.salary)} por temporada. La clase tenía una fuerza media de ${draftWorld.classStrength}/100.`;
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
    changeCoachSystem(game.league.coaches[team.id]);
    return `${old} deja el banquillo. El nuevo entrenador es ${game.league.coaches[team.id].name}.`;
  }
  return "";
}

function dismissCoachForPressure(game,team) {
  const old=game.league.coaches[team.id]?.name||"El entrenador";
  game.league.coaches[team.id]=randomCoach(team);
  changeCoachSystem(game.league.coaches[team.id]);
  return `${old} es despedido por la presión del proyecto. El nuevo entrenador es ${game.league.coaches[team.id].name}.`;
}

export function simulateSeason(game) {
  game=migrateGame(game);
  const deadline=generateTradeDeadline(game);
  if(deadline){ game.pendingDecision=deadline; game.phase="decision"; game.lastSummary="La temporada se detiene en la fecha límite de traspasos."; saveGame(game); return game; }
  const p=refreshPlayer(game.player), Universe=createUniverseRepository(game), team=Universe.getTeam(p.teamId), coach=Universe.getCoach(p.teamId);
  updateRole(p);
  const coachingPlan=prepareCoachingSeason(game,{player:p,team,coach});
  const projectedMinutes=calculateMinutes(p,team,coach)+coachingPlan.minutesModifier;
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
  const chemistry=clamp((p.morale+p.coachTrust)/2+coachingPlan.chemistryModifier,25,100);
  const difficultyProfile=migrateDifficulty(game);
  const simulationEngine=createSimulationEngine({competition:"nba"});
  const simulation=simulationEngine.simulateSeason({player:p,team,coach,injury,games,minutes,chemistry,strategy:{...leagueContext.strategy,winBonus:(leagueContext.strategy?.winBonus||0)+coachingPlan.winBonus,chemistryBonus:(leagueContext.strategy?.chemistryBonus||0)+coachingPlan.chemistryModifier},coaching:coachingPlan,career:p.career,isRookie:p.career.length===0,difficulty:difficultyProfile});
  const advanced=normalizeSeasonStats(simulation.stats,p);
  const teamResult=simulation.teamResult;
  const {wins:teamWins,playoffs,champion}=teamResult;
  const awards=simulation.awards;
  const {allStar,mvp}=awards;
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
    addEvent(game,{type:EVENT_TYPES.PLAYER_MVP,season:game.season,teamId:team.id,data:{playerName:p.name,teamName:team.name,mvps:p.mvps,ppg,wins:teamWins,score:awards.mvpScore}});
  }
  if(awards.finalsMvp)p.finalsMvps=(p.finalsMvps||0)+1;
  if(awards.allNba)p.allNbaSelections=(p.allNbaSelections||0)+1;
  if(awards.dpoy)p.dpoys=(p.dpoys||0)+1;

  const progress=calculateDevelopmentDelta({player:p,coach,minutes,games,role:p.role,injury})+difficultyProfile.development+coachingPlan.developmentModifier;
  progressPlayer(p,{amount:progress,severeInjury:!!injury?.severe});
  if(injury?.ovrPenalty)progressPlayer(p,{amount:injury.ovrPenalty,severeInjury:true});
  finishHealthSeason(game,{minutes,games,injury});
  p.coachTrust=clamp(p.coachTrust+roll(-3,4)+(allStar?4:0)+(ppg<10?-3:0)+coach.trust/5+coachingPlan.trustDelta,20,100);
  p.seasonsWithTeam++;
  recordSeasonSalary(p);
  p.contract.yearsLeft--;

  const coachNews=possibleCoachChange(game,team);
  const seasonData={
    season:game.season,age:p.age,team:team.name,teamId:team.id,games,minutes,ppg,rpg,apg,
    spg:advanced.spg,bpg:advanced.bpg,turnovers:advanced.turnovers,fgPct:advanced.fgPct,
    threePct:advanced.threePct,ftPct:advanced.ftPct,threesMade:advanced.threesMade,
    usage:advanced.usage,per:advanced.per,wins:teamWins,playoffs,roundsWon:teamResult.roundsWon,
    playoffExit:teamResult.playoffExit,playoffPpg:teamResult.playoffPpg,playoffSeries:teamResult.series,dynastyPenalty:teamResult.dynastyPenalty,champion,allStar,mvp,
    finalsMvp:awards.finalsMvp,allNba:awards.allNba,allDefensive:awards.allDefensive,dpoy:awards.dpoy,rookieOfYear:awards.rookie,mip:awards.mip,mvpScore:awards.mvpScore,mvpRace:awards.candidates,
    ovrAfter:p.ovr,role:p.role,injury:injury?.name||null,contractYears:p.contract.yearsLeft,coach:coach.name,
    teamStrategy:leagueContext.strategy.label,coachingSystem:coachingPlan.systemName,coachingFit:coachingPlan.fit,rotationPolicy:coachingPlan.rotationPolicy,coachingFocus:coachingPlan.focus,draftClass:leagueContext.draftClass.label,developmentChange:progress,simulationEngine:simulation.engineVersion,competitionProfile:simulation.competitionProfile
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
  const seasonResult=createSeasonResult(game,{team,teamResult,stats:advanced,awards,games,minutes});
  seasonData.seasonResult=seasonResult;
  advanceBasketballUniverse(game,seasonResult);
  recordEncyclopediaSeason(game,game.season,seasonResult);
  const european=processEuropeanSeason(game);
  seasonData.europe={champion:european.champion,finalist:european.finalist,mvp:european.mvp,finalFourMvp:european.finalFourMvp,acbChampion:european.acbChampion,cupWinner:european.cupWinner,risingStar:european.risingStar};
  const ncaaDraft=processNcaaDraftSeason(game);
  seasonData.ncaa={champion:ncaaDraft.marchMadness?.champion,mop:ncaaDraft.marchMadness?.mop,playerOfYear:ncaaDraft.awards?.playerOfYear,topProspects:ncaaDraft.mock?.slice(0,5)};
  const offseason=processOffseason(game,seasonData);
  rebalanceFranchises(game);
  seasonData.offseason={moves:offseason.moves.length,coachChanges:offseason.coachChanges.length,retirements:offseason.retirements.length,strategyChanges:offseason.strategyChanges.length};
  recordLeagueSeason(game,{teamId:team.id,wins:teamWins,strategy:leagueContext.strategy,draftClass:leagueContext.draftClass});
  const objectiveResults=evaluateSeasonObjectives(game,seasonData);
  seasonData.franchisePressure=updateFranchisePressure(game,seasonData,objectiveResults).pressure;
  const franchiseConsequences=processFranchiseConsequences(game,seasonData,objectiveResults,{replaceCoach:()=>dismissCoachForPressure(game,team)});
  seasonData.franchiseConsequences={events:franchiseConsequences.events,contractObjectives:franchiseConsequences.contractResults};
  seedSeasonFeed(game,seasonData);
  recordImmersionSeason(game,seasonData);
  seasonData.objectives=objectiveResults.map(o=>({title:o.title,status:o.status,value:o.value,target:o.target,unit:o.unit}));
  game.lastSummary=buildSummary(p,seasonData,coachNews)+` Offseason: ${seasonData.offseason.moves} movimientos, ${seasonData.offseason.coachChanges} cambios de entrenador y ${seasonData.offseason.retirements} retiradas. Objetivos: ${objectiveResults.filter(o=>o.status==="completed").length}/${objectiveResults.length} completados.`;
  const nextDecision=franchiseConsequences.decision || generatePressConference(game,seasonData);
  if(shouldCreateClutchMoment(game,seasonData)){
    const clutch=createClutchMoment(game,seasonData);
    clutch.nextDecision=nextDecision;
    game.pendingDecision=clutch;
    game.lastSummary=`${game.lastSummary} Antes de cerrar la temporada, queda un momento decisivo por jugar.`;
  }else game.pendingDecision=nextDecision;
  game.phase="decision";
  saveGame(game); return game;
}

function buildSummary(p,s,coachNews) {
  const achievement=s.champion?"La temporada terminó con un campeonato."
    :s.mvp?"Tu rendimiento te convirtió en MVP de la liga."
    :s.allStar?"Fuiste seleccionado para el All-Star."
    :s.playoffs?`El equipo terminó su camino en ${s.playoffExit.toLowerCase()}.`:"El equipo quedó fuera de los Playoffs.";
  const injury=s.injury?` Una ${s.injury.toLowerCase()} limitó tu temporada.`:"";
  const awards=[s.mvp?"MVP":null,s.finalsMvp?"Finals MVP":null,s.allNba?`All-NBA ${s.allNba}`:null,s.dpoy?"DPOY":null].filter(Boolean);
  return `${p.name} disputó ${s.games} partidos como ${s.role} y promedió ${s.ppg} puntos, ${s.rpg} rebotes y ${s.apg} asistencias, con ${s.fgPct}% en tiros y ${s.per} de eficiencia.${injury} ${achievement} El equipo afrontó el año en modo ${s.teamStrategy.toLowerCase()} y la próxima camada fue catalogada como ${s.draftClass.toLowerCase()}.${awards.length?` Premios: ${awards.join(", ")}.`:""}${coachNews?` ${coachNews}`:""}`;
}

function makeDecision(game) {
  const p=refreshPlayer(game.player), team=createUniverseRepository(game).getTeam(p.teamId);
  if(p.contract.yearsLeft<=0){
    const offers=buildFreeAgencyMarket(p,team.id,game);
    return {type:"freeAgencyMarket",title:"Agencia libre",text:"Cada franquicia responde a su situación deportiva, necesidad de plantilla, presupuesto y relación previa contigo.",offers,options:offers.filter(o=>o.status!=="withdrawn").map(o=>({id:`review_${o.teamId}`,title:o.teamName,text:`${o.years} años · ${money(o.salary)}/año · ${o.role} · Encaje ${o.fit}% · ${o.strategyLabel} · Cap ${o.capRoom}%`,offerId:o.id}))};
  }
  const base=[
    {id:"shooting",title:"Entrenar tiro",text:"Mejora Triple y Media distancia.",apply:{scoring:1,workEthic:1,morale:-1}},
    {id:"body",title:"Mejorar el físico",text:"Mejora Fuerza, Resistencia y Rebote.",apply:{rebounds:1,durability:2,morale:-1}},
    {id:"vision",title:"Trabajar la visión",text:"Mejora Pase, Manejo e IQ.",apply:{assists:1,coachTrust:3,morale:0}},
    {id:"defense",title:"Entrenar defensa",text:"Mejora defensa exterior, interior, robos y tapones.",apply:{coachTrust:2,workEthic:1,morale:-1}},
    {id:"rest",title:"Descansar",text:"Recupera moral y durabilidad, sin subir atributos.",apply:{durability:1,morale:5}},
    {id:"coach",title:"Hablar con el entrenador",text:"Mejora la confianza, sin entrenamiento técnico.",apply:{coachTrust:roll(2,7),morale:roll(-2,2)}}
  ];
  if(p.seasonsWithTeam>=3 && (p.morale<80 || p.hidden.ego>70))base.push({id:"trade",title:"Pedir un traspaso",text:"Puedes cambiar de equipo, pero dañará tu reputación interna",special:"trade"});
  const training=base.filter(o=>["shooting","body","vision","defense"].includes(o.id));
  const lifestyle=base.filter(o=>!["shooting","body","vision","defense"].includes(o.id)&&o.special!=="trade");
  const selected=[...training,...lifestyle];
  const trade=base.find(o=>o.special==="trade");if(trade)selected.push(trade);
  return {type:"summer",title:"Plan de entrenamiento de verano",text:"Elige cómo desarrollar a tu jugador. Solo se aplica un plan por temporada.",options:selected};
}

function openContractNegotiation(game,offer){
  return {type:"contractNegotiation",title:`Negociación con ${offer.teamName}`,text:`${offer.pitch}. Te ofrecen ${offer.years} años por ${money(offer.salary)} anuales (${money(offer.totalValue)} totales), con rol de ${offer.role} y ${offer.promisedMinutes} minutos prometidos. Interés ${offer.interest}% · ${offer.strategyLabel} · margen salarial ${offer.capRoom}%. ${offer.reasons?.join(" · ")||""}`,offer,options:[
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

  if(game.pendingDecision.type==="clutchGame"){
    applyClutchChoice(game,id);
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="tradeDeadline"){
    decisionText=applyTradeDeadlineChoice(game,choice);
    game.pendingDecision=null; game.phase="season"; game.lastSummary=decisionText+" La temporada continúa.";
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="pressConference"){
    decisionText=applyPressChoice(game,choice);
    const latestSeason=game.player.career.at(-1);
    game.pendingDecision=createCoachingMeeting(game)||prepareInternationalInvitation(game,latestSeason)||generateDynamicEvent(game)||makeDecision(game);
    game.lastSummary=`Has respondido: ${decisionText}. Ahora decide cómo afrontar el verano.`;
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="coachingMeeting"){
    decisionText=applyCoachingMeetingChoice(game,choice);
    const latestSeason=game.player.career.at(-1);
    game.pendingDecision=prepareInternationalInvitation(game,latestSeason)||generateDynamicEvent(game)||makeDecision(game);
    game.lastSummary=decisionText;
    saveGame(game); return game;
  } else if(game.pendingDecision.type==="internationalInvitation"){
    decisionText=applyInternationalChoice(game,id);
    game.pendingDecision=generateDynamicEvent(game)||makeDecision(game);
    game.lastSummary=decisionText+" Ahora decide cómo afrontar el resto del verano.";
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
      const offers=buildFreeAgencyMarket(p,p.teamId,game);
      game.pendingDecision={type:"freeAgencyMarket",title:"Agencia libre",text:"El mercado mantiene las mismas ofertas mientras comparas proyectos.",offers,options:offers.map(o=>({id:`review_${o.teamId}`,title:o.teamName,text:`${o.years} años · ${money(o.salary)}/año · ${o.role} · Encaje ${o.fit}% · ${o.strategyLabel}`,offerId:o.id}))};
      saveGame(game); return game;
    }
    if(id==="counter_contract"){
      const updated=counterOffer(p,offer);
      if(updated.status==="withdrawn"){
        const offers=buildFreeAgencyMarket(p,p.teamId,game,{forceNew:true,excludeTeamIds:[updated.teamId]});
        game.pendingDecision={type:"freeAgencyMarket",title:"Agencia libre",text:updated.negotiationMessage,offers,options:offers.map(o=>({id:`review_${o.teamId}`,title:o.teamName,text:`${o.years} años · ${money(o.salary)}/año · ${o.role} · Encaje ${o.fit}% · ${o.strategyLabel}`,offerId:o.id}))};
      } else game.pendingDecision=openContractNegotiation(game,updated);
      game.lastSummary=updated.negotiationMessage; saveGame(game); return game;
    }
    const old=p.teamId;
    const marketOffers=game.pendingDecision?.marketOffers||p.freeAgency?.activeMarket?.offers||[offer];
    recordMarketOutcome(p,game.season,offer.teamId,marketOffers);
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
    addEvent(game,{type:EVENT_TYPES.PLAYER_SIGNED,season:game.season,teamId:p.teamId,data:{playerName:p.name,teamName:createUniverseRepository(game).getTeam(p.teamId)?.name,years:p.contract.totalYears,salary:p.contract.salary,renewal:old===p.teamId}});
  } else if(game.pendingDecision.type==="franchiseUltimatum"){
    const outcome=applyFranchiseConsequenceChoice(game,choice);
    decisionText=outcome.text;
    if(outcome.trade){
      addEvent(game,{type:EVENT_TYPES.PLAYER_TRADED,season:game.season,teamId:outcome.trade.destination.id,data:{playerName:p.name,fromTeamId:outcome.trade.old?.id,fromTeamName:outcome.trade.old?.name,toTeamId:outcome.trade.destination.id,toTeamName:outcome.trade.destination.name,tradeRequests:p.tradeRequests,reason:"franchise-ultimatum"}});
    }
  } else if(choice.special==="trade"){
    const options=TEAMS.filter(t=>t.id!==p.teamId).sort((a,b)=>(b.development+b.strength)-(a.development+a.strength)+roll(-20,20));
    const destination=options[0], old=createUniverseRepository(game).getTeam(p.teamId);
    p.teamId=destination.id; p.tradeRequests++; p.seasonsWithTeam=0; p.coachTrust=45; p.morale=70;
    p.contract={...p.contract}; if(!p.teamsPlayed.includes(destination.id))p.teamsPlayed.push(destination.id);
    decisionText=`Traspasado de ${old.name} a ${destination.name}`;
    addEvent(game,{type:EVENT_TYPES.PLAYER_TRADED,season:game.season,teamId:destination.id,data:{playerName:p.name,fromTeamId:old.id,fromTeamName:old.name,toTeamId:destination.id,toTeamName:destination.name,tradeRequests:p.tradeRequests}});
  } else {
    Object.entries(choice.apply||{}).forEach(([key,value])=>{
      if(key==="morale")p.morale=clamp(p.morale+value,0,100);
      else if(key==="coachTrust")p.coachTrust=clamp(p.coachTrust+value,0,100);
      else p.hidden[key]=clamp((p.hidden[key]||0)+value,0,99);
    });
    if(["shooting","body","vision","defense"].includes(id)){
      trainPlayer(p,id);
      p.developmentHistory??=[];
      p.developmentHistory.push({season:game.season,age:p.age,focus:id,ovr:p.ovr});
    }
  }
  applyCareerDecision(p,{type:game.pendingDecision.type,choiceId:id,special:choice.special,changedTeam:game.pendingDecision.type==="freeAgency"&&choice.teamId!==undefined});
  p.age++; refreshPlayer(p); game.season++; game.pendingDecision=null;
  const retirementBase={34:.04,35:.10,36:.22,37:.42,38:.68,39:.9}[p.age]||0;
  const eliteExtension=p.ovr>=90?.16:p.ovr>=86?.08:0;
  const wearPenalty=Math.max(0,(p.health?.careerWear||0)-35)*.006;
  const retirementChance=clamp(retirementBase-eliteExtension+wearPenalty,0,.96);
  const voluntaryRetirement=p.age>=34&&Random.chance(retirementChance);
  game.phase=p.age>=40||(p.age>=32&&p.ovr<=62)||voluntaryRetirement?"retired":"season";
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

let persistenceEnabled = true;
export function setGamePersistenceEnabled(enabled=true){ persistenceEnabled=Boolean(enabled); return persistenceEnabled; }
export function saveGame(game){
  persistRandomState(game);
  if(!persistenceEnabled){
    game.system??={}; game.system.lastSaveOk=true; game.system.lastSaveError=null; game.system.persistenceSkipped=true;
    return {ok:true,skipped:true};
  }
  const result=saveTransactional(stabilizeGame(game));game.system??={};game.system.lastSaveOk=result.ok;game.system.lastSaveError=result.ok?null:result.reason;game.system.persistenceSkipped=false;return result;
}
export function loadGame(){const result=loadWithRecovery();if(!result.game)return null;const game=migrateGame(result.game);game.system??={};game.system.recoveredFromBackup=!!result.recovered;return game;}
export function clearGame(){clearTransactional();}
export function getTeam(id){return createUniverseRepository(null).getTeam(id);}
export function getCoach(game,id){return createUniverseRepository(migrateGame(game)).getCoach(id);}
export function formatMoney(value){return money(value);}

export function advancePreDraft(game,choice){ game=migrateGame(game); advancePathway(game,choice); saveGame(game); return game; }
