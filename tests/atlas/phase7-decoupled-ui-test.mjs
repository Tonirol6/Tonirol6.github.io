import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

class MemoryStorage {
  constructor(){this.data=new Map();}
  getItem(key){return this.data.has(key)?this.data.get(key):null;}
  setItem(key,value){this.data.set(key,String(value));}
  removeItem(key){this.data.delete(key);}
  clear(){this.data.clear();}
  key(index){return [...this.data.keys()][index]??null;}
  get length(){return this.data.size;}
}
globalThis.localStorage=new MemoryStorage();

const {createGameController, GAME_CONTROLLER_VERSION}=await import("../../js/controllers/game-controller.js");
const {gameActions}=await import("../../js/controllers/game-actions.js");

const controller=createGameController({game:null});
let notifications=0;
controller.subscribe(()=>notifications++);
controller.dispatch(gameActions.create({name:"Atlas UI",position:"PG",archetype:"Director",nationality:"España"}));
const game=controller.getState();
assert.equal(game.player.name,"Atlas UI");
assert.equal(game.atlas.flags.singleSourceTransition,"complete");
assert.equal(game.atlas.ui.controllerVersion,GAME_CONTROLLER_VERSION);
assert.equal(game.atlas.ui.lastAction,"game/create");
assert.ok(game.atlas.events.some(event=>event.type==="UI_ACTION_COMMITTED"));
assert.equal(notifications,1);

controller.dispatch(gameActions.advancePathway("ncaa"));
assert.equal(controller.getState().atlas.ui.lastAction,"game/advance-pathway");
assert.equal(notifications,2);

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
for(const forbidden of ["createGame,", "simulateSeason,", "applyDecision,", "saveGame ", "applyImmersionChoice,", "acceptSponsorship,"]){
  assert.equal(app.includes(forbidden),false,`app.js still imports a mutation API: ${forbidden}`);
}
assert.equal(/game\.lastSummary\s*=/.test(app),false,"UI must not write game.lastSummary directly");
assert.ok(app.includes("gameController.dispatch(action)"));
assert.ok(app.includes("gameActions.simulateSeason()"));

console.log("✓ Atlas Phase 7 decoupled UI controller test passed");
