import { Random } from "../core/random-engine.js";
import { TEAMS } from "../data/teams.js";
import { createUniverseRepository } from "../core/universe-repository.js";
import { migrateDifficulty } from "./difficulty-engine.js";

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const ROLE_ORDER=["Proyecto","Rotación","Sexto hombre","Titular","Superestrella"];

export function migrateFranchiseConsequences(game){
  game.careerMode??={};
  const state=game.careerMode.franchiseConsequences??={};
  state.version=1;
  state.history??=[];
  state.contractObjectives??=[];
  state.activeUltimatum??=null;
  state.lastRoleChange??=null;
  state.coachDismissals??=0;
  state.tradeEscalations??=0;
  return state;
}

function roleIndex(role){const i=ROLE_ORDER.indexOf(role);return i<0?1:i;}
function contractTargets(game,seasonData){
  const profile=migrateDifficulty(game),p=game.player;
  return [
    {id:`contract_wins_${seasonData.season+1}`,title:"Competir por Playoffs",stat:"wins",target:Math.round((p.ovr>=86?48:42)*profile.objective),unit:"victorias"},
    {id:`contract_role_${seasonData.season+1}`,title:"Responder al rol",stat:"per",target:Math.round((p.ovr>=84?18:15)*profile.objective),unit:"PER"}
  ].map(o=>({...o,season:seasonData.season+1,status:"active"}));
}

export function evaluateContractObjectives(game,seasonData){
  const state=migrateFranchiseConsequences(game);
  const active=state.contractObjectives.filter(o=>o.season===seasonData.season&&o.status==='active');
  for(const objective of active){
    objective.value=Number(seasonData[objective.stat]||0);
    objective.status=objective.value>=objective.target?'completed':'failed';
  }
  return active;
}

export function processFranchiseConsequences(game,seasonData,objectiveResults,{replaceCoach}={}){
  const state=migrateFranchiseConsequences(game),difficulty=migrateDifficulty(game),p=game.player;
  const pressure=game.careerMode.difficulty?.pressure??50;
  const completed=objectiveResults.filter(o=>o.status==='completed').length;
  const failed=Math.max(0,objectiveResults.length-completed);
  const contractResults=evaluateContractObjectives(game,seasonData);
  const contractFailed=contractResults.filter(o=>o.status==='failed').length;
  const events=[];

  const currentIndex=roleIndex(p.role);
  if(pressure>=72 && (failed>=2 || contractFailed>0) && currentIndex>0){
    const old=p.role;p.role=ROLE_ORDER[currentIndex-1];
    state.lastRoleChange={season:seasonData.season,from:old,to:p.role,reason:'pressure'};
    events.push({type:'role-change',text:`La franquicia reduce tu rol de ${old} a ${p.role}.`});
  } else if(pressure<=28 && completed===objectiveResults.length && seasonData.per>=18 && currentIndex<ROLE_ORDER.length-1){
    const old=p.role;p.role=ROLE_ORDER[currentIndex+1];
    state.lastRoleChange={season:seasonData.season,from:old,to:p.role,reason:'earned'};
    events.push({type:'role-change',text:`Tu gran año eleva tu rol de ${old} a ${p.role}.`});
  }

  if(pressure>=88 && failed>=2 && typeof replaceCoach==='function' && Random.chance(.35*difficulty.pressure)){
    const change=replaceCoach();
    if(change){state.coachDismissals++;events.push({type:'coach-dismissal',text:change});}
  }

  state.contractObjectives=state.contractObjectives.filter(o=>o.season>=seasonData.season);
  if(p.contract?.yearsLeft<=2 && !state.contractObjectives.some(o=>o.season===seasonData.season+1)){
    state.contractObjectives.push(...contractTargets(game,seasonData));
  }

  let decision=null;
  if(pressure>=70 && (failed>=2 || contractFailed>0)){
    state.activeUltimatum={season:seasonData.season,pressure,failedObjectives:failed+contractFailed};
    decision={
      type:'franchiseUltimatum',
      title:'Ultimátum de la franquicia',
      text:`La dirección considera que la presión (${pressure}/100) exige una respuesta inmediata.`,
      options:[
        {id:'commit',title:'Aceptar el reto',text:'Prometer resultados y recuperar confianza.',effects:{pressure:-14,coachTrust:5,morale:2}},
        {id:'request_trade',title:'Pedir el traspaso',text:'Romper con el proyecto y buscar otro destino.',special:'forcedTrade'},
        {id:'challenge_coach',title:'Cuestionar al entrenador',text:'Defender tu papel y trasladar la presión al banquillo.',effects:{pressure:5,coachTrust:-12,morale:4}}
      ]
    };
    state.tradeEscalations++;
    events.push({type:'ultimatum',text:'La franquicia emite un ultimátum formal.'});
  }

  state.history.push({season:seasonData.season,pressure,events:events.map(e=>e.type),contractResults:contractResults.map(o=>({id:o.id,status:o.status,value:o.value,target:o.target}))});
  return {events,decision,contractResults};
}

export function applyFranchiseConsequenceChoice(game,choice){
  const state=migrateFranchiseConsequences(game),p=game.player;
  if(choice.special==='forcedTrade'){
    const Universe=createUniverseRepository(game),old=Universe.getTeam(p.teamId);
    const destination=[...TEAMS].filter(t=>t.id!==p.teamId).sort((a,b)=>(b.development+b.strength)-(a.development+a.strength)+Random.int(-12,12))[0];
    p.teamId=destination.id;p.tradeRequests=(p.tradeRequests||0)+1;p.seasonsWithTeam=0;p.coachTrust=42;p.morale=68;
    if(!p.teamsPlayed.includes(destination.id))p.teamsPlayed.push(destination.id);
    state.activeUltimatum=null;
    return {text:`La petición prospera: traspasado de ${old?.name||'tu equipo'} a ${destination.name}.`,trade:{old,destination}};
  }
  const e=choice.effects||{};
  if(e.pressure)game.careerMode.difficulty.pressure=clamp(game.careerMode.difficulty.pressure+e.pressure);
  if(e.coachTrust)p.coachTrust=clamp(p.coachTrust+e.coachTrust);
  if(e.morale)p.morale=clamp(p.morale+e.morale);
  state.activeUltimatum=null;
  return {text:choice.title};
}

export function getFranchiseConsequences(game){return migrateFranchiseConsequences(game);}
