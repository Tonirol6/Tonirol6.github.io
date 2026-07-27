import { Random } from "../core/random-engine.js";
import { getCompetitionProfile } from "./competition-profiles.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round1=n=>Math.round(n*10)/10;

export const SIMULATION_ENGINE_VERSION="2.2.0";
export const DEFAULT_SIMULATION_RULES=Object.freeze({});

const ARCHETYPE_TENDENCIES={
  "Floor General":{usage:-2,threeRate:-4,assist:5,reb:-1,def:1,pace:1},
  "Scoring Guard":{usage:5,threeRate:4,assist:0,reb:-1,def:-1,pace:2},
  "Two-Way Guard":{usage:0,threeRate:1,assist:1,reb:0,def:5,pace:0},
  "Sharpshooter":{usage:3,threeRate:12,assist:-2,reb:-2,def:-1,pace:1},
  "Shot Creator":{usage:5,threeRate:1,assist:0,reb:-1,def:-1,pace:0},
  "Slasher":{usage:4,threeRate:-9,assist:-1,reb:1,def:0,pace:4},
  "3&D Wing":{usage:-1,threeRate:7,assist:-2,reb:1,def:6,pace:0},
  "Athletic Wing":{usage:2,threeRate:-5,assist:-1,reb:3,def:1,pace:4},
  "Point Forward":{usage:1,threeRate:0,assist:4,reb:3,def:1,pace:1},
  "Stretch Four":{usage:1,threeRate:9,assist:-1,reb:2,def:0,pace:0},
  "Interior Scorer":{usage:4,threeRate:-10,assist:-2,reb:4,def:0,pace:-1},
  "Defensive Forward":{usage:-3,threeRate:-2,assist:-1,reb:5,def:7,pace:-1},
  "Rim Protector":{usage:-4,threeRate:-14,assist:-3,reb:7,def:10,pace:-2},
  "Paint Beast":{usage:2,threeRate:-16,assist:-3,reb:8,def:4,pace:-2},
  "Mobile Big":{usage:-1,threeRate:-5,assist:1,reb:5,def:6,pace:2}
};

function tendencies(player){
  const base=ARCHETYPE_TENDENCIES[player.archetype]||{};
  const dna=player.dna||{};
  return {
    usage:(base.usage||0)+(dna.hiddenTraits?.includes("Clutch")?1:0),
    threeRate:base.threeRate||0,
    assist:base.assist||0,
    reb:base.reb||0,
    def:base.def||0,
    pace:base.pace||0,
    clutch:dna.clutch||70,
    workEthic:dna.workEthic||70
  };
}

function validateSeasonInput(input){
  if(!input?.player)throw new TypeError("Simulation Engine requires a player");
  if(!input?.team)throw new TypeError("Simulation Engine requires a team");
  if(!input?.coach)throw new TypeError("Simulation Engine requires a coach");
}

export class SimulationEngine {
  constructor({random=Random.next.bind(Random),rules={},competition="nba",profile=null}={}){
    if(typeof random!=="function")throw new TypeError("Simulation Engine random source must be a function");
    this.random=random;
    this.profile=getCompetitionProfile(profile||competition);
    this.rules=Object.freeze({
      regularSeasonGames:this.profile.gamesPerSeason,
      playoffRounds:this.profile.playoffRounds,
      playoffWinsThreshold:this.profile.playoffWinsThreshold,
      maxTeamWins:this.profile.maxTeamWins,
      minTeamWins:this.profile.minTeamWins,
      ...DEFAULT_SIMULATION_RULES,
      ...rules
    });
    this.version=SIMULATION_ENGINE_VERSION;
  }

  roll(min,max){return Math.floor(this.random()*(max-min+1))+min;}

