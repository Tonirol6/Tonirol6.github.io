import { TEAMS } from "../data/teams.js";
import { EVENT_TYPES, addEvent } from "./story-engine.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const FIRST=["Marcus","Darius","Ethan","Jordan","Malik","Cameron","Andre","Jalen","Victor","Noah"];
const LAST=["Carter","Brooks","Stone","Price","Reed","Hayes","Coleman","Ward","Foster","Bennett"];

function createRival(game){
  const p=game.player;
  const team=TEAMS.filter(t=>t.id!==p.teamId)[roll(0,TEAMS.length-2)];
  return {id:"rival_1",name:`${FIRST[roll(0,FIRST.length-1)]} ${LAST[roll(0,LAST.length-1)]}`,teamId:team.id,position:p.position,ovr:clamp(p.ovr+roll(-2,4),72,94),age:p.age+roll(-1,2),meetings:0,userWins:0,rivalWins:0,userPoints:0,rivalPoints:0,intensity:8,level:"Cruce emergente",lastSeason:null};
}

export function migrateLeagueLife(game){
  game.league??={};
  game.league.life??={version:1,rival:null,champions:[],dynasties:{},narratives:[],flags:{}};
  const life=game.league.life;
  life.version??=1; life.champions??=[]; life.dynasties??={}; life.narratives??=[]; life.flags??={};
  if(game.player?.teamId && !life.rival) life.rival=createRival(game);
  return game;
}

function unlock(game,key,title,description,importance=72,data={}){
  const life=game.league.life;
  if(life.flags[key]) return null;
  life.flags[key]=true;
  const narrative={key,title,description,season:game.season,importance};
  life.narratives.push(narrative);
  addEvent(game,{type:EVENT_TYPES.NARRATIVE_UNLOCKED,season:game.season,importance,teamId:game.player.teamId,data:{playerName:game.player.name,title,description,...data}});
  return narrative;
}

function simulateRivalry(game,seasonData){
  const life=game.league.life,r=life.rival,p=game.player;
  if(!r) return;
  const meetings=roll(2,4), edge=(p.ovr-r.ovr)*1.8+(seasonData.ppg-20)*.5;
  let userWins=0;
  for(let i=0;i<meetings;i++) if(roll(1,100)<=clamp(50+edge,20,80)) userWins++;
  const rivalWins=meetings-userWins;
  const userAvg=Math.max(8,Math.round((seasonData.ppg+roll(-3,5))*10)/10);
  const rivalAvg=Math.max(8,Math.round((14+(r.ovr-70)*.65+roll(-20,25)/10)*10)/10);
  r.meetings+=meetings;r.userWins+=userWins;r.rivalWins+=rivalWins;r.userPoints+=userAvg*meetings;r.rivalPoints+=rivalAvg*meetings;r.lastSeason=game.season;
  r.ovr=clamp(r.ovr+roll(-1,2),68,97);
  r.intensity=clamp(r.intensity+meetings*2+Math.abs(userWins-rivalWins)+((seasonData.allStar||seasonData.mvp)?5:0),0,100);
  r.level=r.intensity>=80?"Rivalidad histórica":r.intensity>=55?"Rivalidad nacional":r.intensity>=30?"Rivalidad consolidada":"Cruce emergente";
  const threshold=r.intensity>=80?80:r.intensity>=55?55:r.intensity>=30?30:null;
  if(threshold && !life.flags[`rivalry_${threshold}`]){
    life.flags[`rivalry_${threshold}`]=true;
    addEvent(game,{type:EVENT_TYPES.RIVALRY_MILESTONE,season:game.season,importance:threshold===80?94:threshold===55?80:65,data:{playerName:p.name,rivalName:r.name,meetings:r.meetings,userWins:r.userWins,rivalWins:r.rivalWins,level:r.level,userAvg:Math.round(r.userPoints/r.meetings*10)/10,rivalAvg:Math.round(r.rivalPoints/r.meetings*10)/10}});
  }
}

