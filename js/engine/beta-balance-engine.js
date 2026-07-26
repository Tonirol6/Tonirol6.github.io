import { TEAMS } from "../data/teams.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const round1=n=>Math.round(n*10)/10;

const INJURIES=[
 {name:"Sobrecarga muscular",min:2,max:7,severity:"minor",weight:30,ovr:0},
 {name:"Esguince de tobillo",min:6,max:18,severity:"moderate",weight:25,ovr:0},
 {name:"Distensión muscular",min:10,max:26,severity:"moderate",weight:20,ovr:0},
 {name:"Lesión de hombro",min:14,max:34,severity:"major",weight:12,ovr:-1},
 {name:"Fractura",min:30,max:58,severity:"major",weight:8,ovr:-1},
 {name:"Rotura de ligamento",min:48,max:76,severity:"severe",weight:5,ovr:-2}
];
function weighted(items){let n=roll(1,items.reduce((s,x)=>s+x.weight,0));for(const x of items){n-=x.weight;if(n<=0)return x;}return items.at(-1);}

export function migrateBetaBalance(game){
 game.league??={};
 const b=game.league.betaBalance??={version:2,seasons:[],capHistory:[],injuryReports:[],marketHistory:[]};
 b.version=2;b.seasons??=[];b.capHistory??=[];b.injuryReports??=[];b.marketHistory??=[];
 const p=game.player;
 p.health??={condition:100,fatigue:0,recovery:100,injuryProneness:p.dna?.injuryRisk||18,careerWear:0};
 p.marketValue??=0;p.satisfaction??=72;p.rolePerformance??=50;
 return b;
}

export function calculateInjury(game,{minutes=24,games=82}={}){
 migrateBetaBalance(game);const p=game.player,h=p.health;
 const ageRisk=Math.max(0,p.age-29)*1.1;
 const workload=Math.max(0,minutes-28)*.65+Math.max(0,games-70)*.08;
 const durability=(100-(p.hidden?.durability||75))*.35;
 const fatigue=h.fatigue*.16+h.careerWear*.08;
 const risk=clamp(4+ageRisk+workload+durability+fatigue,3,38);
 if(Math.random()*100>risk)return null;
 let item=weighted(INJURIES);
 if(risk<10&&["major","severe"].includes(item.severity))item=INJURIES[roll(0,2)];
 const gamesOut=roll(item.min,item.max);
 const severe=item.severity==="severe";
 const injury={name:item.name,games:gamesOut,severe,severity:item.severity,ovrPenalty:item.ovr,recoveryTarget:clamp(100-gamesOut*.55,48,94)};
 h.condition=clamp(h.condition-gamesOut*.45,30,100);h.fatigue=clamp(h.fatigue+gamesOut*.3,0,100);h.careerWear=clamp(h.careerWear+(severe?8:item.severity==="major"?4:1),0,100);h.recovery=injury.recoveryTarget;
 game.league.betaBalance.injuryReports.unshift({season:game.season,player:p.name,...injury});
 game.league.betaBalance.injuryReports=game.league.betaBalance.injuryReports.slice(0,80);
 return injury;
}

export function finishHealthSeason(game,{minutes,games,injury}){
 migrateBetaBalance(game);const h=game.player.health;
 h.fatigue=clamp(h.fatigue+minutes*.7+games*.08-(injury?4:12),0,100);
 h.condition=clamp(h.condition+(injury?10:18)-h.fatigue*.08,35,100);
 h.recovery=clamp(h.recovery+(injury?roll(12,24):roll(22,35)),0,100);
 if(!injury)h.fatigue=clamp(h.fatigue-roll(12,24),0,100);
}

export function calculateRoleFit(player,team,coach){
 const need=team.need===player.position?18:0;
 const teamLevel=(player.ovr-(team.strength-4))*1.8;
 const youth=player.age<=24?(team.development-70)*.25:0;
 const coachDev=player.age<=25?(coach?.development||4)*1.2:0;
 return clamp(Math.round(48+need+teamLevel+youth+coachDev),5,99);
}

export function calculateMinutes(player,team,coach){
 const fit=calculateRoleFit(player,team,coach);
 const trust=(player.coachTrust-50)*.11;
 const promise=(player.contract?.promisedMinutes||0)*.28;
 return round1(clamp(7+(player.ovr-65)*.73+fit*.08+trust+promise,7,38.5));
}

export function updateMarketValue(game,seasonData){
 migrateBetaBalance(game);const p=game.player;
 const awards=(seasonData.mvp?14:0)+(seasonData.allStar?5:0)+(seasonData.champion?4:0);
 const production=seasonData.ppg*.62+seasonData.apg*.38+seasonData.rpg*.25+(seasonData.per-15)*.5;
 const ageFactor=p.age<=27?1:p.age<=31?.92:p.age<=34?.78:.58;
 p.marketValue=round1(clamp((p.ovr-62)*1.55+production+awards,1,70)*ageFactor);
 const promise=p.contract?.promisedMinutes||seasonData.minutes;
 const roleGap=seasonData.minutes-promise;
 p.rolePerformance=clamp(Math.round(55+roleGap*2+(seasonData.allStar?18:0)+(seasonData.ppg<9?-12:0)),0,100);
 p.satisfaction=clamp(Math.round(p.morale*.45+p.coachTrust*.25+p.rolePerformance*.3),0,100);
 return p.marketValue;
}

export function rebalanceFranchises(game){
 migrateBetaBalance(game);const ai=game.league.franchiseAI;
 if(!ai?.teams)return;
 const rows=[];
 for(const team of TEAMS){
  const s=ai.teams[team.id];if(!s)continue;
  const wins=s.lastWins??Math.round(20+(s.starPower-60)*.75);
  const target=wins>=50?"contender":wins<=27?"rebuild":"balanced";
  if(target==="rebuild"){s.youngCore=clamp(s.youngCore+roll(2,5),50,99);s.salaryFlex=clamp(s.salaryFlex+roll(3,8),20,100);s.marketAggression=clamp(s.marketAggression-roll(1,6),15,95);}
  else if(target==="contender"){s.starPower=clamp(s.starPower+roll(1,3),55,98);s.salaryFlex=clamp(s.salaryFlex-roll(2,7),10,100);s.marketAggression=clamp(s.marketAggression+roll(2,7),20,100);}
  else{s.starPower=clamp(s.starPower+roll(-1,2),55,98);s.youngCore=clamp(s.youngCore+roll(-1,2),50,99);}
  rows.push({teamId:team.id,wins,target,starPower:s.starPower,youngCore:s.youngCore,salaryFlex:s.salaryFlex});
 }
 game.league.betaBalance.seasons.push({season:game.season,teams:rows});
 game.league.betaBalance.seasons=game.league.betaBalance.seasons.slice(-40);
}

export function getBalanceReport(game){
 migrateBetaBalance(game);const p=game.player,h=p.health;
 return {marketValue:p.marketValue||0,satisfaction:p.satisfaction||0,condition:Math.round(h.condition),fatigue:Math.round(h.fatigue),careerWear:Math.round(h.careerWear),injuries:game.league.betaBalance.injuryReports.length,teams:Object.values(game.league.franchiseAI?.teams||{}).length};
}
