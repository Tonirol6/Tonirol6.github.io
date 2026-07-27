import { Random } from "../core/random-engine.js";
import { TEAMS } from "../data/teams.js";
import { createUniverseRepository } from "../core/universe-repository.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Random.next()*(max-min+1))+min;
const round1=n=>Math.round(n*10)/10;

const ROLES=[
  {id:"franchise",label:"Jugador franquicia",minOvr:89,minutes:36,bonus:1.16},
  {id:"star",label:"Titular estrella",minOvr:83,minutes:33,bonus:1.08},
  {id:"starter",label:"Titular",minOvr:77,minutes:29,bonus:1},
  {id:"rotation",label:"Rotación importante",minOvr:70,minutes:22,bonus:.9}
];

const BIG_MARKETS=new Set(["LAL","LAC","NYK","BKN","MIA","CHI","GSW","BOS"]);
const PATIENT_BUILDERS=new Set(["SAS","OKC","UTA","IND","MEM","ORL","TOR"]);
const STAR_HUNTERS=new Set(["LAL","LAC","NYK","MIA","PHX","DAL","GSW"]);

function roleFor(player,team,state={}){
  const rosterPower=state.starPower??team.strength??75;
  const pressure=rosterPower-78;
  const needBoost=team.need===player.position?3:0;
  const adjusted=player.ovr-pressure*.08+needBoost;
  return ROLES.find(r=>adjusted>=r.minOvr)||ROLES.at(-1);
}
function yearsFor(player,strategy){
  if(player.age>=35)return roll(1,2);
  if(player.age>=31)return roll(2,3);
  if(strategy==="rebuild"&&player.age<=27)return roll(4,5);
  return roll(3,5);
}
function marketSalary(player,team,role,state={},capRoom=50){
  const accolades=(player.allStars||0)*1.25+(player.mvps||0)*4+(player.championships||0)*1.4+(player.allNbaSelections||0)*.7;
  const market=(BIG_MARKETS.has(team.id)?2.2:0)+((team.market||team.strength||75)-70)*.08;
  const valueBoost=(player.marketValue||0)*.22;
  const ageDiscount=player.age>=35?.72:player.age>=32?.86:1;
  const capFactor=clamp(.76+capRoom/180,.82,1.16);
  return round1(clamp((((player.ovr-64)*1.18+accolades+market+valueBoost)*role.bonus)*ageDiscount*capFactor,1.2,64));
}
function strategyLabel(strategy){return ({winNow:"Ganar ahora",contender:"Competir",rebuild:"Reconstrucción",tank:"Reconstrucción profunda"})[strategy]||"Proyecto competitivo";}
function teamPitch(team,state,role,needMatch){
  const strategy=state.strategy||"contender";
  if(needMatch&&role.id==="franchise")return `Te ven como la pieza central para su plan de ${strategyLabel(strategy).toLowerCase()}`;
  if(strategy==="winNow")return "Candidato inmediato al campeonato que busca una última pieza";
  if(strategy==="rebuild"||strategy==="tank")return "Proyecto joven con minutos, paciencia y margen para crecer";
  if(BIG_MARKETS.has(team.id))return "Gran mercado, exposición nacional y ambición competitiva";
  if((state.youngCore||team.development)>=86)return "Núcleo joven de alto nivel y desarrollo de élite";
  return "Proyecto competitivo con un rol definido desde el primer día";
}
function migrateMemory(player){
  player.freeAgency??={version:2,markets:[],teamMemory:{},lastMarketSeason:null};
  player.freeAgency.version=2;
  player.freeAgency.markets??=[];
  player.freeAgency.teamMemory??={};
  return player.freeAgency;
}
function teamMemory(player,teamId){
  const fa=migrateMemory(player);
  return fa.teamMemory[teamId]??={offers:0,rejections:0,lastOfferSeason:null,lastSignedSeason:null,cooldownUntil:0,interest:50};
}
function currentState(game,team){
  return game?.league?.franchiseAI?.teams?.[team.id]||{
    strategy:team.strength>=86?"winNow":team.strength>=78?"contender":team.development>=84?"rebuild":"tank",
    marketAggression:clamp(35+Math.round((team.pressure||70)/2),20,95),
    salaryFlex:55,starPower:team.strength||75,youngCore:team.development||75,lastWins:null
  };
}
function capRoomFor(team,state,season){
  const cycle=((season||2027)+team.id.charCodeAt(0)+team.id.charCodeAt(team.id.length-1))%17;
  const base=(state.salaryFlex??55)*.72+(100-(state.starPower??team.strength??75))*.34+cycle-7;
  return clamp(Math.round(base+roll(-8,8)),8,82);
}
function fitScore(player,team,role,state,memory,capRoom,currentTeamId){
  const needMatch=team.need===player.position;
  const strategy=state.strategy||"contender";
  const wins=state.lastWins??Math.round((state.starPower??team.strength)*.72-8);
  const contenderFit=(strategy==="winNow"||strategy==="contender")?Math.min(wins,58)*.35:12;
  const youthFit=(player.age<=26?(state.youngCore??team.development)*.24:(strategy==="winNow"?14:4));
  const roleValue=role.minutes*.72;
  const need=needMatch?22:-3;
  const cap=capRoom*.18;
  const historyPenalty=memory.rejections*8+(memory.lastOfferSeason!=null&&memory.lastOfferSeason>=(seasonNumber(player)-2)?7:0);
  const loyalty=team.id===currentTeamId?10+Math.min(player.seasonsWithTeam||0,8):0;
  const market=(BIG_MARKETS.has(team.id)?3:0)+(STAR_HUNTERS.has(team.id)&&player.ovr>=88?5:0);
  const personality=PATIENT_BUILDERS.has(team.id)&&player.age<=27?4:0;
  return Math.round(clamp(need+contenderFit+youthFit+roleValue+cap+loyalty+market+personality-historyPenalty+roll(-9,9),1,100));
}
function seasonNumber(player){return player.career?.at(-1)?.season||player.freeAgency?.lastMarketSeason||0;}
function weightedDiverseSelection(candidates,count){
  const selected=[];
  const buckets={elite:0,middle:0,rebuild:0};
  for(const c of candidates){
    c.bucket=(c.state.strategy==="winNow"||c.state.starPower>=88)?"elite":(c.state.strategy==="rebuild"||c.state.strategy==="tank")?"rebuild":"middle";
  }
  const ordered=[...candidates].sort((a,b)=>b.score-a.score);
  for(const wanted of ["elite","middle","rebuild"]){
    const pick=ordered.find(c=>c.bucket===wanted&&!selected.includes(c));
    if(pick&&selected.length<count){selected.push(pick);buckets[wanted]++;}
  }
  while(selected.length<count){
    const remaining=ordered.filter(c=>!selected.includes(c));
    if(!remaining.length)break;
    const top=remaining.slice(0,Math.min(9,remaining.length));
    const total=top.reduce((s,c)=>s+Math.max(5,c.score),0);
    let ticket=Random.next()*total,pick=top[0];
    for(const c of top){ticket-=Math.max(5,c.score);if(ticket<=0){pick=c;break;}}
    selected.push(pick);
  }
  return selected;
}

