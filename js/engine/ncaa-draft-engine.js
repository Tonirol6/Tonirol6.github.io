import { Random } from "../core/random-engine.js";
import { createUniversalSimulationEngine } from './universal-simulation-engine.js';
import { createUniverseRepository } from '../core/universe-repository.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Random.next()*(max-min+1))+min;
const pick=a=>a[roll(0,a.length-1)];
const universalSimulation=createUniversalSimulationEngine();

const UNIVERSITIES=[
 {id:'duke',name:'Duke',prestige:96,development:94,coach:'D. Reynolds',style:'Tiro y lectura'},
 {id:'kentucky',name:'Kentucky',prestige:95,development:92,coach:'M. Wallace',style:'Atletismo y ritmo'},
 {id:'kansas',name:'Kansas',prestige:94,development:91,coach:'R. Collins',style:'Juego completo'},
 {id:'uconn',name:'UConn',prestige:93,development:93,coach:'A. Donovan',style:'Defensa y disciplina'},
 {id:'unc',name:'North Carolina',prestige:95,development:90,coach:'J. Carter',style:'Transición'},
 {id:'ucla',name:'UCLA',prestige:92,development:89,coach:'S. Brooks',style:'Fundamentos'},
 {id:'arizona',name:'Arizona',prestige:88,development:91,coach:'T. Hayes',style:'Ataque abierto'},
 {id:'michigan_state',name:'Michigan State',prestige:89,development:92,coach:'N. Foster',style:'Defensa física'},
 {id:'gonzaga',name:'Gonzaga',prestige:88,development:94,coach:'E. Price',style:'Desarrollo interior'},
 {id:'baylor',name:'Baylor',prestige:87,development:89,coach:'C. Ward',style:'Perímetro agresivo'},
 {id:'villanova',name:'Villanova',prestige:86,development:90,coach:'P. Stone',style:'Triple y spacing'},
 {id:'houston',name:'Houston',prestige:87,development:88,coach:'L. Bennett',style:'Defensa intensa'}
];
const FIRST=['Carlos','Marcus','Nikola','Jalen','Mateo','Darius','Alex','Liam','Noah','Ethan','Malik','Victor','Daniel','Leo','Milan','Isaiah'];
const LAST=['Ortega','Green','Petrovic','Wilson','Carter','Brooks','Reed','Hayes','Stone','Bennett','Santos','Kovacevic','Martin','Johnson','Price','Coleman'];
const COUNTRIES=['Estados Unidos','España','Francia','Serbia','Canadá','Alemania','Australia','Eslovenia','Grecia','Lituania'];
const POS=['PG','SG','SF','PF','C'];
const STYLES=['Creador explosivo','Anotador de tres niveles','Alero two-way','Interior moderno','Protector del aro','Base cerebral','Tirador élite','Finalizador físico'];
const COMP=['Devin Booker','Paul George','Jrue Holiday','Jayson Tatum','Bam Adebayo','Tyrese Haliburton','Jaylen Brown','Domantas Sabonis'];
const STRENGTHS=['Triple','Defensa exterior','IQ','Creación','Atletismo','Finalización','Rebote','Protección del aro'];
const WEAKNESSES=['Físico','Toma de decisiones','Tiro exterior','Defensa','Consistencia','Manejo','Rebote','Disciplina táctica'];
const STORIES=['explosion','injury','late_bloomer','returning','steady'];