  simulatePlayerSeason({player,team,coach,injury,games,minutes,chemistry,difficulty=null,coaching=null}){
    validateSeasonInput({player,team,coach});
    const a=player.attributes||{},t=tendencies(player),roll=this.roll.bind(this);
    const minuteShare=clamp(minutes/36,.25,1.08);
    const usage=clamp(17+(a.handle+a.finishing+a.threePoint-210)/7+t.usage,12,36);
    const threeRate=clamp(28+(a.threePoint-a.finishing)*.42+t.threeRate,8,70);
    const twoSkill=(a.finishing*.58+a.midRange*.42);
    const shootingSkill=(a.threePoint*(threeRate/100)+twoSkill*(1-threeRate/100));
    const efficiency=clamp(42+(shootingSkill-65)*.32+(a.iq-70)*.08-roll(0,3),38,61);
    const possessions=clamp(67+(team.strength-75)*.14+t.pace+this.profile.paceModifier+roll(-3,3),55,82);
    const scoringVolume=(usage*.63)+(a.finishing+a.threePoint+a.midRange-195)*.055;
    const injuryPenalty=injury?.severe?2.5:injury?1:0;
    const difficultyStat=difficulty?.stat||1;
    const ppg=round1(clamp((coaching?.scoring||0)+((scoringVolume+4.2)*minuteShare+(player.hidden?.scoring||0)+(chemistry-60)*.025-injuryPenalty+roll(-12,12)/10)*this.profile.scoringModifier*difficultyStat,2,43));
    const apg=round1(clamp((coaching?.playmaking||0)+((a.passing*.095+a.handle*.035+a.iq*.025)-8+t.assist)*minuteShare+(player.hidden?.assists||0)+roll(-8,8)/10,.4,14));
    const rpg=round1(clamp(((a.rebounding*.11+a.strength*.018)-4+t.reb)*minuteShare+(player.hidden?.rebounds||0)+roll(-8,8)/10,.5,17));
    const spg=round1(clamp((coaching?.defense||0)*.12+((a.steals*.022+a.perimeterDefense*.006)-1.2+t.def*.03)*minuteShare+roll(-3,3)/10,.2,3.2));
    const bpg=round1(clamp((coaching?.defense||0)*.1+((a.blocks*.025+a.interiorDefense*.006)-1.1+t.def*.05)*minuteShare+roll(-3,3)/10,.1,4.2));
    const turnovers=round1(clamp((usage*.085+(78-a.handle)*.025+(78-a.iq)*.02)*minuteShare+roll(-2,3)/10,.5,5.2));
    const threePct=round1(clamp(27+(a.threePoint-60)*.28+(a.iq-70)*.04+roll(-15,15)/10,24,47));
    const fgPct=round1(clamp(efficiency+(100-threeRate)*.035-1.5,35,66));
    const ftPct=round1(clamp(58+(a.midRange+a.iq-120)*.24+roll(-12,12)/10,52,94));
    const threeAttempts=clamp(ppg/2.15*(threeRate/100),.4,13.5);
    const threesMade=round1(threeAttempts*(threePct/100));
    const per=round1(clamp(8+ppg*.48+rpg*.28+apg*.34+spg*.8+bpg*.75-turnovers*.45+(fgPct-45)*.18,5,34));
    return {ppg,rpg,apg,spg,bpg,turnovers,fgPct,threePct,ftPct,threesMade,usage:round1(usage),pace:possessions,per};
  }

  simulateTeamSeason({player,team,coach,stats,chemistry,strategy,career=[],difficulty=null}){
    validateSeasonInput({player,team,coach});
    const a=player.attributes||{},t=tendencies(player),roll=this.roll.bind(this);
    const offense=team.strength*.49+stats.ppg*.47+stats.apg*.48+(a.iq-70)*.07;
    const defense=(a.perimeterDefense+a.interiorDefense+a.steals+a.blocks)/4;
    const defensiveImpact=(defense-65)*.14+t.def*.18;
    const coachImpact=(coach.development+coach.trust-coach.pressure*.25)*.12;
    const strategyWins=strategy?.winBonus||0;
    const strategyChemistry=strategy?.chemistryBonus||0;
    const wins=clamp(Math.round(18+(offense-43)*.67+defensiveImpact+coachImpact+(chemistry-55)*.1+strategyWins+strategyChemistry+(difficulty?.team||0)+roll(-8,8)),this.rules.minTeamWins,this.rules.maxTeamWins);
    const playoffs=wins>=this.rules.playoffWinsThreshold;
    const consecutiveTitles=[...career].reverse().findIndex(s=>!s.champion);
    const titleStreak=consecutiveTitles===-1?career.filter(s=>s.champion).length:consecutiveTitles;
    const dynastyPenalty=Math.min(24,titleStreak*4.5);
    const fatiguePenalty=Math.max(0,(player.health?.fatigue||0)-45)*.11+(player.health?.wear||0)*.05;
    const clutch=(t.clutch-50)*.08+(player.coachTrust-50)*.035;
    const baseRating=team.strength*.39+player.ovr*.31+chemistry*.075+clutch+stats.per*.27-dynastyPenalty-fatiguePenalty;
    let roundsWon=0;
    const series=[];
    if(playoffs){
      const roundDifficulty=Array.from({length:this.rules.playoffRounds},(_,i)=>76+i*(18/Math.max(1,this.rules.playoffRounds-1)));
      for(let i=0;i<this.rules.playoffRounds;i++){
        const homeCourt=wins>=50?2.5:0;
        const opponentVariance=roll(-7,9);
        const probability=clamp(66+(baseRating+homeCourt-roundDifficulty[i]-opponentVariance)*2.0,16,92-titleStreak*5);
        const won=roll(1,100)<=probability;
        series.push({round:i+1,probability:Math.round(probability),won});
        if(won)roundsWon++;else break;
      }
    }
    const champion=roundsWon===this.rules.playoffRounds;
    const playoffExit=!playoffs?"Fuera de Playoffs":champion?this.profile.championLabel:(this.profile.playoffRoundNames[Math.min(roundsWon,this.profile.playoffRoundNames.length-1)]||`Ronda ${roundsWon+1}`);
    const playoffBoost=playoffs?clamp((t.clutch-65)/45,-.1,.22):0;
    const playoffPpg=playoffs?round1(clamp(stats.ppg*(1+playoffBoost)+roll(-15,13)/10,2,43)):null;
    return {wins,playoffs,roundsWon,champion,playoffExit,playoffPpg,series,dynastyPenalty:round1(dynastyPenalty)};
  }

