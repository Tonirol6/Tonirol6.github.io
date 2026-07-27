import assert from "node:assert/strict";
import { migrateAtlas, createAtlasContext, atlasHealth, ATLAS_GAME_VERSION } from "../../js/core/universe-core.js";
import { EventBus } from "../../js/core/event-bus.js";

const game = {
  season: 2030,
  player: {id:"user_1", name:"Atlas Player"},
  league: {coaches:{BOS:{name:"Coach One"}}},
  universe: {players:[{id:"world_1", name:"World Star"}], hallOfFame:[]},
  seasonResults:[{season:2029, nba:{champion:"Boston"}}]
};

migrateAtlas(game);
assert.equal(game.atlas.gameVersion, ATLAS_GAME_VERSION);
assert.equal(game.atlas.collections.players.user_1.source, "game.player");
assert.equal(game.atlas.collections.players.world_1.source, "game.universe.players");
assert.equal(game.atlas.collections.coaches.BOS.source, "game.league.coaches");

const context = createAtlasContext(game);
assert.equal(context.player("world_1").name, "World Star");
assert.equal(context.coach("BOS").name, "Coach One");
context.emit("SEASON_AUDITED", {season:2030});
assert.equal(game.atlas.events[0].type, "SEASON_AUDITED");
assert.equal(atlasHealth(game).ok, true);

const bus = new EventBus();
let received = 0;
bus.on("TEST", event => { received += event.payload.value; });
bus.emit("TEST", {value:2});
assert.equal(received, 2);
assert.equal(bus.snapshot().length, 1);

console.log("✓ Atlas Phase 1 core: migration, indexes, context, events and health OK");
