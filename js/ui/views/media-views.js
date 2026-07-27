import { getTeam, formatMoney } from "../../engine/game-engine.js";
import { getCareerEvents } from "../../engine/story-engine.js";
import { getSeasonNews, getNewsArchive, getSeasonCover } from "../../engine/news-engine.js";
import { calculateLegacy, getGoatRanking, getRecords, evaluateHallOfFame } from "../../engine/legacy-engine.js";
import { getRivalry, getDynasties, getNarratives } from "../../engine/league-life-engine.js";
import { getFranchiseStates, getLatestOffseason } from "../../engine/franchise-ai-engine.js";
import { getFeed } from "../../engine/media-engine.js";
import { getUniverseStars, getUniverseTimeline, getUniverseHistory, getUniverseHallOfFame, getLatestDraftClass, getUniverseRivalries, getCoachHistory } from "../../engine/basketball-universe-engine.js";
import { getInternationalDashboard } from "../../engine/international-engine.js";
import { getDraftWorld } from "../../engine/ncaa-draft-engine.js";
import { getEuropeanDashboard } from "../../engine/european-basketball-engine.js";
import { teamLogo } from "../team-branding.js";
export function createMediaViews(context){
  let game=null;
  let activeConversation=null;
  let newsSeason=null;
  function sync(){({game,activeConversation,newsSeason}=context.getState());}
  const playerHeader=()=>context.playerHeader();

function worldScreen(){
 const d=getInternationalDashboard(game),c=d.career,team=d.team;
 const medal=(m)=>`${m.gold||0} oro · ${m.silver||0} plata · ${m.bronze||0} bronce`;
 return `${playerHeader()}<section class="card world-hero"><span class="pill">NBA GLORY 2.0.6 · OPERACIÓN ATLAS</span><h2>🌍 Basketball World</h2><p class="muted">Selecciones, torneos FIBA, rankings y legado internacional conectados con tu carrera.</p><div class="immersion-kpis"><div><span>SELECCIÓN</span><strong>${team?.name||'Sin selección'}</strong></div><div><span>PRESTIGIO</span><strong>${c.prestige}</strong></div><div><span>PARTIDOS</span><strong>${c.caps}</strong></div><div><span>PUNTOS</span><strong>${c.points}</strong></div></div></section>
 <section class="card"><span class="pill">CARRERA INTERNACIONAL</span><div class="grid"><div class="stat"><span class="muted small">MEDALLAS</span><strong>${medal(c.medals)}</strong></div><div class="stat"><span class="muted small">MVP FIBA</span><strong>${c.mvps}</strong></div><div class="stat"><span class="muted small">TORNEOS</span><strong>${c.tournaments.length}</strong></div><div class="stat"><span class="muted small">FATIGA</span><strong>${c.fatigue}</strong></div></div></section>
 ${d.lastTournament?`<section class="card"><span class="pill">ÚLTIMO TORNEO</span><h3>${d.lastTournament.name} ${d.lastTournament.season}</h3><p class="result">🏆 ${d.lastTournament.champion} · 🥈 ${d.lastTournament.finalist} · 🥉 ${d.lastTournament.bronze}</p><p class="muted">MVP: ${d.lastTournament.mvp}${d.lastTournament.playerParticipated?` · Tu resultado: ${d.lastTournament.playerFinish||'eliminado'}`:''}</p></section>`:''}
 <section class="card"><span class="pill">RANKING FIBA</span><div class="living-list">${d.rankings.map(r=>`<article class="living-row"><div><strong>#${r.ranking} ${r.name}</strong><small>${r.points} puntos</small></div></article>`).join('')}</div></section>
 <section class="card"><span class="pill">MEDALLERO HISTÓRICO</span>${d.medalTable.length?`<div class="living-list">${d.medalTable.slice(0,10).map((m,i)=>`<article class="living-row"><div><strong>${i+1}. ${m.team}</strong><small>${medal(m)}</small></div></article>`).join('')}</div>`:'<p class="muted">El medallero aparecerá después del primer torneo internacional.</p>'}</section>
 <section class="card"><span class="pill">HISTORIAL DE TORNEOS</span>${d.tournaments.length?`<div class="living-list">${d.tournaments.slice(0,10).map(t=>`<article class="living-row"><div><strong>🏆 ${t.name} ${t.season}</strong><small>${t.champion} · MVP ${t.mvp}</small></div><span>${t.playerParticipated?(t.playerFinish||'Participó'):'IA'}</span></article>`).join('')}</div>`:'<p class="muted">Todavía no se ha disputado ningún torneo.</p>'}</section>`;
}

function conversationScreen(){
 const c=activeConversation;
 if(!c)return immersionScreen();
 return `${playerHeader()}<section class="card conversation-card"><span class="pill">DECISIÓN PERSONAL</span><h2>${c.title}</h2><p class="result">${c.text}</p>${c.options.map(o=>`<button class="choice" data-talk-choice="${o.id}"><strong>${o.title}</strong><br><span class="muted">${o.text}</span></button>`).join('')}</section><button data-view="immersion" class="btn secondary">← Volver al entorno</button>`;
}

function feedScreen(){
  const posts=getFeed(game);
  return `${playerHeader()}<section class="card feed-head"><span class="pill">GLORYFEED</span><h2 style="margin:10px 0 4px">La conversación de la liga</h2><p class="muted">Reacciones a tus temporadas, decisiones y declaraciones.</p></section>
  <section class="feed-list">${posts.map(x=>`<article class="feed-post tone-${x.tone}"><div class="feed-avatar">${x.author.slice(0,1)}</div><div><div class="feed-user"><strong>${x.author}</strong><span>${x.handle} · ${x.season}</span></div><p>${x.text}</p><small>Impacto ${x.impact}/100</small></div></article>`).join("")||`<section class="card"><p class="muted">GloryFeed empezará a reaccionar después de tu primera temporada.</p></section>`}</section><button data-view="career" class="btn">← Volver a la carrera</button>`;
}

function eventText(event){
  const d=event.data||{};
  const texts={
    PLAYER_DRAFTED:`Elegido en el Draft por ${d.teamName} con el pick ${d.pick}.`,
    PLAYER_DEBUT:`Debut en la NBA con ${d.teamName}: ${d.games} partidos y ${d.ppg} puntos por encuentro.`,
    PLAYER_INJURY:`${d.name}: ${d.games} partidos de baja${d.severe?" · lesión grave":""}.`,
    PLAYER_ALL_STAR:`Seleccionado para el All-Star por ${d.allStars}.ª vez.`,
    PLAYER_MVP:`MVP de la temporada con ${d.ppg} puntos y ${d.wins} victorias.`,
    PLAYER_CHAMPION:`Campeón con ${d.teamName}. Anillo número ${d.championships}.`,
    PLAYER_TRADED:`Traspasado de ${d.fromTeamName} a ${d.toTeamName}.`,
    PLAYER_SIGNED:d.renewal?`Renovación con ${d.teamName}: ${d.years} años y ${formatMoney(d.salary)} por temporada.`:`Firma como agente libre por ${d.teamName}: ${d.years} años y ${formatMoney(d.salary)} por temporada.`,
    PLAYER_RETIRED:`Retirada tras ${d.seasons} temporadas, ${d.allStars} All-Star, ${d.mvps} MVP y ${d.championships} anillos.`,
    RECORD_BROKEN:`Nuevo récord histórico de ${String(d.recordLabel||"").toLowerCase()}: ${Number(d.value||0).toLocaleString("es-ES")} ${d.unit||""}.`,
    PLAYER_HALL_OF_FAME:`Entrada en el Hall of Fame como miembro de la clase ${d.classYear}.`,
    COACH_CHANGED:d.summary,
    RIVALRY_MILESTONE:`La rivalidad con ${d.rivalName} alcanza el nivel “${d.level}”: serie ${d.userWins}-${d.rivalWins} tras ${d.meetings} duelos.`,
    TEAM_DYNASTY:`${d.teamName} conquista ${d.streak} campeonatos consecutivos y se convierte en dinastía.`,
    NARRATIVE_UNLOCKED:`${d.title}: ${d.description}`,
    SEASON_FINISHED:`Temporada completada: ${d.ppg} PPG · ${d.rpg} RPG · ${d.apg} APG · ${d.wins} victorias.`
  };
  return texts[event.type]||event.type;
}
function eventIcon(type){return ({PLAYER_DRAFTED:"🎓",PLAYER_DEBUT:"🏀",PLAYER_INJURY:"🩺",PLAYER_ALL_STAR:"⭐",PLAYER_MVP:"🏆",PLAYER_CHAMPION:"💍",PLAYER_TRADED:"🔄",PLAYER_SIGNED:"✍️",PLAYER_RETIRED:"👋",RECORD_BROKEN:"📖",PLAYER_HALL_OF_FAME:"🏛️",COACH_CHANGED:"📋",RIVALRY_MILESTONE:"🔥",TEAM_DYNASTY:"👑",NARRATIVE_UNLOCKED:"🎬",SEASON_FINISHED:"📊"})[type]||"•";}
function historyScreen(){
  const events=getCareerEvents(game).filter(e=>e.type!=="SEASON_FINISHED"||e.importance>=40);
  const grouped=events.reduce((acc,event)=>((acc[event.season]??=[]).push(event),acc),{});
  return `${playerHeader()}<section class="card"><div class="history-head"><div><span class="pill">STORY ENGINE</span><h2 style="margin:10px 0 4px">Historia de ${game.player.name}</h2><p class="muted">${events.length} acontecimientos guardados</p></div></div></section>
  <section class="timeline">${Object.keys(grouped).sort((a,b)=>a-b).map(season=>`<div class="timeline-year"><div class="year-badge">${season}</div><div class="timeline-events">${grouped[season].map(event=>`<article class="timeline-event importance-${Math.ceil(event.importance/20)}"><span class="event-icon">${eventIcon(event.type)}</span><div><strong>${eventText(event)}</strong><small>Importancia ${event.importance}/100</small></div></article>`).join("")}</div></div>`).join("")||`<section class="card"><p class="muted">La historia comenzará la noche del Draft.</p></section>`}</section>
  <button data-view="career" class="btn">← Volver a la carrera</button>`;
}

function newsCard(article, featured=false){
  return `<article class="news-card ${featured?"news-featured":""} tone-${article.tone}"><div class="news-meta"><span>${article.level}</span><time>${article.season}</time></div><h3>${article.headline}</h3><p>${article.deck}</p><div class="news-footer">Importancia ${article.importance}/100</div></article>`;
}
function newsScreen(){
  const archive=getNewsArchive(game);
  const latest=game.player.career.at(-1)?.season ?? game.season;
  const selected=Number(newsSeason ?? latest);
  const seasonArticles=getSeasonNews(game,selected);
  const cover=getSeasonCover(game,selected);
  const seasons=archive.map(item=>item.season);
  return `${playerHeader()}<section class="card newsroom-head"><span class="pill">NBA GLORY NEWS</span><h2 style="margin:10px 0 4px">La liga, temporada a temporada</h2><p class="muted">Titulares generados a partir de los acontecimientos reales de tu partida.</p>${seasons.length?`<select id="newsSeason">${seasons.map(season=>`<option value="${season}" ${season===selected?"selected":""}>Temporada ${season}</option>`).join("")}</select>`:""}</section>
  ${cover?`<section class="newspaper"><div class="masthead"><strong>GLORY</strong><span>DAILY</span></div>${newsCard(cover,true)}<div class="news-list">${seasonArticles.slice(1).map(article=>newsCard(article)).join("")}</div></section>`:`<section class="card"><p class="muted">Todavía no hay noticias. La primera portada llegará tras el Draft.</p></section>`}
  <button data-view="career" class="btn">← Volver a la carrera</button>`;
}

function formatNumber(n){return Number(n||0).toLocaleString("es-ES");}
function legacyScreen(){
  const result=calculateLegacy(game),b=result.breakdown,t=result.totals,ranking=getGoatRanking(game),user=ranking.find(x=>x.isUser),hall=game.player.legacy?.hallOfFame||evaluateHallOfFame(game);
  const rows=[["💍 Campeonatos",b.championships],["👑 MVP",b.mvps],["⭐ All-Star",b.allStars],["📈 Estadísticas",b.statistics],["🕰️ Longevidad",b.longevity],["❤️ Lealtad",b.loyalty],["📖 Récords",b.records]];
  return `${playerHeader()}<section class="card"><div class="legacy-score"><div><div class="muted legacy-label">LEGACY SCORE</div><div class="legacy-number">${result.score}</div></div><div style="text-align:right"><div class="muted small">RANKING GOAT ACTUAL</div><strong style="font-size:34px">#${user.rank}</strong><small>${result.goatScore.toLocaleString("es-ES")} puntos</small></div></div><div class="legacy-bar"><span style="width:${result.score}%"></span></div></section>
<section class="card"><h3>Desglose del legado</h3><div class="breakdown">${rows.map(([label,value])=>`<div class="breakdown-row"><span>${label}</span><strong>+${value}</strong></div>`).join("")}</div></section>
<section class="card"><h3>Totales de carrera</h3><div class="grid"><div class="stat"><span class="muted small">PUNTOS</span><strong>${formatNumber(t.points)}</strong></div><div class="stat"><span class="muted small">REBOTES</span><strong>${formatNumber(t.rebounds)}</strong></div><div class="stat"><span class="muted small">ASISTENCIAS</span><strong>${formatNumber(t.assists)}</strong></div><div class="stat"><span class="muted small">PARTIDOS</span><strong>${formatNumber(t.games)}</strong></div></div></section>
<section class="card ${hall.selected?"hof-yes":"hof-no"}"><span class="pill">PROYECCIÓN HALL OF FAME</span><h3>${hall.selected?"Carrera de Hall of Fame":"Fuera del Hall of Fame"}</h3><p class="muted">${game.phase==="retired"?hall.reason:"La evaluación es provisional y se confirmará al retirarte."}</p></section><button data-view="records" class="btn secondary">📖 Ver récords y ranking GOAT</button><button data-view="career" class="btn">← Volver a la carrera</button>`;
}
function recordsScreen(){
  const records=getRecords(game),ranking=getGoatRanking(game);
  return `${playerHeader()}<section class="card"><span class="pill">NBA RECORDS</span><h2 style="margin:10px 0 4px">Récords históricos</h2><p class="muted">Las grandes marcas de este universo.</p><div class="record-grid">${records.map(r=>`<article class="record-card"><span class="muted small">${r.label}</span><strong>${formatNumber(r.value)}</strong><span>${r.holder}</span></article>`).join("")}</div></section>
<section class="card"><span class="pill">GOAT RANKING</span><h2 style="margin:10px 0 12px">Los mejores de la historia</h2><div class="goat-table">${ranking.slice(0,10).map(x=>`<div class="goat-row ${x.isUser?"user":""}"><strong>#${x.rank}</strong><div><strong>${x.name}</strong><small>${x.legacyScore} Legacy · ${x.mvps} MVP · ${x.championships} anillos</small></div><strong>${formatNumber(x.goatScore)}</strong></div>`).join("")}</div></section><button data-view="legacy" class="btn secondary">🏆 Ver mi legado</button><button data-view="career" class="btn">← Volver a la carrera</button>`;
}

function leagueScreen(){
  const rival=getRivalry(game),dynasties=getDynasties(game),narratives=getNarratives(game),franchises=getFranchiseStates(game),offseason=getLatestOffseason(game),universeStars=getUniverseStars(game),timeline=getUniverseTimeline(game),worldHistory=getUniverseHistory(game),worldHall=getUniverseHallOfFame(game),draftClass=getLatestDraftClass(game),teamRivalries=getUniverseRivalries(game),coachHistory=getCoachHistory(game),draftWorld=getDraftWorld(game),europe=getEuropeanDashboard(game);
  const meetings=rival?.meetings||0,userAvg=meetings?Math.round(rival.userPoints/meetings*10)/10:0,rivalAvg=meetings?Math.round(rival.rivalPoints/meetings*10)/10:0;
  return `${playerHeader()}<section class="card league-hero"><span class="pill">LIGA VIVA</span><h2 style="margin:10px 0 4px">La liga recuerda</h2><p class="muted">Rivalidades, dinastías y relatos que evolucionan con cada temporada.</p></section>
  ${rival?`<section class="card rivalry-card"><div class="topline"><div><span class="pill">🔥 ${rival.level}</span><h2 style="margin:10px 0 2px">${game.player.name} vs ${rival.name}</h2><p class="muted">${meetings} enfrentamientos acumulados</p></div><strong class="rival-score">${rival.userWins}-${rival.rivalWins}</strong></div><div class="grid"><div class="stat"><span class="muted small">TU PROMEDIO</span><strong>${userAvg}</strong></div><div class="stat"><span class="muted small">RIVAL</span><strong>${rivalAvg}</strong></div><div class="stat"><span class="muted small">INTENSIDAD</span><strong>${rival.intensity}</strong></div><div class="stat"><span class="muted small">OVR RIVAL</span><strong>${rival.ovr}</strong></div></div><div class="rivalry-meter"><span style="width:${rival.intensity}%"></span></div></section>`:""}

  <section class="card"><span class="pill">🌍 BASKETBALL UNIVERSE 2.0</span><h3>Estrellas de tu generación</h3><div class="living-list">${universeStars.map(p=>`<article><div><strong>${p.name}</strong><small>${p.country} · ${p.position} · ${p.currentTeam} · ${p.age} años · ${p.careerStats?.allStars||0} All-Star</small></div><span>${p.ovr} OVR</span></article>`).join("")}</div></section>
  ${europe?`<section class="card"><span class="pill">🇪🇺 EUROPEAN BASKETBALL</span><h3>Euroliga viva</h3>${europe.latest?`<p class="result">🏆 ${europe.latest.champion} · MVP ${europe.latest.mvp}<br>ACB: ${europe.latest.acbChampion} · Copa: ${europe.latest.cupWinner}</p>`:`<p class="muted">La primera temporada europea se simulará junto a tu campaña.</p>`}<h3 style="margin-top:18px">Ranking de clubes</h3><div class="living-list">${europe.clubs.slice(0,6).map((c,i)=>`<article><div><strong>#${i+1} ${teamLogo(c.name,{size:"xs"})}</strong><small>${c.country} · ${c.style}<br>${c.titles} Euroligas · ${c.domesticTitles} ligas · Academia ${c.academy}</small></div><span>${c.prestige}</span></article>`).join("")}</div><h3 style="margin-top:18px">European Wonderkids</h3><div class="living-list">${europe.wonderkids.slice(0,8).map(p=>`<article><div><strong>${p.name}</strong><small>${p.country} · ${p.age} años · ${p.position} · ${p.club}<br>${p.archetype} · ${p.status} · interés NBA ${p.nbaInterest}%</small></div><span>${p.grade}</span></article>`).join("")}</div>${europe.latest?.marketMoves?.length?`<h3 style="margin-top:18px">Mercado Europa ↔ NBA</h3>${europe.latest.marketMoves.slice(0,4).map(m=>`<p class="result">${m.type}: ${m.player} · ${m.from} → ${m.to}</p>`).join("")}`:""}</section>`:""}
  ${draftWorld?.currentClass?`<section class="card"><span class="pill">🎓 NCAA & DRAFT REVOLUTION</span><h3>Mock Draft ${draftWorld.currentClass.season}</h3>${draftWorld.currentClass.marchMadness?`<p class="result">🏆 ${draftWorld.currentClass.marchMadness.champion} · MOP ${draftWorld.currentClass.marchMadness.mop}</p>`:""}<div class="living-list">${draftWorld.currentClass.mock.slice(0,8).map(p=>`<article><div><strong>#${p.pick} ${p.name}</strong><small>${p.country} · ${p.position} · ${p.college}<br>Potencial ${p.grade} · Stock ${p.stock}</small></div><span>${p.position}</span></article>`).join("")}</div><h3 style="margin-top:18px">Universidades</h3><div class="living-list">${draftWorld.universities.slice(0,6).map(u=>`<article><div><strong>${u.name}</strong><small>${u.coach} · ${u.style}<br>${u.championships} títulos · ${u.finalFours} Final Four</small></div><span>${u.prestige}</span></article>`).join("")}</div></section>`:""}
  ${draftClass?`<section class="card"><span class="pill">🎓 ${draftClass.label}</span><h3>Próxima generación · nivel ${draftClass.strength}</h3><div class="living-list">${draftClass.players.slice(0,6).map(p=>`<article><div><strong>#${p.rank} ${p.name}</strong><small>${p.country} · ${p.age} años · ${p.position} · ${p.team}<br>${p.style} · Comparado con ${p.comparison}</small></div><span>${p.potentialGrade}</span></article>`).join("")}</div></section>`:""}
  ${teamRivalries.length?`<section class="card"><h3>⚔️ Rivalidades de Playoffs</h3><div class="living-list">${teamRivalries.slice(0,5).map(r=>`<article><div><strong>${getTeam(r.teamA)?.name||r.teamA} vs ${getTeam(r.teamB)?.name||r.teamB}</strong><small>${r.meetings} series · ${r.userSeriesWins}-${r.opponentSeriesWins}</small></div><span>${r.intensity}%</span></article>`).join("")}</div></section>`:""}
  ${coachHistory.length?`<section class="card"><h3>📋 Mercado de entrenadores</h3><div class="living-list">${coachHistory.slice(0,6).map(c=>`<article><div><strong>${getTeam(c.teamId)?.name||c.teamId}</strong><small>${c.from} → ${c.to}</small></div><span>${c.season}</span></article>`).join("")}</div></section>`:""}
  <section class="card"><h3>🗓️ Cronología mundial</h3><div class="living-list">${timeline.map(e=>`<article><div><strong>${e.season}</strong><small>${e.text}</small></div><span>${e.type}</span></article>`).join("")||`<p class="muted">La historia comenzará a escribirse con las temporadas.</p>`}</div></section>
  <section class="card"><h3>🏆 Historia paralela</h3><div class="living-list">${worldHistory.map(h=>`<article><div><strong>${h.season}: ${teamLogo(h.nbaChampion,{size:"xs"})}</strong><small>EuroLeague: ${h.euroChampion} · NCAA: ${h.ncaaChampion}</small></div><span>${h.nbaMvp}</span></article>`).join("")||`<p class="muted">Aún no hay temporadas completas registradas.</p>`}</div></section>
  ${worldHall.length?`<section class="card"><h3>🏛️ Hall of Fame mundial</h3><div class="living-list">${worldHall.map(p=>`<article><div><strong>${p.name}</strong><small>${p.country} · ${p.awards.length} premios · legado ${p.legacy}</small></div><span>${p.inducted}</span></article>`).join("")}</div></section>`:""}
  <section class="card"><h3>👑 Dinastías</h3><div class="living-list">${dynasties.filter(d=>d.totalTitles>=2).slice(0,6).map(d=>`<article><div><strong>${teamLogo(d.teamName,{size:"xs"})}</strong><small>${d.totalTitles} títulos · mejor racha ${d.bestStreak}</small></div><span>${d.currentStreak>=2?`${d.currentStreak} seguidos`:"Histórica"}</span></article>`).join("")||`<p class="muted">Todavía ninguna franquicia ha construido una dinastía.</p>`}</div></section>
  <section class="card"><h3>🧠 IA de franquicias</h3><div class="living-list">${franchises.slice(0,8).map(f=>`<article><div><strong>${teamLogo(f.team,{size:"xs"})}</strong><small>${f.strategyLabel} · ${f.lastWins??"—"} victorias · núcleo joven ${f.youngCore}</small></div><span>${f.starPower} poder</span></article>`).join("")}</div></section>
  ${offseason?`<section class="card"><h3>🌴 Última offseason</h3><div class="grid"><div class="stat"><span class="muted small">MOVIMIENTOS</span><strong>${offseason.moves.length}</strong></div><div class="stat"><span class="muted small">COACHES</span><strong>${offseason.coachChanges.length}</strong></div><div class="stat"><span class="muted small">RETIRADAS</span><strong>${offseason.retirements.length}</strong></div><div class="stat"><span class="muted small">CAMBIOS DE PLAN</span><strong>${offseason.strategyChanges.length}</strong></div></div>${offseason.moves.slice(0,4).map(m=>`<p class="result">${m.text}</p>`).join("")}</section>`:""}
  <section class="card"><h3>🎬 Historias emergentes</h3><div class="living-list">${narratives.map(n=>`<article><div><strong>${n.title}</strong><small>${n.description}</small></div><span>${n.season}</span></article>`).join("")||`<p class="muted">Las grandes narrativas aparecerán a medida que avance la carrera.</p>`}</div></section><button data-view="news" class="btn secondary">📰 Ver cómo lo cuenta la prensa</button><button data-view="career" class="btn">← Volver a la carrera</button>`;
}

  return {worldScreen:()=>{sync();return worldScreen();},conversationScreen:()=>{sync();return conversationScreen();},feedScreen:()=>{sync();return feedScreen();},historyScreen:()=>{sync();return historyScreen();},newsScreen:()=>{sync();return newsScreen();},legacyScreen:()=>{sync();return legacyScreen();},recordsScreen:()=>{sync();return recordsScreen();},leagueScreen:()=>{sync();return leagueScreen();}};
}
