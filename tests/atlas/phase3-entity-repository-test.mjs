import assert from "node:assert/strict";
import { EntityManager } from "../../js/core/entity-manager.js";
import { createUniverseRepository } from "../../js/core/universe-repository.js";
import { createAtlasContext, migrateAtlas, ATLAS_GAME_VERSION } from "../../js/core/universe-core.js";

const game = {
  season: 2031,
  player: { id: "user_1", name: "Atlas Player", teamId: "BOS" },
  league: { coaches: { BOS: { name: "Coach Atlas", teamId: "BOS" } } },
  universe: {
    players: [{ id: "world_1", name: "World Star" }],
    hallOfFame: [{ id: "hof_1", name: "Legend" }]
  },
  seasonResults: [{ season: 2030, nba: { champion: "Boston" } }],
  international: { tournaments: [{ id: "world-cup-2030", season: 2030 }] },
  europeanBasketball: { history: [{ season: 2030, champion: "Madrid" }] },
  ncaaDraft: { history: [{ season: 2030, champion: "Duke" }] }
};

const manager = new EntityManager();
manager.register("players", game.player);
assert.equal(manager.get("players", "user_1"), game.player);
assert.equal(manager.has("players", "missing"), false);

const Universe = createUniverseRepository(game);
assert.equal(Universe.players.get("user_1"), game.player);
assert.equal(Universe.players.get("world_1").name, "World Star");
assert.equal(Universe.players.get("hof_1").name, "Legend");
assert.equal(Universe.teams.get("BOS").name, "Boston Celtics");
assert.equal(Universe.coaches.get("BOS").name, "Coach Atlas");
assert.equal(Universe.seasons.get(2030), game.seasonResults[0]);
assert.equal(Universe.competitions.get("international:world-cup-2030"), game.international.tournaments[0]);
assert.equal(Universe.competitions.get("europe:2030"), game.europeanBasketball.history[0]);
assert.equal(Universe.competitions.get("ncaa:2030"), game.ncaaDraft.history[0]);
assert.equal(Universe.players.info("world_1").source, "game.universe.players");

const newPlayer = { id: "world_2", name: "New Star" };
game.universe.players.push(newPlayer);
assert.equal(Universe.players.get("world_2"), null);
Universe.rebuild();
assert.equal(Universe.players.get("world_2"), newPlayer);

migrateAtlas(game);
assert.equal(game.atlas.gameVersion, ATLAS_GAME_VERSION);
const context = createAtlasContext(game);
assert.equal(context.Universe.players.get("world_1").name, "World Star");
assert.equal(context.player("world_1"), context.Universe.getPlayer("world_1"));
assert.equal(context.team("BOS"), context.Universe.getTeam("BOS"));
assert.equal(context.coach("BOS"), context.Universe.getCoach("BOS"));
assert.equal(context.season(2030), context.Universe.getSeason(2030));

console.log("✅ Atlas Fase 3 Entity Manager + Universe Repository: OK");
