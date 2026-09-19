# VideoLab V1 — integración al deployment existente

El repositorio contiene `deployment/docker-compose.yml`, pero el archivo activo está
en `/var/docker/2.0plipshop/docker-compose.yml`. No se reemplazó ni modificó esa copia
real. `deploy.sh` tampoco se modificó. No copiar el Compose base del repo sobre el
servidor: puede tener diferencias locales que deben conservarse.

Se agregó un target independiente `videolab` al Dockerfile (Node + FFmpeg Debian),
proxy nginx `/api/videolab` y un overlay `deployment/videolab.compose.yml`.
Transferencias conserva su servicio, rutas y almacenamiento. VideoLab accede a su
API por la red interna; nunca monta su carpeta física. No hay puertos nuevos públicos.

## Incorporación inicial, manual y revisable

Con el repositorio actualizado y desde el directorio real del deploy:

```sh
cd /var/docker/2.0plipshop
sudo install -d -o 1000 -g 1000 -m 0750 /var/lib/plip/videolab /var/lib/plip/musica
cp -p docker-compose.yml "docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)"
docker-compose -f docker-compose.yml -f app/deployment/videolab.compose.yml config > /tmp/plip-compose-videolab-review.yml
diff -u docker-compose.yml /tmp/plip-compose-videolab-review.yml
```

El resultado resuelto puede contener valores de variables del Compose: no publicarlo.
Revisar que frontend/transferencias, sus puertos, volúmenes y otros servicios conserven
la configuración efectiva existente. Si hay un servicio `videolab` previo, detener
esta incorporación y revisar el conflicto. El overlay es para Compose clásico con
soporte de `cpus`, `mem_limit`, `memswap_limit` y `pids_limit`: si `config` los rechaza,
no desplegar eliminando límites.

Después de revisar, incorporar **solo el bloque `videolab` del overlay** bajo
`services:` en el Compose activo, manteniendo todo lo demás. No es necesario agregar
`depends_on` al frontend: nginx resuelve VideoLab dinámicamente y no deja de arrancar
si este servicio está temporalmente ausente.

```sh
docker-compose config --quiet
docker-compose run --rm --no-deps --entrypoint sh videolab -c 'test -w /data/videolab && test -w /data/musica'
./deploy.sh
docker-compose exec -T frontend nginx -t
curl -fsS http://127.0.0.1:125/api/videolab/health
curl -fsS http://127.0.0.1:125/api/transferencias > /dev/null
docker inspect "$(docker-compose ps -q videolab)" --format '{{json .HostConfig}}'
docker-compose logs --tail=50 videolab
```

La comprobación `run` necesita la imagen: construir antes con
`docker-compose build videolab` si aún no existe. No crea un servicio permanente.
Después de esta incorporación única, `./deploy.sh` levanta también VideoLab sin pasos
manuales adicionales. Ningún comando debe ejecutarse con otro nombre/proyecto Compose.
No se realizó este deployment desde Windows y no se verificó la configuración real
del host con estas modificaciones.

## Datos y límites

- `/var/lib/plip/videolab/projects`: proyectos JSON versionados y revisión optimista.
- `assets`: originales importados y metadatos, pertenecientes a un proyecto.
- `jobs`: snapshot inmutable del proyecto y estado durable de cada render.
- `outputs`: MP4 persistentes. Publicarlos no los elimina, incluso si falla Transferencias.
- `tmp`: archivos parciales; cada operación limpia sus temporales al terminar.
- `cache`: reservado, sin generación automática de proxies en V1.
- `/var/lib/plip/musica/assets`: biblioteca permanente. Seleccionar una pista copia
  el original al proyecto, de modo que eliminarla de la biblioteca no rompe proyectos.

Solo una instancia de VideoLab puede escribir estas carpetas. Una cola, máximo diez
trabajos pendientes/activos; un solo render simultáneo, un hilo, ultrafast/CRF21,
0.5 CPU en CPU lógica 1, 512 MiB RAM+swap total (sin swap). Estos límites incluyen
Node, probes y FFmpeg. No hay aumento automático ni render 4K/HDR. Proyectos <=60 s,
<=20 escenas, originales <=2 GiB, reserva mínima de disco 2 GiB.

Si el contenedor se reinicia, trabajos activos pasan a fallidos; los queued se retoman.
Los completados conservan sus MP4. Los archivos interrumpidos por SIGKILL pueden quedar
en tmp: revisar con el servicio detenido antes de una limpieza manual. V1 no aplica
limpieza automática a proyectos, outputs ni música. Supervisar espacio disponible.

## Guiones y editor

El frontend consulta `public.videolab_guiones` con el cliente Supabase existente.
Escenas: array de `{orden,nombre,tipo,duracion,instruccion}`; duración en segundos.
No se crean tablas ni políticas. Lectura/administración dependen de los permisos/RLS
existentes; un fallo aparece en el módulo. No incluir service-role keys en frontend.
La pantalla permite editar metadatos y el JSON de escenas, activar/desactivar y crear
Guiones. Los proyectos guardan una copia de las escenas y el ID del Guion original.

Preview React con HTMLMediaElement y composición de dos escenas durante dissolve.
Su precisión temporal depende del navegador; el MP4 FFmpeg es el resultado definitivo.
Originales HEVC/MOV que el navegador no decodifique muestran un aviso; no se generan
proxies automáticamente. Color/HDR y mezcla perceptual no se certifican en el preview.
VideoLab interpreta las orientaciones JPEG EXIF 1–8 (incluidos espejos) y aplica la
transformación en FFmpeg sin cambiar el original; los videos usan autorrotación de
FFmpeg. La lectura EXIF y la construcción de filtros tienen pruebas unitarias;
la aceptación visual con originales reales corresponde al deployment.
Los cambios sin guardar conservan un borrador en sessionStorage de esa caja y pueden
recuperarse al reabrir el proyecto si no cambió la revisión del servidor. Guardar
confirma la copia persistente compartida; un borrador local no reemplaza ese guardado.

## Desarrollo y comprobaciones

`npm run test:videolab`, `npm run test:transferencias`, `npm run build`.
`npm run test:videolab:browser` requiere Vite local en 127.0.0.1:5173 y Playwright/Edge
(variable `PLIP_PLAYWRIGHT` si se usa un runtime externo). Usa APIs simuladas, nunca
escribe Guiones reales ni ejecuta renders.
Las pruebas del backend usan FFmpeg simulado para verificar contratos, planificación,
cola y recuperación, sin repetir benchmarks ni recrear el POC.
`npm run start:videolab` requiere FFmpeg/ffprobe y rutas absolutas `VIDEOLAB_DIR` y
`MUSICA_DIR`. Producción usa siempre Docker. No cambia el `npm start` de Transferencias.
