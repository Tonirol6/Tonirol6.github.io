const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const roll=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=a=>a[roll(0,a.length-1)];

const FIRST=['Alex','Jordan','Marcus','Dylan','Noah','Leo','Adrian','Chris','Jalen','Mateo','Luka','Nikola'];
const LAST=['Reed','Brooks','Carter','Miller','Hayes','Young','Walker','Petrovic','Martin','Cole'];
const name=()=>`${pick(FIRST)} ${pick(LAST)}`;

export function migrateImmersion(game){
  game.immersion??={}; const i=game.immersion;
  i.version=1;i.inbox??=[];i.rivalries??=[];i.relationships??=[];i.rumours??=[];i.interviews??=[];i.nextId??=1;
  i.agent??={name:'Maya Torres',trust:68,style:'Directa y protectora',commission:4};
  i.teammates??=[
    {id:'leader',name:name(),role:'Capitán',bond:62,personality:'Competitivo'},
    {id:'friend',name:name(),role:'Compañero cercano',bond:70,personality:'Leal'},
    {id:'young',name:name(),role:'Joven promesa',bond:54,personality:'Ambicioso'}
  ];
  i.coachTalks??=0;i.agentTalks??=0;i.teamChemistry??=62;i.mediaHeat??=35;
  return i;
}
function push(game,item){const i=migrateImmersion(game);i.inbox.unshift({id:i.nextId++,read:false,season:game.season,...item});i.inbox=i.inbox.slice(0,90);}
function rumour(game,text,heat=50){const i=migrateImmersion(game);i.rumours.unshift({id:i.nextId++,season:game.season,text,heat});i.rumours=i.rumours.slice(0,50);i.mediaHeat=clamp(i.mediaHeat+Math.round((heat-50)/8));}

export function recordImmersionSeason(game,s){
  const i=migrateImmersion(game),p=game.player;
  i.teamChemistry=clamp(i.teamChemistry+roll(-5,5)+(s.champion?9:0)+(s.wins<35?-4:0));
  const teammate=pick(i.teammates); teammate.bond=clamp(teammate.bond+roll(-4,7)+(s.champion?5:0));
  push(game,{from:game.league?.coaches?.[p.teamId]?.name||'Entrenador',kind:'coach',title:s.champion?'Mensaje del campeón':s.wins<35?'Reunión pendiente':'Evaluación de temporada',body:s.champion?'Has liderado al grupo. Quiero construir el próximo año alrededor de ti.':s.wins<35?'Necesitamos hablar de tu rol y de cómo recuperar al vestuario.':`Buen trabajo. Tu siguiente paso es mejorar la consistencia y elevar a tus compañeros.`});
  push(game,{from:i.agent.name,kind:'agent',title:'Informe de mercado',body:`Tu valor está en ${p.marketValue?.value||p.ovr}. ${p.contract?.yearsLeft<=1?'Habrá que preparar la negociación.':'No recomiendo forzar movimientos ahora mismo.'}`});
  if(s.allStar||s.mvp||s.champion)push(game,{from:'Glory TV',kind:'media',title:'Invitación al plató',body:`Quieren entrevistarte sobre ${s.champion?'el campeonato':s.mvp?'el MVP':'tu temporada All-Star'}.`});
  if(s.playoffs&&roll(1,100)<=55){
    const rival=name(),existing=i.rivalries.find(r=>r.name===rival);
    if(existing){existing.meetings++;existing.tension=clamp(existing.tension+roll(4,12));existing.lastSeason=s.season;}
    else i.rivalries.unshift({id:`r${i.nextId++}`,name:rival,team:'Rival de conferencia',meetings:1,tension:roll(48,70),userWins:s.roundsWon>0?1:0,rivalWins:s.roundsWon>0?0:1,lastSeason:s.season});
  }
  if(roll(1,100)<=45)rumour(game,p.contract?.yearsLeft<=1?`${p.name} aparece en el radar de varias franquicias antes de la agencia libre.`:`Un ejecutivo rival cree que ${p.name} podría pedir más protagonismo.`,roll(45,78));
  return i;
}

