
import { createGame, runDraft, simulateSeason, applyDecision, advancePreDraft, loadGame, clearGame, getTeam, getCoach, formatMoney, saveGame } from "./engine/game-engine.js";
import { getPathwayOptions, getPathwayTitle } from "./engine/pathway-engine.js";
import { getCareerEvents } from "./engine/story-engine.js";
import { getSeasonNews, getNewsArchive, getSeasonCover } from "./engine/news-engine.js";
import { calculateLegacy, getGoatRanking, getRecords, evaluateHallOfFame } from "./engine/legacy-engine.js";
import { getRivalry, getDynasties, getNarratives } from "./engine/league-life-engine.js";
import { getFranchiseStates, getLatestOffseason } from "./engine/franchise-ai-engine.js";
import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS, getPublicDNA, getArchetypes, refreshPlayer } from "./engine/player-engine.js";
import { getCareerProfile } from "./engine/career-engine.js";
import { getActiveObjectives, getObjectiveResults } from "./engine/career-events-engine.js";
import { getFeed } from "./engine/media-engine.js";
import { getDocumentary, getDefiningMoments, buildCareerArc } from "./engine/career-narrative-engine.js";
import { getUniverseStars, getUniverseTimeline, getUniverseHistory, getUniverseHallOfFame } from "./engine/basketball-universe-engine.js";
import { getEncyclopediaSeasons, getEncyclopediaSeason, getWorldRanking, getPlayerBiography, getEncyclopediaRecords, getHallMuseum } from "./engine/encyclopedia-engine.js";
import { diagnoseGame } from "./engine/health-engine.js";
import { getSaveMeta, hasBackup, restoreBackup, exportSave, importSave } from "./engine/persistence-engine.js";
import { getBalanceReport } from "./engine/beta-balance-engine.js";
import { getImmersionDashboard, getConversation, applyImmersionChoice, markInboxRead } from "./engine/immersion-engine.js";

const app=document.querySelector("#app");
let game=loadGame();
let activeView="career";
let newsSeason=null;
let createPosition="PG";
let encyclopediaSeason=null;
let encyclopediaPlayerId=null;
let activeConversation=null;

function brand(){return `<header class="brand"><div class="brand-mark"><span>🏀</span></div><div class="brand-copy"><div class="eyebrow">CAREER MODE</div><h1>NBA Glory</h1><div class="muted">Tu carrera. Tu legado.</div></div><div class="live-dot" title="Partida guardada"><i></i>LIVE</div></header>`;}
function teamAccent(){
  const palette={ATL:"#e03a3e",BOS:"#007a33",BKN:"#a7a9ac",CHA:"#1d8cab",CHI:"#ce1141",CLE:"#860038",DAL:"#00538c",DEN:"#fdb927",DET:"#c8102e",GSW:"#1d6fc0",HOU:"#ce1141",IND:"#fdbb30",LAC:"#c8102e",LAL:"#fdb927",MEM:"#5d76a9",MIA:"#98002e",MIL:"#00471b",MIN:"#78be20",NOP:"#b4975a",NYK:"#f58426",OKC:"#007ac1",ORL:"#0077c0",PHI:"#ed174c",PHX:"#e56020",POR:"#e03a3e",SAC:"#5a2d81",SAS:"#c4ced4",TOR:"#ce1141",UTA:"#f9a01b",WAS:"#e31837"};
  return palette[game?.player?.teamId]||"#ff5a36";
}
function bottomNav(){
  if(!game||game.phase==="draft")return "";
  const items=[["career","⌂","Carrera"],["feed","◉","GloryFeed"],["immersion","💬","Entorno"],["news","▤","Noticias"],["legacy","★","Legado"],["league","🔥","Liga"],["balance","⚖","Balance"],["encyclopedia","📚","Enciclopedia"],["history","◷","Historia"],["system","⚙","Sistema"]];
  return `<nav class="bottom-nav" aria-label="Navegación principal">${items.map(([view,icon,label])=>`<button data-view="${view}" class="${activeView===view?"active":""}"><span>${icon}</span><small>${label}</small></button>`).join("")}</nav>`;
}
function render(){
  document.documentElement.style.setProperty("--team-accent",teamAccent());
  const content=!game?createScreen():activeView==="documentary"?documentaryScreen():activeView==="encyclopedia"?encyclopediaScreen():activeView==="playerbio"?playerBiographyScreen():activeView==="system"?systemScreen():activeView==="immersion"?immersionScreen():activeView==="conversation"?conversationScreen():activeView==="balance"?balanceScreen():activeView==="history"?historyScreen():activeView==="feed"?feedScreen():activeView==="news"?newsScreen():activeView==="legacy"?legacyScreen():activeView==="records"?recordsScreen():activeView==="league"?leagueScreen():game.phase==="pathway"?pathwayScreen():game.phase==="draft"?draftScreen():game.phase==="season"?seasonScreen():game.phase==="decision"?decisionScreen():retiredScreen();
  app.innerHTML=brand()+`<div class="view-enter">${content}</div>`+bottomNav();
  bind();
}
function createScreen(){return `<section class="card hero create-hero"><div class="court-lines"></div><span class="pill">BETA 1.0c · INMERSIÓN FINAL</span><h2 style="margin-top:12px">Escribe tu propia leyenda</h2>
<p class="muted">Empieza en instituto y elige NCAA, G League o Europa. La NBA es una meta posible, no una obligación.</p>
<form id="createForm"><label>Nombre<input name="name" required maxlength="24" placeholder="Toni Rol"></label>
<label>Nacionalidad<select name="nationality">${["España","Estados Unidos","Francia","Serbia","Canadá","Alemania","Grecia","Lituania","Italia","Australia","Eslovenia","Turquía","Brasil","Argentina","Puerto Rico","Croacia","Letonia","Japón"].map(x=>`<option>${x}</option>`).join("")}</select></label>
<label>Posición<select id="positionSelect" name="position">${["PG","SG","SF","PF","C"].map(x=>`<option ${x===createPosition?"selected":""}>${x}</option>`).join("")}</select></label>
<label>Arquetipo<select id="archetypeSelect" name="archetype">${getArchetypes(createPosition).map(x=>`<option>${x}</option>`).join("")}</select></label>
<button class="btn">Comenzar camino al Draft</button></form></section>`;}
function playerHeader(){
  const p=refreshPlayer(game.player),team=getTeam(p.teamId);
  return `<section class="card player-card"><div class="player-glow"></div><div class="topline"><div class="player-identity"><div class="team-monogram">${team?team.id:"NBA"}</div><div><span class="pill">${p.position} · ${p.archetype}</span>
<h2 style="margin:10px 0 4px">${p.name}</h2><div class="muted">${team?team.name:"Prospecto del Draft"} · ${p.age} años</div>
${team?`<div class="role-line">${p.role} · Confianza ${Math.round(p.coachTrust)}</div>`:""}</div></div>
<div class="ovr-badge"><div class="muted small">OVR</div><strong>${p.ovr}</strong><span>${p.ovr>=90?"ÉLITE":p.ovr>=80?"ESTRELLA":"PRO"}</span></div></div></section>`;}


