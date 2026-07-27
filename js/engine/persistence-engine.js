import {
  SAVE_SCHEMA_VERSION,
  saveGameV2,
  loadGameV2,
  clearAllSaves,
  getSaveMetaV2,
  listBackupSlots,
  restoreBackupSlot,
  exportGameV2,
  importGameV2
} from "../core/save-engine.js";

export const SCHEMA_VERSION = SAVE_SCHEMA_VERSION;

export function saveTransactional(game) {
  return saveGameV2(game, { reason: "game-action" });
}

export function loadWithRecovery() {
  return loadGameV2();
}

export function clearTransactional() {
  clearAllSaves();
}

export function getSaveMeta() {
  return getSaveMetaV2();
}

export function hasBackup() {
  return listBackupSlots().some(slot => slot.exists && slot.valid);
}

export function restoreBackup(slot = 1) {
  const result = restoreBackupSlot(slot);
  return result.ok ? result.game : null;
}

export function getBackupSlots() {
  return listBackupSlots();
}

export function exportSave(game) {
  return exportGameV2(game);
}

export function importSave(text) {
  return importGameV2(text);
}