export function getImmersionDashboard(game){
  const i=migrateImmersion(game);
  return {agent:i.agent,inbox:i.inbox,unread:i.inbox.filter(x=>!x.read).length,teammates:i.teammates,rivalries:i.rivalries,rumours:i.rumours,chemistry:i.teamChemistry,mediaHeat:i.mediaHeat};
}

export function getConversation(game,type){
  const i=migrateImmersion(game),p=game.player;
  if(type==='agent')return {type,title:`Llamada con ${i.agent.name}`,text:'Tu agente quiere definir el siguiente movimiento de carrera.',options:[
    {id:'agent_loyal',title:'Priorizar estabilidad',text:'Buscar continuidad y un proyecto a largo plazo.',effects:{agent:5,morale:4,gm:3,heat:-4}},
    {id:'agent_market',title:'Explorar el mercado',text:'Escuchar discretamente a otros equipos.',effects:{agent:3,gm:-3,heat:8}},
    {id:'agent_star',title:'Exigir trato de estrella',text:'Pedir rol, minutos y salario de jugador franquicia.',effects:{agent:-2,gm:-5,popularity:5,heat:12}}]};
  if(type==='coach')return {type,title:'Reunión con el entrenador',text:'El entrenador te pregunta qué necesitas para rendir mejor.',options:[
    {id:'coach_role',title:'Pedir más responsabilidad',text:'Más balón y decisiones importantes.',effects:{coach:roll(-3,7),morale:3,chemistry:-2}},
    {id:'coach_team',title:'Hablar del equipo',text:'Preguntar cómo puedes ayudar al vestuario.',effects:{coach:6,teammates:6,chemistry:6}},
    {id:'coach_rest',title:'Gestionar la carga',text:'Solicitar descanso y control de minutos.',effects:{coach:2,condition:6,fatigue:-8}}]};
  return {type:'locker',title:'Conversación de vestuario',text:'Tus compañeros esperan que marques el tono antes de la temporada.',options:[
    {id:'locker_lead',title:'Liderar con ambición',text:'Prometer competir por todo.',effects:{teammates:5,chemistry:5,pressure:6}},
    {id:'locker_support',title:'Unir al grupo',text:'Dar confianza a los jóvenes y secundarios.',effects:{teammates:8,chemistry:9,popularity:2}},
    {id:'locker_challenge',title:'Elevar la exigencia',text:'Decir que quien no esté preparado quedará atrás.',effects:{teammates:-4,chemistry:-5,popularity:5,pressure:8}}]};
}

export function applyImmersionChoice(game,conversation,choiceId){
  const i=migrateImmersion(game),p=game.player,choice=conversation.options.find(o=>o.id===choiceId); if(!choice)return '';
  const e=choice.effects||{},profile=p.careerProfile;
  if(e.agent)i.agent.trust=clamp(i.agent.trust+e.agent);
  if(e.chemistry)i.teamChemistry=clamp(i.teamChemistry+e.chemistry);
  if(e.heat)i.mediaHeat=clamp(i.mediaHeat+e.heat);
  if(e.morale)p.morale=clamp(p.morale+e.morale);
  if(e.condition)p.health.condition=clamp(p.health.condition+e.condition);
  if(e.fatigue)p.health.fatigue=clamp(p.health.fatigue+e.fatigue);
  for(const k of ['coach','teammates','gm'])if(e[k])profile.relationships[k]=clamp(profile.relationships[k]+e[k]);
  if(e.popularity)profile.popularity=clamp(profile.popularity+e.popularity);
  i.interviews.unshift({season:game.season,type:conversation.type,choice:choice.title});
  push(game,{from:conversation.type==='agent'?i.agent.name:conversation.type==='coach'?'Entrenador':'Vestuario',kind:conversation.type,title:'Consecuencia de tu decisión',body:`Has elegido “${choice.title}”. La relación y el ambiente han cambiado.`});
  return choice.title;
}
export function markInboxRead(game,id){const item=migrateImmersion(game).inbox.find(x=>x.id===Number(id));if(item)item.read=true;return item;}
