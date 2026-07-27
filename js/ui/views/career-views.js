import { getTeam, getCoach, formatMoney } from "../../engine/game-engine.js";
import { getPathwayOptions, getPathwayTitle } from "../../engine/pathway-engine.js";
import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS, getPublicDNA, getArchetypes, calculateOVR } from "../../engine/player-engine.js";
import { getCareerProfile } from "../../engine/career-engine.js";
import { getActiveObjectives, getObjectiveResults } from "../../engine/career-events-engine.js";
import { getDocumentary, getDefiningMoments, buildCareerArc } from "../../engine/career-narrative-engine.js";
import { getImmersionDashboard } from "../../engine/immersion-engine.js";
import { teamLogo } from "../team-branding.js";
import { listDifficulties } from "../../engine/difficulty-engine.js";
import { getFranchiseConsequences } from "../../engine/franchise-consequences-engine.js";
import { getCoachingDashboard } from "../../engine/coaching-systems-engine.js";

export function createCareerViews(context){
  let game=null;
  let createPosition="PG";
  function sync(){({game,createPosition}=context.getState());}
function viewPlayer(){
  const player=game?.player;
  return player?{...player,ovr:calculateOVR(player)}:null;
}


function createScreen(){return `<section class="card hero create-hero"><div class="court-lines"></div><span class="pill">NBA GLORY 2.0.15 · FRANCHISE CONSEQUENCES</span><h2 style="margin-top:12px">Escribe tu propia leyenda</h2>
<p class="muted">Empieza en instituto y elige NCAA, G League o Europa. La NBA es una meta posible, no una obligación.</p>
<form id="createForm"><label>Nombre<input name="name" required maxlength="24" placeholder="Toni Rol"></label>
<label>Nacionalidad<select name="nationality">${["España","Estados Unidos","Francia","Serbia","Canadá","Alemania","Grecia","Lituania","Italia","Australia","Eslovenia","Turquía","Brasil","Argentina","Puerto Rico","Croacia","Letonia","Japón"].map(x=>`<option>${x}</option>`).join("")}</select></label>
<label>Posición<select id="positionSelect" name="position">${["PG","SG","SF","PF","C"].map(x=>`<option ${x===createPosition?"selected":""}>${x}</option>`).join("")}</select></label>
<label>Arquetipo<select id="archetypeSelect" name="archetype">${getArchetypes(createPosition).map(x=>`<option>${x}</option>`).join("")}</select></label>
<label>Dificultad<select name="difficulty">${listDifficulties().map(x=>`<option value="${x.id}" ${x.id==="normal"?"selected":""}>${x.label} — ${x.description}</option>`).join("")}</select></label>
<button class="btn">Comenzar camino al Draft</button></form></section>`;}
function playerHeader(){
  const p=viewPlayer(),team=getTeam(p.teamId);
  return `<section class="card player-card"><div class="player-glow"></div><div class="topline"><div class="player-identity"><div class="team-monogram ${team?"has-logo":""}">${team?teamLogo(team,{size:"lg",label:false}):"NBA"}</div><div><span class="pill">${p.position} · ${p.archetype}</span>
<h2 style="margin:10px 0 4px">${p.name}</h2><div class="muted">${team?team.name:"Prospecto del Draft"} · ${p.age} años</div>
${team?`<div class="role-line">${p.role} · Confianza ${Math.round(p.coachTrust)}</div>`:""}</div></div>
<div class="ovr-badge"><div class="muted small">OVR</div><strong>${p.ovr}</strong><span>${p.ovr>=90?"ÉLITE":p.ovr>=80?"ESTRELLA":"PRO"}</span></div></div></section>`;}


function careerProfilePanel(){
 const c=getCareerProfile(game.player),rels=c.relationships;
 const rows=[["Entrenador","coach","🎯"],["Compañeros","teammates","🤝"],["General Manager","gm","💼"],["Afición","fans","❤️"],["Prensa","media","🎙️"]];
 return `<section class="card social-card"><div class="topline"><div><span class="pill">MYCAREER ENGINE</span><h3 style="margin:10px 0 4px">Impacto fuera de la pista</h3></div></div><div class="social-score-grid"><div class="social-score"><span>REPUTACIÓN</span><strong>${Math.round(c.reputation)}</strong><small>${c.reputationLabel}</small></div><div class="social-score"><span>POPULARIDAD</span><strong>${Math.round(c.popularity)}</strong><small>${c.popularityLabel}</small></div></div><div class="relationship-list">${rows.map(([label,key,icon])=>`<div class="relationship-row"><span>${icon} ${label}</span><div class="relationship-track"><i style="width:${rels[key]}%"></i></div><strong>${Math.round(rels[key])}</strong></div>`).join("")}</div></section>`;
}


function coachingPanel(){
 const d=getCoachingDashboard(game);if(!d.coach)return "";
 const rotation={short:"corta",development:"de desarrollo",flexible:"flexible"}[d.coach.rotationPolicy]||d.coach.rotationPolicy;
 const tone=d.fit>=75?"stable":d.fit>=55?"warning":"danger";
 return `<section class="card franchise-card ${tone}"><div class="topline"><div><span class="pill">SISTEMA TÁCTICO</span><h3 style="margin:10px 0 4px">${d.system.name}</h3><small>${d.coach.name} · Rotación ${rotation}</small></div><strong>${d.fit}%</strong></div><p class="muted">${d.system.description}</p><div class="legacy-bar"><span style="width:${d.fit}%"></span></div>${d.last?`<p class="result">Último plan: ${d.last.focus} · ${d.last.minutesModifier>=0?'+':''}${d.last.minutesModifier} min proyectados</p>`:''}</section>`;
}
function franchisePanel(){
 const state=getFranchiseConsequences(game),pressure=game.careerMode?.difficulty?.pressure??50;
 const active=state.contractObjectives.filter(o=>o.season===game.season&&o.status==='active');
 const tone=pressure>=75?'danger':pressure>=55?'warning':'stable';
 return `<section class="card franchise-card ${tone}"><div class="topline"><div><span class="pill">PRESIÓN DE FRANQUICIA</span><h3 style="margin:10px 0 4px">Tu situación interna</h3></div><strong>${pressure}/100</strong></div><div class="legacy-bar"><span style="width:${pressure}%"></span></div>${state.lastRoleChange?`<p class="result">Último cambio de rol: ${state.lastRoleChange.from} → ${state.lastRoleChange.to}</p>`:''}<div class="objective-list">${active.map(o=>`<article><div><strong>${o.title}</strong><small>${o.target} ${o.unit}</small></div><span>CONTRATO</span></article>`).join('')||'<p class="muted">Sin objetivos contractuales activos.</p>'}</div></section>`;
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
 const p=viewPlayer(),dna=getPublicDNA(p);
 return `<section class="card attributes-card"><div class="topline"><div><span class="pill">PLAYER DNA</span><h3 style="margin:10px 0 4px">Informe de scouting</h3></div><strong class="potential-badge">${dna.potentialGrade}</strong></div><div class="dna-grid"><div><span>🧠 Personalidad</span><strong>${dna.personality}</strong></div><div><span>⚡ Desarrollo</span><strong>${dna.development}</strong></div><div><span>📈 Pico estimado</span><strong>${dna.peakAge} años</strong></div><div><span>🩺 Riesgo lesión</span><strong>${dna.injuryRisk}</strong></div></div>${Object.entries(ATTRIBUTE_GROUPS).map(([group,keys])=>`<div class="attribute-group"><h4>${group}</h4>${keys.map(key=>`<div class="attribute-row"><span>${ATTRIBUTE_LABELS[key]}</span><div class="attribute-track"><i style="width:${p.attributes[key]}%"></i></div><strong>${p.attributes[key]}</strong></div>`).join("")}</div>`).join("")}</section>`;
}
function pathwayScreen(){
 const pd=game.player.preDraft,options=getPathwayOptions(game),last=pd.history?.at(-1);
 const stats=pd.stats?`<div class="grid"><div class="stat"><span class="muted small">PPG</span><strong>${pd.stats.ppg??"—"}</strong></div><div class="stat"><span class="muted small">RPG</span><strong>${pd.stats.rpg??"—"}</strong></div><div class="stat"><span class="muted small">APG</span><strong>${pd.stats.apg??"—"}</strong></div><div class="stat"><span class="muted small">PROYECCIÓN</span><strong class="small-result">${pd.projection}</strong><small>Pick ${pd.mockPick}</small></div></div>`:"";
 return playerHeader()+`<section class="card pathway-hero"><span class="pill">DRAFT EXPERIENCE</span><h2>${getPathwayTitle(game)}</h2><p class="muted">Instituto · NCAA · G League · Europa · Selecciones · Draft</p><div class="draft-stock"><div><span>STOCK NBA</span><strong>${Math.round(pd.stock)}</strong></div><div class="legacy-bar"><span style="width:${pd.stock}%"></span></div><small>${pd.projection} · Mock pick ${pd.mockPick}</small></div></section>${stats}${pd.currentProgram?`<section class="card"><span class="pill">EQUIPO ACTUAL</span><h3 class="team-heading">${teamLogo(pd.currentProgram,{size:"md"})}</h3><p class="result">${pd.currentProgram.conference||pd.currentProgram.league||pd.currentProgram.style}${pd.currentProgram.europe?` · ${pd.currentProgram.europe}`:""}${pd.salary?` · ${pd.salary.toLocaleString("es-ES")} €/año`:""}</p>${pd.trophies?.slice(-5).map(x=>`<p class="pathway-achievement">🏆 ${x}</p>`).join("")||""}</section>`:""}${pd.international?.caps?`<section class="card"><span class="pill">🌍 SELECCIÓN</span><h3>${game.player.nationality}</h3><div class="grid"><div class="stat"><span class="muted small">PARTIDOS</span><strong>${pd.international.caps}</strong></div><div class="stat"><span class="muted small">MEDALLAS</span><strong>${pd.international.medals.length}</strong></div><div class="stat"><span class="muted small">PRESTIGIO FIBA</span><strong>${pd.international.reputation}</strong></div></div>${pd.international.history.slice(-2).map(x=>`<p class="result">${x.tournament}: ${x.finish}${x.award?` · ${x.award}`:""}</p>`).join("")}</section>`:""}${game.lastSummary?`<section class="card"><h3>Última actualización</h3><p class="result">${game.lastSummary}</p></section>`:""}<section class="card pathway-options"><span class="pill">TU DECISIÓN</span>${options.map(o=>`<button class="choice" data-pathway="${o.id}"><strong>${o.title}</strong><br><span class="muted">${o.text}</span></button>`).join("")}</section>`+attributesPanel();
}
function draftScreen(){const pd=game.player.preDraft;return playerHeader()+`<section class="card pathway-hero"><span class="pill">MOCK DRAFT FINAL</span><h2>Noche del Draft</h2><div class="draft-night-pick"><strong>${pd.mockPick}</strong><span>PICK PROYECTADO</span></div><p class="result">${pd.projection} · Stock ${Math.round(pd.stock)}/100${pd.currentProgram?` · procedente de ${pd.currentProgram.name}`:""}</p><button id="draftBtn" class="btn">Simular noche del Draft</button></section>`+attributesPanel();}
function seasonScreen(){
  const p=game.player,coach=getCoach(game,p.teamId),contract=p.contract;
  return playerHeader()+careerProfilePanel()+coachingPanel()+franchisePanel()+objectivesPanel()+attributesPanel()+`<section class="card"><div class="grid">
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
  const isClutch=game.pendingDecision?.type==="clutchGame";
  const summary=isDeadline
    ?`<section class="card trade-deadline-hero"><span class="pill">TRADE DEADLINE · ${game.season}</span><h2>El mercado está abierto</h2><p class="result">${game.lastSummary}</p></section>`
    :`<section class="card"><h2>Resumen ${s.season}</h2><p class="result">${game.lastSummary}</p>
<div class="grid"><div class="stat"><span class="muted small">PPG</span><strong>${s.ppg}</strong></div><div class="stat"><span class="muted small">RPG</span><strong>${s.rpg}</strong></div><div class="stat"><span class="muted small">APG</span><strong>${s.apg}</strong></div><div class="stat"><span class="muted small">VICTORIAS</span><strong>${s.wins}</strong></div></div>
<div class="grid advanced-grid"><div class="stat"><span class="muted small">FG%</span><strong>${s.fgPct ?? "—"}</strong></div><div class="stat"><span class="muted small">3P%</span><strong>${s.threePct ?? "—"}</strong></div><div class="stat"><span class="muted small">ROBOS</span><strong>${s.spg ?? "—"}</strong></div><div class="stat"><span class="muted small">TAPONES</span><strong>${s.bpg ?? "—"}</strong></div><div class="stat"><span class="muted small">PER</span><strong>${s.per ?? "—"}</strong></div><div class="stat"><span class="muted small">PLAYOFFS</span><strong class="small-result">${s.playoffExit ?? (s.playoffs?"Playoffs":"Fuera")}</strong>${s.playoffPpg!=null?`<small>${s.playoffPpg} PPG</small>`:""}</div></div></section>
<section class="card"><span class="pill">PREMIOS ${s.season}</span><h3>Tu reconocimiento</h3><div class="grid"><div class="stat"><span class="muted small">MVP</span><strong>${s.mvp?'Sí':'No'}</strong><small>Puntuación ${s.mvpScore??'—'}</small></div><div class="stat"><span class="muted small">FINALS MVP</span><strong>${s.finalsMvp?'Sí':'No'}</strong></div><div class="stat"><span class="muted small">ALL-NBA</span><strong class="small-result">${s.allNba||'—'}</strong></div><div class="stat"><span class="muted small">DEFENSA</span><strong class="small-result">${s.dpoy?'DPOY':s.allDefensive||'—'}</strong></div></div>${s.mvpRace?.length?`<div class="objective-list" style="margin-top:14px">${s.mvpRace.map(c=>`<article><div><strong>#${c.rank} ${c.name}</strong><small>${c.name===game.player.name?`${s.ppg} PPG · ${s.apg} APG · ${s.wins} victorias`:'Candidato rival'}</small></div><span>${c.score}</span></article>`).join('')}</div>`:''}</section>`;
  const label=game.pendingDecision.type==="clutchGame"?"MOMENTO CLUTCH":game.pendingDecision.type==="coachingMeeting"?"REUNIÓN TÁCTICA":game.pendingDecision.type==="franchiseUltimatum"?"ULTIMÁTUM":game.pendingDecision.type==="tradeDeadline"?"FECHA LÍMITE":game.pendingDecision.type==="freeAgencyMarket"?"MERCADO":game.pendingDecision.type==="contractNegotiation"?"NEGOCIACIÓN":game.pendingDecision.type==="freeAgency"?"MERCADO":game.pendingDecision.type==="dynamicEvent"?"EVENTO DINÁMICO":game.pendingDecision.type==="pressConference"?"RUEDA DE PRENSA":"VERANO";
  const clutchBoard=isClutch?`<div class="clutch-scoreboard"><div><span>${game.pendingDecision.teamName}</span><strong>${game.pendingDecision.playerScore}</strong></div><b>${game.pendingDecision.possession}/${game.pendingDecision.totalPossessions}</b><div><span>${game.pendingDecision.opponentName}</span><strong>${game.pendingDecision.opponentScore}</strong></div></div>${game.pendingDecision.log?.length?`<div class="clutch-log">${game.pendingDecision.log.slice(-3).map(x=>`<p><strong>${x.success?'✓':'✕'} ${x.choice}</strong><span>${x.score}</span></p>`).join('')}</div>`:''}`:'';
  return playerHeader()+careerProfilePanel()+(isDeadline?objectivesPanel():objectiveResultsPanel(s.season))+summary+`<section class="card ${game.pendingDecision.type==="dynamicEvent"?"dynamic-event":""} ${isDeadline?"trade-deadline-card":""} ${isClutch?"clutch-card":""}"><span class="pill">${label}</span><h3 style="margin-top:12px">${game.pendingDecision.title}</h3>${clutchBoard}${game.pendingDecision.text?`<p class="result">${game.pendingDecision.text}</p>`:""}${game.pendingDecision.options.map(o=>`<button class="choice" data-choice="${o.id}"><strong>${o.title}</strong><br><span class="muted">${o.text}</span></button>`).join("")}</section>${isDeadline?`<button data-view="league" class="btn secondary">🔥 Revisar rivalidad</button>`:isClutch?'':`<button data-view="legacy" class="btn secondary">🏆 Ver legado</button><button data-view="news" class="btn secondary">📰 Portada de la temporada</button><button data-view="history" class="btn secondary">📖 Ver historia</button><button data-view="league" class="btn secondary">🔥 Liga viva</button>`}`;
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
 const d=getImmersionDashboard(game),followers=new Intl.NumberFormat('es-ES',{notation:'compact',maximumFractionDigits:1}).format(d.socialFollowers);
 return `${playerHeader()}<section class="card immersion-hero"><span class="pill">NBA GLORY 1.4 · IMMERSION 2.0</span><h2>Tu vida dentro y fuera de la pista</h2><p class="muted">Prensa, redes, marcas, vestuario y afición reaccionan a cada temporada.</p><div class="immersion-kpis"><div><span>QUÍMICA</span><strong>${d.chemistry}</strong></div><div><span>AFICIÓN</span><strong>${d.fanApproval}</strong></div><div><span>SEGUIDORES</span><strong>${followers}</strong></div><div><span>RUIDO</span><strong>${d.mediaHeat}</strong></div></div></section>
 <section class="card"><span class="pill">CONVERSACIONES</span><div class="conversation-actions"><button data-talk="agent" class="choice"><strong>📞 ${d.agent.name}</strong><span>Agente · Confianza ${d.agent.trust}</span></button><button data-talk="coach" class="choice"><strong>🎯 Entrenador</strong><span>Rol, minutos y carga física</span></button><button data-talk="locker" class="choice"><strong>🤝 Vestuario</strong><span>Química y liderazgo</span></button><button data-talk="press" class="choice"><strong>🎙️ Rueda de prensa</strong><span>Define tu imagen pública</span></button></div></section>
 ${d.sponsorOffers.length?`<section class="card"><span class="pill">OFERTAS DE PATROCINIO</span><div class="sponsor-grid">${d.sponsorOffers.map(o=>`<article class="sponsor-card"><div><strong>${o.brand}</strong><small>${o.focus}</small></div><div class="sponsor-value">${o.annual} M$/año · ${o.years} años</div><button data-sponsor-accept="${o.id}" class="btn">Firmar</button><button data-sponsor-decline="${o.id}" class="btn secondary">Rechazar</button></article>`).join('')}</div></section>`:''}
 <section class="card"><span class="pill">CONTRATOS DE MARCA</span>${d.sponsorships.length?`<div class="living-list">${d.sponsorships.map(o=>`<article class="living-row"><div><strong>👟 ${o.brand}</strong><small>${o.focus} · ${o.yearsLeft} años restantes</small></div><span>${o.annual} M$</span></article>`).join('')}</div>`:'<p class="muted">Todavía no tienes un patrocinio activo.</p>'}</section>
 <section class="card"><span class="pill">GLORY SOCIAL</span><div class="social-feed-list">${d.socialFeed.slice(0,8).map(x=>`<article><span>${x.kind==='sponsor'?'👟':x.kind==='league'?'🏀':x.kind==='media'?'🎙️':'💬'}</span><div><strong>${x.text}</strong><small>Temporada ${x.season}</small></div></article>`).join('')||'<p class="muted">Tu actividad social aparecerá después de tus primeras decisiones.</p>'}</div></section>
 <section class="card"><span class="pill">BANDEJA</span><div class="message-list">${d.inbox.slice(0,8).map(m=>`<button class="message ${m.read?'read':''}" data-message="${m.id}"><span>${m.kind==='agent'?'📞':m.kind==='coach'?'🎯':m.kind==='media'||m.kind==='press'?'🎙️':m.kind==='sponsor'?'👟':'💬'}</span><div><strong>${m.title}</strong><small>${m.from} · ${m.season}</small><p>${m.body}</p></div></button>`).join('')||'<p class="muted">No tienes mensajes todavía.</p>'}</div></section>
 <section class="card"><span class="pill">RECONOCIMIENTOS</span><div class="living-list">${d.monthlyAwards.slice(0,8).map(a=>`<article class="living-row"><div><strong>🏅 ${a.title}</strong><small>Temporada ${a.season} · periodo ${a.month}</small></div></article>`).join('')||'<p class="muted">Los premios semanales y mensuales aparecerán aquí.</p>'}</div></section>`;
}


  return {
    createScreen:()=>{sync();return createScreen();},
    playerHeader:()=>{sync();return playerHeader();},
    pathwayScreen:()=>{sync();return pathwayScreen();},
    draftScreen:()=>{sync();return draftScreen();},
    seasonScreen:()=>{sync();return seasonScreen();},
    decisionScreen:()=>{sync();return decisionScreen();},
    retiredScreen:()=>{sync();return retiredScreen();},
    documentaryScreen:()=>{sync();return documentaryScreen();},
    immersionScreen:()=>{sync();return immersionScreen();}
  };
}
