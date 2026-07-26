const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;

export function migrateMedia(game){
  game.mediaMode ??={};
  const m=game.mediaMode;
  m.version=1;m.feed ??=[];m.pressHistory ??=[];m.nextId ??=1;
  return m;
}
function post(game,{author='GloryFeed',handle='@glory',text,tone='neutral',impact=40,season=game.season}){
  const m=migrateMedia(game);m.feed.unshift({id:m.nextId++,author,handle,text,tone,impact,season});m.feed=m.feed.slice(0,80);
}
export function seedSeasonFeed(game,s){
  const p=game.player;
  post(game,{author:'Glory Analytics',handle:'@gloryanalytics',tone:s.per>=22?'hype':'neutral',impact:55,text:`${p.name}: ${s.ppg} PTS · ${s.rpg} REB · ${s.apg} AST · PER ${s.per}.` ,season:s.season});
  if(s.champion)post(game,{author:'NBA Glory',handle:'@nbaglory',tone:'hype',impact:95,text:`🏆 ${p.name} y ${s.team} son campeones. Una temporada para la historia.`,season:s.season});
  else if(s.mvp)post(game,{author:'The Hardwood',handle:'@hardwood',tone:'hype',impact:90,text:`MVP. ${p.name} ya está en la conversación de los grandes.`,season:s.season});
  else if(s.playoffs)post(game,{author:'Courtside',handle:'@courtside',tone:s.roundsWon>=2?'positive':'debate',impact:65,text:`${s.team} se despide en ${s.playoffExit}. ¿Qué necesita ${p.name} para dar el siguiente paso?`,season:s.season});
  else post(game,{author:'Fan Zone',handle:'@fanzone',tone:'debate',impact:58,text:`Otra temporada sin Playoffs para ${p.name}. La presión empieza a crecer.`,season:s.season});
  if(s.injury)post(game,{author:'Injury Report',handle:'@injuryreport',tone:'concern',impact:64,text:`${p.name} perdió tiempo por ${s.injury.toLowerCase()}. Su recuperación será clave.`,season:s.season});
}
export function generatePressConference(game,s){
  migrateMedia(game);const p=game.player;
  const context=s.champion?'champion':s.mvp?'mvp':s.playoffs?'playoffs':'missed';
  const data={
    champion:{title:'Rueda de prensa del campeón',text:'Te preguntan quién merece el mérito por el campeonato.',options:[
      {id:'team',title:'El equipo primero',text:'«Este anillo pertenece a todos.»',effects:{teammates:8,coach:5,reputation:4,popularity:2},reaction:'El vestuario celebra un discurso generoso.'},
      {id:'leader',title:'Asumir el liderazgo',text:'«Sabía que podía llevarnos hasta aquí.»',effects:{reputation:6,popularity:7,teammates:-2,media:4},reaction:'Las redes ensalzan tu confianza; algunos compañeros levantan una ceja.'},
      {id:'fans',title:'Dedicarlo a la afición',text:'«Lo hicimos por nuestra gente.»',effects:{fans:10,popularity:6,reputation:2},reaction:'La afición convierte tu frase en el mensaje de la noche.'}]},
    mvp:{title:'Rueda de prensa del MVP',text:'La prensa te pregunta si ya eres el mejor jugador de la liga.',options:[
      {id:'humble',title:'Mantener la humildad',text:'«El premio no cambia el trabajo.»',effects:{reputation:6,coach:4,media:2},reaction:'Tu respuesta recibe elogios por su madurez.'},
      {id:'claim',title:'Reclamar el trono',text:'«Sí. Creo que lo he demostrado.»',effects:{popularity:9,media:7,reputation:3,teammates:-2},reaction:'GloryFeed explota tras tu declaración de poder.'},
      {id:'ring',title:'Hablar del anillo',text:'«El MVP importa menos que ganar.»',effects:{teammates:6,fans:5,reputation:5},reaction:'Los aficionados compran tu mensaje competitivo.'}]},
    playoffs:{title:'Rueda de prensa de Playoffs',text:'Te preguntan por la eliminación y el futuro del equipo.',options:[
      {id:'responsibility',title:'Asumir la responsabilidad',text:'«Tengo que ser mejor.»',effects:{reputation:6,coach:4,teammates:4,morale:-1},reaction:'La prensa valora que des la cara.'},
      {id:'support',title:'Pedir más ayuda',text:'«Necesitamos reforzar la plantilla.»',effects:{gm:-7,media:6,popularity:4,teammates:-3},reaction:'El comentario abre un debate sobre la dirección deportiva.'},
      {id:'return',title:'Prometer volver',text:'«Volveremos más fuertes.»',effects:{fans:7,popularity:5,morale:4},reaction:'La afición responde con optimismo.'}]},
    missed:{title:'Rueda de prensa de fin de temporada',text:'La prensa cuestiona por qué el equipo se quedó fuera de Playoffs.',options:[
      {id:'own',title:'Aceptar el fracaso',text:'«No estuvimos a la altura.»',effects:{reputation:5,teammates:3,media:3,morale:-2},reaction:'Tu autocrítica reduce parte de la presión.'},
      {id:'system',title:'Cuestionar el sistema',text:'«Necesitamos jugar de otra manera.»',effects:{coach:-8,media:7,popularity:3},reaction:'Tus palabras ponen al entrenador bajo el foco.'},
      {id:'future',title:'Mirar hacia delante',text:'«Esto será combustible para el próximo año.»',effects:{fans:5,morale:5,reputation:2},reaction:'Los seguidores agradecen el mensaje de esperanza.'}]}
  }[context];
  return {type:'pressConference',context,season:s.season,title:data.title,text:data.text,options:data.options};
}
export function applyPressChoice(game,choice){
  const m=migrateMedia(game),p=game.player,profile=p.careerProfile,e=choice.effects||{};
  for(const k of ['reputation','popularity'])profile[k]=clamp(profile[k]+(e[k]||0));
  for(const k of ['coach','teammates','gm','fans','media'])profile.relationships[k]=clamp(profile.relationships[k]+(e[k]||0));
  p.morale=clamp((p.morale||50)+(e.morale||0));p.coachTrust=profile.relationships.coach;
  m.pressHistory.push({season:game.pendingDecision.season,context:game.pendingDecision.context,choiceId:choice.id,choiceTitle:choice.title,effects:{...e}});
  post(game,{author:'Glory Insider',handle:'@gloryinsider',tone:(e.media||0)>=5?'hype':(e.coach||0)<-5?'debate':'positive',impact:70,text:`${p.name}: ${choice.text} ${choice.reaction}`,season:game.pendingDecision.season});
  return choice.title;
}
export function getFeed(game){return migrateMedia(game).feed;}