function grade(p){return p>=94?'A+':p>=90?'A':p>=86?'A-':p>=82?'B+':p>=78?'B':p>=74?'B-':'C+';}
function createProspect(season,index){
 const college=pick(UNIVERSITIES), hidden=roll(76,99), age=roll(18,21), ovr=clamp(Math.round(hidden-13+roll(-5,4)),65,84);
 return {id:`prospect_${season}_${index}_${roll(100,999)}`,name:`${pick(FIRST)} ${pick(LAST)}`,country:pick(COUNTRIES),age,position:pick(POS),collegeId:college.id,college:college.name,ovr,potential:hidden,scoutedPotential:clamp(hidden+roll(-6,6),70,99),potentialGrade:grade(clamp(hidden+roll(-6,6),70,99)),style:pick(STYLES),comparison:pick(COMP),strengths:[pick(STRENGTHS),pick(STRENGTHS)].filter((x,i,a)=>a.indexOf(x)===i),weaknesses:[pick(WEAKNESSES)],workEthic:roll(55,98),iq:roll(55,98),athleticism:roll(55,98),injuryRisk:roll(5,35),story:pick(STORIES),stock:roll(48,90),stats:null,awards:[],history:[],favorite:false};
}
function createClass(season){
 const prospects=Array.from({length:30},(_,i)=>createProspect(season,i+1));
 return {season,label:`Draft ${season}`,prospects,mock:[],drafted:[],marchMadness:null,awards:null,completed:false};
}
function ensureClass(world,season){
 let cls=world.classes.find(c=>c.season===season);
 if(!cls){cls=createClass(season);world.classes.push(cls);} return cls;
}
export function migrateNcaaDraft(game){
 game.world??={}; game.world.ncaaDraft??={version:1,universities:UNIVERSITIES.map(u=>({...u,championships:0,finalFours:0,nbaPicks:0,history:[]})),classes:[],history:[],favoriteProspects:[]};
 const w=game.world.ncaaDraft; w.version??=1;w.universities??=UNIVERSITIES.map(u=>({...u,championships:0,finalFours:0,nbaPicks:0,history:[]}));w.classes??=[];w.history??=[];w.favoriteProspects??=[];
 ensureClass(w,game.season);
 return game;
}
function simulateProspectSeason(p,college){
 const growth=clamp(Math.round((college.development-80)/7+(p.workEthic-65)/14+roll(-2,3)),0,6);
 p.ovr=clamp(p.ovr+growth,60,p.potential);
 const games=roll(29,34); const sim=universalSimulation.simulatePlayerCompetition({competition:'ncaa',player:p,team:{name:college.name,strength:college.prestige},coach:{name:college.coach,development:college.development,trust:80},minutes:28,chemistry:college.development-10,games});
 const ppg=sim.stats.ppg; p.stats={...sim.stats,games,simulationEngine:sim.simulationEngine,competitionProfile:sim.competitionProfile};
 let delta=(ppg-13)*1.1+growth*2+roll(-5,5), headline='Temporada sólida';
 if(p.story==='explosion'&&roll(1,100)<=45){delta+=14;headline='Explota en March Madness';p.awards.push('Revelación nacional');}
 if(p.story==='injury'&&roll(1,100)<=35){delta-=13;p.stats.games=roll(12,24);headline='Lesión que preocupa a los scouts';p.awards.push('Temporada marcada por lesión');}
 if(p.story==='late_bloomer'&&p.age>=20){delta+=9;headline='Late bloomer sube posiciones';}
 if(p.story==='returning'&&p.age<21&&roll(1,100)<=35){delta-=3;headline='Se plantea continuar otro año';}
 p.stock=clamp(p.stock+delta,15,100);p.history.push({season:college.currentSeason,ovr:p.ovr,stock:p.stock,headline,stats:p.stats});
}
function buildMock(cls){
 cls.mock=[...cls.prospects].sort((a,b)=>(b.stock+b.ovr*.45+b.scoutedPotential*.25)-(a.stock+a.ovr*.45+a.scoutedPotential*.25)).map((p,i)=>({pick:i+1,prospectId:p.id,name:p.name,college:p.college,position:p.position,country:p.country,grade:p.potentialGrade,stock:Math.round(p.stock)}));
}
function simulateTournament(world,cls,season){
 const teams=universalSimulation.rankParticipants(world.universities,{competition:'ncaa',variance:18}).map(x=>({...x.participant,currentSeason:season,score:x.score}));
 const finalFour=teams.slice(0,4),champion=finalFour.sort((a,b)=>b.score+roll(0,20)-(a.score+roll(0,20)))[0];
 champion.championships++;champion.finalFours++;
 const Universe=createUniverseRepository({world:{ncaaDraft:world}});
 finalFour.filter(x=>x.id!==champion.id).forEach(t=>{const real=Universe.getUniversity(t.id);if(real)real.finalFours++;});
 const candidates=cls.prospects.filter(p=>p.collegeId===champion.id).sort((a,b)=>b.stock-a.stock); const mop=candidates[0]||cls.prospects.sort((a,b)=>b.stock-a.stock)[0];
 mop.stock=clamp(mop.stock+8,0,100);mop.awards.push('Final Four MOP');
 cls.marchMadness={champion:champion.name,finalFour:finalFour.map(x=>x.name),mop:mop.name};
 const mvp=[...cls.prospects].sort((a,b)=>(b.stats?.ppg||0)-(a.stats?.ppg||0))[0];
 cls.awards={playerOfYear:mvp.name,defensivePlayer:[...cls.prospects].sort((a,b)=>(b.iq+b.athleticism)-(a.iq+a.athleticism))[0].name,freshman:[...cls.prospects].sort((a,b)=>a.age-b.age||b.stock-a.stock)[0].name};
 world.history.push({season,champion:champion.name,mop:mop.name,playerOfYear:mvp.name});
}
export function processNcaaDraftSeason(game){
 migrateNcaaDraft(game); const world=game.world.ncaaDraft, cls=ensureClass(world,game.season);
 if(cls.completed)return cls;
 const Universe=createUniverseRepository(game);
 cls.prospects.forEach(p=>{const college=Universe.getUniversity(p.collegeId)||world.universities[0];college.currentSeason=game.season;simulateProspectSeason(p,college);});
 simulateTournament(world,cls,game.season);buildMock(cls);cls.completed=true;
 ensureClass(world,game.season+1);
 return cls;
}
export function getDraftWorld(game){migrateNcaaDraft(game);const w=game.world.ncaaDraft;const cls=ensureClass(w,game.season);if(!cls.mock.length)buildMock(cls);return {universities:[...w.universities].sort((a,b)=>b.prestige-a.prestige),currentClass:cls,history:[...w.history].reverse()};}
export function resolveUserDraft(game,{score,projected,position}){
 migrateNcaaDraft(game); const cls=ensureClass(game.world.ncaaDraft,game.season);if(!cls.mock.length)buildMock(cls);
 const classStrength=cls.prospects.slice(0,10).reduce((a,p)=>a+p.stock,0)/10;
 const base=projected??Math.round(61-(score-65)*2.4); const pickNo=clamp(Math.round(base+(classStrength-70)/10+roll(-3,3)),1,60);
 return {pick:pickNo,classStrength:Math.round(classStrength),mock:cls.mock.slice(0,10),position};
}
export function getProspect(game,id){migrateNcaaDraft(game);return createUniverseRepository(game).getProspect(id);}
