import { Random } from "../core/random-engine.js";
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const roll=(a,b)=>Math.floor(Random.next()*(b-a+1))+a;
const pick=a=>a[roll(0,a.length-1)];

const FIRST=['Alex','Jordan','Marcus','Dylan','Noah','Leo','Adrian','Chris','Jalen','Mateo','Luka','Nikola'];
const LAST=['Reed','Brooks','Carter','Miller','Hayes','Young','Walker','Petrovic','Martin','Cole'];
const name=()=>`${pick(FIRST)} ${pick(LAST)}`;
const BRANDS=[
 {id:'volt',name:'Volt Athletics',focus:'Rendimiento',base:7},
 {id:'northstar',name:'Northstar',focus:'Imagen global',base:8},
 {id:'elevate',name:'Elevate Sports',focus:'Juventud y estilo',base:6},
 {id:'forge',name:'Forge Basketball',focus:'Mentalidad competitiva',base:7},
 {id:'pulse',name:'Pulse',focus:'Redes y cultura urbana',base:5}
];

export function migrateImmersion(game){
  game.immersion??={}; const i=game.immersion;
  i.version=2;i.inbox??=[];i.rivalries??=[];i.relationships??=[];i.rumours??=[];i.interviews??=[];i.nextId??=1;
  i.agent??={name:'Maya Torres',trust:68,style:'Directa y protectora',commission:4};
  i.teammates??=[
    {id:'leader',name:name(),role:'Capitán',bond:62,personality:'Competitivo'},
    {id:'friend',name:name(),role:'Compañero cercano',bond:70,personality:'Leal'},
    {id:'young',name:name(),role:'Joven promesa',bond:54,personality:'Ambicioso'}
  ];
  i.coachTalks??=0;i.agentTalks??=0;i.teamChemistry??=62;i.mediaHeat??=35;
  i.fanApproval??=58;i.socialFollowers??=Math.max(120000,Math.round((game.player?.careerProfile?.popularity||50)*18000));
  i.socialFeed??=[];i.sponsorships??=[];i.sponsorOffers??=[];i.mediaMoments??=[];i.monthlyAwards??=[];
  i.lastSponsorSeason??=null;i.pressTone??='equilibrado';
  return i;
}
function push(game,item){const i=migrateImmersion(game);i.inbox.unshift({id:i.nextId++,read:false,season:game.season,...item});i.inbox=i.inbox.slice(0,100);}
function rumour(game,text,heat=50){const i=migrateImmersion(game);i.rumours.unshift({id:i.nextId++,season:game.season,text,heat});i.rumours=i.rumours.slice(0,60);i.mediaHeat=clamp(i.mediaHeat+Math.round((heat-50)/8));}
function post(game,text,kind='fan',impact=0){const i=migrateImmersion(game);i.socialFeed.unshift({id:i.nextId++,season:game.season,text,kind,impact});i.socialFeed=i.socialFeed.slice(0,70);i.socialFollowers=Math.max(0,Math.round(i.socialFollowers*(1+impact/100)));}
function sponsorValue(game,s){const p=game.player;return Math.max(1,Math.round((p.ovr*0.22+(p.careerProfile?.popularity||50)*0.18+(s.ppg||0)*0.7+(s.mvp?18:0)+(s.champion?14:0))/2));}
function generateSponsorOffers(game,s){
 const i=migrateImmersion(game); if(i.lastSponsorSeason===s.season)return;
 i.lastSponsorSeason=s.season;
 const active=new Set(i.sponsorships.filter(x=>x.yearsLeft>0).map(x=>x.brandId));
 const count=s.allStar||s.ppg>=24?3:s.ppg>=16?2:1;
 i.sponsorOffers=BRANDS.filter(b=>!active.has(b.id)).sort(()=>Random.next()-.5).slice(0,count).map(b=>({id:`sp-${s.season}-${b.id}`,brandId:b.id,brand:b.name,focus:b.focus,years:roll(2,4),annual:sponsorValue(game,s)+b.base+roll(-2,3),approvalBoost:b.id==='pulse'?6:b.id==='northstar'?4:3,status:'open'}));
 if(i.sponsorOffers.length)push(game,{from:i.agent.name,kind:'agent',title:'Nuevas propuestas de patrocinio',body:`Tienes ${i.sponsorOffers.length} marcas interesadas. Evalúa dinero, duración e impacto de imagen.`});
}
function seedMonthlyAwards(game,s){
 const i=migrateImmersion(game),awards=[];
 const months=Math.max(1,Math.min(6,Math.round((s.games||82)/14)));
 const chance=clamp((s.ppg||0)*1.5+(s.apg||0)*1.4+(s.rpg||0)*.7+(s.wins||0)*.35-38,5,82);
 for(let m=1;m<=months;m++)if(roll(1,100)<=chance)awards.push({season:s.season,month:m,title:s.allStar&&m===months?'Jugador del mes':'Jugador de la semana'});
 i.monthlyAwards.unshift(...awards);i.monthlyAwards=i.monthlyAwards.slice(0,50);
 if(awards.length)post(game,`${game.player.name} sumó ${awards.length} reconocimientos semanales/mensuales durante la temporada.`,'league',Math.min(10,awards.length*2));
}

export function recordImmersionSeason(game,s){
  const i=migrateImmersion(game),p=game.player;
  i.sponsorships.forEach(x=>x.yearsLeft=Math.max(0,x.yearsLeft-1));
  i.teamChemistry=clamp(i.teamChemistry+roll(-5,5)+(s.champion?9:0)+(s.wins<35?-4:0));
  i.fanApproval=clamp(i.fanApproval+Math.round((s.wins-41)/7)+(s.champion?12:0)+(s.mvp?8:0)+(s.ppg>=25?4:0));
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
  post(game,s.champion?`🏆 ${p.name} es campeón y domina las tendencias.`:s.mvp?`⭐ ${p.name} conquista el MVP tras una temporada histórica.`:`${p.name} cierra el curso con ${s.ppg} puntos y ${s.wins} victorias.`,s.champion?'league':'fan',s.champion?18:s.mvp?14:s.allStar?7:2);
  seedMonthlyAwards(game,s);generateSponsorOffers(game,s);
  return i;
}

