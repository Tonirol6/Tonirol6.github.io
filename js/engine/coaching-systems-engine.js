import { Random } from "../core/random-engine.js";

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));

export const COACHING_SYSTEMS=Object.freeze({
  balanced:Object.freeze({id:"balanced",name:"Equilibrado",description:"Reparte responsabilidades y se adapta al talento disponible.",positions:["PG","SG","SF","PF","C"],scoring:0,playmaking:0,defense:0,pace:0}),
  paceSpace:Object.freeze({id:"paceSpace",name:"Ritmo y espacio",description:"Transición, triples y decisiones rápidas.",positions:["PG","SG","SF"],scoring:1.2,playmaking:.5,defense:-.2,pace:3}),
  motion:Object.freeze({id:"motion",name:"Movimiento continuo",description:"Cortes, lectura y circulación de balón.",positions:["PG","SG","SF","PF"],scoring:.4,playmaking:1.1,defense:0,pace:1}),
  defense:Object.freeze({id:"defense",name:"Identidad defensiva",description:"Disciplina, ayudas y posesiones controladas.",positions:["SG","SF","PF","C"],scoring:-.4,playmaking:0,defense:1.3,pace:-2}),
  insideOut:Object.freeze({id:"insideOut",name:"Dentro-fuera",description:"Juego interior que genera tiros abiertos.",positions:["PF","C","PG"],scoring:.7,playmaking:.3,defense:.4,pace:-1})
});

const STYLE_DEFAULTS={
  developer:{system:"motion",rotation:"development",adaptability:82},
  tactician:{system:"paceSpace",rotation:"flexible",adaptability:88},
  defensive:{system:"defense",rotation:"short",adaptability:68},
  strict:{system:"insideOut",rotation:"short",adaptability:55},
  players:{system:"balanced",rotation:"flexible",adaptability:78}
};

function ensureCoach(coach){
  if(!coach)return coach;
  const defaults=STYLE_DEFAULTS[coach.id]||STYLE_DEFAULTS.players;
  coach.systemId??=defaults.system;
  coach.rotationPolicy??=defaults.rotation;
  coach.adaptability??=defaults.adaptability;
  coach.tacticalLevel??=clamp(62+(coach.development||3)*2+(coach.trust||3),55,96);
  return coach;
}

export function migrateCoachingSystems(game){
  game.careerMode??={};
  const state=game.careerMode.coachingSystems??={};
  state.version=1;
  state.activeFocus??="adapt";
  state.history??=[];
  state.lastEvaluation??=null;
  state.meetings??=0;
  for(const coach of Object.values(game.league?.coaches||{}))ensureCoach(coach);
  return state;
}

function archetypeAffinity(player,systemId){
  const a=(player.archetype||"").toLowerCase();
  if(systemId==="paceSpace" && /(shooter|scorer|creator|floor|wing)/.test(a))return 9;
  if(systemId==="motion" && /(floor|creator|playmaker|two-way)/.test(a))return 8;
  if(systemId==="defense" && /(defen|two-way|rim|lock)/.test(a))return 10;
  if(systemId==="insideOut" && /(post|rim|interior|big|rebound)/.test(a))return 9;
  if(systemId==="balanced")return 5;
  return 0;
}

export function evaluateCoachFit(player,coach){
  ensureCoach(coach);
  const system=COACHING_SYSTEMS[coach.systemId]||COACHING_SYSTEMS.balanced;
  const position=system.positions.includes(player.position)?10:-5;
  const archetype=archetypeAffinity(player,system.id);
  const iq=((player.attributes?.iq||70)-70)*.22;
  const trust=((player.coachTrust??55)-50)*.16;
  return clamp(Math.round(55+position+archetype+iq+trust+(coach.adaptability-70)*.12),20,98);
}

