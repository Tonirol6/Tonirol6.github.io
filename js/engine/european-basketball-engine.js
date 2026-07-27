import { Random } from "../core/random-engine.js";
import { createUniversalSimulationEngine } from './universal-simulation-engine.js';
import { createUniverseRepository } from '../core/universe-repository.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Random.next()*(max-min+1))+min;
const universalSimulation=createUniversalSimulationEngine();
const pick=a=>a[roll(0,a.length-1)];

const CLUBS=[
 {id:'real_madrid',name:'Real Madrid',country:'España',league:'ACB',prestige:98,budget:98,academy:96,style:'Dominio y transición'},
 {id:'barcelona',name:'FC Barcelona',country:'España',league:'ACB',prestige:95,budget:95,academy:94,style:'Talento y spacing'},
 {id:'baskonia',name:'Baskonia',country:'España',league:'ACB',prestige:87,budget:78,academy:88,style:'Ritmo y scouting'},
 {id:'valencia',name:'Valencia Basket',country:'España',league:'ACB',prestige:84,budget:80,academy:84,style:'Equilibrio'},
 {id:'joventut',name:'Joventut Badalona',country:'España',league:'ACB',prestige:82,budget:68,academy:97,style:'Cantera y tiro'},
 {id:'panathinaikos',name:'Panathinaikos',country:'Grecia',league:'GBL',prestige:94,budget:94,academy:82,style:'Estrellas y presión'},
 {id:'olympiacos',name:'Olympiacos',country:'Grecia',league:'GBL',prestige:94,budget:92,academy:84,style:'Defensa y dureza'},
 {id:'fenerbahce',name:'Fenerbahçe',country:'Turquía',league:'BSL',prestige:92,budget:94,academy:82,style:'Plantilla profunda'},
 {id:'anadolu',name:'Anadolu Efes',country:'Turquía',league:'BSL',prestige:90,budget:91,academy:80,style:'Ataque exterior'},
 {id:'partizan',name:'Partizan Belgrade',country:'Serbia',league:'ABA',prestige:91,budget:78,academy:98,style:'Cantera y carácter'},
 {id:'crvena',name:'Crvena Zvezda',country:'Serbia',league:'ABA',prestige:86,budget:76,academy:92,style:'Defensa física'},
 {id:'monaco',name:'AS Monaco',country:'Mónaco',league:'LNB',prestige:88,budget:96,academy:68,style:'Poder económico'},
 {id:'paris',name:'Paris Basketball',country:'Francia',league:'LNB',prestige:82,budget:87,academy:86,style:'Ritmo moderno'},
 {id:'olimpia',name:'Olimpia Milano',country:'Italia',league:'LBA',prestige:89,budget:93,academy:78,style:'Veteranos y control'},
 {id:'virtus',name:'Virtus Bologna',country:'Italia',league:'LBA',prestige:87,budget:85,academy:80,style:'Experiencia'},
 {id:'zalgiris',name:'Žalgiris Kaunas',country:'Lituania',league:'LKL',prestige:88,budget:72,academy:97,style:'Fundamentos y cantera'},
 {id:'bayern',name:'Bayern Munich',country:'Alemania',league:'BBL',prestige:85,budget:90,academy:85,style:'Disciplina'},
 {id:'maccabi',name:'Maccabi Tel Aviv',country:'Israel',league:'BSL-IL',prestige:90,budget:88,academy:83,style:'Transición y talento'}
];
const FIRST=['Nikola','Luka','Mateo','Aleksandar','Hugo','Theo','Milan','Jan','Marco','Iker','Dario','Tomas','Nikos','Emir','Jonas','Leo'];
const LAST=['Petrovic','Jovanovic','García','Martínez','Dubois','Kovac','Papadopoulos','Yilmaz','Rossi','Kuzminskas','Schmidt','Horvat','Santos','Bianchi'];
const POS=['PG','SG','SF','PF','C'];
const ARCH=['Director creativo','Anotador exterior','Alero two-way','Interior móvil','Protector del aro','Tirador élite'];

