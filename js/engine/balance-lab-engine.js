import {createGame, runDraft, simulateSeason, applyDecision, setGamePersistenceEnabled} from './game-engine.js';

export const BALANCE_LAB_VERSION = '1.1.0';

const round = (n, digits=2) => Number(Number(n || 0).toFixed(digits));
const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  const index=(sorted.length-1)*p;
  const lower=Math.floor(index), upper=Math.ceil(index);
  if(lower===upper)return sorted[lower];
  return sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower);
};
const rate = (rows, predicate) => rows.length ? rows.filter(predicate).length/rows.length : 0;

export const DEFAULT_BALANCE_RANGES = Object.freeze({
  careerSeasons: {min: 13, max: 19, severity:'warning'},
  retirementAge: {min: 34, max: 38.5, severity:'warning'},
  peakOvr: {min: 82, max: 94, severity:'warning'},
  teamsPlayed: {min: 1.5, max: 4.5, severity:'info'},
  allStars: {min: 1, max: 8, severity:'warning'},
  mvps: {min: 0.05, max: 2.5, severity:'warning'},
  championships: {min: 0.15, max: 3.5, severity:'warning'},
  injuries: {min: 1, max: 8, severity:'warning'},
  hallOfFameRate: {min: 0.08, max: 0.55, severity:'warning'},
  superstarRate: {min: 0.08, max: 0.45, severity:'warning'},
  journeymanRate: {min: 0.08, max: 0.5, severity:'info'}
});

function chooseDecision(game, strategy='balanced') {
  const pending=game.pendingDecision;
  const options=pending?.options || [];
  if(!options.length)return null;
  if(pending.type==='contractNegotiation'){
    return options.find(x=>x.id==='accept_contract')?.id || options[0].id;
  }
  if(pending.type==='freeAgencyMarket'){
    const offers=pending.offers || [];
    const ranked=[...offers].filter(x=>x.status!=='withdrawn').sort((a,b)=>{
      if(strategy==='money')return (b.totalValue||0)-(a.totalValue||0) || Number(a.renewal)-Number(b.renewal);
      if(strategy==='loyalty')return Number(b.renewal)-Number(a.renewal) || (b.fit||0)-(a.fit||0);
      if(strategy==='aggressive')return (Number(a.renewal)-Number(b.renewal))*12+(b.fit||0)-(a.fit||0);
      return (b.fit||0)-(a.fit||0) || (b.interest||0)-(a.interest||0);
    });
    const selected=ranked[0];
    return options.find(x=>x.offerId===selected?.id)?.id || options[0].id;
  }
  if(strategy==='loyalty'){
    return options.find(x=>x.id==='rest')?.id || options.find(x=>x.special!=='trade')?.id || options[0].id;
  }
  if(strategy==='aggressive'){
    return options.find(x=>['shooting','vision','trade'].includes(x.id))?.id || options[0].id;
  }
  return options.find(x=>['vision','body','rest'].includes(x.id))?.id || options.find(x=>x.special!=='trade')?.id || options[0].id;
}

function advanceCareer(game, {maxSeasons=25, strategy='balanced'}={}) {
  let guard=0;
  while(game.phase!=='retired' && game.player.career.length<maxSeasons && guard<maxSeasons*12){
    guard++;
    if(game.phase==='season'){
      game=simulateSeason(game);
      continue;
    }
    if(game.phase==='decision'){
      const choice=chooseDecision(game,strategy);
      if(!choice)break;
      game=applyDecision(game,choice);
      continue;
    }
    break;
  }
  return game;
}

function summarizeCareer(game, index, strategy) {
  const p=game.player;
  const career=p.career || [];
  const peakOvr=Math.max(p.ovr || 0,...career.map(x=>x.ovrAfter||0));
  const totalSalary=round(career.reduce((sum,row)=>sum+(Number(row.salary)||Number(row.contractSalary)||0),0),1);
  const legacyScore=Number(game.legacy?.score ?? p.legacyScore ?? 0);
  const hallOfFame=Boolean(p.legacy?.hallOfFame?.selected || p.hallOfFame || legacyScore>=68);
  return {
    index,
    seed:p?.atlasSeed || game.atlas?.random?.initialSeed || null,
    strategy,
    seasons:career.length,
    retirementAge:p.age,
    draftPick:p.draftPick,
    peakOvr,
    finalOvr:p.ovr,
    teamsPlayed:p.teamsPlayed?.length || 0,
    allStars:p.allStars || 0,
    mvps:p.mvps || 0,
    championships:p.championships || 0,
    finalsMvps:p.finalsMvps || 0,
    allNba:p.allNbaSelections || 0,
    dpoys:p.dpoys || 0,
    injuries:p.injuryHistory?.length || 0,
    severeInjuries:(p.injuryHistory||[]).filter(x=>x.severe).length,
    tradeRequests:p.tradeRequests || 0,
    totalSalary,
    legacyScore,
    hallOfFame,
    retired:game.phase==='retired'
  };
}

