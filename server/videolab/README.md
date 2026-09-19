# Backend VideoLab

Servicio independiente, Node nativo y FFmpeg/ffprobe. No usa librerías nuevas de npm.
No monta Transferencias ni contiene claves Supabase. El frontend usa el cliente
Supabase ya existente exclusivamente para Guiones; las APIs de este servicio trabajan
con snapshots de escenas y archivos locales.

## Endpoints (`/api/videolab`)

| Método/ruta | Función |
|---|---|
| GET /health | Disponibilidad y trabajo activo |
| GET/POST /projects | Listar / crear desde snapshot de Guion |
| GET/PUT /projects/:id | Leer / guardar con revisión optimista |
| GET /projects/:id/assets | Originales de un proyecto |
| POST /projects/:id/assets | Streaming de un original: cuerpo binario, X-File-Name URI-encoded |
| POST /projects/:id/import | Copia desde referencia `{source: 'transferencias' o 'music', id}` |
| GET/HEAD /assets/:id | Original inline con rangos HTTP |
| GET/POST /music | Biblioteca / subir audio binario |
| GET/HEAD/DELETE /music/:id | Escuchar / eliminar pista de biblioteca |
| POST /projects/:id/jobs | Encolar snapshot de la última revisión guardada |
| GET /jobs?projectId=:id | Estado/progreso; no devuelve snapshots grandes |
| GET /jobs/:id | Trabajo individual |
| POST /jobs/:id/cancel | Cancelar queued/preparing/rendering; SIGTERM y SIGKILL tras espera |
| GET/HEAD /jobs/:id/output | MP4; `?download=1` para descarga |
| POST /jobs/:id/publish | Copia multipart streaming al API de Transferencias |

## Contrato de proyecto versión 1

Tiempo en cuadros enteros a 30 FPS. Cada escena tiene id, name, type, instruction,
frames, inFrame, assetId, fit(contain/cover), x/y (0–1), muted, volume (0–1),
transition(cut/dissolve), overlap(cuadros). La última escena no tiene solapamiento.
Duración total = suma de frames menos suma de overlaps. Los solapamientos adyacentes
deben caber dentro de cada clip; no se admiten tres pistas visuales simultáneas.
La música usa assetId, inFrame, frames, startFrame, volume, fadeIn y fadeOut.

Estados: queued → preparing → rendering → finalizing → completed, o failed/cancelled.
Se persisten transiciones; el progreso intermedio vive en memoria y se consulta por
polling. El render valida formato, duración, frame count y codecs antes de publicar.
El snapshot del job no cambia cuando el usuario sigue editando el proyecto.

## Límites y operación

Sin shell: spawn con argumentos validados. UUIDs en rutas, nombres originales solo
como metadatos/cabeceras. Demuxers permitidos explícitamente; se rechazan playlists,
protocolos de red y HDR/BT.2020. JSON de solicitudes <=256 KB, archivos <=2 GiB.
Una importación simultánea para limitar probes; el frontend muestra un error recuperable
si otra caja está importando. Los proyectos guardados usan reemplazo atómico y revisión
para detectar modificaciones de otra caja. No ejecutar réplicas sobre el mismo volumen.

Los temporales propios se eliminan al completar/fallar operaciones. Un SIGKILL puede
dejar temporales, que se revisan manualmente con el servicio detenido; no se elimina
música/proyectos/outputs automáticamente. Las referencias por ID de proyecto a sus
assets no dependen de la vida útil de Transferencias ni de la biblioteca musical.

Ver `deployment/VIDEOLAB.md` para montaje, permisos, límites y deployment clásico.

## Validación realizada en esta implementación

- Compilación TypeScript/Vite completa de PLIP.
- Cinco pruebas de VideoLab (con múltiples aserciones): planificación, argumentos de
  render, JPEG EXIF, cola/cancelación/reinicio, API/persistencia/importación/publicación.
- Prueba de navegador con Guion en el formato real informado, carga local, selección
  de video por referencia, música, mute, guardado/cola y administración de Guiones.
- Doce pruebas existentes del backend Transferencias, regresión de navegador del
  selector en FotoLab/Folletos y 38 pruebas originales de FotoLab.
- Sin benchmarks, renders nativos nuevos, acceso a Supabase productivo o deployment.
  FFmpeg se simula en las pruebas de integración de este backend; los resultados del
  POC informados por el usuario no se atribuyen a este código nuevo.

El daemon Docker local no está disponible. La construcción de imagen, los límites
reales del contenedor y la aceptación de la nueva implementación con medios reales
deben verificarse en Pipshop después de revisar el Compose activo. El preview puede
no reproducir codecs que el navegador no soporte, aunque FFmpeg pueda renderizarlos.

## Archivos de la implementación

Nuevos:
- `server/videolab/`: `server.mjs`, `storage.mjs`, `model.mjs`, `ffmpeg.mjs`,
  `exif.mjs`, `videolab.test.mjs`, `browser.check.mjs`, `README.md`.
- `src/modules/videolab/`: `VideoLabView.tsx`, `Preview.tsx`, `types.ts`, `api.ts`,
  `videolab.css`.
- `deployment/videolab.compose.yml`, `deployment/VIDEOLAB.md`.

Modificados:
- `src/layout/Shell.tsx`, `src/modules/sidebar/SidebarOverlay.tsx`,
  `src/modules/tools/RightToolsDrawer.tsx`: registrar VideoLab.
- `src/modules/transferencias/TransferenciasPicker.tsx`: modo opcional por referencias
  con videos; el contrato anterior File[] y sus etiquetas se conservan.
- `Dockerfile`, `docker/nginx.conf`, `package.json`: target/proxy y comandos de pruebas.

Sin dependencias npm nuevas. FFmpeg y certificados se instalan únicamente en la
imagen VideoLab. Sin cambios a los originales de FotoLab/Folletos, al backend de
Transferencias, al Compose base versionado ni a deploy.sh. El directorio experimental
no se restauró.
