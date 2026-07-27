export const GAME_ACTIONS = Object.freeze({
  CREATE_GAME: "game/create",
  ADVANCE_PATHWAY: "game/advance-pathway",
  RUN_DRAFT: "game/run-draft",
  SIMULATE_SEASON: "game/simulate-season",
  APPLY_DECISION: "game/apply-decision",
  APPLY_IMMERSION_CHOICE: "game/apply-immersion-choice",
  MARK_INBOX_READ: "game/mark-inbox-read",
  ACCEPT_SPONSORSHIP: "game/accept-sponsorship",
  DECLINE_SPONSORSHIP: "game/decline-sponsorship",
  RESTORE_BACKUP: "game/restore-backup",
  IMPORT_SAVE: "game/import-save",
  RESET_GAME: "game/reset"
});

export const gameActions = Object.freeze({
  create: payload => ({type: GAME_ACTIONS.CREATE_GAME, payload}),
  advancePathway: pathway => ({type: GAME_ACTIONS.ADVANCE_PATHWAY, payload: {pathway}}),
  runDraft: () => ({type: GAME_ACTIONS.RUN_DRAFT}),
  simulateSeason: () => ({type: GAME_ACTIONS.SIMULATE_SEASON}),
  applyDecision: choice => ({type: GAME_ACTIONS.APPLY_DECISION, payload: {choice}}),
  applyImmersionChoice: (conversation, choice) => ({type: GAME_ACTIONS.APPLY_IMMERSION_CHOICE, payload: {conversation, choice}}),
  markInboxRead: messageId => ({type: GAME_ACTIONS.MARK_INBOX_READ, payload: {messageId}}),
  acceptSponsorship: offerId => ({type: GAME_ACTIONS.ACCEPT_SPONSORSHIP, payload: {offerId}}),
  declineSponsorship: offerId => ({type: GAME_ACTIONS.DECLINE_SPONSORSHIP, payload: {offerId}}),
  restoreBackup: () => ({type: GAME_ACTIONS.RESTORE_BACKUP}),
  importSave: text => ({type: GAME_ACTIONS.IMPORT_SAVE, payload: {text}}),
  reset: () => ({type: GAME_ACTIONS.RESET_GAME})
});
