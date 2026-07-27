# ATLAS 002 — Auditoría de dependencias

La aplicación importa más de veinte motores directamente desde `app.js`. `game-engine.js` coordina migraciones, simulación, contratos, historia, medios, NCAA, Europa, FIBA y persistencia.

## Riesgos localizados

1. `game-engine.js` es el orquestador central y conoce todos los subsistemas.
2. Varias migraciones mutan el mismo objeto de partida.
3. La Enciclopedia agrega datos desde distintas estructuras históricas.
4. Existen dos conceptos de universo: la partida principal y `game.universe`.
5. Los efectos derivados se ejecutan mediante llamadas directas, no mediante eventos.

## Decisión Fase 1

Introducir una fachada Atlas compatible, un índice de entidades y un Event Bus persistente antes de mover lógica existente.
