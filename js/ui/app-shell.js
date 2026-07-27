export function renderBrand(){
  return `<header class="brand"><div class="brand-mark"><span>🏀</span></div><div class="brand-copy"><div class="eyebrow">CAREER MODE</div><h1>NBA Glory</h1><div class="muted">Tu carrera. Tu legado.</div></div><div class="live-dot" title="Partida guardada"><i></i>LIVE</div></header>`;
}

export function getTeamAccent(game){
  const palette={ATL:"#e03a3e",BOS:"#007a33",BKN:"#a7a9ac",CHA:"#1d8cab",CHI:"#ce1141",CLE:"#860038",DAL:"#00538c",DEN:"#fdb927",DET:"#c8102e",GSW:"#1d6fc0",HOU:"#ce1141",IND:"#fdbb30",LAC:"#c8102e",LAL:"#fdb927",MEM:"#5d76a9",MIA:"#98002e",MIL:"#00471b",MIN:"#78be20",NOP:"#b4975a",NYK:"#f58426",OKC:"#007ac1",ORL:"#0077c0",PHI:"#ed174c",PHX:"#e56020",POR:"#e03a3e",SAC:"#5a2d81",SAS:"#c4ced4",TOR:"#ce1141",UTA:"#f9a01b",WAS:"#e31837"};
  return palette[game?.player?.teamId]||"#ff5a36";
}

export function renderBottomNav(game,activeView){
  if(!game||game.phase==="draft")return "";
  const items=[["career","⌂","Carrera"],["feed","◉","GloryFeed"],["immersion","💬","Entorno"],["news","▤","Noticias"],["legacy","★","Legado"],["league","🔥","Liga"],["world","🌍","Mundo"],["balance","⚖","Balance"],["encyclopedia","📚","Enciclopedia"],["history","◷","Historia"],["system","⚙","Sistema"]];
  return `<nav class="bottom-nav" aria-label="Navegación principal">${items.map(([view,icon,label])=>`<button data-view="${view}" aria-label="${label}" aria-current="${activeView===view?"page":"false"}" class="${activeView===view?"active":""}"><span>${icon}</span><small>${label}</small></button>`).join("")}</nav>`;
}
