import { Random } from "../core/random-engine.js";
import { createUniverseRepository } from "../core/universe-repository.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Random.int(min,max);
export const CLUTCH_MOMENTS_VERSION="1.0.0";

const ATTACK_OPTIONS=[
  {id:"attack_rim",title:"Atacar el aro",text:"Buscar contacto y finalizar cerca del aro.",skill:"finishing",base:54,reward:2},
  {id:"pullup_three",title:"Triple tras bote",text:"Mucho riesgo, pero puede romper el partido.",skill:"threePoint",base:43,reward:3},
  {id:"create_teammate",title:"Atraer y asistir",text:"Leer la ayuda y encontrar al compañero liberado.",skill:"passing",base:58,reward:2}
];
const DEFENSE_OPTIONS=[
  {id:"pressure_ball",title:"Presionar el balón",text:"Forzar una pérdida sin conceder una penetración fácil.",skill:"perimeterDefense",base:51,reward:0},
  {id:"protect_rim",title:"Cerrar la pintura",text:"Negar el aro y obligar al rival a tirar desde fuera.",skill:"interiorDefense",base:53,reward:0},
  {id:"gamble_steal",title:"Jugarte el robo",text:"Una apuesta agresiva que puede decidir la posesión.",skill:"steals",base:44,reward:0}
];

function difficultyModifier(game){
  const id=game.settings?.difficulty||"normal";
  return id==="easy"?7:id==="hard"?-7:0;
}

function buildOptions(kind){return (kind==="defense"?DEFENSE_OPTIONS:ATTACK_OPTIONS).map(x=>({...x}));}

export function shouldCreateClutchMoment(game,seasonData){
  if(!seasonData?.playoffs||game.pendingDecision?.type==="clutchGame")return false;
  if(seasonData.champion||seasonData.playoffExit==="Finales NBA")return true;
  if(seasonData.playoffExit==="Final de conferencia")return Random.chance(.42);
  return false;
}

export function createClutchMoment(game,seasonData){
  const Universe=createUniverseRepository(game),team=Universe.getTeam(game.player.teamId);
  const finals=seasonData.champion||seasonData.playoffExit==="Finales NBA";
  const opponentPool=Universe.teams.values().filter(t=>t.id!==team.id);
  const opponent=Random.pick(opponentPool)||{id:"rival",name:"Rival"};
  const startingMargin=roll(-3,2);
  const kind=Random.chance(.5)?"attack":"defense";
  const moment={
    version:CLUTCH_MOMENTS_VERSION,
    id:Random.id("clutch"),
    type:"clutchGame",
    title:finals?"Últimos minutos de las Finales":"Partido 7: todo o nada",
    text:finals?`Quedan 90 segundos. ${team.name} se juega el campeonato contra ${opponent.name}.`:`Quedan 90 segundos. El ganador avanza y el perdedor se va a casa.`,
    season:seasonData.season,
    stage:finals?"finals":"conference-finals",
    teamId:team.id,
    teamName:team.name,
    opponentId:opponent.id,
    opponentName:opponent.name,
    originalChampion:!!seasonData.champion,
    possession:1,
    totalPossessions:4,
    kind,
    playerScore:96+Math.max(0,startingMargin),
    opponentScore:96+Math.max(0,-startingMargin),
    points:0,
    stops:0,
    log:[],
    options:buildOptions(kind)
  };
  return moment;
}

function resolveAttempt(game,moment,choice){
  const p=game.player,a=p.attributes||{},skill=a[choice.skill]||70;
  const clutch=p.hidden?.clutch||p.dna?.clutch||70;
  const fit=game.careerMode?.coaching?.current?.fit||70;
  const pressure=game.careerMode?.difficulty?.pressure||50;
  const chance=clamp(choice.base+(skill-70)*.42+(clutch-70)*.22+(fit-70)*.08-(pressure-50)*.05+difficultyModifier(game),18,88);
  const success=roll(1,100)<=chance;
  if(moment.kind==="attack"){
    if(success){moment.playerScore+=choice.reward;moment.points+=choice.reward;}
    else if(Random.chance(.18)){moment.opponentScore+=2;}
  }else{
    if(success)moment.stops++;
    else moment.opponentScore+=Random.chance(.32)?3:2;
  }
  moment.log.push({possession:moment.possession,kind:moment.kind,choice:choice.title,success,chance:Math.round(chance),score:`${moment.playerScore}-${moment.opponentScore}`});
  return success;
}

