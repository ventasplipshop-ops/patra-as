# Transferencias en el Docker existente de PLIP

## Arquitectura

- Directorio de despliegue: `/var/docker/2.0plipshop`.
- Repositorio: `/var/docker/2.0plipshop/app`.
- Se mantiene el servicio `frontend`, el contenedor `pos2-app` y el puerto `125:80`.
- La imagen final del frontend sigue siendo `nginx:stable-alpine`; React se compila
  en la etapa `node:20-alpine` del Dockerfile del repositorio.
- Se agrega `transferencias`, construido con el target del mismo nombre. Ejecuta
  Node automáticamente como UID/GID `1000:1000`, en modo API y sin necesitar `dist/`.
- Solo nginx publica un puerto. `/api/transferencias` y sus subrutas se envían a
  `transferencias:8080` por la red de este proyecto Compose. No se usan redes externas.
- Bind mount: `/var/lib/plip/transferencias` del HOST → `/data/transferencias` del
  contenedor. No se guarda información dentro de `/app` ni en una capa de la imagen.

## Preparación UNA SOLA VEZ, antes del siguiente deploy

Los archivos de este cambio deben estar primero en el repo `app` del servidor.
El Dockerfile queda en `app/Dockerfile` y nginx en `app/docker/nginx.conf`.
La copia versionada de Compose está en `app/deployment/docker-compose.yml`, pero el
archivo activo debe seguir al lado de `deploy.sh`, no dentro del repositorio.

Ejecutar en Linux:

```sh
cd /var/docker/2.0plipshop
sudo install -d -o 1000 -g 1000 -m 0750 /var/lib/plip/transferencias
cp -p docker-compose.yml "docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)"
cp app/deployment/docker-compose.yml docker-compose.yml
docker-compose config --quiet
./deploy.sh
```

`install -d` configura la carpeta indicada, no hace un chown recursivo del host.
Si ya hubiera archivos antiguos con otra propiedad, revisar sus permisos antes de
usarlos. No se asume que Docker pueda escribir: el servicio usa 1000:1000 y necesita
esa propiedad/permisos en el bind mount. No se utiliza `chmod 777` ni se ejecuta la
API como root. En hosts con SELinux enforcing también se debe permitir el acceso
al bind mount según la política del host.

La copia Compose mantiene los datos de despliegue suministrados (un frontend,
puerto 125, nombre pos2-app). El script original no fue editado. Sus comandos
`docker-compose down --remove-orphans` y `docker-compose up -d --build` actuarán sobre
ambos servicios al leer este Compose. Los despliegues posteriores solo requieren
`./deploy.sh`, como antes. Se conserva el directorio/proyecto Compose actual: no
ejecutar esta copia desde otro directorio ni usar un nombre de proyecto diferente.

No se modifican otros contenedores del servidor. El bind mount permanece tras
`docker-compose down`, recreaciones y rebuilds. No borrar `/var/lib/plip/transferencias`.

## nginx y configuración

`docker/nginx.conf` sirve la SPA con fallback a `index.html`. Solo la ruta exacta
`/api/transferencias` y las rutas que comienzan por `/api/transferencias/` se envían
a Node. No se incorporan proxies hacia otras APIs.

Se desactivan el buffering de petición/respuesta y el límite de tamaño de nginx
para esas rutas. Node conserva el máximo por archivo de 5120 MiB. Los tiempos de
inactividad de transferencia son de una hora. El ZIP continúa siendo streaming
sin compresión ni archivo temporal permanente. El DNS de Docker se reconsulta para
seguir funcionando aunque se recree solamente la API y cambie su IP interna.

La imagen API usa `PLIP_API_ONLY=1`, `PORT=8080` y
`TRANSFERENCIAS_DIR=/data/transferencias`. No necesita variables de autenticación,
Supabase ni servicios externos. La etapa frontend sigue usando las variables Vite
disponibles en el contexto de build, como antes; el `.env` no se copia a la imagen API.
El modo local `npm start` sigue sirviendo frontend + API fuera de Docker.

## Comprobaciones en el servidor

```sh
cd /var/docker/2.0plipshop
docker-compose ps
docker-compose exec -T frontend nginx -t
curl -fsS http://127.0.0.1:125/api/transferencias
docker inspect "$(docker-compose ps -q transferencias)" --format '{{json .Mounts}}'
docker-compose logs --tail=50 transferencias frontend
```

Comprobar permiso real de escritura del usuario del contenedor sin tocar archivos
de negocio:

```sh
docker-compose exec -T transferencias node -e 'const fs=require("node:fs"); const p="/data/transferencias/.permiso-"+require("node:crypto").randomUUID(); fs.writeFileSync(p,"ok",{flag:"wx"}); fs.unlinkSync(p); console.log("Permisos OK: UID",process.getuid(),"GID",process.getgid());'
```

Prueba completa después del deploy (crea y luego elimina solo su archivo de prueba;
recrea únicamente el contenedor de Transferencias):

```sh
sh app/deployment/verificar-transferencias.sh
```

El usuario que la ejecuta necesita acceso a Docker y lectura a la carpeta del host.
Si requiere sudo para ambos, ejecutar `sudo sh app/deployment/verificar-transferencias.sh`.
Para probar además la URL que usan las cajas, pasar la URL real, sin inventar dominio:

```sh
PLIP_URL='http://IP-REAL-DEL-SERVIDOR:125' sh app/deployment/verificar-transferencias.sh
```

Si hay otro proxy delante del puerto 125, esta última comprobación permite detectar
si también impone límites de subida. Ese proxy no fue configurado en este cambio.

## Validación local y límites

`node --test server/transferencias.test.mjs` prueba el modo local y el modo API sin
dist, los cinco endpoints, bytes en disco y persistencia después de recrear el proceso.
Esto no sustituye una recreación Docker real ni verifica los permisos del host Linux.
La validación del servidor de producción debe realizarse con los comandos anteriores.
Se usa formato Compose 3.7 y comandos `docker-compose` compatibles con Compose clásico.
