import { Random } from "../core/random-engine.js";
import { createSimulationEngine, SIMULATION_ENGINE_VERSION } from './simulation-engine.js';
import { getCompetitionProfile } from './competition-profiles.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round1=n=>Math.round(n*10)/10;

export const UNIVERSAL_SIMULATION_VERSION='1.0.0';

function attr(source,key,fallback=70){
  const value=source?.attributes?.[key]??source?.[key];
  return Number.isFinite(value)?value:fallback;
}

export function createUniversalPlayer(source={}){
  const ovr=source.ovr??source.rating??70;
  return {
    ...source,
    name:source.name||'Jugador',ovr,age:source.age??22,archetype:source.archetype||'Point Forward',
    attributes:{
      handle:attr(source,'handle',ovr),finishing:attr(source,'finishing',ovr),threePoint:attr(source,'threePoint',ovr),midRange:attr(source,'midRange',ovr),
      iq:attr(source,'iq',source.iq??ovr),passing:attr(source,'passing',source.playmaking??ovr),rebounding:attr(source,'rebounding',ovr),strength:attr(source,'strength',source.athleticism??ovr),
      steals:attr(source,'steals',ovr),blocks:attr(source,'blocks',ovr),perimeterDefense:attr(source,'perimeterDefense',ovr),interiorDefense:attr(source,'interiorDefense',ovr)
    },
    coachTrust:source.coachTrust??70,health:source.health||{fatigue:0,wear:0},dna:source.dna||{clutch:70,workEthic:source.workEthic??70,hiddenTraits:[]}
  };
}

export function createUniversalTeam(source={}){
  return {...source,name:source.name||source.club||'Equipo',strength:source.strength??source.rating??source.prestige??75};
}

export function createUniversalCoach(source={}){
  return typeof source==='string'?{name:source,development:82,trust:75,pressure:55}:{name:source.name||source.coach||'Entrenador',development:source.development??82,trust:source.trust??75,pressure:source.pressure??55};
}

export class UniversalSimulationEngine{
  constructor({random=Random.next.bind(Random)}={}){this.random=random;this.version=UNIVERSAL_SIMULATION_VERSION;}
  roll(min,max){return Math.floor(this.random()*(max-min+1))+min;}
  simulatePlayerCompetition({competition,player,team,coach={},minutes=28,chemistry=75,games,injury=null,strategy={},career=[],isRookie=false}){
    const profile=getCompetitionProfile(competition);
    const engine=createSimulationEngine({competition:profile.id,random:this.random});
    const normalizedPlayer=createUniversalPlayer(player),normalizedTeam=createUniversalTeam(team),normalizedCoach=createUniversalCoach(coach);
    const played=clamp(games??profile.gamesPerSeason,1,profile.gamesPerSeason);
    const result=engine.simulateSeason({player:normalizedPlayer,team:normalizedTeam,coach:normalizedCoach,injury,games:played,minutes,chemistry,strategy,career,isRookie});
    return Object.freeze({...result,universalVersion:this.version,simulationEngine:SIMULATION_ENGINE_VERSION,games:played});
  }
  scoreParticipant(participant,{competition,boost=0,variance=10}={}){
    const profile=getCompetitionProfile(competition);
    const strength=participant.strength??participant.rating??participant.prestige??participant.ovr??70;
    const development=participant.development??participant.academy??75;
    const resources=participant.budget??participant.exposure??participant.prestige??75;
    return round1(strength*.62+development*.16+resources*.08+boost+profile.paceModifier*.15+(this.random()-.5)*variance*2);
  }
  rankParticipants(participants,options={}){
    return participants.map(participant=>({participant,score:this.scoreParticipant(participant,options)})).sort((a,b)=>b.score-a.score);
  }
}

export const createUniversalSimulationEngine=options=>new UniversalSimulationEngine(options);