function finalize(game,moment){
  if(moment.playerScore===moment.opponentScore){
    const overtimeEdge=(game.player.hidden?.clutch||70)+(game.player.ovr||70)+difficultyModifier(game);
    if(roll(1,180)<=overtimeEdge)moment.playerScore+=2;else moment.opponentScore+=2;
    moment.log.push({possession:"OT",kind:"overtime",choice:"Última posesión",success:moment.playerScore>moment.opponentScore,chance:null,score:`${moment.playerScore}-${moment.opponentScore}`});
  }
  const won=moment.playerScore>moment.opponentScore;
  const season=game.player.career.find(s=>s.season===moment.season)||game.player.career.at(-1);
  if(moment.stage==="finals"){
    if(won&&!season.champion){game.player.championships=(game.player.championships||0)+1;}
    if(!won&&season.champion){game.player.championships=Math.max(0,(game.player.championships||0)-1);}
    season.champion=won;
    season.playoffs=true;
    season.roundsWon=won?4:3;
    season.playoffExit=won?"Campeón NBA":"Finales NBA";
    season.finalsMvp=won&&moment.points>=5;
    if(season.seasonResult?.nba){
      season.seasonResult.nba.champion=won;
      season.seasonResult.nba.playoffExit=season.playoffExit;
      if(won){season.seasonResult.nba.championId=moment.teamId;season.seasonResult.nba.champion=moment.teamName;}
    }
  }else{
    season.playoffExit=won?"Finales NBA":"Final de conferencia";
    season.roundsWon=won?3:2;
  }
  season.clutchMoment={version:CLUTCH_MOMENTS_VERSION,stage:moment.stage,won,score:`${moment.playerScore}-${moment.opponentScore}`,points:moment.points,stops:moment.stops,log:moment.log};
  game.careerMode??={};
  game.careerMode.clutchMoments??={version:CLUTCH_MOMENTS_VERSION,history:[]};
  game.careerMode.clutchMoments.history.push({season:moment.season,stage:moment.stage,won,score:`${moment.playerScore}-${moment.opponentScore}`,points:moment.points,stops:moment.stops});
  game.lastSummary=won?`¡Momento histórico! ${moment.teamName} gana ${moment.playerScore}-${moment.opponentScore}${moment.stage==="finals"?" y conquista el campeonato":" y avanza a las Finales"}.`:`El rival resiste y gana ${moment.opponentScore}-${moment.playerScore}. Tus decisiones dejaron huella, pero esta vez no alcanzó.`;
  return {won,season};
}

export function applyClutchChoice(game,choiceId){
  const moment=game.pendingDecision;
  if(moment?.type!=="clutchGame")return game;
  const choice=moment.options.find(o=>o.id===choiceId);
  if(!choice)return game;
  resolveAttempt(game,moment,choice);
  moment.possession++;
  if(moment.possession>moment.totalPossessions){
    finalize(game,moment);
    game.pendingDecision=moment.nextDecision||null;
    game.phase=game.pendingDecision?"decision":"season";
    return game;
  }
  moment.kind=moment.kind==="attack"?"defense":"attack";
  moment.text=`${moment.playerScore}-${moment.opponentScore} · Posesión ${moment.possession} de ${moment.totalPossessions}. ${moment.kind==="attack"?"Tienes el balón.":"Toca defender."}`;
  moment.options=buildOptions(moment.kind);
  return game;
}

export function migrateClutchMoments(game){
  game.careerMode??={};
  game.careerMode.clutchMoments??={version:CLUTCH_MOMENTS_VERSION,history:[]};
  return game.careerMode.clutchMoments;
}