export function migrateContracts(player){
  player.contractHistory??=[];
  player.careerEarnings??=0;
  player.negotiations??={attempts:0,successful:0,failed:0};
  migrateMemory(player);
  return player;
}

export function buildFreeAgencyMarket(player,currentTeamId,game=null,{forceNew=false,excludeTeamIds=[]}={}){
  migrateContracts(player);
  const season=game?.season??seasonNumber(player)+1;
  const fa=migrateMemory(player);
  if(!forceNew&&fa.activeMarket?.season===season){
    const filtered=fa.activeMarket.offers.filter(o=>!excludeTeamIds.includes(o.teamId)&&o.status!=="withdrawn");
    if(filtered.length)return filtered;
  }
  const current=createUniverseRepository(game).getTeam(currentTeamId);
  const candidates=TEAMS.filter(t=>t.id!==currentTeamId&&!excludeTeamIds.includes(t.id)).map(team=>{
    const state=currentState(game,team),memory=teamMemory(player,team.id),capRoom=capRoomFor(team,state,season);
    const role=roleFor(player,team,state);
    const cooldownPenalty=memory.cooldownUntil>=season?35:0;
    const affordability=(capRoom>=24||player.ovr<82)?0:-18;
    const score=fitScore(player,team,role,state,memory,capRoom,currentTeamId)-cooldownPenalty+affordability;
    return {team,state,memory,capRoom,role,score,onCooldown:memory.cooldownUntil>=season};
  }).filter(x=>!x.onCooldown&&x.score>22).sort((a,b)=>b.score-a.score);

  let pool=weightedDiverseSelection(candidates,5);
  if(current){
    const state=currentState(game,current),memory=teamMemory(player,current.id),capRoom=capRoomFor(current,state,season),role=roleFor(player,current,state);
    pool.push({team:current,state,memory,capRoom,role,score:fitScore(player,current,role,state,memory,capRoom,currentTeamId)+10,renewal:true,bucket:"current"});
  }
  pool=pool.sort((a,b)=>b.score-a.score).slice(0,6);
  const offers=pool.map((x,index)=>{
    const years=yearsFor(player,x.state.strategy);
    let salary=marketSalary(player,x.team,x.role,x.state,x.capRoom)*(x.renewal?1.025:1);
    if(x.capRoom<22)salary*=.88;
    const needMatch=x.team.need===player.position;
    const reasons=[
      needMatch?`Necesidad prioritaria: ${player.position}`:`Encaje de rotación: ${player.position}`,
      `${strategyLabel(x.state.strategy)} · ${x.state.lastWins??"—"} victorias recientes`,
      `Margen salarial estimado: ${x.capRoom}%`
    ];
    x.memory.offers++;x.memory.lastOfferSeason=season;x.memory.interest=clamp(Math.round((x.memory.interest+x.score)/2),1,100);
    return {
      id:`offer_${season}_${x.team.id}`,
      teamId:x.team.id,teamName:x.team.name,years,salary:round1(salary),totalValue:round1(salary*years),
      role:x.role.label,promisedMinutes:x.role.minutes,fit:clamp(x.score,1,100),pitch:teamPitch(x.team,x.state,x.role,needMatch),
      renewal:!!x.renewal,negotiable:index<4&&x.capRoom>=18,status:"open",strategy:x.state.strategy,
      strategyLabel:strategyLabel(x.state.strategy),capRoom:x.capRoom,lastWins:x.state.lastWins,need:x.team.need,
      interest:clamp(Math.round(x.score*.72+(x.state.marketAggression||50)*.28),1,100),reasons
    };
  });
  fa.lastMarketSeason=season;
  fa.activeMarket={season,currentTeamId,offers:offers.map(o=>({...o,reasons:[...(o.reasons||[])]}))};
  fa.markets.push({season,currentTeamId,offeredTeamIds:offers.map(o=>o.teamId),signedTeamId:null});
  fa.markets=fa.markets.slice(-20);
  return offers;
}