function careerProfilePanel(){
 const c=getCareerProfile(game.player),rels=c.relationships;
 const rows=[["Entrenador","coach","🎯"],["Compañeros","teammates","🤝"],["General Manager","gm","💼"],["Afición","fans","❤️"],["Prensa","media","🎙️"]];
 return `<section class="card social-card"><div class="topline"><div><span class="pill">MYCAREER ENGINE</span><h3 style="margin:10px 0 4px">Impacto fuera de la pista</h3></div></div><div class="social-score-grid"><div class="social-score"><span>REPUTACIÓN</span><strong>${Math.round(c.reputation)}</strong><small>${c.reputationLabel}</small></div><div class="social-score"><span>POPULARIDAD</span><strong>${Math.round(c.popularity)}</strong><small>${c.popularityLabel}</small></div></div><div class="relationship-list">${rows.map(([label,key,icon])=>`<div class="relationship-row"><span>${icon} ${label}</span><div class="relationship-track"><i style="width:${rels[key]}%"></i></div><strong>${Math.round(rels[key])}</strong></div>`).join("")}</div></section>`;
}


function objectivesPanel(){
 const objectives=getActiveObjectives(game);
 return `<section class="card objectives-card"><div class="topline"><div><span class="pill">OBJETIVOS ${game.season}</span><h3 style="margin:10px 0 4px">Tu hoja de ruta</h3></div><strong>${objectives.length}</strong></div><div class="objective-list">${objectives.map(o=>`<article><div><strong>${o.title}</strong><small>${o.description}</small></div><span>+ REP</span></article>`).join("")||`<p class="muted">Los objetivos se activarán al comenzar la temporada.</p>`}</div></section>`;
}
function objectiveResultsPanel(season){
 const results=getObjectiveResults(game,season);
 return results.length?`<section class="card objectives-card"><span class="pill">OBJETIVOS DE TEMPORADA</span><div class="objective-list result-list">${results.map(o=>`<article class="${o.status}"><div><strong>${o.status==='completed'?'✓':'✕'} ${o.title}</strong><small>${o.value} / ${o.target} ${o.unit}</small></div><span>${o.status==='completed'?'Cumplido':'Fallido'}</span></article>`).join("")}</div></section>`:"";
}
function attributesPanel(){
 const p=refreshPlayer(game.player),dna=getPublicDNA(p);
 return `<section class="card attributes-card"><div class="topline"><div><span class="pill">PLAYER DNA</span><h3 style="margin:10px 0 4px">Informe de scouting</h3></div><strong class="potential-badge">${dna.potentialGrade}</strong></div><div class="dna-grid"><div><span>🧠 Personalidad</span><strong>${dna.personality}</strong></div><div><span>⚡ Desarrollo</span><strong>${dna.development}</strong></div><div><span>📈 Pico estimado</span><strong>${dna.peakAge} años</strong></div><div><span>🩺 Riesgo lesión</span><strong>${dna.injuryRisk}</strong></div></div>${Object.entries(ATTRIBUTE_GROUPS).map(([group,keys])=>`<div class="attribute-group"><h4>${group}</h4>${keys.map(key=>`<div class="attribute-row"><span>${ATTRIBUTE_LABELS[key]}</span><div class="attribute-track"><i style="width:${p.attributes[key]}%"></i></div><strong>${p.attributes[key]}</strong></div>`).join("")}</div>`).join("")}</section>`;
}
function pathwayScreen(){
 const pd=game.player.preDraft,options=getPathwayOptions(game),last=pd.history?.at(-1);
 const stats=pd.stats?`<div class="grid"><div class="stat"><span class="muted small">PPG</span><strong>${pd.stats.ppg??"—"}</strong></div><div class="stat"><span class="muted small">RPG</span><strong>${pd.stats.rpg??"—"}</strong></div><div class="stat"><span class="muted small">APG</span><strong>${pd.stats.apg??"—"}</strong></div><div class="stat"><span class="muted small">PROYECCIÓN</span><strong class="small-result">${pd.projection}</strong><small>Pick ${pd.mockPick}</small></div></div>`:"";
 return playerHeader()+`<section class="card pathway-hero"><span class="pill">DRAFT EXPERIENCE</span><h2>${getPathwayTitle(game)}</h2><p class="muted">Instituto · NCAA · G League · Europa · Selecciones · Draft</p><div class="draft-stock"><div><span>STOCK NBA</span><strong>${Math.round(pd.stock)}</strong></div><div class="legacy-bar"><span style="width:${pd.stock}%"></span></div><small>${pd.projection} · Mock pick ${pd.mockPick}</small></div></section>${stats}${pd.currentProgram?`<section class="card"><span class="pill">EQUIPO ACTUAL</span><h3>${pd.currentProgram.name}</h3><p class="result">${pd.currentProgram.conference||pd.currentProgram.league||pd.currentProgram.style}${pd.currentProgram.europe?` · ${pd.currentProgram.europe}`:""}${pd.salary?` · ${pd.salary.toLocaleString("es-ES")} €/año`:""}</p>${pd.trophies?.slice(-5).map(x=>`<p class="pathway-achievement">🏆 ${x}</p>`).join("")||""}</section>`:""}${pd.international?.caps?`<section class="card"><span class="pill">🌍 SELECCIÓN</span><h3>${game.player.nationality}</h3><div class="grid"><div class="stat"><span class="muted small">PARTIDOS</span><strong>${pd.international.caps}</strong></div><div class="stat"><span class="muted small">MEDALLAS</span><strong>${pd.international.medals.length}</strong></div><div class="stat"><span class="muted small">PRESTIGIO FIBA</span><strong>${pd.international.reputation}</strong></div></div>${pd.international.history.slice(-2).map(x=>`<p class="result">${x.tournament}: ${x.finish}${x.award?` · ${x.award}`:""}</p>`).join("")}</section>`:""}${game.lastSummary?`<section class="card"><h3>Última actualización</h3><p class="result">${game.lastSummary}</p></section>`:""}<section class="card pathway-options"><span class="pill">TU DECISIÓN</span>${options.map(o=>`<button class="choice" data-pathway="${o.id}"><strong>${o.title}</strong><br><span class="muted">${o.text}</span></button>`).join("")}</section>`+attributesPanel();
}
function draftScreen(){const pd=game.player.preDraft;return playerHeader()+`<section class="card pathway-hero"><span class="pill">MOCK DRAFT FINAL</span><h2>Noche del Draft</h2><div class="draft-night-pick"><strong>${pd.mockPick}</strong><span>PICK PROYECTADO</span></div><p class="result">${pd.projection} · Stock ${Math.round(pd.stock)}/100${pd.currentProgram?` · procedente de ${pd.currentProgram.name}`:""}</p><button id="draftBtn" class="btn">Simular noche del Draft</button></section>`+attributesPanel();}
function seasonScreen(){
  const p=game.player,coach=getCoach(game,p.teamId),contract=p.contract;
  return playerHeader()+careerProfilePanel()+objectivesPanel()+attributesPanel()+`<section class="card"><div class="grid">
<div class="stat"><span class="muted small">TEMPORADA</span><strong>${game.season}</strong></div>
<div class="stat"><span class="muted small">MORAL</span><strong>${Math.round(p.morale)}</strong></div>
<div class="stat"><span class="muted small">CONTRATO</span><strong>${contract.yearsLeft} año${contract.yearsLeft===1?"":"s"}</strong><small>${formatMoney(contract.salary)}/año · ${formatMoney(p.careerEarnings||0)} ganados</small></div>
<div class="stat"><span class="muted small">ENTRENADOR</span><strong class="coach-name">${coach.name}</strong><small>${coach.name ? coach.id === "developer" ? "Formador" : coach.id === "tactician" ? "Estratega" : coach.id === "defensive" ? "Especialista defensivo" : coach.id === "strict" ? "Disciplinario" : "Gestor de vestuario" : "Entrenador"}</small></div>
</div></section>
${p.currentInjury?`<section class="card injury"><h3>Parte médico</h3><p>${p.currentInjury.name} · ${p.currentInjury.games} partidos de baja</p></section>`:""}
${game.lastSummary?`<section class="card"><h3>Última noticia</h3><p class="result">${game.lastSummary}</p></section>`:""}
<section class="action-dock"><button id="simBtn" class="btn"><span>▶</span> Simular temporada</button><button id="resetBtn" class="text-action">Reiniciar carrera</button></section>`;}
function decisionScreen(){
  const s=game.player.career.at(-1);
  const isDeadline=game.pendingDecision?.type==="tradeDeadline";
  const summary=isDeadline
    ?`<section class="card trade-deadline-hero"><span class="pill">TRADE DEADLINE · ${game.season}</span><h2>El mercado está abierto</h2><p class="result">${game.lastSummary}</p></section>`
    :`<section class="card"><h2>Resumen ${s.season}</h2><p class="result">${game.lastSummary}</p>
<div class="grid"><div class="stat"><span class="muted small">PPG</span><strong>${s.ppg}</strong></div><div class="stat"><span class="muted small">RPG</span><strong>${s.rpg}</strong></div><div class="stat"><span class="muted small">APG</span><strong>${s.apg}</strong></div><div class="stat"><span class="muted small">VICTORIAS</span><strong>${s.wins}</strong></div></div>
<div class="grid advanced-grid"><div class="stat"><span class="muted small">FG%</span><strong>${s.fgPct ?? "—"}</strong></div><div class="stat"><span class="muted small">3P%</span><strong>${s.threePct ?? "—"}</strong></div><div class="stat"><span class="muted small">ROBOS</span><strong>${s.spg ?? "—"}</strong></div><div class="stat"><span class="muted small">TAPONES</span><strong>${s.bpg ?? "—"}</strong></div><div class="stat"><span class="muted small">PER</span><strong>${s.per ?? "—"}</strong></div><div class="stat"><span class="muted small">PLAYOFFS</span><strong class="small-result">${s.playoffExit ?? (s.playoffs?"Playoffs":"Fuera")}</strong>${s.playoffPpg!=null?`<small>${s.playoffPpg} PPG</small>`:""}</div></div></section>`;
  const label=game.pendingDecision.type==="tradeDeadline"?"FECHA LÍMITE":game.pendingDecision.type==="freeAgencyMarket"?"MERCADO":game.pendingDecision.type==="contractNegotiation"?"NEGOCIACIÓN":game.pendingDecision.type==="freeAgency"?"MERCADO":game.pendingDecision.type==="dynamicEvent"?"EVENTO DINÁMICO":game.pendingDecision.type==="pressConference"?"RUEDA DE PRENSA":"VERANO";
  return playerHeader()+careerProfilePanel()+(isDeadline?objectivesPanel():objectiveResultsPanel(s.season))+summary+`<section class="card ${game.pendingDecision.type==="dynamicEvent"?"dynamic-event":""} ${isDeadline?"trade-deadline-card":""}"><span class="pill">${label}</span><h3 style="margin-top:12px">${game.pendingDecision.title}</h3>${game.pendingDecision.text?`<p class="result">${game.pendingDecision.text}</p>`:""}${game.pendingDecision.options.map(o=>`<button class="choice" data-choice="${o.id}"><strong>${o.title}</strong><br><span class="muted">${o.text}</span></button>`).join("")}</section>${isDeadline?`<button data-view="league" class="btn secondary">🔥 Revisar rivalidad</button>`:`<button data-view="legacy" class="btn secondary">🏆 Ver legado</button><button data-view="news" class="btn secondary">📰 Portada de la temporada</button><button data-view="history" class="btn secondary">📖 Ver historia</button><button data-view="league" class="btn secondary">🔥 Liga viva</button>`}`;
}
function retiredScreen(){
  const p=game.player,legacy=calculateLegacy(game),hall=p.legacy?.hallOfFame||evaluateHallOfFame(game),ranking=getGoatRanking(game),user=ranking.find(x=>x.isUser);
  return playerHeader()+`<section class="card hero"><span class="pill">CARRERA FINALIZADA</span><h2 style="margin-top:12px">El legado de ${p.name}</h2>
<div class="legacy-score"><div><div class="muted legacy-label">LEGACY SCORE</div><div class="legacy-number">${legacy.score}</div></div><div style="text-align:right"><div class="muted small">RANKING GOAT</div><strong style="font-size:34px">#${user.rank}</strong></div></div><div class="legacy-bar"><span style="width:${legacy.score}%"></span></div>
<div class="grid" style="margin-top:16px"><div class="stat"><span class="muted small">TEMPORADAS</span><strong>${p.career.length}</strong></div><div class="stat"><span class="muted small">ALL-STAR</span><strong>${p.allStars}</strong></div><div class="stat"><span class="muted small">MVP</span><strong>${p.mvps}</strong></div><div class="stat"><span class="muted small">ANILLOS</span><strong>${p.championships}</strong></div></div></section>
<section class="card ${hall.selected?"hof-yes":"hof-no"}"><span class="pill">HALL OF FAME</span><h2>${hall.selected?`✓ Clase ${hall.classYear}`:"No seleccionado"}</h2><p class="muted">${hall.reason}</p></section>
<button data-view="legacy" class="btn">🏆 Informe completo de legado</button><button data-view="records" class="btn secondary">📖 Récords y ranking GOAT</button><button data-view="news" class="btn secondary">📰 Archivo de noticias</button><button data-view="history" class="btn secondary">📖 Ver carrera completa</button><button data-view="league" class="btn secondary">🔥 Memoria de la liga</button><button data-view="documentary" class="btn secondary">🎬 Ver documental de carrera</button><button id="resetBtn" class="btn secondary">Crear otra leyenda</button>`;}



