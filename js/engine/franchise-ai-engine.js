import { Random } from "../core/random-engine.js";
import { TEAMS } from "../data/teams.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Random.next()*(max-min+1))+min;
const FIRST=["Damon","Luis","Caleb","Andre","Julian","Troy","Miles","Evan","Nico","Isaiah"];
const LAST=["Carter","Mills","Brooks","Reed","Hayes","Foster","Stone","Ward","Bennett","Coleman"];
const COACH_ARCHETYPES=[
  {id:"offense",label:"Mente ofensiva",development:3,trust:2,pressure:4},
  {id:"defense",label:"Gurú defensivo",development:4,trust:1,pressure:3},
  {id:"youth",label:"Desarrollador de jóvenes",development:9,trust:5,pressure:-3},
  {id:"veterans",label:"Gestor de veteranos",development:2,trust:7,pressure:1},
  {id:"pace",label:"Ritmo alto",development:5,trust:3,pressure:2}
];
const STRATEGIES={
  winNow:{id:"winNow",label:"Ganar ahora"}, contender:{id:"contender",label:"Competir"},
  rebuild:{id:"rebuild",label:"Reconstrucción"}, tank:{id:"tank",label:"Tanking"}
};
function makeCoach(team){
  const a=COACH_ARCHETYPES[roll(0,COACH_ARCHETYPES.length-1)];
  return {...a,name:`${FIRST[roll(0,FIRST.length-1)]} ${LAST[roll(0,LAST.length-1)]}`,teamId:team.id,seasons:0};
}
function baseStrategy(team){
  if(team.strength>=86)return STRATEGIES.winNow;
  if(team.strength>=78)return STRATEGIES.contender;
  if(team.development>=84)return STRATEGIES.rebuild;
  return STRATEGIES.tank;
}
export function migrateFranchiseAI(game){
  game.league??={};
  const ai=game.league.franchiseAI??={version:1,teams:{},offseasons:[],transactions:[],retirements:[],coachChanges:[]};
  ai.version=1;ai.teams??={};ai.offseasons??=[];ai.transactions??=[];ai.retirements??=[];ai.coachChanges??=[];
  for(const t of TEAMS){
    ai.teams[t.id]??={teamId:t.id,strategy:baseStrategy(t).id,marketAggression:clamp(35+Math.round(t.pressure/2)+roll(-8,8),20,95),ownerPatience:clamp(105-t.pressure+roll(-8,8),20,85),youthBias:clamp(t.development+roll(-10,10),35,95),salaryFlex:roll(35,90),starPower:clamp(t.strength+roll(-5,5),60,96),youngCore:clamp(t.development+roll(-7,7),55,97),lastWins:null,coachSecurity:roll(45,90)};
  }
  return ai;
}
function strategyFor(state,wins){
  if(wins>=53||state.starPower>=90)return STRATEGIES.winNow;
  if(wins>=42)return STRATEGIES.contender;
  if(wins<=24&&state.youngCore<78)return STRATEGIES.tank;
  return STRATEGIES.rebuild;
}
function post(game,text,tone="neutral",impact=60){
  game.mediaMode??={feed:[],pressHistory:[],nextId:1};
  game.mediaMode.feed??=[];game.mediaMode.nextId??=1;
  game.mediaMode.feed.unshift({id:game.mediaMode.nextId++,author:"League Wire",handle:"@leaguewire",text,tone,impact,season:game.season});
  game.mediaMode.feed=game.mediaMode.feed.slice(0,80);
}
function simulateLeagueWins(team,state,championId){
  let base=18+(state.starPower-60)*.75+(state.youngCore-60)*.18+roll(-8,8);
  if(state.strategy==="tank")base-=9;
  if(state.strategy==="winNow")base+=4;
  if(team.id===championId)base=Math.max(base,56);
  return clamp(Math.round(base),15,66);
}
function chooseOther(exclude){return TEAMS.filter(t=>t.id!==exclude)[roll(0,TEAMS.length-2)];}
function createTransaction(game,team,state){
  const other=chooseOther(team.id);
  const kind=state.strategy==="winNow"?"estrella":state.strategy==="rebuild"||state.strategy==="tank"?"joven promesa":"titular";
  const name=`${FIRST[roll(0,FIRST.length-1)]} ${LAST[roll(0,LAST.length-1)]}`;
  const text=state.strategy==="winNow"
    ?`${team.name} acelera por el anillo y adquiere a ${name}, ${kind}, desde ${other.name}.`
    :state.strategy==="rebuild"||state.strategy==="tank"
      ?`${team.name} envía a un veterano a ${other.name} y recibe activos de Draft y una ${kind}.`
      :`${team.name} completa un movimiento por ${name} para equilibrar su rotación.`;
  state.starPower=clamp(state.starPower+(state.strategy==="winNow"?roll(2,5):roll(-2,2)),55,98);
  state.youngCore=clamp(state.youngCore+((state.strategy==="rebuild"||state.strategy==="tank")?roll(3,7):roll(-2,2)),50,99);
  return {season:game.season,teamId:team.id,otherTeamId:other.id,type:"trade",text};
}
export function processOffseason(game,seasonData){
  const ai=migrateFranchiseAI(game),championId=game.league.life?.champions?.at(-1)?.teamId;
  const summary={season:game.season,moves:[],coachChanges:[],retirements:[],strategyChanges:[]};
  for(const team of TEAMS){
    const s=ai.teams[team.id];
    const wins=team.id===seasonData.teamId?seasonData.wins:simulateLeagueWins(team,s,championId);
    const previous=s.strategy;const next=strategyFor(s,wins);s.strategy=next.id;s.lastWins=wins;
    s.starPower=clamp(s.starPower+roll(-3,3)+(wins>=50?1:wins<=25?-1:0),55,98);
    s.youngCore=clamp(s.youngCore+roll(-2,3),50,99);
    if(previous!==s.strategy){
      const text=`${team.name} cambia su plan: ${STRATEGIES[previous]?.label||previous} → ${next.label}.`;
      summary.strategyChanges.push(text);post(game,text,"debate",56);
    }
    const moveChance=clamp(20+s.marketAggression*.45+(s.strategy==="winNow"?18:0),25,82);
    if(roll(1,100)<=moveChance){const tr=createTransaction(game,team,s);ai.transactions.push(tr);summary.moves.push(tr);if(summary.moves.length<=5)post(game,tr.text,s.strategy==="winNow"?"hype":"neutral",68);}
    const coach=game.league.coaches?.[team.id];
    const danger=(wins<30?30:0)+(coach?.seasons>=5?18:0)+(100-s.ownerPatience)*.25;
    if(coach&&roll(1,100)<=danger){
      const old=coach.name,newCoach=makeCoach(team);game.league.coaches[team.id]=newCoach;
      const item={season:game.season,teamId:team.id,oldCoach:old,newCoach:newCoach.name,style:newCoach.label};ai.coachChanges.push(item);summary.coachChanges.push(item);
      post(game,`${team.name} despide a ${old} y apuesta por ${newCoach.name}, perfil ${newCoach.label.toLowerCase()}.`,"debate",72);
    }
    if(roll(1,100)<=7){
      const veteran=`${FIRST[roll(0,FIRST.length-1)]} ${LAST[roll(0,LAST.length-1)]}`;
      const item={season:game.season,teamId:team.id,name:veteran,careerYears:roll(12,20)};ai.retirements.push(item);summary.retirements.push(item);
      if(summary.retirements.length<=3)post(game,`${veteran} anuncia su retirada tras ${item.careerYears} temporadas.`,"positive",64);
    }
  }
  ai.offseasons.push(summary);ai.offseasons=ai.offseasons.slice(-25);
  return summary;
}
export function getFranchiseStates(game){
  const ai=migrateFranchiseAI(game);
  return TEAMS.map(t=>({team:t,...ai.teams[t.id],strategyLabel:STRATEGIES[ai.teams[t.id].strategy]?.label||ai.teams[t.id].strategy})).sort((a,b)=>b.starPower-a.starPower);
}
export function getLatestOffseason(game){return migrateFranchiseAI(game).offseasons.at(-1)||null;}