export function recordMarketOutcome(player,season,signedTeamId,offers=[]){
  const fa=migrateMemory(player);
  for(const offer of offers){
    const memory=teamMemory(player,offer.teamId);
    if(offer.teamId===signedTeamId){memory.lastSignedSeason=season;memory.rejections=Math.max(0,memory.rejections-1);memory.interest=100;}
    else {memory.rejections++;memory.cooldownUntil=season+roll(1,3);memory.interest=clamp(memory.interest-roll(8,18),5,100);}
  }
  const market=fa.markets.findLast?.(m=>m.season===season)||[...fa.markets].reverse().find(m=>m.season===season);
  if(market)market.signedTeamId=signedTeamId;
  fa.activeMarket=null;
}

export function counterOffer(player,offer){
  migrateContracts(player);player.negotiations.attempts++;
  const askRaise=offer.salary<18?2.2:offer.salary<35?3.5:5;
  const leverage=player.ovr+(player.reputation||50)*.08+(player.allStars||0)*1.5+(offer.interest||50)*.08+(offer.capRoom||40)*.06-offer.salary*.22+roll(-10,10);
  const accepted=leverage>=82;
  if(accepted){
    player.negotiations.successful++;
    return {...offer,salary:round1(offer.salary+askRaise),totalValue:round1((offer.salary+askRaise)*offer.years),status:"improved",negotiable:false,negotiationMessage:`${offer.teamName} acepta tu contraoferta.`};
  }
  player.negotiations.failed++;
  const withdrawn=leverage<68;
  return {...offer,status:withdrawn?"withdrawn":"final",negotiable:false,negotiationMessage:withdrawn?`${offer.teamName} retira la oferta tras no alcanzar un acuerdo.`:`${offer.teamName} mantiene su propuesta como oferta final.`};
}

export function signContract(player,offer,season){
  migrateContracts(player);
  const contract={yearsLeft:offer.years,totalYears:offer.years,salary:offer.salary,type:"Veterano",rolePromised:offer.role,promisedMinutes:offer.promisedMinutes,totalValue:offer.totalValue,signedSeason:season};
  player.contractHistory.push({season,teamId:offer.teamId,teamName:offer.teamName,...contract,renewal:offer.renewal,strategy:offer.strategy,fit:offer.fit});
  return contract;
}

export function recordSeasonSalary(player){
  migrateContracts(player);
  if(player.contract?.salary)player.careerEarnings=round1(player.careerEarnings+player.contract.salary);
}
