import { EVENT_TYPES, addEvent } from "./story-engine.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const sum=(items,key)=>items.reduce((t,item)=>t+Number(item[key]||0),0);
const round=n=>Math.round(n);

const LEGENDS=[
  {id:"legend_carter",name:"Marcus Carter",seasons:19,points:42115,rebounds:8120,assists:9860,mvps:5,championships:6,allStars:16,records:3,legacyScore:98,goatScore:9870,hallOfFame:true},
  {id:"legend_brooks",name:"Ethan Brooks",seasons:20,points:39840,rebounds:11320,assists:5210,mvps:6,championships:4,allStars:18,records:2,legacyScore:96,goatScore:9715,hallOfFame:true},
  {id:"legend_stone",name:"Michael Stone",seasons:18,points:33210,rebounds:12980,assists:4100,mvps:3,championships:8,allStars:15,records:2,legacyScore:95,goatScore:9630,hallOfFame:true},
  {id:"legend_price",name:"Jordan Price",seasons:17,points:36550,rebounds:6780,assists:11240,mvps:4,championships:3,allStars:14,records:2,legacyScore:93,goatScore:9440,hallOfFame:true},
  {id:"legend_reed",name:"Darius Reed",seasons:21,points:37205,rebounds:9040,assists:7440,mvps:2,championships:5,allStars:17,records:1,legacyScore:91,goatScore:9280,hallOfFame:true}
];

const RECORD_DEFS={
  points:{label:"Más puntos",unit:"puntos",legend:{name:"Marcus Carter",value:42115}},
  rebounds:{label:"Más rebotes",unit:"rebotes",legend:{name:"Michael Stone",value:12980}},
  assists:{label:"Más asistencias",unit:"asistencias",legend:{name:"Jordan Price",value:11240}},
  mvps:{label:"Más MVP",unit:"MVP",legend:{name:"Ethan Brooks",value:6}},
  championships:{label:"Más anillos",unit:"anillos",legend:{name:"Michael Stone",value:8}},
  allStars:{label:"Más All-Star",unit:"All-Star",legend:{name:"Ethan Brooks",value:18}},
  seasons:{label:"Más temporadas",unit:"temporadas",legend:{name:"Darius Reed",value:21}}
};

function ensureLegacy(game){
  game.league??={};
  game.league.legends??=LEGENDS.map(x=>({...x}));
  game.league.records??=Object.fromEntries(Object.entries(RECORD_DEFS).map(([key,def])=>[key,{key,label:def.label,unit:def.unit,holder:def.legend.name,value:def.legend.value,playerId:null}]));
  game.player.legacy??={records:[],hallOfFame:null,finalized:false};
  game.player.legacy.records??=[];
  return game.player.legacy;
}

export function getCareerTotals(game){
  const p=game.player,career=p.career||[];
  return {
    seasons:career.length,
    games:sum(career,"games"),
    points:round(career.reduce((t,s)=>t+Number(s.ppg||0)*Number(s.games||0),0)),
    rebounds:round(career.reduce((t,s)=>t+Number(s.rpg||0)*Number(s.games||0),0)),
    assists:round(career.reduce((t,s)=>t+Number(s.apg||0)*Number(s.games||0),0)),
    wins:sum(career,"wins"),
    mvps:Number(p.mvps||0),championships:Number(p.championships||0),allStars:Number(p.allStars||0),
    teams:(p.teamsPlayed||[]).length
  };
}

export function calculateLegacy(game){
  ensureLegacy(game);
  const p=game.player,t=getCareerTotals(game);
  const championships=clamp(t.championships*6,0,24);
  const mvps=clamp(t.mvps*7,0,21);
  const allStars=clamp(t.allStars*.85,0,13);
  const statistics=clamp((t.points/40000)*10+(t.rebounds/12000)*3+(t.assists/11000)*3,0,16);
  const longevity=clamp(t.seasons*.45,0,9);
  const loyalty=clamp(t.seasons?Math.max(0,7-(t.teams-1)*2)+(p.seasonsWithTeam>=10?1:0):0,0,8);
  const records=clamp((p.legacy.records||[]).length*3,0,9);
  const raw=championships+mvps+allStars+statistics+longevity+loyalty+records;
  const score=clamp(round(raw),0,100);
  const goatScore=round(score*85+t.mvps*95+t.championships*80+t.allStars*18+(t.points/100)+(t.rebounds+t.assists)/250);
  return {score,goatScore,breakdown:{championships:round(championships),mvps:round(mvps),allStars:round(allStars),statistics:round(statistics),longevity:round(longevity),loyalty:round(loyalty),records:round(records)},totals:t};
}

export function updateRecords(game,season=game.season){
  ensureLegacy(game);
  const totals=getCareerTotals(game),broken=[];
  Object.keys(RECORD_DEFS).forEach(key=>{
    const record=game.league.records[key],value=totals[key];
    if(value>record.value && record.playerId!=="user_player"){
      record.holder=game.player.name;record.value=value;record.playerId="user_player";
      if(!game.player.legacy.records.includes(key))game.player.legacy.records.push(key);
      const event=addEvent(game,{type:EVENT_TYPES.RECORD_BROKEN,season,importance:100,data:{playerName:game.player.name,recordKey:key,recordLabel:record.label,value,unit:record.unit}});
      broken.push(event);
    }else if(record.playerId==="user_player"&&value>record.value){record.value=value;}
  });
  return broken;
}

export function evaluateHallOfFame(game){
  const result=calculateLegacy(game),t=result.totals;
  const selected=result.score>=68 || t.mvps>=1 || t.championships>=3 || t.allStars>=8 || (t.points>=25000&&t.allStars>=5);
  return {selected,classYear:game.season+5,reason:selected?"Una carrera con impacto histórico suficiente para entrar entre los inmortales.":"La carrera no alcanzó todavía el nivel exigido por el comité.",legacyScore:result.score};
}

export function finalizeLegacy(game){
  const legacy=ensureLegacy(game);
  updateRecords(game,game.season);
  const hall=evaluateHallOfFame(game);
  legacy.hallOfFame=hall;legacy.finalized=true;
  if(hall.selected && !(game.history?.events||[]).some(e=>e.type===EVENT_TYPES.PLAYER_HALL_OF_FAME)){
    addEvent(game,{type:EVENT_TYPES.PLAYER_HALL_OF_FAME,season:hall.classYear,importance:98,data:{playerName:game.player.name,classYear:hall.classYear,legacyScore:hall.legacyScore}});
  }
  return calculateLegacy(game);
}

export function getGoatRanking(game){
  ensureLegacy(game);
  const current=calculateLegacy(game),user={id:"user_player",name:game.player.name,seasons:current.totals.seasons,points:current.totals.points,rebounds:current.totals.rebounds,assists:current.totals.assists,mvps:current.totals.mvps,championships:current.totals.championships,allStars:current.totals.allStars,records:game.player.legacy.records.length,legacyScore:current.score,goatScore:current.goatScore,hallOfFame:game.player.legacy.hallOfFame?.selected??false};
  const ranking=[...game.league.legends,user].sort((a,b)=>b.goatScore-a.goatScore);
  return ranking.map((entry,index)=>({...entry,rank:index+1,isUser:entry.id==="user_player"}));
}

export function getRecords(game){ensureLegacy(game);return Object.values(game.league.records);}
export function migrateLegacy(game){ensureLegacy(game);return game;}
