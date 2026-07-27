import { Random } from "../core/random-engine.js";
import { TEAMS } from '../data/teams.js';
import { migrateBasketballUniverse } from './basketball-universe-engine.js';

const EURO=['Real Madrid','FC Barcelona','Olympiacos','Panathinaikos','Fenerbahçe','AS Monaco','Partizan Belgrade','Virtus Bologna','Olimpia Milano','Žalgiris Kaunas'];
const NCAA=['Duke Blue Devils','UConn Huskies','Kansas Jayhawks','Kentucky Wildcats','North Carolina Tar Heels','Houston Cougars','Gonzaga Bulldogs','Purdue Boilermakers'];
const FIBA=['España','Estados Unidos','Francia','Serbia','Canadá','Alemania','Eslovenia','Australia','Grecia','Lituania'];
const pick=a=>a[Math.floor(Random.next()*a.length)];
const roll=(a,b)=>Math.floor(Random.next()*(b-a+1))+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function migrateSeasonResults(game){
  game.seasonResults??=[];
  return game.seasonResults;
}

function weightedTeam(excluded=[], game){
  const previous=migrateSeasonResults(game).slice(-4);
  const recentCounts=Object.fromEntries(TEAMS.map(t=>[t.id,previous.filter(s=>s.nba?.championId===t.id).length]));
  const pool=TEAMS.filter(t=>!excluded.includes(t.id)).map(t=>({
    team:t,
    weight:Math.max(4,(t.strength-60)*1.35+(t.development-60)*.25-roll(0,8)-recentCounts[t.id]*13)
  }));
  let cursor=Random.next()*pool.reduce((s,x)=>s+x.weight,0);
  for(const x of pool){cursor-=x.weight;if(cursor<=0)return x.team;}
  return pool[0]?.team||TEAMS[0];
}

function worldAwardWinners(game, playerAwards){
  const active=migrateBasketballUniverse(game).players.filter(p=>p.status==='NBA'&&p.status!=='retired');
  const ranked=[...active].sort((a,b)=>(b.ovr*1.2+b.legacy/35)-(a.ovr*1.2+a.legacy/35));
  return {
    mvp:playerAwards.mvp?game.player.name:(ranked[0]?.name||'Jugador generado'),
    dpoy:playerAwards.dpoy?game.player.name:(ranked.find(p=>p.position==='C'||p.position==='PF')?.name||ranked[1]?.name||'Jugador generado'),
    rookie:playerAwards.rookie?game.player.name:(ranked.filter(p=>p.age<=22)[0]?.name||'Novato generado'),
    mip:playerAwards.mip?game.player.name:(ranked[roll(2,Math.max(2,Math.min(8,ranked.length-1)))]?.name||'Jugador generado')
  };
}

export function createSeasonResult(game,{team,teamResult,stats,awards,games,minutes}){
  const existing=migrateSeasonResults(game).find(s=>s.season===game.season);
  if(existing)return existing;
  const playerChampion=!!teamResult.champion;
  const nbaChampion=playerChampion?team:weightedTeam([team.id],game);
  const finalist=playerChampion?weightedTeam([team.id],game):weightedTeam([nbaChampion.id],game);
  const world=worldAwardWinners(game,awards);
  const playerFinalsMvp=playerChampion&&awards.finalsMvp;
  const result={
    version:2,
    season:game.season,
    createdAt:new Date().toISOString(),
    player:{
      name:game.player.name,teamId:team.id,teamName:team.name,games,minutes,stats:{...stats},
      champion:playerChampion,playoffs:teamResult.playoffs,roundsWon:teamResult.roundsWon,playoffExit:teamResult.playoffExit,
      awards:{...awards}
    },
    nba:{
      championId:nbaChampion.id,champion:nbaChampion.name,
      finalistId:finalist.id,finalist:finalist.name,
      mvp:world.mvp,finalsMvp:playerFinalsMvp?game.player.name:(nbaChampion.id===team.id?game.player.name:(migrateBasketballUniverse(game).players.filter(p=>p.status==='NBA').sort((a,b)=>b.ovr-a.ovr)[0]?.name||'Estrella del equipo campeón')),
      dpoy:world.dpoy,rookie:world.rookie,mip:world.mip,
      allNba:awards.allNba,allDefensive:awards.allDefensive
    },
    europe:{champion:pick(EURO),mvp:migrateBasketballUniverse(game).players.filter(p=>p.status==='Europe').sort((a,b)=>b.ovr-a.ovr)[0]?.name||'Estrella europea'},
    ncaa:{champion:pick(NCAA)},
    fiba:null,
    draft:[],
    headlines:[]
  };
  if(game.season%4===0){const gold=pick(FIBA);const silver=pick(FIBA.filter(x=>x!==gold));result.fiba={tournament:'Juegos Olímpicos',gold,silver,bronze:pick(FIBA.filter(x=>x!==gold&&x!==silver)),mvp:world.mvp};}
  else if(game.season%2===1){const euroCountries=FIBA.filter(x=>!['Estados Unidos','Canadá','Australia'].includes(x));const gold=pick(euroCountries);const silver=pick(euroCountries.filter(x=>x!==gold));result.fiba={tournament:'EuroBasket',gold,silver,bronze:pick(euroCountries.filter(x=>x!==gold&&x!==silver)),mvp:world.mvp};}
  game.seasonResults.push(result);
  game.seasonResults.sort((a,b)=>a.season-b.season);
  if(game.seasonResults.length>60)game.seasonResults=game.seasonResults.slice(-60);
  return result;
}

export function getSeasonResult(game,season){return migrateSeasonResults(game).find(s=>s.season===Number(season))||null;}
