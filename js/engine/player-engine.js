import { Random } from "../core/random-engine.js";
const clamp=(n,min=25,max=99)=>Math.max(min,Math.min(max,Math.round(n)));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const pick=(r,a)=>a[Math.floor(r()*a.length)];

export const ATTRIBUTE_GROUPS={
  Ataque:["threePoint","midRange","finishing"],
  Creación:["passing","handle","iq"],
  Defensa:["rebounding","perimeterDefense","interiorDefense","steals","blocks"],
  Físico:["speed","strength","stamina"]
};
export const ATTRIBUTE_LABELS={threePoint:"Triple",midRange:"Media distancia",finishing:"Finalización",passing:"Pase",handle:"Manejo",iq:"IQ",rebounding:"Rebote",perimeterDefense:"Defensa exterior",interiorDefense:"Defensa interior",steals:"Robos",blocks:"Tapones",speed:"Velocidad",strength:"Fuerza",stamina:"Resistencia"};

const POSITION_ARCHETYPES={
 PG:["Floor General","Scoring Guard","Two-Way Guard"],SG:["Sharpshooter","Shot Creator","Slasher"],
 SF:["3&D Wing","Athletic Wing","Point Forward"],PF:["Stretch Four","Interior Scorer","Defensive Forward"],
 C:["Rim Protector","Paint Beast","Mobile Big"]
};
const LEGACY_MAP={Shooter:"Sharpshooter",Playmaker:"Floor General",Slasher:"Slasher",Defender:"Two-Way Guard","All-Around":"Point Forward"};
const ARCHETYPE_BONUS={
 "Floor General":{passing:12,handle:9,iq:8,threePoint:-2},"Scoring Guard":{threePoint:7,midRange:8,handle:5,passing:-3},"Two-Way Guard":{perimeterDefense:9,steals:8,threePoint:3},
 Sharpshooter:{threePoint:14,midRange:6,finishing:-5,rebounding:-4},"Shot Creator":{midRange:11,handle:8,finishing:5},Slasher:{finishing:13,speed:8,threePoint:-6},
 "3&D Wing":{threePoint:8,perimeterDefense:10,steals:5,handle:-3},"Athletic Wing":{finishing:9,speed:9,rebounding:5},"Point Forward":{passing:9,handle:6,rebounding:5,iq:5},
 "Stretch Four":{threePoint:11,midRange:5,interiorDefense:-3},"Interior Scorer":{finishing:11,strength:8,rebounding:5},"Defensive Forward":{perimeterDefense:7,interiorDefense:8,rebounding:7},
 "Rim Protector":{blocks:15,interiorDefense:12,rebounding:9,handle:-8},"Paint Beast":{finishing:11,strength:11,rebounding:10,threePoint:-8},"Mobile Big":{speed:7,interiorDefense:7,blocks:7,passing:4}
};
const WEIGHTS={
 PG:{passing:.19,handle:.17,iq:.14,threePoint:.13,speed:.10,perimeterDefense:.10,finishing:.07,midRange:.05,steals:.05},
 SG:{threePoint:.18,finishing:.14,midRange:.13,handle:.12,speed:.11,perimeterDefense:.10,iq:.08,passing:.07,steals:.07},
 SF:{threePoint:.13,finishing:.13,perimeterDefense:.13,speed:.10,rebounding:.10,handle:.09,iq:.09,midRange:.08,passing:.08,strength:.07},
 PF:{rebounding:.16,finishing:.14,interiorDefense:.14,strength:.12,threePoint:.10,blocks:.09,iq:.09,midRange:.06,passing:.05,speed:.05},
 C:{rebounding:.19,interiorDefense:.18,blocks:.15,strength:.14,finishing:.14,iq:.08,passing:.05,stamina:.04,speed:.03}
};

