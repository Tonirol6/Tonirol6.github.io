import { migrateBasketballUniverse } from './basketball-universe-engine.js';

const pick=a=>a[Math.floor(Math.random()*a.length)];
const roll=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const NBA_FINALISTS=['Boston Celtics','Los Angeles Lakers','Golden State Warriors','Denver Nuggets','Miami Heat','Milwaukee Bucks','New York Knicks','Dallas Mavericks','Oklahoma City Thunder'];
const EURO=['Real Madrid','FC Barcelona','Olympiacos','Panathinaikos','Fenerbahçe','AS Monaco','Partizan','Virtus Bologna'];
const FIBA=['España','Estados Unidos','Francia','Serbia','Canadá','Alemania','Eslovenia','Australia','Grecia','Lituania'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function migrateEncyclopedia(game){
 const u=migrateBasketballUniverse(game);
 game.encyclopedia??={version:1,seasons:[],records:[],drafts:[],fiba:[],lastSeason:null};
 const e=game.encyclopedia;
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

function buildSeason(game,season,source={}){
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

export function recordEncyclopediaSeason(game,season=game.season){
 const e=migrateEncyclopedia(game);
 const existing=e.seasons.find(s=>s.season===season);
 if(existing){if(!e.drafts.some(d=>d.season===season))e.drafts.push({season,picks:existing.draft||[]});if(existing.fiba&&!e.fiba.some(f=>f.season===season))e.fiba.push({season,...existing.fiba});e.lastSeason=season;refreshRecords(game);return e;}
 const source=migrateBasketballUniverse(game).seasonHistory.find(s=>s.season===season)||{};
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
 const p=migrateBasketballUniverse(game).players.find(x=>x.id===id);if(!p)return null;
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
