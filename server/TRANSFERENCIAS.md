# PLIP — servidor local y Transferencias

Para el despliegue Docker de producción (nginx en puerto 125 + API interna), seguir
`deployment/DOCKER.md`. Las instrucciones `npm start` de este documento corresponden
solo al uso local sin Docker; no son un paso adicional del deploy de producción.

## Inicio en la computadora que actúa como servidor

Requiere Node.js compatible con el proyecto (probado con Node 22.20.0). Desde la
carpeta de PLIP, instalar las dependencias si todavía no están instaladas (`npm ci`),
compilar e iniciar:

```powershell
npm run build
npm start
```

Un solo proceso sirve `dist/` y `/api/transferencias` en todas las interfaces IPv4,
puerto 8080. Abrir `http://localhost:8080` en el servidor. Las demás cajas abren
`http://IP-LOCAL-DEL-SERVIDOR:8080` en su navegador. Usar una IP fija o reserva DHCP.
Las cajas no necesitan Node, Vite, carpetas compartidas de Windows ni unidades mapeadas.

`npm run dev` y `npm run preview` siguen disponibles, pero no incluyen el servicio de
Transferencias. Para el uso habitual de este módulo usar `npm start`.

## Carpeta persistente y configuración

Por defecto en Windows: `C:\PLIP-Datos\transferencias\`. Se crea al iniciar si el
usuario de Windows tiene permisos. En otros sistemas: `~/PLIP-Datos/transferencias`.
La carpeta debe ser absoluta y externa al proyecto. No se guarda nada en `dist/`.

Configuración opcional en PowerShell, antes de `npm start`:

```powershell
$env:TRANSFERENCIAS_DIR = 'D:\PLIP-Datos\transferencias'
$env:PORT = '8080'
$env:TRANSFERENCIAS_MAX_MB = '5120'
npm start
```

Son variables del proceso; el servidor no carga el `.env` del frontend. El límite
predeterminado por archivo es 5120 MiB (5 GiB). No hay limpieza automática en esta
primera versión. Los archivos permanecen hasta eliminarlos desde la bandeja.

Cada archivo completo se guarda como `<carpeta>/<UUID>/<nombre original>`; nombres
repetidos no se sobrescriben. Las cargas en curso están en `.temporales/<UUID>` y
se publican al terminar. Una desconexión elimina su carga incompleta. Si el proceso
o Windows se cierran abruptamente, pueden quedar residuos en `.temporales`, que no
aparecen en la bandeja; pueden retirarse manualmente con el servidor detenido.
No colocar manualmente archivos en esta estructura mientras el servicio opera.

## Operaciones

| Método | Ruta | Resultado |
|---|---|---|
| POST | `/api/transferencias` | Multipart, un archivo en `file`; 201 con id, nombre, tipo, tamaño y fecha. La pantalla envía la selección múltiple en una cola. |
| GET | `/api/transferencias` | Lista JSON de archivos completos. |
| GET | `/api/transferencias/:id/download` | Descarga original por streaming. |
| GET / HEAD | `/api/transferencias/:id/view` | Original inline con MIME, sin copias; rangos de bytes para reproducir y buscar en videos. |
| GET | `/api/transferencias/download-all` | ZIP64 por streaming, método STORE sin compresión. |
| DELETE | `/api/transferencias/:id` | Elimina archivo y subcarpeta; 204. |

El ZIP no se guarda en disco. Dentro del ZIP, cada original conserva su nombre
bajo su UUID para evitar colisiones. Los bytes no se editan, recomprimen ni procesan.
El listado obtiene nombre, tamaño y fecha del filesystem; no hay base de datos.
El tipo se deduce de la extensión, sin analizar ni convertir el contenido multimedia.

La columna Vista carga imágenes originales de forma diferida. Al pulsarla abre un
visor que se cierra con X, Escape o clic fuera. Los videos muestran un indicador
y se abren con controles de reproducción. La compatibilidad depende del formato
y códec que admita el navegador; si no puede mostrarlo, se informa y se conserva
la descarga habitual. No se generan miniaturas ni versiones convertidas en disco.
HTML y SVG no se admiten para visualización inline.

El nombre mostrado es exactamente el recibido del selector (`File.name`), que
también se envía explícitamente en la subida. El UUID identifica la carpeta, no
sustituye el nombre. Si el dispositivo entrega un archivo cuyo nombre ya es un
UUID, ese es el nombre original recibido: no hay metadatos guardados que permitan
recuperar un nombre anterior. No se renombran archivos existentes.

Admite JPG/JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC/HEIF, AVIF y videos MP4, MOV, M4V,
AVI, MKV, WebM, MPG/MPEG, 3GP, MTS/M2TS. Los nombres incompatibles con Windows se
rechazan en vez de renombrarse. Cada archivo tiene progreso y resultado independiente.
Mantener la pantalla abierta mientras sube: salir del módulo cancela la carga en
curso y las pendientes; los archivos ya terminados siguen en el servidor.

No se agrega autenticación: los equipos con acceso al puerto pueden listar,
subir, descargar y eliminar. El módulo no llama servicios externos ni se vincula
con pedidos, clientes, FotoLab o Folletos. El acceso y los otros módulos de PLIP
conservan sus dependencias anteriores; este cambio no convierte todo PLIP en offline.

## Configuración manual en Windows

- Permitir a Node/puerto TCP elegido recibir conexiones de la red privada del negocio.
- Dar lectura/escritura de la carpeta a la cuenta que ejecuta el servidor. Si la
  creación de `C:\PLIP-Datos` no está permitida, un administrador puede crearla y
  asignar esos permisos, o elegir otra ubicación externa mediante la variable.
- Mantener el equipo encendido y sin suspensión durante el uso.
- Si se desea inicio automático, configurar el Programador de tareas para lanzar
  `node.exe` con el argumento absoluto `...\patra-as\server\plip-server.mjs`, con
  la cuenta y variables adecuadas. Esto no se configura automáticamente.
- No se abrió el firewall, modificó el router ni creó una tarea de Windows durante
  la implementación. Las pruebas usan carpetas temporales, no la carpeta real del negocio.

## Verificaciones reproducibles

`npm run test:transferencias`: pruebas HTTP reales con almacenamiento temporal externo,
conservación byte a byte, ZIP sin compresión, nombres repetidos, rechazos, cancelación,
eliminación, archivos estáticos, vista inline/HEAD, rangos de video y persistencia tras reiniciar.

`server/transferencias.browser.test.mjs`: prueba opcional con Playwright y Edge;
requiere Vite en 127.0.0.1:5173 y `PLIP_PLAYWRIGHT` apuntando al paquete cuando no
está instalado localmente. Monta dos sesiones del componente React contra un
servidor local real; no usa ni altera el login ni datos comerciales. No equivale
a una prueba entre dos computadoras físicas de la red.
Incluye miniatura, visor de imagen, tres formas de cierre, devolución del foco y
reproducción de un video WebM generado en memoria durante la prueba.

Dependencias de servidor agregadas: `busboy` (multipart por streaming) y `archiver`
(ZIP por streaming). No se agregó Playwright como dependencia de la aplicación.
