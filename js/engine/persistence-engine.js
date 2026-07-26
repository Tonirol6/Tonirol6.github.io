const PRIMARY_KEY='nbaGlorySave';
const BACKUP_KEY='nbaGlorySaveBackup';
const META_KEY='nbaGlorySaveMeta';
const SCHEMA_VERSION=18;

function storage(){
  try{return globalThis.localStorage??null;}catch{return null;}
}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function parse(raw){if(!raw)return null;const value=JSON.parse(raw);if(!value||typeof value!=='object'||!value.player)return null;return value;}
function metaFor(raw,game){return {schema:SCHEMA_VERSION,checksum:hash(raw),savedAt:new Date().toISOString(),season:game.season,phase:game.phase,player:game.player?.name??'—',bytes:raw.length};}

export function saveTransactional(game){
  const s=storage(); if(!s)return {ok:false,reason:'storage-unavailable'};
  const clean=structuredClone?structuredClone(game):JSON.parse(JSON.stringify(game));
  clean.version=SCHEMA_VERSION;
  clean.system??={};clean.system.lastSavedAt=new Date().toISOString();clean.system.schema=SCHEMA_VERSION;
  const raw=JSON.stringify(clean), current=s.getItem(PRIMARY_KEY);
  try{
    if(current){parse(current);s.setItem(BACKUP_KEY,current);}
    s.setItem(PRIMARY_KEY,raw);
    const verify=s.getItem(PRIMARY_KEY);if(!verify||hash(verify)!==hash(raw))throw new Error('save-verification-failed');
    s.setItem(META_KEY,JSON.stringify(metaFor(raw,clean)));
    return {ok:true,meta:metaFor(raw,clean)};
  }catch(error){
    if(current)s.setItem(PRIMARY_KEY,current);
    return {ok:false,reason:error?.message||'save-failed'};
  }
}

export function loadWithRecovery(){
  const s=storage();if(!s)return {game:null,recovered:false,error:'storage-unavailable'};
  try{const raw=s.getItem(PRIMARY_KEY),game=parse(raw);if(game)return {game,recovered:false,meta:getSaveMeta()};}catch{}
  try{const raw=s.getItem(BACKUP_KEY),game=parse(raw);if(game){s.setItem(PRIMARY_KEY,raw);return {game,recovered:true,meta:getSaveMeta()};}}catch{}
  return {game:null,recovered:false,error:'no-valid-save'};
}
export function clearTransactional(){const s=storage();if(!s)return;s.removeItem(PRIMARY_KEY);s.removeItem(BACKUP_KEY);s.removeItem(META_KEY);}
export function getSaveMeta(){const s=storage();try{return JSON.parse(s?.getItem(META_KEY)||'null');}catch{return null;}}
export function hasBackup(){const s=storage();try{return !!parse(s?.getItem(BACKUP_KEY));}catch{return false;}}
export function restoreBackup(){const s=storage();if(!s)return null;try{const raw=s.getItem(BACKUP_KEY),game=parse(raw);if(!game)return null;s.setItem(PRIMARY_KEY,raw);return game;}catch{return null;}}
export function exportSave(game){const payload={product:'NBA Glory',schema:SCHEMA_VERSION,exportedAt:new Date().toISOString(),game};return JSON.stringify(payload,null,2);}
export function importSave(text){const payload=JSON.parse(text);const game=payload?.game??payload;if(!game?.player)throw new Error('El archivo no contiene una partida válida.');return game;}
export {SCHEMA_VERSION};
