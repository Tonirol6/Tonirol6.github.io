const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;

export function migrateCareerEvents(game){
  game.careerMode ??= {};
  const c=game.careerMode;
  c.version=2;c.objectives ??=[];c.objectiveHistory ??=[];c.eventHistory ??=[];
  return c;
}

function targetFor(player,type){
  const ovr=player.ovr||72,role=player.role||'Rotación';
  const roleBoost=role==='Superestrella'?4:role==='Titular'?2:role==='Proyecto'?-3:0;
  if(type==='ppg')return Math.max(8,Math.round(10+(ovr-70)*.45+roleBoost));
  if(type==='apg')return Math.max(3,Math.round(3+(player.attributes?.passing-65)*.12));
  if(type==='rpg')return Math.max(4,Math.round(4+(player.attributes?.rebounding-65)*.14));
  if(type==='wins')return ovr>=86?50:ovr>=78?44:38;
  if(type==='games')return 65;
  if(type==='per')return Math.max(14,Math.round(14+(ovr-72)*.22));
  return 1;
}
function objective(type,target){
 const data={
  ppg:['Anotador de confianza',`Promedia al menos ${target} puntos`, 'ppg','PPG'],
  apg:['Director del juego',`Promedia al menos ${target} asistencias`, 'apg','APG'],
  rpg:['Domina el rebote',`Promedia al menos ${target} rebotes`, 'rpg','RPG'],
  wins:['Cultura ganadora',`Consigue al menos ${target} victorias`, 'wins','victorias'],
  games:['Disponibilidad total',`Disputa al menos ${target} partidos`, 'games','partidos'],
  per:['Eficiencia de estrella',`Alcanza un PER de ${target}`, 'per','PER']
 }[type];
 return {id:`${type}_${Date.now()}_${Math.random()}`,type,title:data[0],description:data[1],stat:data[2],unit:data[3],target,status:'active',reward:{reputation:3,popularity:2,morale:3},penalty:{morale:-2}};
}
export function ensureSeasonObjectives(game){
 const c=migrateCareerEvents(game),p=game.player;
 if(game.phase==='draft'||!p?.teamId)return [];
 if(c.objectives.some(o=>o.season===game.season&&o.status==='active'))return c.objectives.filter(o=>o.season===game.season);
 const primary=p.position==='PG'?'apg':['PF','C'].includes(p.position)?'rpg':'ppg';
 const pool=[primary,'wins','games','per'].filter((v,i,a)=>a.indexOf(v)===i);
 c.objectives=pool.slice(0,3).map(type=>({...objective(type,targetFor(p,type)),season:game.season}));
 return c.objectives;
}
export function evaluateSeasonObjectives(game,seasonData){
 const c=migrateCareerEvents(game),p=game.player,profile=p.careerProfile;
 const objectives=c.objectives.filter(o=>o.season===seasonData.season);
 objectives.forEach(o=>{
   const value=Number(seasonData[o.stat]||0);o.value=value;o.status=value>=o.target?'completed':'failed';
   const effect=o.status==='completed'?o.reward:o.penalty;
   p.morale=clamp((p.morale||50)+(effect.morale||0));
   profile.reputation=clamp(profile.reputation+(effect.reputation||0));
   profile.popularity=clamp(profile.popularity+(effect.popularity||0));
 });
 c.objectiveHistory.push(...objectives.map(o=>({...o})));
 c.objectives=c.objectives.filter(o=>o.season!==seasonData.season);
 return objectives;
}

const EVENTS=[
 {id:'coach_tension',title:'Tensión con el entrenador',text:'El entrenador cuestiona públicamente tu toma de decisiones.',minSeason:1,options:[
  {id:'accept',title:'Aceptar la crítica',text:'Trabajar en silencio y recuperar su confianza.',effects:{coach:7,reputation:2,morale:-1}},
  {id:'respond',title:'Responder públicamente',text:'Defender tu juego ante los medios.',effects:{coach:-9,media:7,popularity:5,morale:3}},
  {id:'private',title:'Hablar en privado',text:'Buscar una solución dentro del vestuario.',effects:{coach:4,teammates:3,reputation:1}}
 ]},
 {id:'locker_room',title:'Problema en el vestuario',text:'Un compañero veterano cree que recibes demasiado protagonismo.',minSeason:1,options:[
  {id:'share',title:'Compartir protagonismo',text:'Ceder parte del foco al equipo.',effects:{teammates:8,popularity:-2,morale:1}},
  {id:'compete',title:'Competir por el liderazgo',text:'Dejar que la pista decida quién manda.',effects:{teammates:-6,reputation:4,morale:4}},
  {id:'mediate',title:'Mediar con el capitán',text:'Reforzar la unidad del grupo.',effects:{teammates:5,coach:3,gm:2}}
 ]},
 {id:'brand_offer',title:'Oferta comercial',text:'Una gran marca quiere convertirte en una de sus caras principales.',minSeason:2,options:[
  {id:'sign',title:'Aceptar la campaña',text:'Más fama, pero también más presión.',effects:{popularity:10,media:4,reputation:-1,morale:2}},
  {id:'community',title:'Vincularla a una causa',text:'Usar la campaña para ayudar a la comunidad.',effects:{popularity:6,reputation:7,fans:8}},
  {id:'decline',title:'Centrarse en el baloncesto',text:'Rechazar distracciones externas.',effects:{coach:5,reputation:3,popularity:-3}}
 ]},
 {id:'media_pressure',title:'Presión mediática',text:'La prensa dice que debes demostrar que puedes liderar un equipo ganador.',minSeason:2,options:[
  {id:'embrace',title:'Aceptar el reto',text:'Prometer que responderás en la pista.',effects:{media:5,popularity:4,morale:4}},
  {id:'team_first',title:'Hablar del equipo',text:'Quitar importancia a los premios individuales.',effects:{teammates:6,reputation:4,media:-1}},
  {id:'ignore',title:'No responder',text:'Evitar alimentar el debate.',effects:{media:-4,coach:2,morale:1}}
 ]}
];
export function generateDynamicEvent(game){
 const c=migrateCareerEvents(game),seasons=game.player.career?.length||0;
 if(seasons<1||roll(1,100)>58)return null;
 const possible=EVENTS.filter(e=>seasons>=e.minSeason&&!c.eventHistory.some(h=>h.eventId===e.id&&h.season>=game.season-2));
 const event=possible[roll(0,possible.length-1)];
 return event?{type:'dynamicEvent',eventId:event.id,title:event.title,text:event.text,options:event.options.map(o=>({...o}))}:null;
}
export function applyDynamicEventChoice(game,choice){
 const c=migrateCareerEvents(game),p=game.player,profile=p.careerProfile,e=choice.effects||{};
 for(const key of ['reputation','popularity'])profile[key]=clamp(profile[key]+(e[key]||0));
 for(const key of ['coach','teammates','gm','fans','media'])profile.relationships[key]=clamp(profile.relationships[key]+(e[key]||0));
 p.morale=clamp((p.morale||50)+(e.morale||0));p.coachTrust=profile.relationships.coach;
 c.eventHistory.push({season:game.season,eventId:game.pendingDecision.eventId,title:game.pendingDecision.title,choiceId:choice.id,choiceTitle:choice.title,effects:{...e}});
 return choice.title;
}
export function getActiveObjectives(game){return ensureSeasonObjectives(game);}
export function getObjectiveResults(game,season){return migrateCareerEvents(game).objectiveHistory.filter(o=>o.season===season);}
