const cap=(a,n)=>Array.isArray(a)?a.slice(-n):[];
export function stabilizeGame(game){
 if(!game||typeof game!=='object')return game;
 game.system??={};game.system.beta='1.0a';game.system.stabilityPasses=(game.system.stabilityPasses||0)+1;
 const p=game.player;if(p){p.career=cap(p.career,45);p.injuryHistory=cap(p.injuryHistory,40);p.teamsPlayed=[...new Set(p.teamsPlayed||[])];}
 if(game.history?.events)game.history.events=cap(game.history.events,500);
 if(game.media?.feed)game.media.feed=cap(game.media.feed,300);
 if(game.universe){game.universe.timeline=cap(game.universe.timeline,180);game.universe.seasonHistory=cap(game.universe.seasonHistory,60);game.universe.hallOfFame=cap(game.universe.hallOfFame,120);game.universe.players=Array.isArray(game.universe.players)?game.universe.players.slice(-450):[];}
 if(game.encyclopedia){game.encyclopedia.seasons=cap(game.encyclopedia.seasons,60);game.encyclopedia.records=Array.isArray(game.encyclopedia.records)?game.encyclopedia.records:[];}
 return game;
}
export function diagnoseGame(game){
 const issues=[];if(!game?.player)issues.push('Jugador ausente');if(!Number.isFinite(game?.season))issues.push('Temporada inválida');if(!game?.phase)issues.push('Fase ausente');
 if(game?.phase==='season'&&!game.player?.teamId)issues.push('Temporada NBA sin equipo');
 if(game?.player?.contract&&game.player.contract.yearsLeft<0)issues.push('Contrato con años negativos');
 const bytes=JSON.stringify(game||{}).length;
 return {ok:issues.length===0,issues,bytes,season:game?.season??null,careerSeasons:game?.player?.career?.length||0,universePlayers:game?.universe?.players?.length||0,historicalSeasons:game?.encyclopedia?.seasons?.length||0};
}