function updateChampions(game,seasonData){
  const life=game.league.life;
  let championId;
  if(seasonData.champion) championId=game.player.teamId;
  else {
    const contenders=TEAMS.filter(t=>t.id!==game.player.teamId).sort((a,b)=>b.strength-a.strength+roll(-18,18));
    championId=contenders[0].id;
  }
  const champion=TEAMS.find(t=>t.id===championId);
  life.champions.push({season:game.season,teamId:championId,teamName:champion.name});
  const prev=life.champions.at(-2);
  const dynasty=life.dynasties[championId]??={teamId:championId,teamName:champion.name,currentStreak:0,bestStreak:0,totalTitles:0,lastTitle:null};
  dynasty.currentStreak=prev?.teamId===championId?dynasty.currentStreak+1:1;
  dynasty.bestStreak=Math.max(dynasty.bestStreak,dynasty.currentStreak);dynasty.totalTitles++;dynasty.lastTitle=game.season;
  life.dynasties[championId]=dynasty;
  Object.values(life.dynasties).forEach(d=>{if(d.teamId!==championId)d.currentStreak=0;});
  if(dynasty.currentStreak>=3 && !life.flags[`dynasty_${championId}_${dynasty.currentStreak}`]){
    life.flags[`dynasty_${championId}_${dynasty.currentStreak}`]=true;
    addEvent(game,{type:EVENT_TYPES.TEAM_DYNASTY,season:game.season,importance:dynasty.currentStreak>=4?98:91,teamId:championId,data:{teamName:champion.name,streak:dynasty.currentStreak,totalTitles:dynasty.totalTitles,playerName:championId===game.player.teamId?game.player.name:null}});
  }
}

function detectNarratives(game,seasonData){
  const p=game.player,career=p.career;
  if(p.draftPick>=35 && (p.allStars>=1||p.mvps>=1)) unlock(game,"late_pick_star","El elegido que nadie esperaba",`${p.name}, pick ${p.draftPick}, ha convertido una elección tardía en una carrera estelar.`,82,{draftPick:p.draftPick});
  if(p.seasonsWithTeam>=10) unlock(game,"one_team_decade","El rostro de una franquicia",`${p.name} alcanza una década defendiendo los mismos colores.`,78,{teamName:seasonData.team,seasons:p.seasonsWithTeam});
  if(career.length>=12 && p.championships===0) unlock(game,"ringless_veteran","La persecución del anillo",`${p.name} entra en la recta final de su carrera con una cuenta pendiente: el campeonato.`,74,{seasons:career.length});
  const previous=career.at(-2);
  if(previous?.injury && p.injuryHistory?.find(i=>i.season===previous.season&&i.severe) && (seasonData.allStar||seasonData.mvp)) unlock(game,"great_comeback","El gran regreso",`${p.name} vuelve de una lesión grave y recupera su lugar entre la élite.`,90,{previousSeason:previous.season});
  if(p.mvps>=3) unlock(game,"era_defining","El jugador de su era",`${p.name} ya no domina una temporada: está definiendo una generación.`,94,{mvps:p.mvps});
  if(p.championships>=4) unlock(game,"serial_champion","Una carrera construida para ganar",`${p.name} suma cuatro campeonatos y entra en territorio reservado a las dinastías.`,95,{championships:p.championships});
}

export function processLeagueSeason(game,seasonData){
  migrateLeagueLife(game);
  simulateRivalry(game,seasonData);
  updateChampions(game,seasonData);
  detectNarratives(game,seasonData);
  return game.league.life;
}

export function getLeagueLife(game){migrateLeagueLife(game);return game.league.life;}
export function getRivalry(game){return getLeagueLife(game).rival;}
export function getDynasties(game){return Object.values(getLeagueLife(game).dynasties).sort((a,b)=>b.bestStreak-a.bestStreak||b.totalTitles-a.totalTitles);}
export function getNarratives(game){return [...getLeagueLife(game).narratives].sort((a,b)=>b.season-a.season);}
