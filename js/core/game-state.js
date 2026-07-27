import { createAtlasContext, migrateAtlas, atlasHealth } from "./universe-core.js";

export function prepareGameState(game) {
  migrateAtlas(game);
  return createAtlasContext(game);
}

export function validateGameState(game) {
  return atlasHealth(game);
}
