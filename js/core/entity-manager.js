/**
 * Atlas Entity Manager
 * Colección indexada y única para entidades del universo.
 * No modifica las entidades registradas: conserva las referencias originales.
 */
export class EntityCollection {
  constructor(name, { idResolver = entity => entity?.id } = {}) {
    if (!name) throw new TypeError("EntityCollection requires a name");
    this.name = name;
    this.idResolver = idResolver;
    this.entities = new Map();
    this.metadata = new Map();
  }

  register(entity, metadata = {}) {
    if (!entity || typeof entity !== "object") return null;
    const id = metadata.id ?? this.idResolver(entity);
    if (id === undefined || id === null || id === "") return null;
    const key = String(id);
    this.entities.set(key, entity);
    this.metadata.set(key, { ...metadata, id: key, collection: this.name });
    return entity;
  }

  registerMany(entities = [], metadata = {}) {
    const registered = [];
    for (const entity of entities ?? []) {
      const item = this.register(entity, typeof metadata === "function" ? metadata(entity) : metadata);
      if (item) registered.push(item);
    }
    return registered;
  }

  get(id) {
    if (id === undefined || id === null) return null;
    return this.entities.get(String(id)) ?? null;
  }

  has(id) {
    if (id === undefined || id === null) return false;
    return this.entities.has(String(id));
  }

  info(id) {
    if (id === undefined || id === null) return null;
    return this.metadata.get(String(id)) ?? null;
  }

  all() { return [...this.entities.values()]; }
  entries() { return [...this.entities.entries()]; }
  values() { return this.entities.values(); }
  get size() { return this.entities.size; }

  clear() {
    this.entities.clear();
    this.metadata.clear();
  }
}

export class EntityManager {
  constructor() {
    this.collections = new Map();
  }

  define(name, options = {}) {
    if (!this.collections.has(name)) this.collections.set(name, new EntityCollection(name, options));
    return this.collections.get(name);
  }

  collection(name) { return this.collections.get(name) ?? null; }

  register(type, entity, metadata = {}) {
    return this.define(type).register(entity, metadata);
  }

  get(type, id) { return this.collection(type)?.get(id) ?? null; }
  has(type, id) { return this.collection(type)?.has(id) ?? false; }
  clear() { for (const collection of this.collections.values()) collection.clear(); }
}
