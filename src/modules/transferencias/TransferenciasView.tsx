import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Trash2, Upload } from 'lucide-react';

type SharedFile = { id: string; name: string; size: number; type: string; uploadedAt: string };
type UploadStatus = { name: string; progress: number; state: 'pending' | 'uploading' | 'saving' | 'done' | 'error'; error?: string };
const endpoint = '/api/transferencias';
const accept = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif,.mp4,.mov,.m4v,.avi,.mkv,.webm,.mpg,.mpeg,.3gp,.mts,.m2ts';
const button = 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';
const labels = { pending: 'En espera', uploading: 'Subiendo', saving: 'Guardando en el servidor', done: 'Subido', error: 'Error' };

function sizeLabel(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unit = 0;
  while (bytes >= 1024 && unit < units.length - 1) { bytes /= 1024; unit++; }
  return `${bytes.toLocaleString('es-AR', { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`;
}
async function responseError(response: Response) {
  try { const data = await response.json(); return data.error || 'No se pudo completar la operación.'; }
  catch { return 'Transferencias no está disponible. Verificá la conexión y el servicio de archivos del servidor de PLIP.'; }
}

export default function TransferenciasView() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refreshId = useRef(0);

  async function refresh() {
    const id = ++refreshId.current;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(await responseError(response));
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error('Transferencias no está disponible. Verificá la conexión y el servicio de archivos del servidor de PLIP.');
      if (mounted.current && id === refreshId.current) setFiles(result);
    } catch (cause) {
      if (mounted.current && id === refreshId.current) setError(cause instanceof Error ? cause.message : 'No se pudo obtener el listado.');
    } finally {
      if (mounted.current && id === refreshId.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; refreshId.current++; xhr.current?.abort(); };
  }, []);

  async function uploadFiles(selected: FileList | null) {
    const queue = Array.from(selected || []);
    if (!queue.length || uploading) return;
    setUploading(true);
    setUploads(queue.map(file => ({ name: file.name, progress: 0, state: 'pending' })));
    const update = (index: number, patch: Partial<UploadStatus>) => {
      if (mounted.current) setUploads(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
    };
    for (const [index, file] of queue.entries()) {
      if (!mounted.current) break;
      update(index, { state: 'uploading' });
      try {
        await new Promise<void>((resolve, reject) => {
          const request = new XMLHttpRequest();
          xhr.current = request;
          request.open('POST', endpoint);
          request.upload.onprogress = event => {
            if (event.lengthComputable) update(index, { progress: Math.round(event.loaded / event.total * 100) });
          };
          request.upload.onload = () => update(index, { progress: 100, state: 'saving' });
          request.onload = () => {
            if (request.status === 201) resolve();
            else {
              let message = 'No se pudo subir el archivo.';
              try { message = JSON.parse(request.responseText).error || message; } catch { /* Non-JSON server error. */ }
              reject(new Error(message));
            }
          };
          request.onerror = () => reject(new Error('Se perdió la conexión con el servidor.'));
          request.onabort = () => reject(new Error('Subida interrumpida.'));
          const body = new FormData(); body.append('file', file); request.send(body);
        });
        update(index, { state: 'done', progress: 100 });
      } catch (cause) {
        update(index, { state: 'error', error: cause instanceof Error ? cause.message : 'Error de subida.' });
      } finally { xhr.current = null; }
    }
    if (mounted.current) { setUploading(false); if (input.current) input.current.value = ''; await refresh(); }
  }

  async function remove(file: SharedFile) {
    if (!window.confirm(`¿Eliminar "${file.name}" de la bandeja compartida?`)) return;
    setDeleting(file.id); setError('');
    try {
      const response = await fetch(`${endpoint}/${file.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response));
      if (mounted.current) await refresh();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el archivo.');
    } finally { if (mounted.current) setDeleting(null); }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Transferencias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Bandeja compartida de fotos y videos del negocio.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} />Actualizar</button>
          {files.length > 0 && <a className={button} href={`${endpoint}/download-all`} download="transferencias.zip"><Download size={16} />Descargar todos</a>}
          <button className={button} disabled={uploading} onClick={() => input.current?.click()}><Upload size={16} />Subir fotos y videos</button>
          <input ref={input} type="file" multiple accept={accept} className="hidden" aria-label="Seleccionar fotos y videos" onChange={event => void uploadFiles(event.target.files)} />
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {uploads.length > 0 && <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3" aria-label="Progreso de subidas">
        {uploads.map((item, index) => <div key={index} className="text-sm">
          <div className="flex justify-between gap-3"><span className="break-all">{item.name}</span><span>{labels[item.state]}{item.state === 'uploading' ? ` ${item.progress}%` : ''}</span></div>
          <progress aria-label={`Subida de ${item.name}`} className="w-full" max={100} value={item.progress} />
          {item.error && <p className="text-red-600 dark:text-red-300">{item.error}</p>}
        </div>)}
        {uploading && <p className="text-sm text-gray-500">Mantené esta pantalla abierta hasta finalizar las subidas.</p>}
      </div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>
            <th className="p-3">Nombre</th><th className="p-3">Tipo / tamaño</th><th className="p-3">Fecha de subida</th><th className="p-3">Acciones</th>
          </tr></thead>
          <tbody>{files.map(file => <tr key={file.id} className="border-t border-gray-200 dark:border-gray-700">
            <td className="p-3 break-all">{file.name}</td>
            <td className="p-3 whitespace-nowrap">{file.type.startsWith('video/') ? 'Video' : 'Foto'} · {sizeLabel(file.size)}</td>
            <td className="p-3 whitespace-nowrap">{new Date(file.uploadedAt).toLocaleString('es-AR')}</td>
            <td className="p-3"><div className="flex gap-2">
              <a href={`${endpoint}/${file.id}/download`} download={file.name} className={button} aria-label={`Descargar ${file.name}`}><Download size={16} />Descargar</a>
              <button className={button} disabled={deleting !== null} onClick={() => void remove(file)} aria-label={`Eliminar ${file.name}`}><Trash2 size={16} />{deleting === file.id ? 'Eliminando…' : 'Eliminar'}</button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {!files.length && <p className="p-6 text-center text-gray-500">{loading ? 'Cargando archivos…' : error ? 'Listado no disponible.' : 'No hay archivos disponibles.'}</p>}
      </div>
    </section>
  );
}