export function prepareCoachingSeason(game,{player,coach}={}){
  const state=migrateCoachingSystems(game);ensureCoach(coach);
  const system=COACHING_SYSTEMS[coach.systemId]||COACHING_SYSTEMS.balanced;
  const fit=evaluateCoachFit(player,coach);
  const policy=coach.rotationPolicy;
  let minutesModifier=(fit-60)*.075;
  if(policy==="short")minutesModifier+=player.ovr>=82?1.5:-1.3;
  if(policy==="development")minutesModifier+=player.age<=25?1.8:-.4;
  if(policy==="flexible")minutesModifier+=(player.coachTrust-50)*.025;
  const focus=state.activeFocus;
  const focusMods={adapt:{fit:3,minutes:.2,trust:0,development:.1},defense:{fit:1,minutes:.7,trust:1,defense:.4,scoring:-.3},playmaking:{fit:1,minutes:.4,trust:0,playmaking:.45,scoring:-.15},demand:{fit:-5,minutes:.9,trust:-4,scoring:.35,development:-.25}}[focus]||{};
  const effectiveFit=clamp(fit+(focusMods.fit||0));
  const plan={
    systemId:system.id,systemName:system.name,rotationPolicy:policy,focus,fit:effectiveFit,
    minutesModifier:Math.round((minutesModifier+(focusMods.minutes||0))*10)/10,
    chemistryModifier:Math.round(((effectiveFit-68)*.035+(focus==="adapt"?.4:0))*10)/10,
    developmentModifier:(effectiveFit-60)*.008+(focusMods.development||0)*.35,
    trustDelta:Math.round((effectiveFit-70)/32)+(focusMods.trust||0),
    scoring:(system.scoring+(focusMods.scoring||0))*.3,playmaking:(system.playmaking+(focusMods.playmaking||0))*.3,
    defense:(system.defense+(focusMods.defense||0))*.3,pace:system.pace,
    winBonus:(effectiveFit-60)*.012+system.defense*.12
  };
  state.lastEvaluation={season:game.season,coach:coach.name,...plan};
  state.history.push({...state.lastEvaluation});
  state.history=state.history.slice(-40);
  state.activeFocus="adapt";
  return plan;
}

export function createCoachingMeeting(game){
  const state=migrateCoachingSystems(game),player=game.player,coach=game.league?.coaches?.[player.teamId];
  if(!coach)return null;ensureCoach(coach);
  const system=COACHING_SYSTEMS[coach.systemId]||COACHING_SYSTEMS.balanced;
  return {type:"coachingMeeting",title:`Reunión táctica con ${coach.name}`,text:`El equipo jugará con ${system.name.toLowerCase()} y una rotación ${coach.rotationPolicy}. Elige cómo ganarte tu sitio.`,options:[
    {id:"coach_adapt",title:"Adaptarme al sistema",text:"Mejor encaje, química y desarrollo.",focus:"adapt"},
    {id:"coach_defense",title:"Ganar minutos defendiendo",text:"Más confianza y minutos; menor libertad ofensiva.",focus:"defense"},
    {id:"coach_playmaking",title:"Dirigir la segunda unidad",text:"Más creación y responsabilidad con balón.",focus:"playmaking"},
    {id:"coach_demand",title:"Exigir más protagonismo",text:"Más uso y minutos, con riesgo para la relación.",focus:"demand"}
  ]};
}

export function applyCoachingMeetingChoice(game,choice){
  const state=migrateCoachingSystems(game),p=game.player;
  state.activeFocus=choice.focus||"adapt";state.meetings++;
  if(state.activeFocus==="adapt"){p.morale=clamp(p.morale+1);}
  if(state.activeFocus==="defense"){p.coachTrust=clamp(p.coachTrust+1);}
  if(state.activeFocus==="playmaking"){p.coachTrust=clamp(p.coachTrust+1);}
  if(state.activeFocus==="demand"){p.coachTrust=clamp(p.coachTrust-5);p.morale=clamp(p.morale+3);}
  return `${choice.title}. El plan quedará activo durante la próxima temporada.`;
}

export function changeCoachSystem(coach){
  ensureCoach(coach);
  const ids=Object.keys(COACHING_SYSTEMS).filter(id=>id!==coach.systemId);
  coach.systemId=Random.pick(ids);
  coach.rotationPolicy=Random.pick(["short","development","flexible"]);
  return coach;
}

export function getCoachingDashboard(game){
  const state=migrateCoachingSystems(game),p=game.player,coach=game.league?.coaches?.[p.teamId];
  if(!coach)return {state,coach:null,system:null,fit:null};
  ensureCoach(coach);
  return {state,coach,system:COACHING_SYSTEMS[coach.systemId],fit:evaluateCoachFit(p,coach),last:state.lastEvaluation};
}
