import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const app=read("js/app.js");
const registry=read("js/ui/view-registry.js");
const modules=[
  "js/ui/app-shell.js",
  "js/ui/views/career-views.js",
  "js/ui/views/media-views.js",
  "js/ui/views/encyclopedia-views.js"
];

assert.ok(Buffer.byteLength(app)<10000,`app.js remains too large: ${Buffer.byteLength(app)} bytes`);
for(const file of modules) assert.ok(fs.existsSync(path.join(root,file)),`missing modular UI file: ${file}`);
for(const name of ["career-views.js","media-views.js","encyclopedia-views.js"]) assert.ok(registry.includes(name),`view registry does not load ${name}`);
assert.ok(app.includes("createViewRegistry"));
assert.ok(app.includes("renderBottomNav"));
assert.equal(/game\.[A-Za-z0-9_$]+\s*=/.test(app),false,"app.js must not mutate game properties");
for(const file of modules.filter(x=>x.includes("/views/"))){
  const source=read(file);
  assert.equal(source.includes("game-controller.js"),false,`${file} imports GameController`);
  assert.equal(source.includes("game-actions.js"),false,`${file} imports Game Actions`);
}

const {migrateAtlas,ATLAS_SCHEMA_VERSION,ATLAS_GAME_VERSION}=await import("../../js/core/universe-core.js");
const old={player:{name:"Legacy"},atlas:{schema:4,migrations:[]},universe:{players:[]}};
migrateAtlas(old);
assert.ok(ATLAS_SCHEMA_VERSION>=5);
assert.equal(old.atlas.schema,ATLAS_SCHEMA_VERSION);
assert.equal(old.atlas.gameVersion,ATLAS_GAME_VERSION);
assert.ok(old.atlas.migrations.some(item=>item.id==="modular-ui"));

console.log("✅ NBA Glory 2.0.10: Modular UI, registry and Atlas v5 migration OK");