function documentaryScreen(){
  const doc=getDocumentary(game),arc=buildCareerArc(game),moments=getDefiningMoments(game,6);
  return `${playerHeader()}<section class="card documentary-hero"><span class="pill">CAREER DOCUMENTARY</span><h2>${doc.title}</h2><p class="muted">${doc.subtitle}</p><div class="documentary-score"><strong>${arc.legacyScore}</strong><span>LEGACY SCORE</span></div></section>
  <section class="documentary-chapters">${doc.chapters.map(ch=>`<article class="card documentary-chapter"><div class="chapter-number">${String(ch.number).padStart(2,'0')}</div><div><span class="pill">${ch.season?`TEMPORADA ${ch.season}`:'EPÍLOGO'}</span><h3>${ch.title}</h3><p>${ch.text}</p></div></article>`).join('')}</section>
  <section class="card"><span class="pill">MOMENTOS DEFINITIVOS</span><div class="objective-list">${moments.map(e=>`<article><div><strong>${eventIcon(e.type)} ${eventText(e)}</strong><small>Temporada ${e.season}</small></div><span>${e.importance}</span></article>`).join('')}</div></section>
  <button data-view="career" class="btn">← Volver al legado</button>`;
}


function immersionScreen(){
 const d=getImmersionDashboard(game);
 return `${playerHeader()}<section class="card immersion-hero"><span class="pill">BETA 1.0c · ENTORNO VIVO</span><h2>Tu mundo fuera de la pista</h2><p class="muted">Agente, entrenador, compañeros, rumores y rivalidades reaccionan a tu carrera.</p><div class="immersion-kpis"><div><span>QUÍMICA</span><strong>${d.chemistry}</strong></div><div><span>RUIDO MEDIÁTICO</span><strong>${d.mediaHeat}</strong></div><div><span>MENSAJES</span><strong>${d.unread}</strong></div></div></section>
 <section class="card"><span class="pill">CONVERSACIONES</span><div class="conversation-actions"><button data-talk="agent" class="choice"><strong>📞 ${d.agent.name}</strong><span>Agente · Confianza ${d.agent.trust}</span></button><button data-talk="coach" class="choice"><strong>🎯 Hablar con el entrenador</strong><span>Rol, minutos y carga física</span></button><button data-talk="locker" class="choice"><strong>🤝 Entrar al vestuario</strong><span>Química y liderazgo</span></button></div></section>
 <section class="card"><span class="pill">BANDEJA</span><div class="message-list">${d.inbox.slice(0,8).map(m=>`<button class="message ${m.read?'read':''}" data-message="${m.id}"><span>${m.kind==='agent'?'📞':m.kind==='coach'?'🎯':m.kind==='media'?'🎙️':'💬'}</span><div><strong>${m.title}</strong><small>${m.from} · ${m.season}</small><p>${m.body}</p></div></button>`).join('')||'<p class="muted">Todavía no hay mensajes.</p>'}</div></section>
 <section class="card"><span class="pill">VESTUARIO</span><div class="teammate-grid">${d.teammates.map(t=>`<article><strong>${t.name}</strong><span>${t.role}</span><small>${t.personality} · Vínculo ${t.bond}</small></article>`).join('')}</div></section>
 <section class="card"><span class="pill">RUMORES Y RIVALIDADES</span><div class="living-list">${d.rumours.slice(0,4).map(r=>`<article><div><strong>🗞️ Rumor</strong><small>${r.text}</small></div><span>${r.heat}</span></article>`).join('')}${d.rivalries.slice(0,4).map(r=>`<article><div><strong>🔥 ${r.name}</strong><small>${r.meetings} duelos · tensión ${r.tension}</small></div><span>${r.userWins}-${r.rivalWins}</span></article>`).join('')||'<p class="muted">Las rivalidades crecerán en Playoffs.</p>'}</div></section>`;
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
  const rival=getRivalry(game),dynasties=getDynasties(game),narratives=getNarratives(game),franchises=getFranchiseStates(game),offseason=getLatestOffseason(game),universeStars=getUniverseStars(game),timeline=getUniverseTimeline(game),worldHistory=getUniverseHistory(game),worldHall=getUniverseHallOfFame(game);
  const meetings=rival?.meetings||0,userAvg=meetings?Math.round(rival.userPoints/meetings*10)/10:0,rivalAvg=meetings?Math.round(rival.rivalPoints/meetings*10)/10:0;
  return `${playerHeader()}<section class="card league-hero"><span class="pill">LIGA VIVA</span><h2 style="margin:10px 0 4px">La liga recuerda</h2><p class="muted">Rivalidades, dinastías y relatos que evolucionan con cada temporada.</p></section>
  ${rival?`<section class="card rivalry-card"><div class="topline"><div><span class="pill">🔥 ${rival.level}</span><h2 style="margin:10px 0 2px">${game.player.name} vs ${rival.name}</h2><p class="muted">${meetings} enfrentamientos acumulados</p></div><strong class="rival-score">${rival.userWins}-${rival.rivalWins}</strong></div><div class="grid"><div class="stat"><span class="muted small">TU PROMEDIO</span><strong>${userAvg}</strong></div><div class="stat"><span class="muted small">RIVAL</span><strong>${rivalAvg}</strong></div><div class="stat"><span class="muted small">INTENSIDAD</span><strong>${rival.intensity}</strong></div><div class="stat"><span class="muted small">OVR RIVAL</span><strong>${rival.ovr}</strong></div></div><div class="rivalry-meter"><span style="width:${rival.intensity}%"></span></div></section>`:""}

  <section class="card"><span class="pill">🌍 BASKETBALL UNIVERSE</span><h3>Estrellas de tu generación</h3><div class="living-list">${universeStars.map(p=>`<article><div><strong>${p.name}</strong><small>${p.country} · ${p.position} · ${p.currentTeam} · ${p.age} años</small></div><span>${p.ovr} OVR</span></article>`).join("")}</div></section>
  <section class="card"><h3>🗓️ Cronología mundial</h3><div class="living-list">${timeline.map(e=>`<article><div><strong>${e.season}</strong><small>${e.text}</small></div><span>${e.type}</span></article>`).join("")||`<p class="muted">La historia comenzará a escribirse con las temporadas.</p>`}</div></section>
  <section class="card"><h3>🏆 Historia paralela</h3><div class="living-list">${worldHistory.map(h=>`<article><div><strong>${h.season}: ${h.nbaChampion}</strong><small>EuroLeague: ${h.euroChampion} · NCAA: ${h.ncaaChampion}</small></div><span>${h.nbaMvp}</span></article>`).join("")||`<p class="muted">Aún no hay temporadas completas registradas.</p>`}</div></section>
  ${worldHall.length?`<section class="card"><h3>🏛️ Hall of Fame mundial</h3><div class="living-list">${worldHall.map(p=>`<article><div><strong>${p.name}</strong><small>${p.country} · ${p.awards.length} premios · legado ${p.legacy}</small></div><span>${p.inducted}</span></article>`).join("")}</div></section>`:""}
  <section class="card"><h3>👑 Dinastías</h3><div class="living-list">${dynasties.filter(d=>d.totalTitles>=2).slice(0,6).map(d=>`<article><div><strong>${d.teamName}</strong><small>${d.totalTitles} títulos · mejor racha ${d.bestStreak}</small></div><span>${d.currentStreak>=2?`${d.currentStreak} seguidos`:"Histórica"}</span></article>`).join("")||`<p class="muted">Todavía ninguna franquicia ha construido una dinastía.</p>`}</div></section>
  <section class="card"><h3>🧠 IA de franquicias</h3><div class="living-list">${franchises.slice(0,8).map(f=>`<article><div><strong>${f.team.name}</strong><small>${f.strategyLabel} · ${f.lastWins??"—"} victorias · núcleo joven ${f.youngCore}</small></div><span>${f.starPower} poder</span></article>`).join("")}</div></section>
  ${offseason?`<section class="card"><h3>🌴 Última offseason</h3><div class="grid"><div class="stat"><span class="muted small">MOVIMIENTOS</span><strong>${offseason.moves.length}</strong></div><div class="stat"><span class="muted small">COACHES</span><strong>${offseason.coachChanges.length}</strong></div><div class="stat"><span class="muted small">RETIRADAS</span><strong>${offseason.retirements.length}</strong></div><div class="stat"><span class="muted small">CAMBIOS DE PLAN</span><strong>${offseason.strategyChanges.length}</strong></div></div>${offseason.moves.slice(0,4).map(m=>`<p class="result">${m.text}</p>`).join("")}</section>`:""}
  <section class="card"><h3>🎬 Historias emergentes</h3><div class="living-list">${narratives.map(n=>`<article><div><strong>${n.title}</strong><small>${n.description}</small></div><span>${n.season}</span></article>`).join("")||`<p class="muted">Las grandes narrativas aparecerán a medida que avance la carrera.</p>`}</div></section><button data-view="news" class="btn secondary">📰 Ver cómo lo cuenta la prensa</button><button data-view="career" class="btn">← Volver a la carrera</button>`;
}

