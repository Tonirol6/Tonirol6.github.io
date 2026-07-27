const hasId = value => value && value.id !== undefined && value.id !== null && value.id !== "";

function duplicateIds(items = [], idResolver = item => item?.id) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items ?? []) {
    const id = idResolver(item);
    if (id === undefined || id === null || id === "") continue;
    const key = String(id);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates];
}

export function auditAtlasIntegrity(game) {
  const issues = [];
  const warnings = [];
  if (!game || typeof game !== "object") return {ok:false, issues:["game-not-object"], warnings, metrics:{}};
  if (!hasId(game.player)) issues.push("missing-player-id");
  if (!Number.isFinite(Number(game.season))) issues.push("invalid-season");

  const worldPlayers = game.universe?.players ?? [];
  const hallOfFame = game.universe?.hallOfFame ?? [];
  const seasons = game.seasonResults ?? [];
  const tournaments = game.international?.tournaments ?? [];
  const duplicatePlayers = duplicateIds([game.player, ...worldPlayers, ...hallOfFame]);
  const duplicateSeasons = duplicateIds(seasons, item => item?.season);
  const duplicateCompetitions = duplicateIds(tournaments, item => item?.id ?? item?.season);
  duplicatePlayers.forEach(id => issues.push(`duplicate-player-id:${id}`));
  duplicateSeasons.forEach(id => issues.push(`duplicate-season:${id}`));
  duplicateCompetitions.forEach(id => issues.push(`duplicate-international-competition:${id}`));

  const coachIds = Object.keys(game.league?.coaches ?? {});
  if (coachIds.length && new Set(coachIds).size !== coachIds.length) issues.push("duplicate-coach-id");
  if ((game.atlas?.events?.length ?? 0) > 5000) warnings.push("large-event-journal");
  if ((game.player?.career?.length ?? 0) !== seasons.length && seasons.length) warnings.push("career-season-count-mismatch");

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    metrics: {
      players: worldPlayers.length + (game.player ? 1 : 0),
      hallOfFame: hallOfFame.length,
      seasons: seasons.length,
      competitions: tournaments.length + (game.europeanBasketball?.history?.length ?? 0) + (game.ncaaDraft?.history?.length ?? 0),
      events: game.atlas?.events?.length ?? 0
    }
  };
}

export function compactAtlasJournal(game, limit = 2000) {
  if (!Array.isArray(game?.atlas?.events) || game.atlas.events.length <= limit) return 0;
  const removed = game.atlas.events.length - limit;
  game.atlas.events = game.atlas.events.slice(-limit);
  game.atlas.journalCompaction ??= {runs:0, removed:0};
  game.atlas.journalCompaction.runs++;
  game.atlas.journalCompaction.removed += removed;
  return removed;
}
