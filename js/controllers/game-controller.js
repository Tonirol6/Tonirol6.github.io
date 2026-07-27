import {
  createGame,
  runDraft,
  simulateSeason,
  applyDecision,
  advancePreDraft,
  loadGame,
  clearGame,
  saveGame
} from "../engine/game-engine.js";
import {
  applyImmersionChoice,
  acceptSponsorship,
  declineSponsorship,
  markInboxRead
} from "../engine/immersion-engine.js";
import {restoreBackup, importSave, exportSave} from "../engine/persistence-engine.js";
import {createAtlasContext} from "../core/universe-core.js";
import {GAME_ACTIONS} from "./game-actions.js";

export const GAME_CONTROLLER_VERSION = "1.1.0";

export class GameController {
  #game;
  #listeners = new Set();
  #busy = false;

  constructor({game = loadGame()} = {}) {
    this.#game = game;
  }

  getState() {
    return this.#game;
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Controller listener must be a function");
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispatch(action) {
    if (!action?.type) throw new TypeError("A game action requires a type");
    if (this.#busy) throw new Error("A game action is already being processed");
    this.#busy = true;
    try {
      const result = this.#reduce(action);
      this.#recordAction(action.type);
      if (this.#game) saveGame(this.#game);
      this.#notify(action, result);
      return result;
    } finally {
      this.#busy = false;
    }
  }

  exportCurrentSave() {
    if (!this.#game) throw new Error("No active game to export");
    return exportSave(this.#game);
  }

  #reduce(action) {
    switch (action.type) {
      case GAME_ACTIONS.CREATE_GAME:
        this.#game = createGame(action.payload ?? {});
        return {game: this.#game};
      case GAME_ACTIONS.ADVANCE_PATHWAY:
        this.#requireGame();
        this.#game = advancePreDraft(this.#game, action.payload?.pathway);
        return {game: this.#game};
      case GAME_ACTIONS.RUN_DRAFT:
        this.#requireGame();
        this.#game = runDraft(this.#game);
        return {game: this.#game};
      case GAME_ACTIONS.SIMULATE_SEASON:
        this.#requireGame();
        this.#game = simulateSeason(this.#game);
        return {game: this.#game};
      case GAME_ACTIONS.APPLY_DECISION:
        this.#requireGame();
        this.#game = applyDecision(this.#game, action.payload?.choice);
        return {game: this.#game};
      case GAME_ACTIONS.APPLY_IMMERSION_CHOICE: {
        this.#requireGame();
        const summary = applyImmersionChoice(this.#game, action.payload?.conversation, action.payload?.choice);
        this.#game.lastSummary = `Conversación completada: ${summary}.`;
        saveGame(this.#game);
        return {game: this.#game, summary};
      }
      case GAME_ACTIONS.MARK_INBOX_READ:
        this.#requireGame();
        markInboxRead(this.#game, action.payload?.messageId);
        saveGame(this.#game);
        return {game: this.#game};
      case GAME_ACTIONS.ACCEPT_SPONSORSHIP: {
        this.#requireGame();
        const offer = acceptSponsorship(this.#game, action.payload?.offerId);
        if (offer) this.#game.lastSummary = `Has firmado con ${offer.brand}.`;
        saveGame(this.#game);
        return {game: this.#game, offer};
      }
      case GAME_ACTIONS.DECLINE_SPONSORSHIP: {
        this.#requireGame();
        const offer = declineSponsorship(this.#game, action.payload?.offerId);
        saveGame(this.#game);
        return {game: this.#game, offer};
      }
      case GAME_ACTIONS.RESTORE_BACKUP: {
        const restored = restoreBackup();
        if (!restored) return {game: this.#game, restored: false};
        this.#game = restored;
        return {game: this.#game, restored: true};
      }
      case GAME_ACTIONS.IMPORT_SAVE:
        this.#game = importSave(action.payload?.text ?? "");
        saveGame(this.#game);
        return {game: this.#game, imported: true};
      case GAME_ACTIONS.RESET_GAME:
        clearGame();
        this.#game = null;
        return {game: null};
      default:
        throw new Error(`Unknown game action: ${action.type}`);
    }
  }

  #recordAction(type) {
    if (!this.#game) return;
    const atlas = createAtlasContext(this.#game);
    this.#game.atlas.flags.singleSourceTransition = "complete";
    this.#game.atlas.flags.operationAtlas = "closed";
    this.#game.atlas.ui ??= {};
    this.#game.atlas.ui.controllerVersion = GAME_CONTROLLER_VERSION;
    this.#game.atlas.ui.lastAction = type;
    atlas.emit("UI_ACTION_COMMITTED", {action: type, controllerVersion: GAME_CONTROLLER_VERSION}, {source: "game-controller"});
  }

  #notify(action, result) {
    const snapshot = {game: this.#game, action, result};
    for (const listener of this.#listeners) listener(snapshot);
  }

  #requireGame() {
    if (!this.#game) throw new Error("No active game");
  }
}

export function createGameController(options) {
  return new GameController(options);
}