function encyclopediaScreen(){
  const seasons=getEncyclopediaSeasons(game),selected=encyclopediaSeason??seasons[0]?.season,entry=getEncyclopediaSeason(game,selected),ranking=getWorldRanking(game).slice(0,12),records=getEncyclopediaRecords(game),hall=getHallMuseum(game).slice(0,10);
  const seasonOptions=seasons.map(s=>`<option value="${s.season}" ${s.season===Number(selected)?"selected":""}>${s.season}</option>`).join("");
  const seasonHeader=`${playerHeader()}<section class="card encyclopedia-hero"><span class="pill">SPRINT 7.4</span><h2>Basketball Encyclopedia</h2><p class="muted">La memoria completa de tu universo: temporadas, jugadores, récords, Drafts y leyendas.</p>${seasons.length?`<label>Año histórico<select id="encyclopediaSeason">${seasonOptions}</select></label>`:""}</section>`;
  let seasonContent='<section class="card"><p class="muted">Completa temporadas para llenar la enciclopedia.</p></section>';
  if(entry){
    const fiba=entry.fiba?`<article><span>${entry.fiba.tournament}</span><strong>${entry.fiba.gold}</strong><small>Plata ${entry.fiba.silver} · Bronce ${entry.fiba.bronze}</small></article>`:'';
    const draft=entry.draft?.length?`<section class="card"><h3>🎓 Draft ${entry.season}</h3><div class="draft-board">${entry.draft.map(p=>`<article><strong>#${p.pick}</strong><span class="player-link">${p.name}</span><small>${p.country} · ${p.team} · POT ${p.potential}</small></article>`).join('')}</div></section>`:'';
    seasonContent=`<section class="card"><span class="pill">TEMPORADA ${entry.season}</span><h3>🏆 Grandes campeones</h3><div class="encyclopedia-grid"><article><span>NBA</span><strong>${entry.nba.champion}</strong><small>Finalista: ${entry.nba.finalist}</small></article><article><span>EuroLeague</span><strong>${entry.europe.champion}</strong><small>Finalista: ${entry.europe.finalist}</small></article><article><span>NCAA</span><strong>${entry.ncaa.champion}</strong><small>MOP: ${entry.ncaa.mop}</small></article>${fiba}</div></section><section class="card"><h3>⭐ Premios y líderes</h3><div class="living-list"><article><div><strong>MVP NBA · ${entry.nba.mvp}</strong><small>Finals MVP: ${entry.nba.finalsMvp}</small></div><span>NBA</span></article><article><div><strong>MVP EuroLeague · ${entry.europe.mvp}</strong><small>Final Four MVP: ${entry.europe.finalFourMvp}</small></div><span>Europa</span></article><article><div><strong>Rookie · ${entry.nba.rookie}</strong><small>DPOY: ${entry.nba.dpoy} · MIP: ${entry.nba.mip}</small></div><span>Premios</span></article><article><div><strong>${entry.nba.leaders.points.name}</strong><small>${entry.nba.leaders.points.value} PPG · ${entry.nba.leaders.assists.name} ${entry.nba.leaders.assists.value} APG · ${entry.nba.leaders.rebounds.name} ${entry.nba.leaders.rebounds.value} RPG</small></div><span>Líderes</span></article></div></section>${draft}`;
  }
  const rankingHtml=`<section class="card"><h3>👑 Ranking histórico mundial</h3><div class="goat-table">${ranking.map(p=>`<button class="goat-row player-row" data-universe-player="${p.id}"><strong>#${p.rank}</strong><div><strong>${p.name}</strong><small>${p.country} · ${p.currentTeam} · ${p.awards.length} premios</small></div><strong>${p.legacyScore}</strong></button>`).join('')}</div></section>`;
  const recordsHtml=`<section class="card"><h3>📖 Récords del universo</h3><div class="record-grid">${records.map(r=>`<article class="record-card"><span class="muted small">${r.scope} · ${r.label}</span><strong>${formatNumber(r.value)}</strong><span>${r.holder}</span></article>`).join('')}</div></section>`;
  const hallHtml=`<section class="card"><h3>🏛️ Museo Hall of Fame</h3><div class="living-list">${hall.map(p=>`<button class="museum-entry" data-universe-player="${p.id}"><div><strong>${p.name}</strong><small>${p.country} · ${p.awards.length} premios · Clase ${p.inducted}</small></div><span>${p.legacyScore}</span></button>`).join('')||'<p class="muted">Las primeras vitrinas se abrirán cuando se retiren las grandes leyendas.</p>'}</div></section>`;
  return seasonHeader+seasonContent+rankingHtml+recordsHtml+hallHtml+'<button data-view="league" class="btn secondary">🔥 Volver a Liga Viva</button>';
}

