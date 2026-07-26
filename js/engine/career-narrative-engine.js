import { getCareerEvents } from './story-engine.js';
import { calculateLegacy, getCareerTotals } from './legacy-engine.js';
import { getRivalry, getNarratives } from './league-life-engine.js';

const topBy=(items,key)=>[...items].sort((a,b)=>Number(b[key]||0)-Number(a[key]||0))[0]||null;
const esc=s=>String(s??'');

export function migrateCareerNarrative(game){
  game.player.narrative??={version:1,documentary:null,careerArc:null};
  return game.player.narrative;
}

export function getDefiningMoments(game,limit=8){
  const priority={PLAYER_CHAMPION:100,PLAYER_MVP:96,RECORD_BROKEN:95,PLAYER_HALL_OF_FAME:94,RIVALRY_MILESTONE:88,PLAYER_TRADED:78,PLAYER_INJURY:75,PLAYER_DRAFTED:72,NARRATIVE_UNLOCKED:70,PLAYER_ALL_STAR:64,PLAYER_SIGNED:55};
  return getCareerEvents(game).filter(e=>priority[e.type]).sort((a,b)=>(priority[b.type]+b.importance/10)-(priority[a.type]+a.importance/10)||a.season-b.season).slice(0,limit);
}

export function buildCareerArc(game){
  migrateCareerNarrative(game);
  const p=game.player,c=p.career||[],legacy=calculateLegacy(game),totals=getCareerTotals(game),rival=getRivalry(game);
  const best=topBy(c,'per')||topBy(c,'ppg');
  const peak=best?`${best.season}: ${best.ppg} PPG, ${best.per??'—'} PER y ${best.wins} victorias`:'Sin temporada registrada';
  const loyalty=(p.teamsPlayed||[]).length===1?'One-team player':(p.teamsPlayed||[]).length<=3?'Estrella de varias etapas':'Viajero de la liga';
  const status=legacy.score>=90?'Leyenda generacional':legacy.score>=78?'Icono histórico':legacy.score>=65?'Estrella inolvidable':legacy.score>=50?'Carrera notable':'Profesional respetado';
  const arc={status,loyalty,peak,rivalry:rival?`${rival.name} · ${rival.level} · balance ${rival.userWins}-${rival.rivalWins}`:'Sin rivalidad principal',legacyScore:legacy.score,totals};
  p.narrative.careerArc=arc;
  return arc;
}

export function buildDocumentary(game){
  migrateCareerNarrative(game);
  const p=game.player,c=p.career||[],arc=buildCareerArc(game),rival=getRivalry(game),narratives=getNarratives(game),best=topBy(c,'per')||topBy(c,'ppg');
  const first=c[0],last=c.at(-1),titles=c.filter(s=>s.champion),injuries=(p.injuryHistory||[]).filter(i=>i.severe);
  const chapters=[
    {id:'draft',number:1,title:'La noche que empezó todo',season:p.draftPick?first?.season:null,text:p.draftPick?`${esc(p.name)} fue elegido con el pick ${p.draftPick}. Desde ese momento, cada temporada dejó una huella distinta.`:'La carrera comenzó fuera del foco principal, con todo por demostrar.'},
    {id:'rise',number:2,title:'El salto a la élite',season:best?.season,text:best?`La temporada ${best.season} marcó el pico estadístico: ${best.ppg} puntos, ${best.rpg} rebotes, ${best.apg} asistencias y ${best.per??'—'} de PER.`:'La progresión fue constante, sin un único año que definiera toda la trayectoria.'},
    {id:'rivalry',number:3,title:'La rivalidad',season:rival?.lastSeason,text:rival?`${rival.name} fue el gran adversario. Se enfrentaron ${rival.meetings} veces, con balance ${rival.userWins}-${rival.rivalWins}, hasta convertir el duelo en “${rival.level}”.`:'No hubo una rivalidad dominante; el verdadero rival fue la exigencia de mantenerse en la liga.'},
    {id:'adversity',number:4,title:'Las pruebas',season:injuries[0]?.season,text:injuries.length?`${p.name} sufrió ${injuries.length} lesión${injuries.length===1?' grave':'es graves'}. La más recordada fue ${injuries[0].name.toLowerCase()} en ${injuries[0].season}.`:'La carrera evitó grandes lesiones, una rareza que permitió mantener continuidad y ritmo.'},
    {id:'glory',number:5,title:'La gloria',season:titles[0]?.season,text:titles.length?`${p.name} levantó ${titles.length} campeonato${titles.length===1?'':'s'}. ${titles.map(s=>s.season).join(', ')} quedaron grabados como los años de la consagración.`:`El anillo nunca llegó, pero la persecución del campeonato definió buena parte de su historia.`},
    {id:'legacy',number:6,title:'Lo que quedó',season:last?.season,text:`${arc.status}. ${p.allStars} All-Star, ${p.mvps} MVP, ${p.championships} anillos y un Legacy Score de ${arc.legacyScore}. ${arc.loyalty}.`}
  ];
  if(narratives.length) chapters.splice(5,0,{id:'myth',number:6,title:'La historia que contó la liga',season:narratives[0].season,text:narratives.slice(0,2).map(n=>`${n.title}: ${n.description}`).join(' ')});
  chapters.forEach((c,i)=>c.number=i+1);
  const documentary={title:`La historia de ${p.name}`,subtitle:`${arc.status} · ${c.length} temporadas`,chapters,generatedSeason:game.season};
  p.narrative.documentary=documentary;
  return documentary;
}

export function getDocumentary(game){return game.player.narrative?.documentary||buildDocumentary(game);}
