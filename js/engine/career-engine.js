const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const round=n=>Math.round(n);

export function migrateCareerProfile(player){
  player.careerProfile ??= {};
  const c=player.careerProfile;
  c.version=1;
  c.reputation ??= 60;
  c.popularity ??= 45;
  c.relationships ??= {};
  c.relationships.coach ??= player.coachTrust ?? 55;
  c.relationships.teammates ??= 58;
  c.relationships.gm ??= 55;
  c.relationships.fans ??= 50;
  c.relationships.media ??= 50;
  c.history ??= [];
  syncLegacyFields(player);
  return c;
}

export function syncLegacyFields(player){
  const c=player.careerProfile;
  if(!c)return player;
  player.coachTrust=clamp(c.relationships.coach ?? player.coachTrust ?? 55);
  return player;
}

function apply(profile,key,delta){profile[key]=clamp((profile[key]??50)+delta);}
function relation(profile,key,delta){profile.relationships[key]=clamp((profile.relationships[key]??50)+delta);}

export function processCareerSeason(player,seasonData){
  const c=migrateCareerProfile(player);
  const performance=(seasonData.per-15)*.55+(seasonData.wins-41)*.08+(seasonData.ppg-14)*.18;
  apply(c,'reputation',round(performance)+(seasonData.allStar?5:0)+(seasonData.mvp?10:0)+(seasonData.champion?9:0)-(seasonData.injury?2:0));
  apply(c,'popularity',round((seasonData.ppg-12)*.28)+(seasonData.allStar?7:0)+(seasonData.mvp?8:0)+(seasonData.champion?10:0));
  relation(c,'coach',round((seasonData.minutes-24)/5)+(seasonData.per>=18?3:-1));
  relation(c,'teammates',round((seasonData.wins-36)/10)+(seasonData.champion?6:0));
  relation(c,'gm',round((seasonData.ovrAfter-75)/6)+(seasonData.playoffs?2:-2));
  relation(c,'fans',round((seasonData.ppg-15)/4)+(seasonData.allStar?5:0)+(seasonData.champion?8:0));
  relation(c,'media',round((seasonData.per-14)/4)+(seasonData.mvp?6:0));
  c.history.push({season:seasonData.season,reputation:c.reputation,popularity:c.popularity,relationships:{...c.relationships}});
  if(c.history.length>30)c.history=c.history.slice(-30);
  syncLegacyFields(player);
  return c;
}

export function applyCareerDecision(player,context={}){
  const c=migrateCareerProfile(player);
  const {type,choiceId,special,changedTeam=false}=context;
  if(type==='freeAgency'){
    apply(c,'popularity',changedTeam?-2:3); relation(c,'fans',changedTeam?-8:6); relation(c,'gm',4); relation(c,'teammates',changedTeam?-5:3); relation(c,'media',2);
  }
  if(special==='trade'){
    apply(c,'reputation',-3); apply(c,'popularity',3); relation(c,'fans',-10); relation(c,'gm',-12); relation(c,'media',4); relation(c,'teammates',-7); relation(c,'coach',-8);
  }
  const focus={shooting:{coach:2,fans:2},body:{coach:3,teammates:2},vision:{teammates:4,coach:2},defense:{coach:4,teammates:2}}[choiceId];
  if(focus)Object.entries(focus).forEach(([k,v])=>relation(c,k,v));
  syncLegacyFields(player);
  return c;
}

export function getCareerProfile(player){
  const c=migrateCareerProfile(player);
  const label=n=>n>=85?'Élite':n>=70?'Muy alta':n>=55?'Sólida':n>=40?'Inestable':'Crítica';
  return {...c,reputationLabel:label(c.reputation),popularityLabel:label(c.popularity),relationshipLabels:Object.fromEntries(Object.entries(c.relationships).map(([k,v])=>[k,label(v)]))};
}
