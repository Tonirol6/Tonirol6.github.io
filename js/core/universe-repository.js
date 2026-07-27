import { TEAMS } from "../data/teams.js";
import { EntityManager } from "./entity-manager.js";

const seasonId = item => item?.id ?? item?.season;
const competitionId = item => item?.repositoryId ?? item?.id ?? item?.season;

/**
 * Fachada única de lectura para las entidades persistentes del universo.
 * Conserva referencias originales: el Repository nunca clona ni duplica estado.
 */
export class UniverseRepository {
  constructor(game, { teams = TEAMS } = {}) {
    this.game = game;
    this.manager = new EntityManager();
    this.players = this.manager.define("players");
    this.teams = this.manager.define("teams");
    this.coaches = this.manager.define("coaches", { idResolver: coach => coach?.id ?? coach?.teamId });
    this.competitions = this.manager.define("competitions", { idResolver: competitionId });
    this.seasons = this.manager.define("seasons", { idResolver: seasonId });
    this.universities = this.manager.define("universities");
    this.draftClasses = this.manager.define("draftClasses", { idResolver: item => item?.id ?? item?.season });
    this.prospects = this.manager.define("prospects");
    this.europeanClubs = this.manager.define("europeanClubs");
    this.wonderkidClasses = this.manager.define("wonderkidClasses", { idResolver: item => item?.id ?? item?.season });
    this.wonderkids = this.manager.define("wonderkids");
    this.nationalTeams = this.manager.define("nationalTeams");
    this.sources = { teams };
    this.rebuild();
  }

  rebuild(game = this.game) {
    this.game = game;
    this.manager.clear();

    this.teams.registerMany(this.sources.teams, team => ({ source: "static-team-data", id: team.id }));

    if (game?.player?.id) this.players.register(game.player, { source: "game.player", kind: "user" });
    this.players.registerMany(game?.universe?.players, player => ({ source: "game.universe.players", kind: "world" }));
    this.players.registerMany(game?.universe?.hallOfFame, player => ({ source: "game.universe.hallOfFame", kind: "hall-of-fame" }));

    for (const [teamId, coach] of Object.entries(game?.league?.coaches ?? {})) {
      this.coaches.register(coach, { source: "game.league.coaches", id: teamId, teamId });
    }

    this.seasons.registerMany(game?.seasonResults, item => ({ source: "game.seasonResults", id: item?.season }));

    const ncaa = game?.world?.ncaaDraft ?? game?.ncaaDraft;
    this.universities.registerMany(ncaa?.universities, item => ({ source: "game.world.ncaaDraft.universities" }));
    for (const draftClass of ncaa?.classes ?? []) {
      this.draftClasses.register(draftClass, { source: "game.world.ncaaDraft.classes", id: draftClass?.season });
      this.prospects.registerMany(draftClass?.prospects, item => ({ source: "game.world.ncaaDraft.classes.prospects", season: draftClass?.season }));
    }

    const europe = game?.world?.europe ?? game?.europeanBasketball;
    this.europeanClubs.registerMany(europe?.clubs, item => ({ source: "game.world.europe.clubs" }));
    for (const wonderkidClass of europe?.wonderkidClasses ?? []) {
      this.wonderkidClasses.register(wonderkidClass, { source: "game.world.europe.wonderkidClasses", id: wonderkidClass?.season });
      this.wonderkids.registerMany(wonderkidClass?.players, item => ({ source: "game.world.europe.wonderkidClasses.players", season: wonderkidClass?.season }));
    }

    this.nationalTeams.registerMany(game?.international?.teams, item => ({ source: "game.international.teams" }));

    for (const item of game?.international?.tournaments ?? []) {
      const rawId = item?.id ?? item?.season;
      if (rawId != null) this.competitions.register(item, { source: "game.international.tournaments", id: `international:${rawId}`, kind: "international" });
    }
    for (const item of europe?.seasons ?? europe?.history ?? []) {
      if (item?.season != null) this.competitions.register(item, { source: "game.world.europe.seasons", id: `europe:${item.season}`, kind: "europe" });
    }
    for (const item of ncaa?.history ?? []) {
      if (item?.season != null) this.competitions.register(item, { source: "game.world.ncaaDraft.history", id: `ncaa:${item.season}`, kind: "ncaa" });
    }
    return this;
  }

  getPlayer(id) { return this.players.get(id); }
  getTeam(id) { return this.teams.get(id); }
  getCoach(id) { return this.coaches.get(id); }
  getCompetition(id) { return this.competitions.get(id); }
  getSeason(id) { return this.seasons.get(id); }
  getUniversity(id) { return this.universities.get(id); }
  getDraftClass(id) { return this.draftClasses.get(id); }
  getProspect(id) { return this.prospects.get(id); }
  getEuropeanClub(id) { return this.europeanClubs.get(id); }
  getWonderkidClass(id) { return this.wonderkidClasses.get(id); }
  getWonderkid(id) { return this.wonderkids.get(id); }
  getNationalTeam(id) { return this.nationalTeams.get(id); }
}

export function createUniverseRepository(game, options) {
  return new UniverseRepository(game, options);
}
