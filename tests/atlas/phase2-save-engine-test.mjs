import assert from "node:assert/strict";
import {
  SAVE_KEYS,
  saveGameV2,
  loadGameV2,
  listBackupSlots,
  restoreBackupSlot,
  exportGameV2,
  importGameV2,
  validateSaveGame
} from "../../js/core/save-engine.js";

class MemoryStorage {
  constructor(){ this.map = new Map(); }
  getItem(k){ return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k,v){ this.map.set(k,String(v)); }
  removeItem(k){ this.map.delete(k); }
}

const makeGame = season => ({
  season,
  phase: "season",
  player: { id: "toni", name: "Toni Rol", career: [], teamId: "LAL" },
  universe: { players: [] },
  league: { coaches: {} },
  seasonResults: []
});

const storage = new MemoryStorage();
let result = saveGameV2(makeGame(2026), { storage, reason: "test-1" });
assert.equal(result.ok, true);
assert.equal(validateSaveGame(result.game).ok, true);

result = saveGameV2(makeGame(2027), { storage, reason: "test-2" });
assert.equal(result.ok, true);
result = saveGameV2(makeGame(2028), { storage, reason: "test-3" });
assert.equal(result.ok, true);
result = saveGameV2(makeGame(2029), { storage, reason: "test-4" });
assert.equal(result.ok, true);

const backups = listBackupSlots({ storage });
assert.equal(backups.filter(b => b.exists && b.valid).length, 3);
assert.equal(loadGameV2({ storage }).game.season, 2029);

// Corrupt primary: engine must recover from latest valid backup.
storage.setItem(SAVE_KEYS.primary, '{corrupt');
const recovered = loadGameV2({ storage, promoteRecovered: false });
assert.equal(recovered.recovered, true);
assert.equal(recovered.recoveredFrom, "backup-1");
assert.equal(recovered.game.season, 2028);

const restored = restoreBackupSlot(2, { storage });
assert.equal(restored.ok, true);
assert.equal(restored.game.season, 2027);

const exported = exportGameV2(makeGame(2040));
const imported = importGameV2(exported);
assert.equal(imported.season, 2040);
assert.equal(imported.player.name, "Toni Rol");

console.log("✅ Atlas Fase 2 Save Engine 2.0: OK");