function playerBiographyScreen(){
 const p=getPlayerBiography(game,encyclopediaPlayerId); if(!p){activeView='encyclopedia';return encyclopediaScreen();}
 return `<section class="card biography-hero"><div class="bio-avatar">${p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><span class="pill">PERFIL HISTÓRICO</span><h2>${p.name}</h2><p class="muted">${p.country} · ${p.position} · ${p.status} · ${p.currentTeam}</p><div class="grid"><div class="stat"><span class="muted small">OVR</span><strong>${p.ovr}</strong></div><div class="stat"><span class="muted small">POTENCIAL</span><strong>${p.potential}</strong></div><div class="stat"><span class="muted small">LEGACY</span><strong>${p.legacyScore}</strong></div><div class="stat"><span class="muted small">PREMIOS</span><strong>${p.awards.length}</strong></div></div></section><section class="card"><h3>Biografía</h3><p class="result">${p.summary}</p></section><section class="card"><h3>🏆 Palmarés</h3>${p.awards.map(a=>`<p class="pathway-achievement">🏆 ${a}</p>`).join('')||`<p class="muted">Todavía no ha ganado premios principales.</p>`}</section><section class="card"><h3>📅 Trayectoria</h3><div class="timeline">${p.timeline.map(x=>`<div class="timeline-year"><div class="year-badge">${x.season}</div><div class="timeline-events"><article class="timeline-event"><span class="event-icon">🏀</span><div><strong>${x.text}</strong></div></article></div></div>`).join('')}</div></section><button data-view="encyclopedia" class="btn">← Volver a la Enciclopedia</button>`;
}


