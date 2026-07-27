const PROFILES = Object.freeze({
  easy:Object.freeze({id:'easy',label:'Fácil',description:'Más margen para desarrollar tu estrella y cumplir objetivos.',baseOvr:2,potential:2,development:1,stat:1.05,team:4,objective:.9,eventChance:.85,pressure:.75}),
  normal:Object.freeze({id:'normal',label:'Normal',description:'La experiencia equilibrada y recomendada.',baseOvr:0,potential:0,development:0,stat:1,team:0,objective:1,eventChance:1,pressure:1}),
  hard:Object.freeze({id:'hard',label:'Difícil',description:'Menos margen, rivales más fuertes y mayor presión.',baseOvr:-2,potential:-2,development:-1,stat:.96,team:-4,objective:1.1,eventChance:1.2,pressure:1.3})
});
export const DEFAULT_DIFFICULTY='normal';
export function getDifficultyProfile(value=DEFAULT_DIFFICULTY){return PROFILES[value]||PROFILES.normal;}
export function migrateDifficulty(game){
  game.settings??={};
  const profile=getDifficultyProfile(game.settings.difficulty);
  game.settings.difficulty=profile.id;
  game.careerMode??={};
  game.careerMode.difficulty??={id:profile.id,label:profile.label,pressure:50,objectiveStreak:0,lastSeason:null};
  game.careerMode.difficulty.id=profile.id;game.careerMode.difficulty.label=profile.label;
  return profile;
}
export function applyDifficultyToPlayer(player,profile){
  player.dna.potential=Math.max(76,Math.min(97,player.dna.potential+profile.potential));
  player.hidden??={};
  player.hidden.truePotential=player.dna.potential;
  player.hidden.potentialBand=profile.id==='easy'?'favorable':profile.id==='hard'?'uncertain':'balanced';
  return player;
}
export function updateFranchisePressure(game,seasonData,objectives=[]){
  const profile=migrateDifficulty(game),state=game.careerMode.difficulty;
  const completed=objectives.filter(o=>o.status==='completed').length;
  const ratio=objectives.length?completed/objectives.length:1;
  const performance=(seasonData.wins>=45?5:-5)+(seasonData.allStar?5:0)+(seasonData.champion?10:0);
  state.pressure=Math.max(0,Math.min(100,Math.round(state.pressure+(ratio<.5?12:ratio===1?-8:-2)*profile.pressure-performance)));
  state.objectiveStreak=ratio===1?state.objectiveStreak+1:0;
  state.lastSeason={season:seasonData.season,completed,total:objectives.length,pressure:state.pressure};
  return state;
}
export function listDifficulties(){return Object.values(PROFILES);}
