import { TEAMS } from "../data/teams.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const round1=n=>Math.round(n*10)/10;

const ROLES=[
  {id:"franchise",label:"Jugador franquicia",minOvr:89,minutes:36,bonus:1.16},
  {id:"star",label:"Titular estrella",minOvr:83,minutes:33,bonus:1.08},
  {id:"starter",label:"Titular",minOvr:77,minutes:29,bonus:1},
  {id:"rotation",label:"Rotación importante",minOvr:70,minutes:22,bonus:.9}
];

function roleFor(player,team){
  const pressure=(team.strength||75)-78;
  const adjusted=player.ovr-pressure*.08;
  return ROLES.find(r=>adjusted>=r.minOvr)||ROLES.at(-1);
}
function yearsFor(player){return player.age>=34?roll(1,2):player.age>=30?roll(2,3):roll(3,5);}
function marketSalary(player,team,role){
  const accolades=(player.allStars||0)*1.25+(player.mvps||0)*4+(player.championships||0)*1.4;
  const market=((team.market||team.strength||75)-70)*.11;
  const valueBoost=(player.marketValue||0)*.22;
  const ageDiscount=player.age>=34?.78:player.age>=31?.9:1;
  return round1(clamp((((player.ovr-64)*1.18+accolades+market+valueBoost)*role.bonus)*ageDiscount,1.2,62));
}
function teamPitch(team){
  if(team.strength>=86)return "Candidato inmediato al campeonato";
  if(team.development>=84)return "Proyecto de desarrollo de élite";
  if(team.market>=84)return "Gran mercado y máxima exposición";
  return "Proyecto competitivo con margen para crecer";
}
function fitScore(player,team,role){
  const need=team.need===player.position?20:0;
  const winning=team.strength*.35;
  const development=team.development*(player.age<=25?.28:.12);
  const roleValue=role.minutes*.7;
  const satisfaction=(player.satisfaction||70)-70;
  return Math.round(clamp(need+winning+development+roleValue+satisfaction*.08+roll(-6,6),1,100));
}

export function migrateContracts(player){
  player.contractHistory??=[];
  player.careerEarnings??=0;
  player.negotiations??={attempts:0,successful:0,failed:0};
  return player;
}

export function buildFreeAgencyMarket(player,currentTeamId){
  migrateContracts(player);
  const current=TEAMS.find(t=>t.id===currentTeamId);
  const pool=TEAMS.filter(t=>t.id!==currentTeamId)
    .map(team=>{const role=roleFor(player,team);return {team,role,fit:fitScore(player,team,role)};})
    .sort((a,b)=>b.fit-a.fit).slice(0,4);
  if(current){const role=roleFor(player,current);pool.push({team:current,role,fit:fitScore(player,current,role)+8,renewal:true});}
  return pool.sort((a,b)=>b.fit-a.fit).slice(0,4).map((x,index)=>{
    const years=yearsFor(player);
    const salary=marketSalary(player,x.team,x.role)*(x.renewal?1.02:1);
    return {
      id:`offer_${x.team.id}`,
      teamId:x.team.id,
      teamName:x.team.name,
      years,
      salary:round1(salary),
      totalValue:round1(salary*years),
      role:x.role.label,
      promisedMinutes:x.role.minutes,
      fit:clamp(x.fit,1,100),
      pitch:teamPitch(x.team),
      renewal:!!x.renewal,
      negotiable:index<3,
      status:"open"
    };
  });
}

export function counterOffer(player,offer){
  migrateContracts(player); player.negotiations.attempts++;
  const askRaise=offer.salary<18?2.2:offer.salary<35?3.5:5;
  const leverage=player.ovr+(player.reputation||50)*.08+(player.allStars||0)*1.5-offer.salary*.22+roll(-12,12);
  const accepted=leverage>=79;
  if(accepted){
    player.negotiations.successful++;
    return {...offer,salary:round1(offer.salary+askRaise),totalValue:round1((offer.salary+askRaise)*offer.years),status:"improved",negotiable:false,negotiationMessage:`${offer.teamName} acepta tu contraoferta.`};
  }
  player.negotiations.failed++;
  const withdrawn=leverage<65;
  return {...offer,status:withdrawn?"withdrawn":"final",negotiable:false,negotiationMessage:withdrawn?`${offer.teamName} retira la oferta tras no alcanzar un acuerdo.`:`${offer.teamName} mantiene su propuesta como oferta final.`};
}

export function signContract(player,offer,season){
  migrateContracts(player);
  const contract={yearsLeft:offer.years,totalYears:offer.years,salary:offer.salary,type:"Veterano",rolePromised:offer.role,promisedMinutes:offer.promisedMinutes,totalValue:offer.totalValue,signedSeason:season};
  player.contractHistory.push({season,teamId:offer.teamId,teamName:offer.teamName,...contract,renewal:offer.renewal});
  return contract;
}

export function recordSeasonSalary(player){
  migrateContracts(player);
  if(player.contract?.salary)player.careerEarnings=round1(player.careerEarnings+player.contract.salary);
}
