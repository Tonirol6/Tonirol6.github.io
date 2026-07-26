const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round1=n=>Math.round(n*10)/10;
const roll=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;

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

export function simulatePlayerSeason({player,team,coach,injury,games,minutes,chemistry}){
  const a=player.attributes||{},t=tendencies(player);
  const minuteShare=clamp(minutes/36,.25,1.08);
  const usage=clamp(17+(a.handle+a.finishing+a.threePoint-210)/7+t.usage,12,36);
  const threeRate=clamp(28+(a.threePoint-a.finishing)*.42+t.threeRate,8,70);
  const twoSkill=(a.finishing*.58+a.midRange*.42);
  const shootingSkill=(a.threePoint*(threeRate/100)+twoSkill*(1-threeRate/100));
  const efficiency=clamp(42+(shootingSkill-65)*.32+(a.iq-70)*.08-roll(0,3),38,61);
  const possessions=clamp(67+(team.strength-75)*.14+t.pace+roll(-3,3),61,75);
  const scoringVolume=(usage*.63)+(a.finishing+a.threePoint+a.midRange-195)*.055;
  const injuryPenalty=injury?.severe?2.5:injury?1:0;
  const ppg=round1(clamp((scoringVolume+4.2)*minuteShare+(player.hidden?.scoring||0)+(chemistry-60)*.025-injuryPenalty+roll(-12,12)/10,2,39));
  const apg=round1(clamp(((a.passing*.095+a.handle*.035+a.iq*.025)-8+t.assist)*minuteShare+(player.hidden?.assists||0)+roll(-8,8)/10,.4,14));
  const rpg=round1(clamp(((a.rebounding*.11+a.strength*.018)-4+t.reb)*minuteShare+(player.hidden?.rebounds||0)+roll(-8,8)/10,.5,17));
  const spg=round1(clamp(((a.steals*.022+a.perimeterDefense*.006)-1.2+t.def*.03)*minuteShare+roll(-3,3)/10,.2,3.2));
  const bpg=round1(clamp(((a.blocks*.025+a.interiorDefense*.006)-1.1+t.def*.05)*minuteShare+roll(-3,3)/10,.1,4.2));
  const turnovers=round1(clamp((usage*.085+(78-a.handle)*.025+(78-a.iq)*.02)*minuteShare+roll(-2,3)/10,.5,5.2));
  const threePct=round1(clamp(27+(a.threePoint-60)*.28+(a.iq-70)*.04+roll(-15,15)/10,24,47));
  const fgPct=round1(clamp(efficiency+(100-threeRate)*.035-1.5,35,66));
  const ftPct=round1(clamp(58+(a.midRange+a.iq-120)*.24+roll(-12,12)/10,52,94));
  const threeAttempts=clamp(ppg/2.15*(threeRate/100),.4,13.5);
  const threesMade=round1(threeAttempts*(threePct/100));
  const per=round1(clamp(8+ppg*.48+rpg*.28+apg*.34+spg*.8+bpg*.75-turnovers*.45+(fgPct-45)*.18,5,34));
  return {ppg,rpg,apg,spg,bpg,turnovers,fgPct,threePct,ftPct,threesMade,usage:round1(usage),pace:possessions,per};
}

export function simulateTeamSeason({player,team,coach,stats,chemistry,strategy}){
  const a=player.attributes||{},t=tendencies(player);
  const offense=team.strength*.52+stats.ppg*.52+stats.apg*.55+(a.iq-70)*.08;
  const defense=(a.perimeterDefense+a.interiorDefense+a.steals+a.blocks)/4;
  const defensiveImpact=(defense-65)*.17+t.def*.22;
  const coachImpact=(coach.development+coach.trust-coach.pressure*.25)*.15;
  const strategyWins=strategy?.winBonus||0;
  const strategyChemistry=strategy?.chemistryBonus||0;
  const wins=clamp(Math.round(19+(offense-45)*.72+defensiveImpact+coachImpact+(chemistry-55)*.12+strategyWins+strategyChemistry+roll(-6,6)),15,69);
  const playoffs=wins>=41;
  const clutch=(t.clutch-50)*.12+(player.coachTrust-50)*.05;
  const playoffRating=team.strength*.45+player.ovr*.36+chemistry*.1+clutch+stats.per*.35+roll(-8,8);
  let roundsWon=0;
  if(playoffs){
    const thresholds=[76,82,88,94];
    for(const threshold of thresholds){
      if(playoffRating+roll(-12,12)>=threshold) roundsWon++; else break;
    }
  }
  const champion=roundsWon===4;
  const playoffExit=!playoffs?"Fuera de Playoffs":roundsWon===0?"Primera ronda":roundsWon===1?"Semifinales de conferencia":roundsWon===2?"Final de conferencia":roundsWon===3?"Finales NBA":"Campeón NBA";
  const playoffBoost=playoffs?clamp((t.clutch-65)/35,-.12,.28):0;
  const playoffPpg=playoffs?round1(clamp(stats.ppg*(1+playoffBoost)+roll(-12,14)/10,2,43)):null;
  return {wins,playoffs,roundsWon,champion,playoffExit,playoffPpg};
}

export function evaluateAwards({player,stats,teamResult}){
  const allStarScore=stats.ppg*.9+stats.apg*.55+stats.rpg*.3+stats.per*.45+player.ovr*.22;
  const mvpScore=stats.ppg*1.1+stats.apg*.65+stats.rpg*.35+stats.per*.55+teamResult.wins*.38+(teamResult.champion?8:0);
  const allStar=allStarScore+roll(-8,8)>=67;
  const mvp=teamResult.playoffs&&mvpScore+roll(-12,12)>=104;
  return {allStar,mvp};
}
