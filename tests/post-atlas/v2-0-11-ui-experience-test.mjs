import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateAtlas, ATLAS_SCHEMA_VERSION, ATLAS_GAME_VERSION } from '../../js/core/universe-core.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const feedback=fs.readFileSync(path.join(root,'js/ui/feedback-center.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const shell=fs.readFileSync(path.join(root,'js/ui/app-shell.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');

assert.equal(/(?<![.\w])alert\s*\(/.test(app),false,'app.js no debe usar alert()');
assert.equal(/(?<![.\w])confirm\s*\(/.test(app),false,'app.js no debe usar confirm() nativo');
assert.match(app,/createFeedbackCenter/);
assert.match(app,/feedback\.confirm/);
assert.match(app,/feedback\.success/);
assert.match(app,/feedback\.error/);
assert.match(feedback,/aria-live/);
assert.match(feedback,/role=\\?"dialog/);
assert.match(feedback,/aria-modal=\\?"true/);
assert.match(feedback,/Escape/);
assert.match(css,/min-height:44px/);
assert.match(css,/:focus-visible/);
assert.match(css,/\.toast-region/);
assert.match(css,/\.dialog-layer/);
assert.match(shell,/aria-label/);
assert.match(shell,/aria-current/);
assert.match(worker,/feedback-center\.js/);

const oldGame={player:{name:'Test'},atlas:{schema:5,migrations:[]}};
migrateAtlas(oldGame);
assert.ok(ATLAS_SCHEMA_VERSION>=6);
assert.ok(ATLAS_GAME_VERSION.startsWith('2.0.')); 
assert.ok(oldGame.atlas.schema>=6);
assert.ok(oldGame.atlas.migrations.some(m=>m.id==='ui-experience'));
console.log('✓ NBA Glory 2.0.11 UI Experience');
