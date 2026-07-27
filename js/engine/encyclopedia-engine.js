import { Random } from "../core/random-engine.js";
import { migrateBasketballUniverse } from './basketball-universe-engine.js';
import { createUniverseRepository } from "../core/universe-repository.js";
import { migrateSeasonResults, getSeasonResult } from './season-result-engine.js';

const pick=a=>a[Math.floor(Random.next()*a.length)];
const roll=(a,b)=>Math.floor(Random.next()*(b-a+1))+a;
const NBA_FINALISTS=['Boston Celtics','Los Angeles Lakers','Golden State Warriors','Denver Nuggets','Miami Heat','Milwaukee Bucks','New York Knicks','Dallas Mavericks','Oklahoma City Thunder'];
const EURO=['Real Madrid','FC Barcelona','Olympiacos','Panathinaikos','Fenerbahçe','AS Monaco','Partizan','Virtus Bologna'];
const FIBA=['España','Estados Unidos','Francia','Serbia','Canadá','Alemania','Eslovenia','Australia','Grecia','Lituania'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function migrateEncyclopedia(game){
 const u=migrateBasketballUniverse(game);
 game.encyclopedia??={version:2,seasons:[],records:[],drafts:[],fiba:[],lastSeason:null,searchHistory:[],bookmarks:[]};
 const e=game.encyclopedia;e.version=2;e.searchHistory??=[];e.bookmarks??=[];
 // Migra el historial simple de 7.3.2 sin duplicarlo.
 for(const h of [...(u.seasonHistory||[])].reverse()){
  if(!e.seasons.some(s=>s.season===h.season)){
   const entry=buildSeason(game,h.season,h);e.seasons.push(entry);
   if(!e.drafts.some(d=>d.season===h.season))e.drafts.push({season:h.season,picks:entry.draft});
   if(entry.fiba&&!e.fiba.some(f=>f.season===h.season))e.fiba.push({season:h.season,...entry.fiba});
  }
 }
 refreshRecords(game);
 return e;
}

function activePlayers(game){return migrateBasketballUniverse(game).players.filter(p=>p.status!=='retired');}
function stars(game,status){return activePlayers(game).filter(p=>!status||p.status===status).sort((a,b)=>(b.ovr+b.legacy/18)-(a.ovr+a.legacy/18));}
function finalist(champion,pool){return pick(pool.filter(x=>x!==champion));}
function playerStats(p){const base=clamp((p?.ovr||75)-55,8,38);return {ppg:Math.round((base+roll(-3,4))*10)/10,rpg:Math.round((3+base/5+roll(-2,2))*10)/10,apg:Math.round((2+base/6+roll(-2,3))*10)/10};}


function fromSeasonResult(game,result){
 const all=stars(game), scoring=all[0], assists=all.find(p=>p.position==='PG')||all[1], rebounds=all.find(p=>p.position==='C'||p.position==='PF')||all[2];
 const draftClass=activePlayers(game).filter(p=>p.draftYear===result.season).sort((a,b)=>(b.potential+b.ovr)-(a.potential+a.ovr)).slice(0,10).map((p,i)=>({pick:i+1,name:p.name,country:p.country,team:p.status==='NBA'?p.currentTeam:pick(NBA_FINALISTS),ovr:p.ovr,potential:p.potential}));
 return {season:result.season,
  nba:{champion:result.nba.champion,finalist:result.nba.finalist,mvp:result.nba.mvp,finalsMvp:result.nba.finalsMvp,rookie:result.nba.rookie,dpoy:result.nba.dpoy,mip:result.nba.mip,sixth:'—',allNba:result.nba.allNba,allDefensive:result.nba.allDefensive,leaders:{points:{name:scoring?.name||result.player.name,value:scoring?playerStats(scoring).ppg:result.player.stats.ppg},assists:{name:assists?.name||result.player.name,value:assists?playerStats(assists).apg:result.player.stats.apg},rebounds:{name:rebounds?.name||result.player.name,value:rebounds?playerStats(rebounds).rpg:result.player.stats.rpg}}},
  europe:{champion:result.europe.champion,finalist:finalist(result.europe.champion,EURO),mvp:result.europe.mvp,finalFourMvp:result.europe.mvp,euroCupChampion:pick(EURO.filter(x=>x!==result.europe.champion))},
  ncaa:{champion:result.ncaa.champion,finalist:finalist(result.ncaa.champion,['Duke','UConn','Kansas','Kentucky','North Carolina','Houston','Gonzaga']),playerOfYear:'—',mop:'—'},
  fiba:result.fiba,draft:draftClass,
  headlines:[{season:result.season,type:'champions',text:`${result.nba.champion} gana la NBA; ${result.europe.champion} conquista Europa; ${result.ncaa.champion} gana el March Madness.`}]
 };
}
function buildSeason(game,season,source={}){
 if(source?.version===2&&source?.nba)return fromSeasonResult(game,source);
 const nba=stars(game,'NBA'),euro=stars(game,'Europe'),all=stars(game);
 const nbaMvp=source.nbaMvp&&source.nbaMvp!=='—'?source.nbaMvp:nba[0]?.name||all[0]?.name||'—';
 const euroMvp=source.euroMvp&&source.euroMvp!=='—'?source.euroMvp:euro[0]?.name||all[1]?.name||'—';
 const nbaChampion=source.nbaChampion||pick(NBA_FINALISTS), euroChampion=source.euroChampion||pick(EURO), ncaaChampion=source.ncaaChampion||pick(['Duke','UConn','Kansas','Kentucky','North Carolina','Houston','Gonzaga']);
 const rookie=all.filter(p=>p.age<=22).sort((a,b)=>b.ovr-a.ovr)[0]?.name||'—';
 const dpoy=all.sort((a,b)=>(b.ovr+b.potential/8)-(a.ovr+a.potential/8))[1]?.name||nbaMvp;
 const scoring=all[0], assists=all.find(p=>p.position==='PG')||all[1], rebounds=all.find(p=>p.position==='C'||p.position==='PF')||all[2];
 const draftClass=activePlayers(game).filter(p=>p.draftYear===season).sort((a,b)=>(b.potential+b.ovr)-(a.potential+a.ovr)).slice(0,10).map((p,i)=>({pick:i+1,name:p.name,country:p.country,team:p.status==='NBA'?p.currentTeam:pick(NBA_FINALISTS),ovr:p.ovr,potential:p.potential}));
 const fibaEvent=season%4===0?{tournament:'Juegos Olímpicos',gold:pick(FIBA),silver:null,bronze:null,mvp:all[0]?.name||'—'}:season%2===1?{tournament:'EuroBasket',gold:pick(FIBA.filter(x=>x!=='Estados Unidos'&&x!=='Canadá'&&x!=='Australia')),silver:null,bronze:null,mvp:euro[0]?.name||all[0]?.name||'—'}:null;
 if(fibaEvent){fibaEvent.silver=finalist(fibaEvent.gold,FIBA);fibaEvent.bronze=pick(FIBA.filter(x=>x!==fibaEvent.gold&&x!==fibaEvent.silver));}
 return {season,
  nba:{champion:nbaChampion,finalist:finalist(nbaChampion,NBA_FINALISTS),mvp:nbaMvp,finalsMvp:nba[0]?.name||nbaMvp,rookie,dpoy,mip:all[roll(0,Math.min(5,all.length-1))]?.name||'—',sixth:all[roll(0,Math.min(8,all.length-1))]?.name||'—',leaders:{points:{name:scoring?.name||'—',value:playerStats(scoring).ppg},assists:{name:assists?.name||'—',value:playerStats(assists).apg},rebounds:{name:rebounds?.name||'—',value:playerStats(rebounds).rpg}}},
  europe:{champion:euroChampion,finalist:finalist(euroChampion,EURO),mvp:euroMvp,finalFourMvp:euro[0]?.name||euroMvp,euroCupChampion:pick(EURO.filter(x=>x!==euroChampion))},
  ncaa:{champion:ncaaChampion,finalist:finalist(ncaaChampion,['Duke','UConn','Kansas','Kentucky','North Carolina','Houston','Gonzaga']),playerOfYear:rookie,mop:rookie},
  fiba:fibaEvent,draft:draftClass,
  headlines:(migrateBasketballUniverse(game).timeline||[]).filter(x=>x.season===season).slice(0,8)
 };
}

export function recordEncyclopediaSeason(game,season=game.season,seasonResult=null){
 const e=migrateEncyclopedia(game);
 const existing=e.seasons.find(s=>s.season===season);
 if(existing){if(!e.drafts.some(d=>d.season===season))e.drafts.push({season,picks:existing.draft||[]});if(existing.fiba&&!e.fiba.some(f=>f.season===season))e.fiba.push({season,...existing.fiba});e.lastSeason=season;refreshRecords(game);return e;}
 const source=seasonResult||getSeasonResult(game,season)||migrateBasketballUniverse(game).seasonHistory.find(s=>s.season===season)||{};
 const entry=buildSeason(game,season,source);e.seasons.push(entry);e.seasons.sort((a,b)=>a.season-b.season);e.drafts.push({season,picks:entry.draft});if(entry.fiba)e.fiba.push({season,...entry.fiba});e.lastSeason=season;refreshRecords(game);return e;
}

export function getEncyclopediaSeasons(game){return [...migrateEncyclopedia(game).seasons].sort((a,b)=>b.season-a.season);}
export function getEncyclopediaSeason(game,season){return migrateEncyclopedia(game).seasons.find(s=>s.season===Number(season))||null;}

export function getWorldPlayers(game){
 const u=migrateBasketballUniverse(game);return [...u.players].sort((a,b)=>legacyScore(b)-legacyScore(a));
}
export function legacyScore(p){return Math.round((p.legacy||0)+(p.ovr||0)*3+(p.awards?.length||0)*90+(p.status==='retired'?25:0));}
export function getWorldRanking(game){return getWorldPlayers(game).slice(0,50).map((p,i)=>({...p,rank:i+1,legacyScore:legacyScore(p)}));}
export function getPlayerBiography(game,id){
 migrateBasketballUniverse(game);const p=createUniverseRepository(game).getPlayer(id);if(!p)return null;
 const timeline=[];
 timeline.push({season:Math.max(2026,(p.draftYear||2028)-2),text:`Comienza su desarrollo en ${p.route} con ${p.currentTeam}.`});
 (p.career||[]).forEach(x=>timeline.push({season:x.season||x.year||'—',text:x.text||`${x.team||p.currentTeam}: ${x.event||'temporada profesional'}.`}));
 (p.awards||[]).forEach(a=>{const m=String(a).match(/^(\d{4}):\s*(.*)$/);timeline.push({season:m?Number(m[1]):'—',text:m?m[2]:a});});
 if(p.status==='retired')timeline.push({season:p.inducted||'—',text:'Anuncia su retirada del baloncesto profesional.'});
 const teams=[...new Set([p.currentTeam,...timeline.map(x=>x.team).filter(Boolean)])];
 return {...p,legacyScore:legacyScore(p),timeline:timeline.sort((a,b)=>String(a.season).localeCompare(String(b.season))),teams,summary:`${p.name}, ${p.position} de ${p.country}, construyó su carrera a través de ${p.route}. Su trayectoria alcanzó ${p.ovr} OVR y ${legacyScore(p)} puntos de legado.`};
}
function refreshRecords(game){
 const e=game.encyclopedia,u=migrateBasketballUniverse(game),players=[...u.players];
 const by=(fn)=>players.sort((a,b)=>fn(b)-fn(a))[0];
 const award=by(p=>p.awards?.length||0),legacy=by(p=>legacyScore(p)),ovr=by(p=>p.ovr||0);
 e.records=[
  {scope:'Mundial',label:'Mayor Legacy Score',value:legacy?legacyScore(legacy):0,holder:legacy?.name||'—'},
  {scope:'Mundial',label:'Más premios individuales',value:award?.awards?.length||0,holder:award?.name||'—'},
  {scope:'Mundial',label:'OVR más alto',value:ovr?.ovr||0,holder:ovr?.name||'—'},
  {scope:'Historia',label:'Temporadas archivadas',value:e.seasons.length,holder:'Basketball Universe'},
  {scope:'Draft',label:'Clases de Draft archivadas',value:e.drafts.length,holder:'Enciclopedia'},
  {scope:'FIBA',label:'Torneos archivados',value:e.fiba.length,holder:'Selecciones'}
 ];
}
export function getEncyclopediaRecords(game){migrateEncyclopedia(game);return game.encyclopedia.records;}
export function getHallMuseum(game){const u=migrateBasketballUniverse(game);return [...u.hallOfFame].map(p=>({...p,legacyScore:legacyScore(p)})).sort((a,b)=>b.legacyScore-a.legacyScore);}


// NBA Glory 1.5.5 · Basketball Encyclopedia navegable
function normalizeText(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function actualSeasonPatch(game,entry){
 const europe=game.world?.europe?.seasons?.find(x=>x.season===entry.season);
 const ncaa=game.world?.ncaaDraft?.history?.find(x=>x.season===entry.season);
 const intl=game.international?.tournaments?.find(x=>x.season===entry.season);
 if(europe)entry.europe={...entry.europe,champion:europe.champion,finalist:europe.finalist,mvp:europe.mvp,finalFourMvp:europe.finalFourMvp,defensivePlayer:europe.defensivePlayer,risingStar:europe.risingStar,acbChampion:europe.acbChampion,cupWinner:europe.cupWinner,finalFour:europe.finalFour};
 if(ncaa)entry.ncaa={...entry.ncaa,champion:ncaa.champion,mop:ncaa.mop,playerOfYear:ncaa.playerOfYear};
 if(intl)entry.fiba={tournament:intl.name,gold:intl.champion,silver:intl.finalist,bronze:intl.bronze,mvp:intl.mvp};
 return entry;
}
function syncEncyclopedia(game){
 const e=migrateEncyclopedia(game);
 const seasons=new Set([...(game.seasonResults||[]).map(x=>x.season),...(game.world?.europe?.seasons||[]).map(x=>x.season),...(game.world?.ncaaDraft?.history||[]).map(x=>x.season),...(game.international?.tournaments||[]).map(x=>x.season)]);
 for(const season of seasons)if(!e.seasons.some(x=>x.season===season))recordEncyclopediaSeason(game,season);
 e.seasons.forEach(x=>actualSeasonPatch(game,x));
 e.seasons.sort((a,b)=>a.season-b.season);
 e.drafts=(game.world?.ncaaDraft?.classes||[]).filter(c=>c.completed||c.mock?.length).map(c=>({season:c.season,picks:(c.mock||[]).slice(0,30),champion:c.marchMadness?.champion||null,mop:c.marchMadness?.mop||null,classStrength:Math.round((c.prospects||[]).slice(0,10).reduce((a,p)=>a+(p.stock||0),0)/Math.max(1,Math.min(10,(c.prospects||[]).length)))})).sort((a,b)=>b.season-a.season);
 e.fiba=(game.international?.tournaments||[]).map(t=>({season:t.season,tournament:t.name,gold:t.champion,silver:t.finalist,bronze:t.bronze,mvp:t.mvp,playerParticipated:t.playerParticipated})).sort((a,b)=>b.season-a.season);
 refreshRecords(game);return e;
}
export function getEncyclopediaDashboard(game){
 const e=syncEncyclopedia(game),u=migrateBasketballUniverse(game),players=[...u.players,...(u.hallOfFame||[])].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i);
 const europe=game.world?.europe,international=game.international,ncaa=game.world?.ncaaDraft;
 return {stats:{seasons:e.seasons.length,players:players.length,drafts:e.drafts.length,clubs:europe?.clubs?.length||0,internationalTeams:international?.teams?.length||0,hallOfFamers:(u.hallOfFame||[]).length,records:e.records.length},latestSeason:[...e.seasons].sort((a,b)=>b.season-a.season)[0]||null,topPlayers:getWorldRanking(game).slice(0,5),latestDraft:e.drafts[0]||null,latestFiba:e.fiba[0]||null,topClubs:getClubArchive(game).slice(0,5),timeline:getTimelineArchive(game).slice(0,8),ncaaChampions:[...(ncaa?.history||[])].reverse().slice(0,5)};
}
export function getDraftArchive(game){syncEncyclopedia(game);return [...game.encyclopedia.drafts];}
export function getCompetitionArchive(game){
 syncEncyclopedia(game);return {nba:getEncyclopediaSeasons(game).map(s=>({season:s.season,champion:s.nba.champion,finalist:s.nba.finalist,mvp:s.nba.mvp,finalsMvp:s.nba.finalsMvp})),europe:[...(game.world?.europe?.seasons||[])].sort((a,b)=>b.season-a.season),ncaa:[...(game.world?.ncaaDraft?.history||[])].sort((a,b)=>b.season-a.season),fiba:[...(game.encyclopedia.fiba||[])]};
}
export function getClubArchive(game){
 const clubs=game.world?.europe?.clubs||[];return [...clubs].map(c=>({...c,score:(c.titles||0)*25+(c.domesticTitles||0)*7+(c.cups||0)*4+(c.finalFours||0)*3+c.prestige})).sort((a,b)=>b.score-a.score);
}
export function getClubBiography(game,id){
 const club=createUniverseRepository(game).getEuropeanClub(id);if(!club)return null;
 const seasons=(game.world?.europe?.seasons||[]).filter(s=>s.champion===club.name||s.finalist===club.name||s.finalFour?.includes(club.name)||s.acbChampion===club.name||s.cupWinner===club.name).sort((a,b)=>b.season-a.season);
 const wonderkids=(game.world?.europe?.wonderkidClasses||[]).flatMap(c=>c.players||[]).filter(p=>p.clubId===id).sort((a,b)=>(b.potential+b.ovr)-(a.potential+a.ovr));
 const moves=(game.world?.europe?.marketHistory||[]).flatMap(h=>(h.moves||[]).map(m=>({...m,season:h.season}))).filter(m=>m.from===club.name||m.to===club.name).sort((a,b)=>b.season-a.season);
 return {...club,seasons,wonderkids,moves,score:(club.titles||0)*25+(club.domesticTitles||0)*7+(club.cups||0)*4+(club.finalFours||0)*3+club.prestige};
}
export function getNationalTeamArchive(game){
 const teams=game.international?.teams||[];return [...teams].map(t=>({...t,tournaments:(game.international?.tournaments||[]).filter(x=>[x.championId,x.finalistId,x.bronzeId].includes(t.id))})).sort((a,b)=>(b.medals?.gold||0)-(a.medals?.gold||0)||(a.ranking||99)-(b.ranking||99));
}
export function getTimelineArchive(game){
 const items=[];
 for(const s of getEncyclopediaSeasons(game))items.push({season:s.season,type:'Temporada',title:`${s.nba.champion} campeón NBA`,text:`MVP: ${s.nba.mvp} · Europa: ${s.europe.champion} · NCAA: ${s.ncaa.champion}`});
 for(const t of game.international?.tournaments||[])items.push({season:t.season,type:'FIBA',title:`${t.champion} gana ${t.name}`,text:`MVP: ${t.mvp} · Plata: ${t.finalist} · Bronce: ${t.bronze}`});
 for(const m of game.international?.moments||[])items.push({season:m.season,type:'Momento',title:m.text,text:''});
 for(const e of game.universe?.timeline||[])items.push({season:e.season,type:e.type||'Historia',title:e.text,text:''});
 return items.filter((x,i,a)=>a.findIndex(y=>y.season===x.season&&y.title===x.title)===i).sort((a,b)=>Number(b.season)-Number(a.season));
}
export function searchEncyclopedia(game,query){
 const q=normalizeText(query);if(!q)return [];
 const results=[];
 for(const p of getWorldPlayers(game)){const hay=normalizeText([p.name,p.country,p.position,p.currentTeam,p.route].join(' '));if(hay.includes(q))results.push({type:'player',id:p.id,title:p.name,subtitle:`${p.country} · ${p.position} · ${p.currentTeam}`,score:100});}
 for(const c of getClubArchive(game)){if(normalizeText([c.name,c.country,c.league,c.style].join(' ')).includes(q))results.push({type:'club',id:c.id,title:c.name,subtitle:`${c.country} · ${c.league} · ${c.titles} Euroligas`,score:90});}
 for(const s of getEncyclopediaSeasons(game)){if(normalizeText([s.season,s.nba.champion,s.nba.mvp,s.europe.champion,s.europe.mvp,s.ncaa.champion].join(' ')).includes(q))results.push({type:'season',id:String(s.season),title:`Temporada ${s.season}`,subtitle:`NBA ${s.nba.champion} · Europa ${s.europe.champion}`,score:80});}
 for(const d of getDraftArchive(game)){if(normalizeText([d.season,...d.picks.map(p=>p.name)].join(' ')).includes(q))results.push({type:'draft',id:String(d.season),title:`Draft ${d.season}`,subtitle:`${d.picks.length} prospectos archivados`,score:70});}
 game.encyclopedia.searchHistory=[query,...game.encyclopedia.searchHistory.filter(x=>x!==query)].slice(0,8);
 return results.sort((a,b)=>b.score-a.score).slice(0,30);
}