function normalizeArchetype(position,value){
 const mapped=LEGACY_MAP[value]||value;
 return POSITION_ARCHETYPES[position]?.includes(mapped)?mapped:POSITION_ARCHETYPES[position]?.[0]||"Point Forward";
}
function potentialGrade(n){return n>=96?"A+":n>=92?"A":n>=88?"A-":n>=84?"B+":n>=80?"B":n>=76?"B-":"C";}
export function calculateOVR(player){
 const a=player.attributes||{},w=WEIGHTS[player.position]||WEIGHTS.SF;
 const total=Object.entries(w).reduce((s,[k,v])=>s+(a[k]||50)*v,0);
 return clamp(total,40,99);
}
export function refreshPlayer(player){
 player.ovr=calculateOVR(player);
 player.potential=player.dna?.potential??player.potential??player.ovr;
 player.potentialGrade=potentialGrade(player.potential);
 return player;
}
export function createPlayer({name,position="PG",archetype,age=19,draftPick=null,baseOvr=73,seed}={}){
 const playerSeed=seed??hash(`${name}|${position}|${Date.now()}|${Random.next()}`),r=rng(playerSeed);
 const selected=normalizeArchetype(position,archetype||pick(r,POSITION_ARCHETYPES[position]));
 const personality=pick(r,["Competitivo","Trabajador","Líder","Profesional","Ambicioso","Sereno"]);
 const development=pick(r,["Explosivo","Rápido","Normal","Lento"]);
 const attrs={};
 Object.values(ATTRIBUTE_GROUPS).flat().forEach(k=>attrs[k]=clamp(baseOvr-5+Math.floor(r()*11)));
 const positionBase={PG:{passing:5,handle:5,speed:3,blocks:-12,rebounding:-7},SG:{threePoint:4,finishing:3,rebounding:-4,blocks:-8},SF:{finishing:3,perimeterDefense:3},PF:{rebounding:5,strength:5,handle:-5},C:{rebounding:8,interiorDefense:8,blocks:10,strength:7,handle:-12,threePoint:-6,speed:-4}}[position]||{};
 [positionBase,ARCHETYPE_BONUS[selected]||{}].forEach(map=>Object.entries(map).forEach(([k,v])=>attrs[k]=clamp(attrs[k]+v)));
 const potential=clamp(baseOvr+6+Math.floor(r()*14),78,95);
 const player={name:String(name||"Rookie").trim(),position,archetype:selected,age,draftPick,attributes:attrs,dna:{seed:playerSeed,archetype:selected,personality,development,peakAge:26+Math.floor(r()*6),potential,injuryRisk:8+Math.floor(r()*25),workEthic:55+Math.floor(r()*41),clutch:50+Math.floor(r()*46),hiddenTraits:[pick(r,["Competidor","Líder silencioso","Clutch","Profesional"]),pick(r,["Resistente","Inconstante","Leal","Ambicioso"])]}};
 return refreshPlayer(player);
}
export function migratePlayer(player){
 if(!player)return player;
 if(!player.attributes||!player.dna){
   const original=player.ovr||72;
   const generated=createPlayer({name:player.name,position:player.position,archetype:player.archetype,age:player.age||19,draftPick:player.draftPick,baseOvr:original,seed:hash(`${player.name}|${player.position}|${player.draftPick||0}`)});
   player.attributes=generated.attributes;player.dna=generated.dna;player.archetype=generated.archetype;
 }
 player.dna.potential=player.dna.potential??player.potential??Math.min(99,(player.ovr||72)+15);
 return refreshPlayer(player);
}
export function progressPlayer(player,{amount=0,severeInjury=false}={}){
 migratePlayer(player);
 const age=player.age||19,peak=player.dna.peakAge||28,dev={Explosivo:1.3,Rápido:1.15,Normal:1,Lento:.82}[player.dna.development]||1;
 const phase=age<23?1.2:age<peak?1:age<=peak+2?.35:-.9;
 const delta=Math.max(-3,Math.min(3,Math.round((amount+phase)*dev)));
 const keys=Object.keys(player.attributes);
 keys.forEach(k=>{
   let d=delta;
   if(age>peak+2&&["speed","stamina","strength","finishing"].includes(k))d-=1;
   if(severeInjury&&["speed","strength","stamina"].includes(k))d-=1;
   if(delta>0&&player.attributes[k]>=player.dna.potential)d=0;
   player.attributes[k]=clamp(player.attributes[k]+d,25,player.dna.potential);
 });
 return refreshPlayer(player);
}
export function trainPlayer(player,focus){
 migratePlayer(player);
 const map={shooting:["threePoint","midRange"],body:["strength","stamina","rebounding"],vision:["passing","handle","iq"],defense:["perimeterDefense","interiorDefense","steals","blocks"]};
 (map[focus]||[]).forEach(k=>player.attributes[k]=clamp(player.attributes[k]+1,25,player.dna.potential));
 return refreshPlayer(player);
}
export function getPublicDNA(player){migratePlayer(player);return {personality:player.dna.personality,development:player.dna.development,peakAge:player.dna.peakAge,potential:player.dna.potential,potentialGrade:potentialGrade(player.dna.potential),injuryRisk:player.dna.injuryRisk<16?"Bajo":player.dna.injuryRisk<25?"Medio":"Alto"};}
export function getArchetypes(position){return [...(POSITION_ARCHETYPES[position]||[])];}
