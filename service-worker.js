const CACHE="nba-glory-beta-v080a";
const ASSETS=["./","./index.html","./css/app.css","./js/app.js","./js/engine/game-engine.js","./js/engine/persistence-engine.js","./js/engine/health-engine.js","./js/engine/encyclopedia-engine.js","./js/engine/basketball-universe-engine.js","./js/engine/player-engine.js","./js/engine/simulation-engine.js","./js/engine/balance-engine.js",
  "./js/engine/beta-balance-engine.js","./js/engine/immersion-engine.js","./js/engine/career-engine.js","./js/engine/career-events-engine.js","./js/engine/media-engine.js","./js/engine/contract-engine.js",
  "./js/engine/career-narrative-engine.js","./js/engine/trade-deadline-engine.js","./js/engine/franchise-ai-engine.js","./js/engine/pathway-engine.js","./js/engine/story-engine.js","./js/engine/news-engine.js","./js/engine/legacy-engine.js","./js/engine/league-life-engine.js","./js/data/teams.js","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
