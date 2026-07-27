import { migrateAtlas, atlasHealth, ATLAS_SCHEMA_VERSION } from "./universe-core.js";

export const SAVE_ENGINE_VERSION = 2;
export const SAVE_SCHEMA_VERSION = 20;
export const SAVE_KEYS = Object.freeze({
  primary: "nbaGlorySaveV2",
  legacyPrimary: "nbaGlorySave",
  meta: "nbaGlorySaveMetaV2",
  backups: ["nbaGlorySaveBackupV2_1", "nbaGlorySaveBackupV2_2", "nbaGlorySaveBackupV2_3"]
});

const nowIso = () => new Date().toISOString();
const clone = value => globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));

function storageOrNull(customStorage) {
  if (customStorage) return customStorage;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function checksum(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + ((h2 << 6) >>> 0) + (h2 >>> 2);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

function stableEnvelope(game, reason = "manual") {
  const clean = clone(game);
  clean.version = SAVE_SCHEMA_VERSION;
  clean.system ??= {};
  clean.system.schema = SAVE_SCHEMA_VERSION;
  clean.system.saveEngine = SAVE_ENGINE_VERSION;
  clean.system.lastSavedAt = nowIso();
  migrateAtlas(clean);
  const payload = JSON.stringify(clean);
  return {
    product: "NBA Glory",
    format: "atlas-save",
    saveEngine: SAVE_ENGINE_VERSION,
    schema: SAVE_SCHEMA_VERSION,
    atlasSchema: ATLAS_SCHEMA_VERSION,
    createdAt: clean.system.lastSavedAt,
    reason,
    checksum: checksum(payload),
    game: clean
  };
}

function serializeEnvelope(envelope) {
  return JSON.stringify(envelope);
}

function decode(raw) {
  if (!raw) throw new Error("empty-save");
  const parsed = JSON.parse(raw);
  const envelope = parsed?.format === "atlas-save" ? parsed : {
    product: "NBA Glory",
    format: "legacy-save",
    saveEngine: 1,
    schema: parsed?.version ?? 0,
    atlasSchema: parsed?.atlas?.schema ?? 0,
    createdAt: parsed?.system?.lastSavedAt ?? null,
    reason: "legacy",
    checksum: checksum(JSON.stringify(parsed)),
    game: parsed?.game ?? parsed
  };
  if (!envelope.game || typeof envelope.game !== "object" || !envelope.game.player) throw new Error("invalid-save-game");
  if (envelope.format === "atlas-save") {
    const payload = JSON.stringify(envelope.game);
    if (envelope.checksum !== checksum(payload)) throw new Error("checksum-mismatch");
  }
  return envelope;
}

export function validateSaveGame(game) {
  const issues = [];
  if (!game || typeof game !== "object") issues.push("game-not-object");
  if (!game?.player || typeof game.player !== "object") issues.push("missing-player");
  if (!game?.player?.id) issues.push("missing-player-id");
  if (!Number.isFinite(Number(game?.season))) issues.push("invalid-season");
  if (!game?.phase) issues.push("missing-phase");
  if (game?.atlas) {
    const health = atlasHealth(game);
    issues.push(...health.issues.map(issue => `atlas:${issue}`));
  }
  return { ok: issues.length === 0, issues };
}

export function repairGameState(input) {
  const game = clone(input);
  game.system ??= {};
  game.season = Number.isFinite(Number(game.season)) ? Number(game.season) : 2026;
  game.phase ||= "season";
  game.player ??= {};
  game.player.id ||= `player_${Date.now().toString(36)}`;
  game.player.name ||= "Jugador";
  game.player.career = Array.isArray(game.player.career) ? game.player.career : [];
  migrateAtlas(game);
  game.system.repairedAt = nowIso();
  return game;
}

function metadataFor(raw, envelope, slot = "primary") {
  return {
    saveEngine: SAVE_ENGINE_VERSION,
    schema: envelope.schema,
    atlasSchema: envelope.atlasSchema,
    checksum: checksum(raw),
    payloadChecksum: envelope.checksum,
    savedAt: envelope.createdAt,
    reason: envelope.reason,
    slot,
    season: envelope.game.season,
    phase: envelope.game.phase,
    player: envelope.game.player?.name ?? "—",
    bytes: raw.length
  };
}

function rotateBackups(storage) {
  const [b1, b2, b3] = SAVE_KEYS.backups;
  const second = storage.getItem(b2);
  const first = storage.getItem(b1);
  const current = storage.getItem(SAVE_KEYS.primary);
  if (second) storage.setItem(b3, second); else storage.removeItem(b3);
  if (first) storage.setItem(b2, first); else storage.removeItem(b2);
  if (current) storage.setItem(b1, current); else storage.removeItem(b1);
}

export function saveGameV2(game, { storage: customStorage, reason = "autosave" } = {}) {
  const storage = storageOrNull(customStorage);
  if (!storage) return { ok: false, reason: "storage-unavailable" };
  const validation = validateSaveGame(game);
  const source = validation.ok ? game : repairGameState(game);
  const envelope = stableEnvelope(source, reason);
  const raw = serializeEnvelope(envelope);
  const previous = storage.getItem(SAVE_KEYS.primary);
  try {
    rotateBackups(storage);
    storage.setItem(SAVE_KEYS.primary, raw);
    const verified = storage.getItem(SAVE_KEYS.primary);
    const decoded = decode(verified);
    if (decoded.checksum !== envelope.checksum) throw new Error("save-verification-failed");
    const meta = metadataFor(raw, envelope);
    meta.repairedBeforeSave = !validation.ok;
    meta.validationIssues = validation.issues;
    storage.setItem(SAVE_KEYS.meta, JSON.stringify(meta));
    return { ok: true, game: envelope.game, meta };
  } catch (error) {
    if (previous) storage.setItem(SAVE_KEYS.primary, previous);
    else storage.removeItem(SAVE_KEYS.primary);
    return { ok: false, reason: error?.message || "save-failed" };
  }
}

function candidateSlots(storage) {
  return [
    { key: SAVE_KEYS.primary, slot: "primary" },
    ...SAVE_KEYS.backups.map((key, index) => ({ key, slot: `backup-${index + 1}` })),
    { key: SAVE_KEYS.legacyPrimary, slot: "legacy" }
  ].map(item => ({ ...item, raw: storage.getItem(item.key) })).filter(item => item.raw);
}

export function loadGameV2({ storage: customStorage, promoteRecovered = true } = {}) {
  const storage = storageOrNull(customStorage);
  if (!storage) return { game: null, recovered: false, error: "storage-unavailable", attempts: [] };
  const attempts = [];
  for (const candidate of candidateSlots(storage)) {
    try {
      const envelope = decode(candidate.raw);
      let game = repairGameState(envelope.game);
      const validation = validateSaveGame(game);
      if (!validation.ok) throw new Error(`validation-failed:${validation.issues.join(",")}`);
      const recovered = candidate.slot !== "primary";
      if (recovered && promoteRecovered) saveGameV2(game, { storage, reason: `recovery:${candidate.slot}` });
      return { game, recovered, recoveredFrom: candidate.slot, attempts, meta: metadataFor(candidate.raw, envelope, candidate.slot) };
    } catch (error) {
      attempts.push({ slot: candidate.slot, error: error?.message || "invalid-save" });
    }
  }
  return { game: null, recovered: false, error: "no-valid-save", attempts };
}

export function getSaveMetaV2({ storage: customStorage } = {}) {
  const storage = storageOrNull(customStorage);
  if (!storage) return null;
  try { return JSON.parse(storage.getItem(SAVE_KEYS.meta) || "null"); } catch { return null; }
}

export function listBackupSlots({ storage: customStorage } = {}) {
  const storage = storageOrNull(customStorage);
  if (!storage) return [];
  return SAVE_KEYS.backups.map((key, index) => {
    const raw = storage.getItem(key);
    if (!raw) return { slot: index + 1, exists: false };
    try {
      const envelope = decode(raw);
      return { slot: index + 1, exists: true, valid: true, ...metadataFor(raw, envelope, `backup-${index + 1}`) };
    } catch (error) {
      return { slot: index + 1, exists: true, valid: false, error: error?.message || "invalid-save" };
    }
  });
}

export function restoreBackupSlot(slot = 1, { storage: customStorage } = {}) {
  const storage = storageOrNull(customStorage);
  const key = SAVE_KEYS.backups[slot - 1];
  if (!storage || !key) return { ok: false, reason: "invalid-backup-slot" };
  try {
    const envelope = decode(storage.getItem(key));
    const game = repairGameState(envelope.game);
    const result = saveGameV2(game, { storage, reason: `manual-restore:backup-${slot}` });
    return { ...result, restoredFrom: slot };
  } catch (error) {
    return { ok: false, reason: error?.message || "restore-failed" };
  }
}

export function clearAllSaves({ storage: customStorage } = {}) {
  const storage = storageOrNull(customStorage);
  if (!storage) return;
  [SAVE_KEYS.primary, SAVE_KEYS.legacyPrimary, SAVE_KEYS.meta, ...SAVE_KEYS.backups].forEach(key => storage.removeItem(key));
}

export function exportGameV2(game) {
  const envelope = stableEnvelope(repairGameState(game), "export");
  envelope.exportedAt = nowIso();
  return JSON.stringify(envelope, null, 2);
}

export function importGameV2(text) {
  const envelope = decode(text);
  const game = repairGameState(envelope.game);
  const validation = validateSaveGame(game);
  if (!validation.ok) throw new Error(`El archivo no contiene una partida válida: ${validation.issues.join(", ")}`);
  return game;
}
