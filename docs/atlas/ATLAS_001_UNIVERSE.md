# ATLAS 001 — Universe Core

## Estado de la Fase 1

La v2.0 introduce `game.atlas` sin eliminar todavía las estructuras históricas. Atlas actúa como índice y puerta de acceso única, evitando copiar entidades completas.

## Fuente de verdad durante la transición

- Jugador del usuario: `game.player`
- Jugadores del mundo: `game.universe.players`
- Entrenadores: `game.league.coaches`
- Temporadas: `game.seasonResults`
- Historial especializado: motores NCAA, Europa e Internacional

`game.atlas.collections` solo guarda referencias ligeras a esas fuentes. En fases posteriores las entidades se moverán gradualmente al núcleo Atlas.