export function getImmersionDashboard(game){
  const i=migrateImmersion(game);
  return {agent:i.agent,inbox:i.inbox,unread:i.inbox.filter(x=>!x.read).length,teammates:i.teammates,rivalries:i.rivalries,rumours:i.rumours,chemistry:i.teamChemistry,mediaHeat:i.mediaHeat,fanApproval:i.fanApproval,socialFollowers:i.socialFollowers,socialFeed:i.socialFeed,sponsorships:i.sponsorships.filter(x=>x.yearsLeft>0),sponsorOffers:i.sponsorOffers.filter(x=>x.status==='open'),monthlyAwards:i.monthlyAwards};
}

export function getConversation(game,type){
  const i=migrateImmersion(game);
  if(type==='agent')return {type,title:`Llamada con ${i.agent.name}`,text:'Tu agente quiere definir el siguiente movimiento de carrera.',options:[
    {id:'agent_loyal',title:'Priorizar estabilidad',text:'Buscar continuidad y un proyecto a largo plazo.',effects:{agent:5,morale:4,gm:3,heat:-4}},
    {id:'agent_market',title:'Explorar el mercado',text:'Escuchar discretamente a otros equipos.',effects:{agent:3,gm:-3,heat:8}},
    {id:'agent_star',title:'Exigir trato de estrella',text:'Pedir rol, minutos y salario de jugador franquicia.',effects:{agent:-2,gm:-5,popularity:5,heat:12}}]};
  if(type==='coach')return {type,title:'Reunión con el entrenador',text:'El entrenador te pregunta qué necesitas para rendir mejor.',options:[
    {id:'coach_role',title:'Pedir más responsabilidad',text:'Más balón y decisiones importantes.',effects:{coach:roll(-3,7),morale:3,chemistry:-2}},
    {id:'coach_team',title:'Hablar del equipo',text:'Preguntar cómo puedes ayudar al vestuario.',effects:{coach:6,teammates:6,chemistry:6}},
    {id:'coach_rest',title:'Gestionar la carga',text:'Solicitar descanso y control de minutos.',effects:{coach:2,condition:6,fatigue:-8}}]};
  if(type==='press')return {type,title:'Rueda de prensa',text:'La prensa espera una declaración sobre tus objetivos y el equipo.',options:[
    {id:'press_team',title:'Dar mérito al equipo',text:'Compartir el foco con compañeros y entrenador.',effects:{teammates:7,coach:4,fans:4,heat:-3,followers:3}},
    {id:'press_confident',title:'Prometer competir por todo',text:'Elevar expectativas y asumir la presión.',effects:{popularity:7,pressure:8,heat:10,followers:7}},
    {id:'press_honest',title:'Ser directo con los problemas',text:'Hablar con honestidad aunque moleste al club.',effects:{gm:-6,fans:6,media:5,heat:12,followers:5}}]};
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
  if(e.followers)i.socialFollowers=Math.round(i.socialFollowers*(1+e.followers/100));
  if(e.fans)i.fanApproval=clamp(i.fanApproval+e.fans);
  if(e.morale)p.morale=clamp(p.morale+e.morale);
  if(e.condition)p.health.condition=clamp(p.health.condition+e.condition);
  if(e.fatigue)p.health.fatigue=clamp(p.health.fatigue+e.fatigue);
  for(const k of ['coach','teammates','gm','media'])if(e[k])profile.relationships[k]=clamp(profile.relationships[k]+e[k]);
  if(e.popularity)profile.popularity=clamp(profile.popularity+e.popularity);
  i.interviews.unshift({season:game.season,type:conversation.type,choice:choice.title});
  post(game,`“${choice.title}” — ${p.name} marca el tono fuera de la pista.`,'media',e.followers||1);
  push(game,{from:conversation.type==='agent'?i.agent.name:conversation.type==='coach'?'Entrenador':conversation.type==='press'?'Glory Press':'Vestuario',kind:conversation.type,title:'Consecuencia de tu decisión',body:`Has elegido “${choice.title}”. La relación y el ambiente han cambiado.`});
  return choice.title;
}
export function acceptSponsorship(game,id){
 const i=migrateImmersion(game),offer=i.sponsorOffers.find(x=>x.id===id&&x.status==='open');if(!offer)return null;
 offer.status='accepted';i.sponsorOffers.filter(x=>x.status==='open').forEach(x=>x.status='declined');
 i.sponsorships.push({...offer,yearsLeft:offer.years});i.fanApproval=clamp(i.fanApproval+offer.approvalBoost);i.socialFollowers=Math.round(i.socialFollowers*1.06);
 post(game,`${game.player.name} firma con ${offer.brand} por ${offer.annual} M$ anuales.`,'sponsor',8);
 push(game,{from:offer.brand,kind:'sponsor',title:'Contrato de patrocinio firmado',body:`Acuerdo de ${offer.years} años. La marca espera presencia pública y rendimiento.`});return offer;
}
export function declineSponsorship(game,id){const i=migrateImmersion(game),offer=i.sponsorOffers.find(x=>x.id===id);if(offer)offer.status='declined';return offer;}
export function markInboxRead(game,id){const item=migrateImmersion(game).inbox.find(x=>x.id===Number(id));if(item)item.read=true;return item;}