  evaluateAwards({player,stats,teamResult,games=this.rules.regularSeasonGames,isRookie=false}){
    const seasonStats={...stats,games};
    const availability=Math.min(1,games/this.profile.awardAvailabilityGames);
    const impact=seasonStats.ppg*1.02+seasonStats.apg*.72+seasonStats.rpg*.38+seasonStats.spg*1.5+seasonStats.bpg*1.35+seasonStats.per*.74;
    const winning=teamResult.wins*.48+(teamResult.wins>=55?5:0)+(teamResult.wins>=62?4:0);
    const mvpScore=round1((impact+winning+player.ovr*.13)*availability);
    const allStarScore=seasonStats.ppg*.9+seasonStats.apg*.62+seasonStats.rpg*.34+seasonStats.per*.52+player.ovr*.2+teamResult.wins*.12;
    const defenseScore=seasonStats.spg*12+seasonStats.bpg*10+((player.attributes?.perimeterDefense||70)+(player.attributes?.interiorDefense||70))/3+teamResult.wins*.18;
    const gameRatio=this.profile.gamesPerSeason/82;
    const minAllStarGames=Math.max(4,Math.round(35*gameRatio));
    const minMvpGames=Math.max(5,Math.round(58*gameRatio));
    const minFinalsGames=Math.max(4,Math.round(45*gameRatio));
    const mvpWins=Math.max(1,Math.round(44*gameRatio));
    const eliteWins=Math.max(1,Math.round(58*gameRatio));
    const allStarThreshold=player.age<=23?68:player.age>=34?72:70;
    const allStar=this.profile.awardRules.allStar&&games>=minAllStarGames&&allStarScore>=allStarThreshold;
    const rivalScores=[
      round1(clamp(this.roll(84,98)+teamResult.wins*.035,84,102)),
      round1(clamp(this.roll(82,96)+teamResult.wins*.025,82,100))
    ];
    const mvpThreshold=90;
    const mvp=this.profile.awardRules.mvp&&games>=minMvpGames&&teamResult.wins>=mvpWins&&mvpScore>=mvpThreshold&&mvpScore>=Math.max(...rivalScores);
    const finalsMvp=this.profile.awardRules.finalsMvp&&teamResult.champion&&games>=minFinalsGames&&(teamResult.playoffPpg||seasonStats.ppg)>=Math.max(18*this.profile.scoringModifier,seasonStats.ppg*.78);
    const allNba=mvp||mvpScore>=108?'First Team':mvpScore>=97?'Second Team':mvpScore>=88?'Third Team':null;
    const allDefensive=defenseScore>=102?'First Team':defenseScore>=88?'Second Team':null;
    const dpoy=games>=minMvpGames&&defenseScore>=116&&teamResult.wins>=mvpWins;
    const rookie=isRookie&&games>=minFinalsGames&&(seasonStats.ppg>=16*this.profile.scoringModifier||seasonStats.per>=18);
    const mip=!isRookie&&player.age<=27&&seasonStats.per>=20&&seasonStats.ppg>=18;
    const candidates=[
      {name:player.name,score:mvpScore,teamWins:teamResult.wins,ppg:seasonStats.ppg,apg:seasonStats.apg,rpg:seasonStats.rpg},
      {name:'Candidato rival A',score:rivalScores[0]},
      {name:'Candidato rival B',score:rivalScores[1]}
    ].sort((a,b)=>b.score-a.score).map((x,i)=>({...x,rank:i+1}));
    return {allStar,mvp,finalsMvp,allNba,allDefensive,dpoy,rookie,mip,mvpScore,defenseScore:round1(defenseScore),candidates};
  }

  simulateSeason(input){
    validateSeasonInput(input);
    const stats=this.simulatePlayerSeason(input);
    const teamResult=this.simulateTeamSeason({...input,stats});
    const awards=this.evaluateAwards({player:input.player,stats,teamResult,games:input.games,isRookie:input.isRookie});
    return Object.freeze({engineVersion:this.version,competitionProfile:this.profile.id,stats,teamResult,awards});
  }
}

export function createSimulationEngine(options){return new SimulationEngine(options);}

// API heredada: sigue funcionando mientras los consumidores migran al motor único.
const legacyEngine=createSimulationEngine();
export const simulatePlayerSeason=input=>legacyEngine.simulatePlayerSeason(input);
export const simulateTeamSeason=input=>legacyEngine.simulateTeamSeason(input);
export const evaluateAwards=input=>legacyEngine.evaluateAwards(input);
export const simulateSeasonBundle=input=>legacyEngine.simulateSeason(input);
