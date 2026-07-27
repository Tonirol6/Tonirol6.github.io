export const EVENT_TYPES = Object.freeze({
  PLAYER_DRAFTED: "PLAYER_DRAFTED",
  PLAYER_DEBUT: "PLAYER_DEBUT",
  PLAYER_INJURY: "PLAYER_INJURY",
  PLAYER_ALL_STAR: "PLAYER_ALL_STAR",
  PLAYER_MVP: "PLAYER_MVP",
  PLAYER_CHAMPION: "PLAYER_CHAMPION",
  PLAYER_TRADED: "PLAYER_TRADED",
  PLAYER_SIGNED: "PLAYER_SIGNED",
  PLAYER_RETIRED: "PLAYER_RETIRED",
  COACH_CHANGED: "COACH_CHANGED",
  SEASON_FINISHED: "SEASON_FINISHED",
  RECORD_BROKEN: "RECORD_BROKEN",
  PLAYER_HALL_OF_FAME: "PLAYER_HALL_OF_FAME",
  RIVALRY_MILESTONE: "RIVALRY_MILESTONE",
  TEAM_DYNASTY: "TEAM_DYNASTY",
  NARRATIVE_UNLOCKED: "NARRATIVE_UNLOCKED"
});

const DEFAULT_IMPORTANCE = Object.freeze({
  PLAYER_DRAFTED: 72,
  PLAYER_DEBUT: 35,
  PLAYER_INJURY: 45,
  PLAYER_ALL_STAR: 58,
  PLAYER_MVP: 92,
  PLAYER_CHAMPION: 96,
  PLAYER_TRADED: 70,
  PLAYER_SIGNED: 62,
  PLAYER_RETIRED: 90,
  COACH_CHANGED: 28,
  SEASON_FINISHED: 18,
  RECORD_BROKEN: 100,
  PLAYER_HALL_OF_FAME: 98,
  RIVALRY_MILESTONE: 75,
  TEAM_DYNASTY: 92,
  NARRATIVE_UNLOCKED: 78
});

function ensureHistory(game) {
  game.history ??= {version: 1, nextEventId: 1, events: []};
  game.history.version ??= 1;
  game.history.nextEventId ??= game.history.events.length + 1;
  game.history.events ??= [];
  return game.history;
}

function cleanData(data = {}) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export function addEvent(game, event) {
  const history = ensureHistory(game);
  const normalized = {
    id: `evt_${String(history.nextEventId++).padStart(6, "0")}`,
    type: event.type,
    season: Number(event.season ?? game.season),
    importance: Math.max(0, Math.min(100, Number(event.importance ?? DEFAULT_IMPORTANCE[event.type] ?? 20))),
    playerId: event.playerId ?? "user_player",
    teamId: event.teamId ?? null,
    createdAt: event.createdAt ?? new Date().toISOString(),
    data: cleanData(event.data)
  };
  history.events.push(normalized);
  return normalized;
}

export function getSeasonEvents(game, season) {
  return ensureHistory(game).events
    .filter(event => event.season === Number(season))
    .sort((a, b) => b.importance - a.importance || a.id.localeCompare(b.id));
}

export function getCareerEvents(game, playerId = "user_player") {
  return ensureHistory(game).events
    .filter(event => event.playerId === playerId)
    .sort((a, b) => a.season - b.season || a.id.localeCompare(b.id));
}

export function getTopEvents(game, limit = 10) {
  return [...ensureHistory(game).events]
    .sort((a, b) => b.importance - a.importance || b.season - a.season)
    .slice(0, Math.max(0, limit));
}

export function migrateHistory(game) {
  ensureHistory(game);
  return game;
}
