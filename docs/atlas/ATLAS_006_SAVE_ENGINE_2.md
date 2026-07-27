# ATLAS 006 — Save Engine 2.0

## Objetivo
Centralizar la persistencia de NBA Glory en un formato Atlas verificable y recuperable.

## Cambios
- Sobre de guardado versionado (`atlas-save`).
- Checksum doble del contenido.
- Tres copias de seguridad rotativas.
- Recuperación automática desde el primer slot válido.
- Migración transparente desde la clave histórica `nbaGlorySave`.
- Validación y reparación mínima antes de guardar o cargar.
- Exportación e importación con el mismo formato verificable.
- Metadatos de tamaño, temporada, fase y motivo del guardado.

## Compatibilidad
`js/engine/persistence-engine.js` conserva la API anterior y actúa como adaptador del nuevo núcleo.

## Próximo paso
Desacoplar la interfaz del almacenamiento y mostrar los tres slots de backup con fecha y temporada.
