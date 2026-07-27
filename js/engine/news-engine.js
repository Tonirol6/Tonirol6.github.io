import { getSeasonEvents } from "./story-engine.js";

const LEVELS = [
  {min: 90, label: "HISTÓRICO", tone: "historic"},
  {min: 75, label: "PORTADA", tone: "cover"},
  {min: 55, label: "DESTACADO", tone: "featured"},
  {min: 35, label: "ACTUALIDAD", tone: "regular"},
  {min: 0, label: "BREVE", tone: "brief"}
];

function hash(value = "") {
  return [...String(value)].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function pick(event, options) {
  return options[hash(event.id) % options.length];
}

function levelFor(importance) {
  return LEVELS.find(level => importance >= level.min) || LEVELS.at(-1);
}

function articleFor(event) {
  const d = event.data || {};
  const templates = {
    PLAYER_DRAFTED: [
      {headline:`${d.teamName} apuesta por ${d.playerName}`, deck:`La franquicia selecciona al joven ${d.playerName} con el pick ${d.pick} del Draft.`},
      {headline:`El sueño NBA de ${d.playerName} comienza en ${d.teamName}`, deck:`El pick ${d.pick} abre una nueva etapa para uno de los talentos de esta generación.`}
    ],
    PLAYER_DEBUT: [
      {headline:`Primer capítulo para ${d.playerName}`, deck:`El rookie debuta con ${d.teamName} y cierra su primera campaña con ${d.ppg} puntos por partido.`},
      {headline:`${d.playerName} ya es jugador NBA`, deck:`Su temporada de estreno deja ${d.games} partidos y las primeras pistas sobre su futuro.`}
    ],
    PLAYER_INJURY: [
      {headline:`Alarma en ${d.teamName}: cae ${d.playerName}`, deck:`${d.name} y una ausencia estimada de ${d.games} partidos frenan su temporada.`},
      {headline:`La lesión golpea la campaña de ${d.playerName}`, deck:`El parte médico confirma ${String(d.name || "Una lesión").toLowerCase()} y ${d.games} encuentros de baja.`}
    ],
    PLAYER_ALL_STAR: [
      {headline:`${d.playerName}, entre las estrellas de la liga`, deck:`Su rendimiento le lleva al All-Star por ${d.allStars}.ª vez.`},
      {headline:`El All-Star vuelve a reconocer a ${d.playerName}`, deck:`La temporada de ${d.ppg} puntos por partido obtiene el premio de la liga.`}
    ],
    PLAYER_MVP: [
      {headline:`${d.playerName} conquista el MVP`, deck:`Una campaña de ${d.ppg} puntos y ${d.wins} victorias lo sitúa en la cima de la NBA.`},
      {headline:`La liga tiene dueño: ${d.playerName}`, deck:`El líder de ${d.teamName} levanta su ${d.mvps}.º MVP tras una temporada extraordinaria.`}
    ],
    PLAYER_CHAMPION: [
      {headline:`${d.playerName} toca la gloria con ${d.teamName}`, deck:`El campeonato termina en sus manos y ya suma ${d.championships} anillo${d.championships===1?"":"s"}.`},
      {headline:`Campeón: ${d.teamName} corona a ${d.playerName}`, deck:`La carrera de ${d.playerName} añade una página dorada con el título de la NBA.`}
    ],
    PLAYER_TRADED: [
      {headline:`Traspaso bomba: ${d.playerName} aterriza en ${d.toTeamName}`, deck:`${d.fromTeamName} cierra una etapa y abre uno de los movimientos del verano.`},
      {headline:`Nuevo destino para ${d.playerName}`, deck:`El jugador cambia ${d.fromTeamName} por ${d.toTeamName} y reinicia su carrera.`}
    ],
    PLAYER_SIGNED: [
      {headline:d.renewal?`${d.playerName} seguirá en ${d.teamName}`:`${d.teamName} ficha a ${d.playerName}`, deck:`Acuerdo por ${d.years} temporadas y ${d.salary} M$ por año.`},
      {headline:d.renewal?`Renovación cerrada entre ${d.playerName} y ${d.teamName}`:`Golpe de mercado de ${d.teamName}`, deck:`El contrato asegura el futuro de ${d.playerName} durante ${d.years} años.`}
    ],
    PLAYER_RETIRED: [
      {headline:`${d.playerName} dice adiós al baloncesto`, deck:`Se retira tras ${d.seasons} temporadas, ${d.mvps} MVP y ${d.championships} campeonatos.`},
      {headline:`Fin de una era: se retira ${d.playerName}`, deck:`Una carrera de ${d.seasons} campañas llega a su último capítulo.`}
    ],
    COACH_CHANGED: [
      {headline:`Cambio de rumbo en ${d.teamName}`, deck:d.summary || "La franquicia inicia una nueva etapa en el banquillo."}
    ],
    SEASON_FINISHED: [
      {headline:`${d.playerName} cierra otra temporada`, deck:`${d.ppg} puntos, ${d.rpg} rebotes y ${d.apg} asistencias en una campaña de ${d.wins} victorias.`}
    ],
    RECORD_BROKEN: [
      {headline:`${d.playerName} rompe el récord de ${String(d.recordLabel||"la liga").toLowerCase()}`, deck:`La nueva marca histórica queda fijada en ${Number(d.value||0).toLocaleString("es-ES")} ${d.unit||""}.`},
      {headline:`Nuevo récord histórico de ${d.playerName}`, deck:`Nadie había alcanzado antes los ${Number(d.value||0).toLocaleString("es-ES")} ${d.unit||""}.`}
    ],
    PLAYER_HALL_OF_FAME: [
      {headline:`${d.playerName} entra en el Hall of Fame`, deck:`La clase ${d.classYear} recibe a una carrera valorada con ${d.legacyScore} puntos de legado.`}
    ],
    RIVALRY_MILESTONE: [
      {headline:`${d.playerName} y ${d.rivalName}: la rivalidad ya es inevitable`, deck:`Tras ${d.meetings} enfrentamientos, la serie está ${d.userWins}-${d.rivalWins} y entra en una nueva dimensión.`},
      {headline:`La liga se divide entre ${d.playerName} y ${d.rivalName}`, deck:`Dos estrellas, ${d.meetings} duelos y una historia que crece temporada tras temporada.`}
    ],
    TEAM_DYNASTY: [
      {headline:`${d.teamName} ya es una dinastía`, deck:`La franquicia conquista ${d.streak} campeonatos consecutivos y marca una era en la liga.`}
    ],
    NARRATIVE_UNLOCKED: [
      {headline:d.title, deck:d.description}
    ]
  };
  const candidates = templates[event.type] || [{headline:event.type, deck:"Un nuevo acontecimiento queda registrado en la liga."}];
  return pick(event, candidates);
}

export function eventToNews(event) {
  const copy = articleFor(event);
  const level = levelFor(event.importance);
  return {...event, ...copy, level:level.label, tone:level.tone};
}

export function getSeasonNews(game, season, {minimumImportance = 28} = {}) {
  return getSeasonEvents(game, season)
    .filter(event => event.importance >= minimumImportance)
    .map(eventToNews)
    .sort((a,b) => b.importance - a.importance || a.id.localeCompare(b.id));
}

export function getNewsArchive(game) {
  const seasons = [...new Set((game.history?.events || []).map(event => event.season))].sort((a,b) => b-a);
  return seasons.map(season => ({season, articles:getSeasonNews(game, season)})).filter(item => item.articles.length);
}

export function getSeasonCover(game, season) {
  const articles = getSeasonNews(game, season);
  return articles[0] || null;
}