function balanceScreen(){
 const r=getBalanceReport(game),p=game.player;
 return `${playerHeader()}<section class="card"><span class="pill">BETA 1.0b</span><h2>Centro de equilibrio</h2><p class="muted">Progresión, salud, mercado e inteligencia de franquicias conectados al ciclo de temporada.</p><div class="grid"><div class="stat"><span class="muted small">VALOR DE MERCADO</span><strong>${formatMoney(r.marketValue)}</strong></div><div class="stat"><span class="muted small">SATISFACCIÓN</span><strong>${r.satisfaction}/100</strong></div><div class="stat"><span class="muted small">CONDICIÓN</span><strong>${r.condition}%</strong></div><div class="stat"><span class="muted small">FATIGA</span><strong>${r.fatigue}%</strong></div></div></section><section class="card"><h3>Informe deportivo</h3><div class="objective-list"><article><div><strong>Desgaste de carrera</strong><small>Aumenta con edad, carga y lesiones graves</small></div><span>${r.careerWear}%</span></article><article><div><strong>Historial médico</strong><small>Lesiones registradas en toda la carrera</small></div><span>${r.injuries}</span></article><article><div><strong>Promesa contractual</strong><small>Minutos acordados y rendimiento del rol</small></div><span>${p.contract?.promisedMinutes||'—'} min</span></article><article><div><strong>Franquicias con IA</strong><small>Contendientes, proyectos equilibrados y reconstrucciones</small></div><span>${r.teams}</span></article></div></section><button data-view="career" class="btn">← Volver a la carrera</button>`;
}
function systemScreen(){
 const health=diagnoseGame(game),meta=getSaveMeta(),backup=hasBackup();
 const size=(health.bytes/1024).toLocaleString("es-ES",{maximumFractionDigits:1});
 return `${playerHeader()}<section class="card encyclopedia-hero"><span class="pill">BETA 1.0a</span><h2>Estado del sistema</h2><p class="muted">Guardado transaccional, recuperación automática y control de integridad.</p></section>
 <section class="card"><h3>${health.ok?'✅ Partida estable':'⚠️ Revisión necesaria'}</h3><div class="grid"><div class="stat"><span class="muted small">TAMAÑO</span><strong>${size} KB</strong></div><div class="stat"><span class="muted small">TEMPORADAS</span><strong>${health.careerSeasons}</strong></div><div class="stat"><span class="muted small">JUGADORES IA</span><strong>${health.universePlayers}</strong></div><div class="stat"><span class="muted small">ARCHIVO</span><strong>${health.historicalSeasons}</strong></div></div>${health.issues.map(x=>`<p class="result">⚠ ${x}</p>`).join('')||'<p class="result">No se han detectado incoherencias estructurales.</p>'}</section>
 <section class="card"><h3>💾 Guardado protegido</h3><p class="result">${meta?`Último guardado: ${new Date(meta.savedAt).toLocaleString('es-ES')} · checksum ${meta.checksum}`:'La partida se guardará al realizar la siguiente acción.'}</p><p class="muted">${backup?'Existe una copia de seguridad válida para recuperación manual.':'La copia de seguridad se creará en el próximo guardado.'}</p><button id="exportSaveBtn" class="btn">Exportar partida</button>${backup?'<button id="restoreBackupBtn" class="btn secondary">Restaurar copia anterior</button>':''}<label class="btn secondary import-label">Importar partida<input id="importSaveInput" type="file" accept="application/json,.json" hidden></label></section>
 <section class="card"><h3>🛡️ Mejoras activas</h3><p class="pathway-achievement">✓ Escritura verificada antes de confirmar el guardado</p><p class="pathway-achievement">✓ Copia automática de la versión anterior</p><p class="pathway-achievement">✓ Recuperación si el archivo principal está dañado</p><p class="pathway-achievement">✓ Límites de historial para carreras de más de 30 temporadas</p><p class="pathway-achievement">✓ Migración automática de partidas 7.4</p></section><button data-view="career" class="btn">← Volver a la carrera</button>`;
}

