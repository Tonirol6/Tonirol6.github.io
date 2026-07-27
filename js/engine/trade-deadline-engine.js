import { Random } from "../core/random-engine.js";
import { TEAMS } from "../data/teams.js";
import { EVENT_TYPES, addEvent } from "./story-engine.js";
import { createUniverseRepository } from "../core/universe-repository.js";

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Random.next()*(max-min+1))+min;

export function migrateTradeDeadline(game){
  game.league??={};
  game.league.tradeDeadline??={version:1,resolvedSeasons:[],history:[]};
  const d=game.league.tradeDeadline; d.version=1; d.resolvedSeasons??=[]; d.history??=[];
  return d;
}

function destinationOptions(game){
  const p=game.player;
  return TEAMS.filter(t=>t.id!==p.teamId)
    .map(t=>({...t,fit:Math.round(clamp(52+(t.need===p.position?20:0)+(t.development-70)*.5+(t.strength-75)*.35+roll(-8,8),35,96))}))
    .sort((a,b)=>b.fit-a.fit).slice(0,2);
}

export function generateTradeDeadline(game){
  const d=migrateTradeDeadline(game),p=game.player;
  if(!p?.teamId||d.resolvedSeasons.includes(game.season))return null;
  const rival=game.league?.life?.rival;
  const destinations=destinationOptions(game);
  const pressure=clamp((65-p.morale)+(65-p.coachTrust)+(p.careerProfile?.relationships?.gm<50?15:0),0,80);
  const headline=pressure>=28?'Tu futuro domina el mercado':'La fecha límite pone a prueba tu compromiso';
  const text=pressure>=28
    ?`Los rumores aseguran que varias franquicias han llamado por ti. ${destinations[0].name} aparece como el destino con mejor encaje.`
    :`Tu equipo recibe llamadas, pero la dirección quiere saber si estás comprometido con el proyecto. ${rival?`Además, tu duelo con ${rival.name} está calentando la liga.`:''}`;
  return {type:'tradeDeadline',title:headline,text,season:game.season,destinations,options:[
    {id:'deadline_stay',title:'Cerrar filas',text:'Confirmar que quieres terminar la temporada aquí.',effects:{morale:4,coach:5,gm:7,fans:5,reputation:3}},
    {id:'deadline_listen',title:`Escuchar a ${destinations[0].name}`,text:`Aceptar un traspaso inmediato. Encaje estimado ${destinations[0].fit}%.`,destinationId:destinations[0].id,effects:{morale:5,gm:-8,fans:-6,popularity:4}},
    {id:'deadline_rival',title:'Convertirlo en combustible',text:rival?`Ignorar los rumores y retar públicamente a ${rival.name}.`:'Ignorar los rumores y elevar la presión competitiva.',effects:{morale:3,popularity:6,media:6,reputation:2},rivalry:true}
  ]};
}

export function applyTradeDeadlineChoice(game,choice){
  const d=migrateTradeDeadline(game),p=game.player,profile=p.careerProfile,e=choice.effects||{};
  const Universe=createUniverseRepository(game),old=Universe.getTeam(p.teamId);
  for(const k of ['reputation','popularity'])profile[k]=clamp(profile[k]+(e[k]||0));
  for(const k of ['coach','teammates','gm','fans','media'])profile.relationships[k]=clamp(profile.relationships[k]+(e[k]||0));
  p.morale=clamp(p.morale+(e.morale||0)); p.coachTrust=profile.relationships.coach;
  let summary=choice.title;
  if(choice.destinationId){
    const dest=Universe.getTeam(choice.destinationId);
    p.teamId=dest.id; p.seasonsWithTeam=0; p.coachTrust=52; profile.relationships.coach=52; profile.relationships.gm=50;
    if(!p.teamsPlayed.includes(dest.id))p.teamsPlayed.push(dest.id);
    addEvent(game,{type:EVENT_TYPES.PLAYER_TRADED,season:game.season,teamId:dest.id,importance:78,data:{playerName:p.name,fromTeamId:old.id,fromTeamName:old.name,toTeamId:dest.id,toTeamName:dest.name,deadline:true}});
    summary=`Traspaso en la fecha límite: ${old.name} envía a ${p.name} a ${dest.name}.`;
  }else if(choice.rivalry&&game.league?.life?.rival){
    const r=game.league.life.rival; r.intensity=clamp(r.intensity+12); r.level=r.intensity>=80?'Rivalidad histórica':r.intensity>=55?'Rivalidad nacional':r.intensity>=30?'Rivalidad consolidada':'Cruce emergente';
    addEvent(game,{type:EVENT_TYPES.RIVALRY_MILESTONE,season:game.season,importance:70,data:{playerName:p.name,rivalName:r.name,meetings:r.meetings,userWins:r.userWins,rivalWins:r.rivalWins,level:r.level,deadlineChallenge:true}});
    summary=`${p.name} convierte los rumores en un desafío directo a ${r.name}.`;
  }
  d.resolvedSeasons.push(game.season); d.history.push({season:game.season,choiceId:choice.id,summary,teamId:p.teamId});
  return summary;
}

export function getTradeDeadlineHistory(game){return migrateTradeDeadline(game).history;}