function createWonderkid(season,index,clubs){
 const club=[...clubs].sort((a,b)=>(b.academy+roll(0,20))-(a.academy+roll(0,20)))[0];
 const ceiling=roll(82,99),age=roll(16,19),ovr=clamp(ceiling-roll(13,25),58,80);
 return {id:`eu_${season}_${index}_${roll(100,999)}`,name:`${pick(FIRST)} ${pick(LAST)}`,age,country:club.country,position:pick(POS),clubId:club.id,club:club.name,ovr,potential:ceiling,grade:ceiling>=96?'A+':ceiling>=91?'A':ceiling>=87?'A-':ceiling>=83?'B+':'B',archetype:pick(ARCH),stock:roll(35,76),nbaInterest:roll(5,70),status:'Academia',history:[],awards:[]};
}
function createClass(season,clubs){return {season,players:Array.from({length:roll(3,8)},(_,i)=>createWonderkid(season,i+1,clubs)),completed:false};}
function ensureClass(world,season){let c=world.wonderkidClasses.find(x=>x.season===season);if(!c){c=createClass(season,world.clubs);world.wonderkidClasses.push(c);}return c;}

export function migrateEuropeanBasketball(game){
 game.world??={};
 game.world.europe??={version:1,clubs:CLUBS.map(c=>({...c,titles:0,finalFours:0,domesticTitles:0,cups:0,legends:[],history:[]})),wonderkidClasses:[],seasons:[],hallOfFame:[],marketHistory:[],news:[]};
 const w=game.world.europe;w.version??=1;w.clubs??=CLUBS.map(c=>({...c,titles:0,finalFours:0,domesticTitles:0,cups:0,legends:[],history:[]}));w.wonderkidClasses??=[];w.seasons??=[];w.hallOfFame??=[];w.marketHistory??=[];w.news??=[];
 ensureClass(w,game.season);return game;
}
function developWonderkids(world,cls,season){
 const Universe=createUniverseRepository({world:{europe:world}});
 cls.players.forEach(p=>{
  const club=Universe.getEuropeanClub(p.clubId)||world.clubs[0];
  const growth=clamp(Math.round((club.academy-75)/9+roll(-1,4)),0,7);p.ovr=clamp(p.ovr+growth,50,p.potential);p.age++;
  p.stock=clamp(p.stock+growth*3+roll(-5,8),0,100);p.nbaInterest=clamp(p.nbaInterest+(p.ovr>=78?roll(4,12):roll(-2,5)),0,100);
  if(p.ovr>=82)p.status='Estrella europea';else if(p.ovr>=75)p.status='Primer equipo';
  if(p.nbaInterest>=82&&p.age>=19)p.status='Candidato al Draft';
  p.history.push({season,ovr:p.ovr,stock:p.stock,status:p.status,club:p.club});
 });
}
function clubScore(c){return universalSimulation.scoreParticipant(c,{competition:'euroleague',variance:16});}
function awardPool(world,cls){
 const vets=world.clubs.map(c=>({name:`${pick(FIRST)} ${pick(LAST)}`,club:c.name,score:clubScore(c)+roll(0,20),young:false}));
 const kids=cls.players.map(p=>({name:p.name,club:p.club,score:p.ovr+roll(0,20),young:true,id:p.id}));return [...vets,...kids];
}
export function processEuropeanSeason(game){
 migrateEuropeanBasketball(game);const w=game.world.europe;if(w.seasons.some(s=>s.season===game.season))return w.seasons.find(s=>s.season===game.season);
 const cls=ensureClass(w,game.season);developWonderkids(w,cls,game.season);cls.completed=true;
 const standings=w.clubs.map(c=>({clubId:c.id,name:c.name,country:c.country,wins:clamp(Math.round(14+(clubScore(c)-65)/3),8,29),score:clubScore(c)})).sort((a,b)=>b.score-a.score);
 const finalFour=standings.slice(0,4);const champion=[...finalFour].sort((a,b)=>b.score+roll(0,15)-(a.score+roll(0,15)))[0];const finalist=finalFour.find(x=>x.clubId!==champion.clubId)||finalFour[1];
 const Universe=createUniverseRepository(game);const champClub=Universe.getEuropeanClub(champion.clubId);champClub.titles++;champClub.finalFours++;finalFour.filter(x=>x.clubId!==champion.clubId).forEach(x=>{const club=Universe.getEuropeanClub(x.clubId);if(club)club.finalFours++;});
 const acb=w.clubs.filter(c=>c.league==='ACB').map(c=>({clubId:c.id,name:c.name,score:clubScore(c)})).sort((a,b)=>b.score-a.score);const acbChampion=acb[0],cupWinner=[...acb].sort(()=>Random.next()-.5)[0];Universe.getEuropeanClub(acbChampion.clubId).domesticTitles++;Universe.getEuropeanClub(cupWinner.clubId).cups++;
 const pool=awardPool(w,cls).sort((a,b)=>b.score-a.score),mvp=pool[0],finalFourMvp=pool.find(x=>x.club===champion.name)||pool[1],defender=pool[roll(1,Math.min(8,pool.length-1))],rising=[...pool].filter(x=>x.young).sort((a,b)=>b.score-a.score)[0];
 if(rising?.id){const kid=Universe.getWonderkid(rising.id);if(kid){kid.awards.push('Rising Star EuroLeague');kid.stock=clamp(kid.stock+10,0,100);}}
 const marketMoves=[];for(let i=0;i<roll(2,5);i++){const from=pick(w.clubs),to=pick(w.clubs.filter(c=>c.id!==from.id));marketMoves.push({player:`${pick(FIRST)} ${pick(LAST)}`,from:from.name,to:to.name,type:roll(1,100)<25?'Regreso desde NBA':'Traspaso europeo'});}w.marketHistory.push({season:game.season,moves:marketMoves});
 const result={simulationEngine:'2.1.0',competitionProfile:'euroleague',universalSimulation:'1.0.0',season:game.season,standings:standings.map((x,i)=>({...x,rank:i+1})),finalFour:finalFour.map(x=>x.name),champion:champion.name,finalist:finalist.name,mvp:mvp.name,finalFourMvp:finalFourMvp.name,defensivePlayer:defender.name,risingStar:rising?.name||'—',acbChampion:acbChampion.name,cupWinner:cupWinner.name,marketMoves,wonderkids:cls.players.map(p=>({id:p.id,name:p.name,club:p.club,age:p.age,position:p.position,ovr:p.ovr,grade:p.grade,status:p.status,nbaInterest:p.nbaInterest}))};
 champClub.history.push({season:game.season,title:'EuroLeague'});w.seasons.push(result);w.news.unshift({season:game.season,text:`${champion.name} conquista la Euroliga; ${mvp.name} es el MVP.`},{season:game.season,text:`${acbChampion.name} gana la ACB y ${cupWinner.name} levanta la Copa del Rey.`});
 ensureClass(w,game.season+1);return result;
}
export function getEuropeanDashboard(game){
 migrateEuropeanBasketball(game);const w=game.world.europe,latest=[...w.seasons].sort((a,b)=>b.season-a.season)[0]||null,current=ensureClass(w,game.season);
 const clubRanking=[...w.clubs].sort((a,b)=>(b.titles*18+b.prestige+b.domesticTitles*4)-(a.titles*18+a.prestige+a.domesticTitles*4));
 const wonderkids=[...w.wonderkidClasses.flatMap(c=>c.players)].sort((a,b)=>(b.potential+b.ovr+b.stock*.25)-(a.potential+a.ovr+a.stock*.25)).slice(0,12);
 return {latest,seasons:[...w.seasons].reverse(),clubs:clubRanking,wonderkids,currentClass:current,marketHistory:[...w.marketHistory].reverse(),news:w.news.slice(0,8),hallOfFame:w.hallOfFame};
}