function bind(){
  document.querySelector("#positionSelect")?.addEventListener("change",e=>{createPosition=e.target.value;render();});
  document.querySelector("#createForm")?.addEventListener("submit",e=>{e.preventDefault();game=createGame(Object.fromEntries(new FormData(e.currentTarget)));activeView="career";render();});
  document.querySelector("#draftBtn")?.addEventListener("click",()=>{game=runDraft(game);render();});
  document.querySelectorAll("[data-pathway]").forEach(btn=>btn.addEventListener("click",()=>{game=advancePreDraft(game,btn.dataset.pathway);render();}));
  document.querySelector("#simBtn")?.addEventListener("click",()=>{game=simulateSeason(game);render();});
  document.querySelectorAll("[data-choice]").forEach(btn=>btn.addEventListener("click",()=>{game=applyDecision(game,btn.dataset.choice);render();}));
  document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>{activeView=btn.dataset.view;if(activeView==="news")newsSeason=game.player.career.at(-1)?.season??game.season;render();}));
  document.querySelectorAll("[data-talk]").forEach(btn=>btn.addEventListener("click",()=>{activeConversation=getConversation(game,btn.dataset.talk);activeView="conversation";render();}));
  document.querySelectorAll("[data-talk-choice]").forEach(btn=>btn.addEventListener("click",()=>{const result=applyImmersionChoice(game,activeConversation,btn.dataset.talkChoice);game.lastSummary=`Conversación completada: ${result}.`;saveGame(game);activeConversation=null;activeView="immersion";render();}));
  document.querySelectorAll("[data-message]").forEach(btn=>btn.addEventListener("click",()=>{markInboxRead(game,btn.dataset.message);saveGame(game);render();}));
  document.querySelector("#newsSeason")?.addEventListener("change",e=>{newsSeason=Number(e.target.value);render();});
  document.querySelector("#encyclopediaSeason")?.addEventListener("change",e=>{encyclopediaSeason=Number(e.target.value);render();});
  document.querySelectorAll("[data-universe-player]").forEach(btn=>btn.addEventListener("click",()=>{encyclopediaPlayerId=btn.dataset.universePlayer;activeView="playerbio";render();}));

  document.querySelector("#exportSaveBtn")?.addEventListener("click",()=>{const blob=new Blob([exportSave(game)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`NBA_Glory_${game.player.name.replace(/[^a-z0-9]/gi,"_")}_${game.season}.json`;a.click();URL.revokeObjectURL(url);});
  document.querySelector("#restoreBackupBtn")?.addEventListener("click",()=>{const restored=restoreBackup();if(restored){game=restored;location.reload();}});
  document.querySelector("#importSaveInput")?.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{game=importSave(await file.text());localStorage.setItem("nbaGlorySave",JSON.stringify(game));location.reload();}catch(err){alert(err.message);}});
  document.querySelector("#resetBtn")?.addEventListener("click",()=>{clearGame();game=null;activeView="career";render();});
}
render();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
