import { createGameController } from "./controllers/game-controller.js";
import { gameActions } from "./controllers/game-actions.js";
import { getConversation } from "./engine/immersion-engine.js";
import { bindTeamLogoFallbacks } from "./ui/team-branding.js";
import { createViewRegistry } from "./ui/view-registry.js";
import { renderBrand, getTeamAccent, renderBottomNav } from "./ui/app-shell.js";
import { createFeedbackCenter } from "./ui/feedback-center.js";

const app=document.querySelector("#app");
const gameController=createGameController();
const feedback=createFeedbackCenter();
let game=gameController.getState();
let activeView="career";
let newsSeason=null;
let createPosition="PG";
let encyclopediaSeason=null;
let encyclopediaPlayerId=null;
let encyclopediaClubId=null;
let encyclopediaSection="home";
let encyclopediaQuery="";
let activeConversation=null;

const viewRegistry=createViewRegistry({
  getState:()=>({game,activeView,newsSeason,createPosition,encyclopediaSeason,encyclopediaPlayerId,encyclopediaClubId,encyclopediaSection,encyclopediaQuery,activeConversation}),
  setActiveView:view=>{activeView=view;}
});

function render(){
  document.documentElement.style.setProperty("--team-accent",getTeamAccent(game));
  app.innerHTML=renderBrand()+`<div class="view-enter">${viewRegistry.getContent()}</div>`+renderBottomNav(game,activeView);
  bindTeamLogoFallbacks(app);
  bind();
}

function dispatchGame(action){
  try{return gameController.dispatch(action);}
  catch(error){console.error(error);feedback.error(error.message||"No se pudo completar la acción.");return null;}
}

function bind(){
  document.querySelector("#positionSelect")?.addEventListener("change",e=>{createPosition=e.target.value;render();});
  document.querySelector("#createForm")?.addEventListener("submit",e=>{e.preventDefault();activeView="career";dispatchGame(gameActions.create(Object.fromEntries(new FormData(e.currentTarget))));});
  document.querySelector("#draftBtn")?.addEventListener("click",()=>dispatchGame(gameActions.runDraft()));
  document.querySelectorAll("[data-pathway]").forEach(btn=>btn.addEventListener("click",()=>dispatchGame(gameActions.advancePathway(btn.dataset.pathway))));
  document.querySelector("#simBtn")?.addEventListener("click",()=>dispatchGame(gameActions.simulateSeason()));
  document.querySelectorAll("[data-choice]").forEach(btn=>btn.addEventListener("click",()=>dispatchGame(gameActions.applyDecision(btn.dataset.choice))));
  document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>{activeView=btn.dataset.view;if(activeView==="news")newsSeason=game.player.career.at(-1)?.season??game.season;render();}));
  document.querySelectorAll("[data-talk]").forEach(btn=>btn.addEventListener("click",()=>{activeConversation=getConversation(game,btn.dataset.talk);activeView="conversation";render();}));
  document.querySelectorAll("[data-talk-choice]").forEach(btn=>btn.addEventListener("click",()=>{activeView="immersion";dispatchGame(gameActions.applyImmersionChoice(activeConversation,btn.dataset.talkChoice));activeConversation=null;}));
  document.querySelectorAll("[data-message]").forEach(btn=>btn.addEventListener("click",()=>dispatchGame(gameActions.markInboxRead(btn.dataset.message))));
  document.querySelectorAll("[data-sponsor-accept]").forEach(btn=>btn.addEventListener("click",()=>dispatchGame(gameActions.acceptSponsorship(btn.dataset.sponsorAccept))));
  document.querySelectorAll("[data-sponsor-decline]").forEach(btn=>btn.addEventListener("click",()=>dispatchGame(gameActions.declineSponsorship(btn.dataset.sponsorDecline))));
  document.querySelector("#newsSeason")?.addEventListener("change",e=>{newsSeason=Number(e.target.value);render();});
  document.querySelector("#encyclopediaSeason")?.addEventListener("change",e=>{encyclopediaSeason=Number(e.target.value);render();});
  document.querySelector("#encyclopediaSearch")?.addEventListener("submit",e=>{e.preventDefault();encyclopediaQuery=document.querySelector("#encyclopediaQuery")?.value.trim()||"";render();});
  document.querySelector("[data-clear-encyclopedia-search]")?.addEventListener("click",()=>{encyclopediaQuery="";render();});
  document.querySelectorAll("[data-encyclopedia-section]").forEach(btn=>btn.addEventListener("click",()=>{encyclopediaSection=btn.dataset.encyclopediaSection;encyclopediaQuery="";render();}));
  document.querySelectorAll("[data-europe-club]").forEach(btn=>btn.addEventListener("click",()=>{encyclopediaClubId=btn.dataset.europeClub;activeView="clubbiography";render();}));
  document.querySelectorAll("[data-encyclopedia-result]").forEach(btn=>btn.addEventListener("click",()=>{const type=btn.dataset.encyclopediaResult,id=btn.dataset.resultId;if(type==="player"){encyclopediaPlayerId=id;activeView="playerbio";}else if(type==="club"){encyclopediaClubId=id;activeView="clubbiography";}else if(type==="season"){encyclopediaSeason=Number(id);encyclopediaSection="seasons";encyclopediaQuery="";}else if(type==="draft"){encyclopediaSection="drafts";encyclopediaQuery="";}render();}));
  document.querySelectorAll("[data-universe-player]").forEach(btn=>btn.addEventListener("click",()=>{encyclopediaPlayerId=btn.dataset.universePlayer;activeView="playerbio";render();}));

  document.querySelector("#exportSaveBtn")?.addEventListener("click",()=>{const blob=new Blob([gameController.exportCurrentSave()],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`NBA_Glory_${game.player.name.replace(/[^a-z0-9]/gi,"_")}_${game.season}.json`;a.click();URL.revokeObjectURL(url);feedback.success("La partida se ha exportado correctamente.");});
  document.querySelector("#restoreBackupBtn")?.addEventListener("click",async()=>{if(!await feedback.confirm({title:"Restaurar copia anterior",message:"La partida actual será sustituida por la última copia de seguridad disponible.",confirmText:"Restaurar",danger:true}))return;const result=dispatchGame(gameActions.restoreBackup());if(result)feedback.success("Copia de seguridad restaurada.");});
  document.querySelector("#importSaveInput")?.addEventListener("change",async e=>{const input=e.currentTarget,file=input.files?.[0];if(!file)return;try{if(!await feedback.confirm({title:"Importar partida",message:`Se cargará ${file.name} y se sustituirá la partida actual.`,confirmText:"Importar",danger:true})){input.value="";return;}const result=dispatchGame(gameActions.importSave(await file.text()));if(result)feedback.success("Partida importada correctamente.");}catch(err){console.error(err);feedback.error(err.message||"No se pudo importar la partida.");}finally{input.value="";}});
  document.querySelector("#resetBtn")?.addEventListener("click",async()=>{if(!await feedback.confirm({title:"Reiniciar carrera",message:"Se eliminará la carrera actual y volverás a la creación de jugador. Esta acción no se puede deshacer.",confirmText:"Reiniciar",danger:true}))return;activeView="career";dispatchGame(gameActions.reset());feedback.success("Carrera reiniciada.");});
}

gameController.subscribe(({game:nextGame})=>{game=nextGame;render();});
render();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
