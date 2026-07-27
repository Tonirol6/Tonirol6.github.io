const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const round1=n=>Math.round(n*10)/10;

const CLASS_TYPES=[
 {id:"historic",label:"Generación histórica",weight:9,quality:96,depth:91,variance:7},
 {id:"strong",label:"Generación fuerte",weight:24,quality:89,depth:84,variance:6},
 {id:"normal",label:"Generación equilibrada",weight:43,quality:82,depth:78,variance:5},
 {id:"weak",label:"Generación floja",weight:24,quality:75,depth:70,variance:5}
];
const STRATEGIES=[
 {id:"contender",label:"Ganar ahora",minStrength:82,developmentBias:-1,winBonus:4,chemistryBonus:1},
 {id:"balanced",label:"Competir",minStrength:72,developmentBias:1,winBonus:1,chemistryBonus:2},
 {id:"rebuild",label:"Reconstrucción",minStrength:0,developmentBias:5,winBonus:-4,chemistryBonus:-1}
];
function weightedPick(r,items){let n=r()*items.reduce((s,x)=>s+x.weight,0);for(const x of items){n-=x.weight;if(n<=0)return x;}return items.at(-1);}
export function createDraftClassProfile(season){
 const r=rng(hash(`draft-class-${season}`)),type=weightedPick(r,CLASS_TYPES);
 return {season,type:type.id,label:type.label,quality:clamp(Math.round(type.quality+(r()-.5)*type.variance),68,99),depth:clamp(Math.round(type.depth+(r()-.5)*type.variance),62,96),starProbability:round1(clamp((type.quality-68)*1.25+(r()-.5)*5,5,42))};
}
export function getTeamStrategy(team,season,previousWins=null){
 const r=rng(hash(`${team.id}|${season}|strategy`));
 const effective=previousWins==null?team.strength:clamp(team.strength+(previousWins-41)*.18,55,96);
 let base=STRATEGIES.find(s=>effective>=s.minStrength)||STRATEGIES.at(-1);
 if(r()<.14)base=STRATEGIES[Math.floor(r()*STRATEGIES.length)];
 return {...base,season,teamId:team.id};
}
export function calculateDevelopmentDelta({player,coach,minutes,games,role,injury}){
 const age=player.age||19,peak=player.dna?.peakAge||28,potential=player.dna?.potential||player.potential||85;
 const gap=Math.max(0,potential-player.ovr),work=(player.dna?.workEthic||70)-70;
 const dev={Explosivo:.8,Rápido:.45,Normal:0,Lento:-.45}[player.dna?.development]||0;
 const opportunity=clamp((minutes-22)/11,-1.1,1.15)*clamp(games/72,.35,1.05);
 const roleBonus={Superestrella:-.1,Titular:.15,"Sexto hombre":.1,"Rotación":0,Proyecto:-.2}[role]||0;
 const ageCurve=age<=21?1.15:age<=24?.75:age<peak?.3:age<=peak+1?0:age<=32?-.65:age<=35?-1.25:-1.9;
 const ceiling=gap<=1?-1.35:gap<=4?-.65:gap>=12?.25:0;
 const health=injury?.severe?-1.5:injury?-.35:0;
 const coachEffect=((coach?.development||4)-4)/14;
 return clamp(Math.round(ageCurve+dev+opportunity+roleBonus+work/30+ceiling+health+coachEffect),-4,4);
}
export function normalizeSeasonStats(stats,player){
 const pos=player.position;
 const caps={PG:{ppg:36,rpg:11,apg:13.5,bpg:2.1},SG:{ppg:38,rpg:11,apg:10,bpg:2.3},SF:{ppg:37,rpg:13,apg:10,bpg:3},PF:{ppg:34,rpg:16,apg:8,bpg:4},C:{ppg:34,rpg:18,apg:7,bpg:5}}[pos]||{ppg:36,rpg:15,apg:12,bpg:4};
 const out={...stats};
 out.ppg=round1(clamp(out.ppg,1.5,caps.ppg));out.rpg=round1(clamp(out.rpg,.8,caps.rpg));out.apg=round1(clamp(out.apg,.4,caps.apg));
 out.spg=round1(clamp(out.spg,.1,3.4));out.bpg=round1(clamp(out.bpg,.1,caps.bpg));out.turnovers=round1(clamp(out.turnovers,.4,5.3));
 out.fgPct=round1(clamp(out.fgPct,34,68));out.threePct=round1(clamp(out.threePct,24,47));out.ftPct=round1(clamp(out.ftPct,50,95));
 out.per=round1(clamp(out.per,5,34));out.usage=round1(clamp(out.usage,8,39));out.threesMade=round1(clamp(out.threesMade,0,5.7));
 return out;
}
export function migrateBalance(game){
 game.league??={};game.league.balance??={};
 game.league.balance.version=1;
 game.league.balance.draftClasses??={};game.league.balance.teamStrategies??={};game.league.balance.history??=[];
 return game.league.balance;
}
export function prepareLeagueSeason(game,teams){
 const balance=migrateBalance(game),season=game.season;
 balance.draftClasses[season]??=createDraftClassProfile(season);
 for(const team of teams){
   const previous=balance.history.filter(x=>x.teamId===team.id).at(-1);
   balance.teamStrategies[`${season}:${team.id}`]??=getTeamStrategy(team,season,previous?.wins);
 }
 return {draftClass:balance.draftClasses[season],strategy:balance.teamStrategies[`${season}:${game.player.teamId}`]};
}
export function recordLeagueSeason(game,{teamId,wins,strategy,draftClass}){
 const balance=migrateBalance(game);
 balance.history.push({season:game.season,teamId,wins,strategy:strategy.id,draftClass:draftClass.type});
 if(balance.history.length>160)balance.history=balance.history.slice(-160);
}
