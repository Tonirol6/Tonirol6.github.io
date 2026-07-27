import { Random } from "./random-engine.js";
/**
 * NBA Glory Atlas Event Bus.
 * Runtime subscribers are intentionally not persisted. The event journal is.
 */
export class EventBus {
  constructor({journal = [], maxJournal = 500} = {}) {
    this.subscribers = new Map();
    this.journal = Array.isArray(journal) ? journal : [];
    this.maxJournal = maxJournal;
  }

  on(type, handler) {
    if (typeof handler !== "function") throw new TypeError("Event handler must be a function");
    const handlers = this.subscribers.get(type) ?? new Set();
    handlers.add(handler);
    this.subscribers.set(type, handlers);
    return () => handlers.delete(handler);
  }

  emit(type, payload = {}, meta = {}) {
    if (!type || typeof type !== "string") throw new TypeError("Event type must be a non-empty string");
    const event = Object.freeze({
      id: meta.id ?? `evt_${Date.now()}_${Random.next().toString(36).slice(2, 9)}`,
      type,
      payload,
      season: meta.season ?? null,
      source: meta.source ?? "unknown",
      createdAt: meta.createdAt ?? new Date().toISOString()
    });
    this.journal.unshift(event);
    this.journal.length = Math.min(this.journal.length, this.maxJournal);
    for (const handler of this.subscribers.get(type) ?? []) handler(event);
    for (const handler of this.subscribers.get("*") ?? []) handler(event);
    return event;
  }

  snapshot() {
    return this.journal.map(event => ({...event, payload: structuredCloneSafe(event.payload)}));
  }
}

function structuredCloneSafe(value) {
  try { return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  catch { return value; }
}
