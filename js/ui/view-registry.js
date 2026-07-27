import { createCareerViews } from "./views/career-views.js";
import { createMediaViews } from "./views/media-views.js";
import { createEncyclopediaViews } from "./views/encyclopedia-views.js";

export function createViewRegistry(context){
  const career=createCareerViews(context);
  const childContext={...context,playerHeader:career.playerHeader};
  const media=createMediaViews(childContext);
  const encyclopedia=createEncyclopediaViews(childContext);

  function getContent(){
    const {game,activeView}=context.getState();
    return !game?career.createScreen():activeView==="documentary"?career.documentaryScreen():activeView==="encyclopedia"?encyclopedia.encyclopediaScreen():activeView==="playerbio"?encyclopedia.playerBiographyScreen():activeView==="clubbiography"?encyclopedia.clubBiographyScreen():activeView==="system"?encyclopedia.systemScreen():activeView==="immersion"?career.immersionScreen():activeView==="conversation"?media.conversationScreen():activeView==="balance"?encyclopedia.balanceScreen():activeView==="history"?media.historyScreen():activeView==="feed"?media.feedScreen():activeView==="news"?media.newsScreen():activeView==="legacy"?media.legacyScreen():activeView==="records"?media.recordsScreen():activeView==="league"?media.leagueScreen():activeView==="world"?media.worldScreen():game.phase==="pathway"?career.pathwayScreen():game.phase==="draft"?career.draftScreen():game.phase==="season"?career.seasonScreen():game.phase==="decision"?career.decisionScreen():career.retiredScreen();
  }

  return {getContent};
}
