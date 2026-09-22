import { createServer } from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, lstat, realpath, rename, rm, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Busboy from 'busboy';
import { ZipArchive } from 'archiver';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const mediaTypes = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
  '.heic': 'image/heic', '.heif': 'image/heif', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v', '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska', '.webm': 'video/webm', '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg',
  '.3gp': 'video/3gpp', '.mts': 'video/mp2t', '.m2ts': 'video/mp2t',
  '.pdf': 'application/pdf',
};
const staticTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', ...mediaTypes };
const httpError = (status, message) => Object.assign(new Error(message), { status });
const inside = (root, target) => target.startsWith(root + path.sep);
const attachment = (name, disposition = 'attachment') => `${disposition}; filename="download"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}`;

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

function validName(name) {
  return name && Buffer.byteLength(name, 'utf8') <= 240 && !/[<>:"/\\|?*\x00-\x1f\x7f]/.test(name)
    && !/[. ]$/.test(name) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name);
}

export async function createPlipServer({
  storageDir = process.env.TRANSFERENCIAS_DIR || (process.platform === 'win32'
    ? 'C:\\PLIP-Datos\\transferencias' : path.join(homedir(), 'PLIP-Datos', 'transferencias')),
  distDir = path.join(projectRoot, 'dist'),
  apiOnly = process.env.PLIP_API_ONLY === '1',
  maxFileBytes = Number(process.env.TRANSFERENCIAS_MAX_MB || 5120) * 1024 * 1024,
} = {}) {
  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes <= 0) throw new Error('TRANSFERENCIAS_MAX_MB debe ser un número positivo.');
  if (!path.isAbsolute(storageDir)) throw new Error('TRANSFERENCIAS_DIR debe ser una ruta absoluta externa al proyecto.');
  const resolved = path.resolve(storageDir);
  const actualProject = await realpath(projectRoot);
  if (resolved === projectRoot || inside(projectRoot, resolved)) throw new Error('La carpeta de archivos debe estar fuera del proyecto.');
  await mkdir(resolved, { recursive: true });
  const storage = await realpath(resolved);
  if (storage === actualProject || inside(actualProject, storage)) throw new Error('La carpeta de archivos debe estar fuera del proyecto.');
  await access(storage, constants.R_OK | constants.W_OK);
  const temporary = path.join(storage, '.temporales');
  await mkdir(temporary, { recursive: true });
  if ((await lstat(temporary)).isSymbolicLink()) throw new Error('La carpeta temporal no puede ser un enlace.');
  const dist = apiOnly ? null : await realpath(distDir);
  if (dist) await access(path.join(dist, 'index.html'));

  async function fileInfo(id) {
    if (!uuidPattern.test(id)) throw httpError(404, 'Archivo no encontrado.');
    const directory = path.join(storage, id);
    try {
      const directoryStat = await lstat(directory);
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw httpError(404, 'Archivo no encontrado.');
      const entries = await readdir(directory, { withFileTypes: true });
      const entry = entries.find(item => item.isFile() && !item.isSymbolicLink());
      if (!entry) throw httpError(404, 'Archivo no encontrado.');
      const filename = path.join(directory, entry.name);
      const stat = await lstat(filename);
      return { id, name: entry.name, size: stat.size, type: mediaTypes[path.extname(entry.name).toLowerCase()] || 'application/octet-stream',
        uploadedAt: directoryStat.mtime.toISOString(), filename };
    } catch (error) {
      if (error.code === 'ENOENT') throw httpError(404, 'Archivo no encontrado.');
      throw error;
    }
  }
  const publicInfo = ({ filename, ...info }) => info;
  async function listFiles() {
    const files = [];
    for (const entry of await readdir(storage, { withFileTypes: true })) {
      if (!uuidPattern.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink()) continue;
      try { files.push(await fileInfo(entry.name)); }
      catch (error) { if (error.status !== 404) throw error; }
    }
    return files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async function upload(request) {
    let parser;
    try { parser = Busboy({ headers: request.headers, defParamCharset: 'utf8', preservePath: true,
      limits: { fileSize: maxFileBytes + 1, files: 1, fields: 0, parts: 2 } }); }
    catch { throw httpError(400, 'Se requiere multipart/form-data con un archivo en el campo file.'); }
    const id = randomUUID();
    const staging = path.join(temporary, id);
    await mkdir(staging);
    const writes = [];
    let count = 0;
    let completed = false;
    try {
      await new Promise((resolve, reject) => {
        let settled = false;
        const fail = error => {
          if (settled) return;
          settled = true;
          request.unpipe(parser);
          parser.destroy();
          request.resume();
          reject(error);
        };
        const aborted = () => fail(httpError(400, 'Subida interrumpida.'));
        request.once('aborted', aborted);
        request.once('error', fail);
        parser.once('close', () => {
          request.off('aborted', aborted);
          request.off('error', fail);
          if (!settled) { settled = true; resolve(); }
        });
        parser.once('error', () => fail(httpError(400, 'Subida incompleta o inválida.')));
        for (const event of ['filesLimit', 'fieldsLimit', 'partsLimit']) {
          parser.once(event, () => fail(httpError(400, 'Enviá un solo archivo por solicitud, en el campo file.')));
        }
        parser.on('file', (field, stream, info) => {
          count++;
          if (field !== 'file' || !validName(info.filename) || !mediaTypes[path.extname(info.filename).toLowerCase()]) {
            stream.on('error', () => {});
            stream.resume();
            // Defer destruction until Busboy has finished dispatching this part.
            queueMicrotask(() => fail(httpError(400, 'Archivo no admitido o nombre de archivo inválido.')));
            return;
          }
          stream.once('limit', () => queueMicrotask(() => fail(httpError(413, 'El archivo supera el tamaño permitido.'))));
          const writing = pipeline(stream, createWriteStream(path.join(staging, info.filename), { flags: 'wx' }));
          writes.push(writing);
          writing.catch(fail);
        });
        request.pipe(parser);
      });
      await Promise.all(writes);
      if (count !== 1 || writes.length !== 1) throw httpError(400, 'Falta el archivo.');
      // Publish only after the complete multipart request and disk write succeed.
      await rename(staging, path.join(storage, id));
      completed = true;
      return publicInfo(await fileInfo(id));
    } finally {
      await Promise.allSettled(writes);
      if (!completed && inside(temporary, staging)) await rm(staging, { recursive: true, force: true });
    }
  }

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(request.url, 'http://plip.local');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\\') || pathname.split('/').some(segment => segment.startsWith('.'))) throw httpError(404, 'No encontrado.');
      const method = request.method;
      if (pathname === '/api/transferencias' && method === 'GET') {
        return json(response, 200, (await listFiles()).map(publicInfo));
      }
      if (pathname === '/api/transferencias' && method === 'POST') {
        return json(response, 201, await upload(request));
      }
      if (pathname === '/api/transferencias/download-all' && method === 'GET') {
        const files = await listFiles();
        if (!files.length) throw httpError(404, 'No hay archivos para descargar.');
        const archive = new ZipArchive({ store: true, forceZip64: true });
        // A disappeared/unreadable file fails the download rather than silently omitting it.
        archive.on('warning', error => archive.destroy(error));
        response.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': attachment('transferencias.zip'), 'Cache-Control': 'no-store' });
        const sent = pipeline(archive, response);
        for (const file of files) archive.file(file.filename, { name: `${file.id}/${file.name}`, store: true });
        try { await Promise.all([sent, archive.finalize()]); }
        finally { archive.abort(); }
        return;
      }
      const preview = pathname.match(/^\/api\/transferencias\/([^/]+)\/view$/);
      if (preview && (method === 'GET' || method === 'HEAD')) {
        const info = await fileInfo(preview[1]);
        // PDF is stored and downloadable, but never rendered inline by this route.
        if (info.type === 'application/pdf' || !Object.values(mediaTypes).includes(info.type)) throw httpError(415, 'Este archivo no admite visualización.');
        const headers = { 'Content-Type': info.type, 'Content-Disposition': attachment(info.name, 'inline'),
          'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes',
          'Content-Security-Policy': "default-src 'none'; sandbox" };
        let start = 0;
        let end = info.size - 1;
        let status = 200;
        // Single-byte ranges allow seeking videos without reading them into memory.
        if (request.headers.range && method === 'GET') {
          const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
          let valid = Boolean(range && (range[1] || range[2]) && info.size > 0);
          if (valid) {
            if (!range[1]) {
              const suffix = Number(range[2]);
              valid = Number.isSafeInteger(suffix) && suffix > 0;
              start = Math.max(0, info.size - suffix);
            } else {
              start = Number(range[1]);
              const requestedEnd = range[2] ? Number(range[2]) : end;
              valid = Number.isSafeInteger(start) && Number.isSafeInteger(requestedEnd);
              end = Math.min(requestedEnd, end);
            }
            valid = valid && start >= 0 && start <= end && start < info.size;
          }
          if (!valid) {
            response.writeHead(416, { ...headers, 'Content-Range': `bytes */${info.size}`, 'Content-Length': 0 });
            response.end(); return;
          }
          status = 206;
          headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        }
        response.writeHead(status, { ...headers, 'Content-Length': info.size ? end - start + 1 : 0 });
        if (method === 'HEAD' || !info.size) response.end();
        else await pipeline(createReadStream(info.filename, { start, end }), response);
        return;
      }
      const match = pathname.match(/^\/api\/transferencias\/([^/]+)(\/download)?$/);
      if (match && ((method === 'GET' && match[2]) || (method === 'DELETE' && !match[2]))) {
        const info = await fileInfo(match[1]);
        if (method === 'DELETE') {
          const target = path.join(storage, info.id);
          if (!inside(storage, target)) throw httpError(400, 'Ruta inválida.');
          await rm(target, { recursive: true });
          response.writeHead(204); response.end(); return;
        }
        response.writeHead(200, { 'Content-Type': info.type, 'Content-Length': info.size,
          'Content-Disposition': attachment(info.name), 'Cache-Control': 'no-store' });
        await pipeline(createReadStream(info.filename), response);
        return;
      }
      if (pathname.startsWith('/api/')) throw httpError(404, 'Endpoint no encontrado.');
      if (apiOnly) throw httpError(404, 'Endpoint no encontrado.');
      if (!['GET', 'HEAD'].includes(method)) throw httpError(405, 'Método no permitido.');
      let filename = path.resolve(dist, '.' + pathname);
      if (filename !== dist && !inside(dist, filename)) throw httpError(404, 'No encontrado.');
      try {
        const stat = await lstat(filename);
        if (!stat.isFile()) throw Object.assign(new Error(), { code: 'ENOENT' });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        if (path.extname(pathname)) throw httpError(404, 'No encontrado.');
        filename = path.join(dist, 'index.html');
      }
      filename = await realpath(filename);
      if (!inside(dist, filename)) throw httpError(404, 'No encontrado.');
      response.writeHead(200, { 'Content-Type': staticTypes[path.extname(filename)] || 'application/octet-stream',
        'Cache-Control': 'no-cache' });
      if (method === 'HEAD') response.end();
      else await pipeline(createReadStream(filename), response);
    } catch (error) {
      if (response.headersSent || response.destroyed) { response.destroy(); return; }
      const status = error.status || (error.code === 'ENOSPC' ? 507 : error.code === 'ENOENT' ? 404 : 500);
      if (status === 500) console.error('Transferencias:', error.message);
      json(response, status, { error: error.status ? error.message : status === 507 ? 'No queda espacio en el servidor.' : 'No se pudo completar la operación.' });
    }
  });
  // Large local video uploads can take longer than Node's default request timeout.
  server.requestTimeout = 0;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe estar entre 1 y 65535.');
  try {
    const server = await createPlipServer();
    server.on('error', error => { console.error('No se pudo iniciar PLIP:', error.message); process.exitCode = 1; });
    server.listen(port, '0.0.0.0', () => console.log(`${process.env.PLIP_API_ONLY === '1' ? 'PLIP Transferencias API' : 'PLIP'}: escuchando en 0.0.0.0:${port}`));
  } catch (error) {
    console.error(process.env.PLIP_API_ONLY === '1'
      ? 'No se pudo iniciar Transferencias. Verificá el montaje y los permisos de la carpeta de datos.'
      : 'No se pudo iniciar PLIP. Verificá la carpeta de datos y la compilación del frontend.', error.message);
    process.exitCode = 1;
  }
}
