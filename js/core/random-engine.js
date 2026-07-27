/**
 * NBA Glory deterministic Random Engine.
 * One serializable source of randomness for the entire game universe.
 */
export const RANDOM_ENGINE_VERSION = "1.0.0";
const UINT32_MAX_PLUS_ONE = 0x100000000;

function hashSeed(value) {
  const text = String(value ?? "nba-glory");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 0x6d2b79f5;
}

export function createSeed(label = "nba-glory") {
  const entropy = new Uint32Array(1);
  try {
    globalThis.crypto?.getRandomValues?.(entropy);
  } catch {}
  const clock = `${Date.now()}|${globalThis.performance?.now?.() ?? 0}|${entropy[0] || 0}`;
  return hashSeed(`${label}|${clock}`);
}

export class RandomEngine {
  constructor(seed = createSeed()) {
    this.seed(seed);
  }

  seed(seed) {
    this.initialSeed = hashSeed(seed);
    this.state = this.initialSeed;
    this.calls = 0;
    return this;
  }

  restore(snapshot = {}) {
    const seed = Number(snapshot.initialSeed ?? snapshot.seed);
    const state = Number(snapshot.state);
    this.initialSeed = Number.isFinite(seed) ? (seed >>> 0) || 0x6d2b79f5 : hashSeed("nba-glory");
    this.state = Number.isFinite(state) ? (state >>> 0) || this.initialSeed : this.initialSeed;
    this.calls = Math.max(0, Number(snapshot.calls) || 0);
    return this;
  }

  next() {
    // Mulberry32: compact, deterministic and suitable for game simulation.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.calls++;
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_MAX_PLUS_ONE;
  }

  int(min, max) {
    const low = Math.ceil(Number(min));
    const high = Math.floor(Number(max));
    if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) throw new RangeError("Random.int requires a valid range");
    return Math.floor(this.next() * (high - low + 1)) + low;
  }

  chance(probability) {
    const normalized = probability > 1 ? probability / 100 : probability;
    return this.next() < Math.max(0, Math.min(1, Number(normalized) || 0));
  }

  pick(items) {
    if (!Array.isArray(items) || items.length === 0) return undefined;
    return items[this.int(0, items.length - 1)];
  }

  shuffle(items) {
    const copy = [...(items ?? [])];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  weighted(items, getWeight = item => item?.weight ?? 1) {
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const weights = items.map(item => Math.max(0, Number(getWeight(item)) || 0));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) return this.pick(items);
    let cursor = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      cursor -= weights[i];
      if (cursor <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  id(prefix = "id") {
    const token = Math.floor(this.next() * UINT32_MAX_PLUS_ONE).toString(36).padStart(7, "0");
    return `${prefix}_${token}_${this.calls.toString(36)}`;
  }

  snapshot() {
    return Object.freeze({
      version: RANDOM_ENGINE_VERSION,
      initialSeed: this.initialSeed >>> 0,
      state: this.state >>> 0,
      calls: this.calls
    });
  }
}

export const Random = new RandomEngine(hashSeed("nba-glory-default"));

export function initializeRandom(game, {seed} = {}) {
  game ??= {};
  game.atlas ??= {};
  if (game.atlas.random?.state != null) Random.restore(game.atlas.random);
  else {
    const fallback = seed ?? `${game.player?.name ?? "player"}|${game.season ?? 2026}|${game.player?.id ?? "legacy"}`;
    Random.seed(fallback);
    game.atlas.random = {...Random.snapshot()};
  }
  return Random;
}

export function persistRandomState(game) {
  if (!game || typeof game !== "object") return null;
  game.atlas ??= {};
  game.atlas.random = {...Random.snapshot()};
  return game.atlas.random;
}
