import { EventBus } from "./event-bus.js";
import { createUniverseRepository } from "./universe-repository.js";
import { auditAtlasIntegrity, compactAtlasJournal } from "./atlas-integrity.js";

export const ATLAS_SCHEMA_VERSION = 14;
export const ATLAS_GAME_VERSION = "2.0.19-draft-projection";

const emptyCollections = () => ({
  players: {}, teams: {}, coaches: {}, competitions: {}, contracts: {}, seasons: {}, awards: {}, records: {}, relationships: {}
});

export function migrateAtlas(game) {
  if (!game || typeof game !== "object") return game;
  game.player ??= {};
  game.player.id ||= "player-user";
  game.atlas ??= {};
  const atlas = game.atlas;
  const previousSchema = Number(atlas.schema || 0);
  atlas.migrations ??= [];
  if (previousSchema < 1) atlas.migrations.push({from: previousSchema, to: 1, id: "atlas-core", appliedAt: new Date().toISOString()});
  if (previousSchema < 2) atlas.migrations.push({from: Math.max(previousSchema, 1), to: 2, id: "atlas-integrity-and-closure", appliedAt: new Date().toISOString()});
  if (previousSchema < 3) atlas.migrations.push({from: Math.max(previousSchema, 2), to: 3, id: "post-atlas-random-engine", appliedAt: new Date().toISOString()});
  if (previousSchema < 4) atlas.migrations.push({from: Math.max(previousSchema, 3), to: 4, id: "repository-completion", appliedAt: new Date().toISOString()});
  if (previousSchema < 5) atlas.migrations.push({from: Math.max(previousSchema, 4), to: 5, id: "modular-ui", appliedAt: new Date().toISOString()});
  if (previousSchema < 6) atlas.migrations.push({from: Math.max(previousSchema, 5), to: 6, id: "ui-experience", appliedAt: new Date().toISOString()});
  if (previousSchema < 7) atlas.migrations.push({from: Math.max(previousSchema, 6), to: 7, id: "balance-lab", appliedAt: new Date().toISOString()});
  if (previousSchema < 8) atlas.migrations.push({from: Math.max(previousSchema, 7), to: 8, id: "balance-tuning", appliedAt: new Date().toISOString()});
  if (previousSchema < 9) atlas.migrations.push({from: Math.max(previousSchema, 8), to: 9, id: "difficulty-and-career-variety", appliedAt: new Date().toISOString()});
  if (previousSchema < 10) atlas.migrations.push({from: Math.max(previousSchema, 9), to: 10, id: "franchise-consequences", appliedAt: new Date().toISOString()});
  if (previousSchema < 11) atlas.migrations.push({from: Math.max(previousSchema, 10), to: 11, id: "coaching-systems", appliedAt: new Date().toISOString()});
  if (previousSchema < 12) atlas.migrations.push({from: Math.max(previousSchema, 11), to: 12, id: "clutch-moments", appliedAt: new Date().toISOString()});
  if (previousSchema < 13) atlas.migrations.push({from: Math.max(previousSchema, 12), to: 13, id: "player-development", appliedAt: new Date().toISOString()});
  if (previousSchema < 14) atlas.migrations.push({from: Math.max(previousSchema, 13), to: 14, id: "draft-projection", appliedAt: new Date().toISOString()});
  atlas.schema = ATLAS_SCHEMA_VERSION;
  atlas.gameVersion = ATLAS_GAME_VERSION;
  atlas.createdAt ??= new Date().toISOString();
  atlas.lastMigratedAt = new Date().toISOString();
  atlas.collections ??= emptyCollections();
  atlas.events ??= [];
  atlas.flags ??= {};
  atlas.flags.legacyCompatibility = true;
  atlas.flags.singleSourceTransition = "complete";
  atlas.flags.operationAtlas = "closed";
  compactAtlasJournal(game);
  rebuildAtlasIndexes(game);
  return game;
}

export function rebuildAtlasIndexes(game) {
  if (!game?.atlas) return null;
  const c = game.atlas.collections ??= emptyCollections();
  for (const key of Object.keys(emptyCollections())) c[key] = {};

  const user = game.player;
  if (user?.id) c.players[user.id] = {source: "game.player", id: user.id, kind: "user"};
  for (const p of game.universe?.players ?? []) if (p?.id) c.players[p.id] = {source: "game.universe.players", id: p.id, kind: "world"};
  for (const p of game.universe?.hallOfFame ?? []) if (p?.id) c.players[p.id] = {source: "game.universe.hallOfFame", id: p.id, kind: "hall-of-fame"};

  for (const [teamId] of Object.entries(game.league?.coaches ?? {})) {
    c.teams[teamId] = {source: "static-team-data", id: teamId};
    c.coaches[teamId] = {source: "game.league.coaches", id: teamId};
  }
  for (const result of game.seasonResults ?? []) if (result?.season != null) c.seasons[result.season] = {source: "game.seasonResults", id: result.season};
  for (const item of game.international?.tournaments ?? []) if (item?.id || item?.season) c.competitions[`international:${item.id ?? item.season}`] = {source: "game.international.tournaments", id: item.id ?? item.season};
  for (const item of game.europeanBasketball?.history ?? []) if (item?.season != null) c.competitions[`europe:${item.season}`] = {source: "game.europeanBasketball.history", id: item.season};
  for (const item of game.ncaaDraft?.history ?? []) if (item?.season != null) c.competitions[`ncaa:${item.season}`] = {source: "game.ncaaDraft.history", id: item.season};
  return c;
}

export function createAtlasContext(game) {
  migrateAtlas(game);
  const bus = new EventBus({journal: game.atlas.events});
  const Universe = createUniverseRepository(game);
  return {
    game,
    bus,
    Universe,
    emit(type, payload = {}, meta = {}) {
      const event = bus.emit(type, payload, {season: game.season, source: "atlas", ...meta});
      game.atlas.events = bus.snapshot();
      return event;
    },
    player(id) { return Universe.getPlayer(id); },
    team(id) { return Universe.getTeam(id); },
    coach(id) { return Universe.getCoach(id); },
    competition(id) { return Universe.getCompetition(id); },
    season(id) { return Universe.getSeason(id); },
    rebuild() {
      rebuildAtlasIndexes(game);
      Universe.rebuild(game);
      return Universe;
    }
  };
}

export function atlasHealth(game) {
  const integrity = auditAtlasIntegrity(game);
  const issues = [...integrity.issues];
  if (!game?.atlas) issues.push("missing-atlas");
  if (game?.atlas?.schema !== ATLAS_SCHEMA_VERSION) issues.push("atlas-schema-mismatch");
  return {
    ok: issues.length === 0,
    issues,
    warnings: integrity.warnings,
    metrics: integrity.metrics,
    schema: game?.atlas?.schema ?? null,
    version: game?.atlas?.gameVersion ?? null
  };
}
