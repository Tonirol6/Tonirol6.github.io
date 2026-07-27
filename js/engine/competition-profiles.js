const deepFreeze=value=>{
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

export const COMPETITION_PROFILE_VERSION="1.0.0";

const RAW_PROFILES={
  nba:{
    id:"nba",name:"NBA",category:"professional",region:"USA/Canada",
    gamesPerSeason:82,playoffRounds:4,playoffWinsThreshold:41,maxTeamWins:68,minTeamWins:14,
    paceModifier:0,scoringModifier:1,awardAvailabilityGames:70,
    playoffRoundNames:["Primera ronda","Semifinales de conferencia","Final de conferencia","Finales NBA"],
    championLabel:"Campeón NBA",
    qualificationRules:{type:"wins-threshold",playIn:true},
    rosterRules:{maxPlayers:15,twoWayContracts:3},
    awardRules:{allStar:true,mvp:true,finalsMvp:true,allLeagueName:"All-NBA"}
  },
  ncaa:{
    id:"ncaa",name:"NCAA",category:"college",region:"USA",
    gamesPerSeason:34,playoffRounds:6,playoffWinsThreshold:18,maxTeamWins:33,minTeamWins:5,
    paceModifier:1,scoringModifier:.82,awardAvailabilityGames:28,
    playoffRoundNames:["Primera ronda","Segunda ronda","Sweet Sixteen","Elite Eight","Final Four","Final NCAA"],
    championLabel:"Campeón NCAA",
    qualificationRules:{type:"selection-committee",automaticBids:true},
    rosterRules:{maxPlayers:15,eligibilityYears:4},
    awardRules:{allStar:false,mvp:true,finalsMvp:false,allLeagueName:"All-American"}
  },
  euroleague:{
    id:"euroleague",name:"EuroLeague",category:"professional",region:"Europe",
    gamesPerSeason:34,playoffRounds:3,playoffWinsThreshold:17,maxTeamWins:30,minTeamWins:5,
    paceModifier:-3,scoringModifier:.88,awardAvailabilityGames:28,
    playoffRoundNames:["Play-In / Cuartos","Final Four","Final EuroLeague"],
    championLabel:"Campeón de EuroLeague",
    qualificationRules:{type:"table-and-play-in",playIn:true},
    rosterRules:{maxPlayers:16,foreignPlayerRules:"league-specific"},
    awardRules:{allStar:false,mvp:true,finalsMvp:true,allLeagueName:"All-EuroLeague"}
  },
  gleague:{
    id:"gleague",name:"NBA G League",category:"development",region:"USA/Canada/Mexico",
    gamesPerSeason:50,playoffRounds:4,playoffWinsThreshold:25,maxTeamWins:42,minTeamWins:8,
    paceModifier:4,scoringModifier:.94,awardAvailabilityGames:40,
    playoffRoundNames:["Primera ronda","Cuartos de final","Semifinales","Final G League"],
    championLabel:"Campeón de la G League",
    qualificationRules:{type:"conference-table",singleElimination:true},
    rosterRules:{maxPlayers:12,nbaAssignments:true,twoWayContracts:true},
    awardRules:{allStar:true,mvp:true,finalsMvp:true,allLeagueName:"All-G League"}
  },
  international:{
    id:"international",name:"Selecciones internacionales",category:"national-teams",region:"Global",
    gamesPerSeason:8,playoffRounds:4,playoffWinsThreshold:4,maxTeamWins:8,minTeamWins:0,
    paceModifier:-2,scoringModifier:.86,awardAvailabilityGames:6,
    playoffRoundNames:["Octavos de final","Cuartos de final","Semifinales","Final internacional"],
    championLabel:"Campeón internacional",
    qualificationRules:{type:"group-and-knockout",groupStage:true},
    rosterRules:{maxPlayers:12,nationalEligibility:true},
    awardRules:{allStar:false,mvp:true,finalsMvp:true,allLeagueName:"Equipo ideal"}
  }
};

const REQUIRED_NUMBERS=["gamesPerSeason","playoffRounds","playoffWinsThreshold","maxTeamWins","minTeamWins","paceModifier","scoringModifier","awardAvailabilityGames"];

export function validateCompetitionProfile(profile){
  const errors=[];
  if(!profile||typeof profile!=="object")return {ok:false,errors:["Profile must be an object"]};
  if(!profile.id||typeof profile.id!=="string")errors.push("Profile id is required");
  if(!profile.name||typeof profile.name!=="string")errors.push("Profile name is required");
  for(const key of REQUIRED_NUMBERS)if(typeof profile[key]!=="number"||!Number.isFinite(profile[key]))errors.push(`${key} must be a finite number`);
  if(profile.gamesPerSeason<1)errors.push("gamesPerSeason must be positive");
  if(profile.playoffRounds<1)errors.push("playoffRounds must be positive");
  if(profile.minTeamWins>profile.maxTeamWins)errors.push("minTeamWins cannot exceed maxTeamWins");
  if(!Array.isArray(profile.playoffRoundNames)||profile.playoffRoundNames.length<profile.playoffRounds)errors.push("playoffRoundNames must cover every playoff round");
  return {ok:errors.length===0,errors};
}

export class CompetitionProfileRegistry{
  constructor(profiles=RAW_PROFILES){
    this.profiles=new Map();
    Object.values(profiles).forEach(profile=>this.register(profile));
  }
  register(profile){
    const result=validateCompetitionProfile(profile);
    if(!result.ok)throw new TypeError(`Invalid competition profile: ${result.errors.join(", ")}`);
    const normalized=deepFreeze({...profile,id:profile.id.toLowerCase()});
    this.profiles.set(normalized.id,normalized);
    return normalized;
  }
  get(id="nba"){
    if(id&&typeof id==="object")return this.register({...id});
    const key=String(id||"nba").toLowerCase();
    const aliases={europe:"euroleague",euro:"euroleague","g-league":"gleague",fiba:"international",world:"international"};
    return this.profiles.get(aliases[key]||key)||null;
  }
  require(id="nba"){
    const profile=this.get(id);
    if(!profile)throw new RangeError(`Unknown competition profile: ${id}`);
    return profile;
  }
  list(){return [...this.profiles.values()];}
  has(id){return !!this.get(id);}
}

export const competitionProfiles=new CompetitionProfileRegistry();
export const getCompetitionProfile=id=>competitionProfiles.require(id);
export const listCompetitionProfiles=()=>competitionProfiles.list();
export const NBA_PROFILE=getCompetitionProfile("nba");
export const NCAA_PROFILE=getCompetitionProfile("ncaa");
export const EUROLEAGUE_PROFILE=getCompetitionProfile("euroleague");
export const GLEAGUE_PROFILE=getCompetitionProfile("gleague");
export const INTERNATIONAL_PROFILE=getCompetitionProfile("international");