export function evaluateBalance(metrics, ranges=DEFAULT_BALANCE_RANGES) {
  const diagnostics=[];
  for(const [key,range] of Object.entries(ranges)){
    const value=metrics[key];
    if(!Number.isFinite(value))continue;
    if(value<range.min)diagnostics.push({key,value,status:'low',expected:[range.min,range.max],severity:range.severity});
    else if(value>range.max)diagnostics.push({key,value,status:'high',expected:[range.min,range.max],severity:range.severity});
  }
  return {
    ok:!diagnostics.some(x=>x.severity==='warning'),
    diagnostics
  };
}

export function aggregateBalanceCareers(careers, meta={}) {
  const values=key=>careers.map(x=>Number(x[key])||0);
  const metrics={
    careerSeasons:round(mean(values('seasons'))),
    retirementAge:round(mean(values('retirementAge'))),
    peakOvr:round(mean(values('peakOvr'))),
    finalOvr:round(mean(values('finalOvr'))),
    teamsPlayed:round(mean(values('teamsPlayed'))),
    allStars:round(mean(values('allStars'))),
    mvps:round(mean(values('mvps'))),
    championships:round(mean(values('championships'))),
    injuries:round(mean(values('injuries'))),
    severeInjuries:round(mean(values('severeInjuries'))),
    draftPick:round(mean(values('draftPick'))),
    hallOfFameRate:round(rate(careers,x=>x.hallOfFame),4),
    superstarRate:round(rate(careers,x=>x.peakOvr>=90),4),
    journeymanRate:round(rate(careers,x=>x.teamsPlayed>=5),4),
    mvpRate:round(rate(careers,x=>x.mvps>0),4),
    championRate:round(rate(careers,x=>x.championships>0),4),
    earlyRetirementRate:round(rate(careers,x=>x.retirementAge<33),4)
  };
  const distributions={
    careerSeasons:{p10:round(percentile(values('seasons'),.1)),median:round(percentile(values('seasons'),.5)),p90:round(percentile(values('seasons'),.9))},
    peakOvr:{p10:round(percentile(values('peakOvr'),.1)),median:round(percentile(values('peakOvr'),.5)),p90:round(percentile(values('peakOvr'),.9))},
    allStars:{p10:round(percentile(values('allStars'),.1)),median:round(percentile(values('allStars'),.5)),p90:round(percentile(values('allStars'),.9))},
    injuries:{p10:round(percentile(values('injuries'),.1)),median:round(percentile(values('injuries'),.5)),p90:round(percentile(values('injuries'),.9))}
  };
  return {
    version:BALANCE_LAB_VERSION,
    generatedAt:new Date().toISOString(),
    sampleSize:careers.length,
    meta,
    metrics,
    distributions,
    evaluation:evaluateBalance(metrics),
    careers
  };
}

export function runBalanceLab({careers=100, maxSeasons=25, seedPrefix='balance-lab', strategies=['balanced','aggressive','loyalty','money'], includeCareers=true}={}) {
  const rows=[];
  setGamePersistenceEnabled(false);
  try {
    for(let i=0;i<careers;i++){
      const strategy=strategies[i%strategies.length];
      const seed=`${seedPrefix}-${String(i+1).padStart(5,'0')}`;
      let game=createGame({name:`Prospect ${i+1}`,position:['PG','SG','SF','PF','C'][i%5],archetype:['playmaker','shooter','two-way','slasher'][i%4],nationality:'España',seed});
      game=runDraft(game);
      game=advanceCareer(game,{maxSeasons,strategy});
      const row=summarizeCareer(game,i+1,strategy);
      row.seed=seed;
      rows.push(row);
    }
  } finally {
    setGamePersistenceEnabled(true);
  }
  const report=aggregateBalanceCareers(rows,{maxSeasons,seedPrefix,strategies});
  if(!includeCareers)delete report.careers;
  return report;
}
