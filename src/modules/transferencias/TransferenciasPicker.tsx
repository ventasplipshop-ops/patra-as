import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ImageFile = { id: string; name: string; type: string; uploadedAt: string };
type Props = { accept: string[]; multiple?: boolean; onSelect: (files: File[]) => void; onClose: () => void };

export default function TransferenciasPicker({ accept, multiple = false, onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    const controller = new AbortController(); abort.current = controller;
    void (async () => {
      try {
        const response = await fetch('/api/transferencias', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo obtener el listado de Transferencias.');
        const result: unknown = await response.json();
        if (!Array.isArray(result)) throw new Error('Transferencias no está disponible.');
        setFiles(result.filter((file): file is ImageFile => typeof file.id === 'string' && /^[\da-f-]{36}$/.test(file.id)
          && typeof file.name === 'string' && typeof file.type === 'string' && file.type.startsWith('image/') && accept.includes(file.type)));
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo conectar con Transferencias.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => { controller.abort(); element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [accept]);

  async function confirm() {
    setBusy(true); setError('');
    const signal = abort.current!.signal;
    try {
      const imported: File[] = [];
      for (const id of selected) {
        const file = files.find(item => item.id === id)!;
        const response = await fetch(`/api/transferencias/${id}/download`, { signal });
        if (!response.ok) throw new Error(`No se pudo cargar “${file.name}”. Puede haber sido eliminado. Volvé a abrir el selector para actualizar.`);
        const blob = await response.blob();
        imported.push(new File([blob], file.name, { type: file.type, lastModified: Date.parse(file.uploadedAt) || Date.now() }));
      }
      if (!signal.aborted) { onSelect(imported); onClose(); }
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las imágenes.');
    } finally { if (!signal.aborted) setBusy(false); }
  }

  return createPortal(<dialog ref={dialog} aria-label="Elegir imágenes de Transferencias"
    className="m-auto w-[90vw] max-w-4xl max-h-[90vh] rounded-2xl p-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 backdrop:bg-black/70"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-semibold">Desde Transferencias</h2>
      <button type="button" onClick={onClose} aria-label="Cerrar selector" className="p-2">✕</button></div>
    {loading && <p role="status">Cargando imágenes…</p>}
    {error && <p role="alert" className="text-red-600 p-3">{error}</p>}
    {!loading && !error && !files.length && <p>No hay imágenes compatibles disponibles.</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto">
      {files.map(file => <button key={file.id} type="button" aria-label={file.name} aria-pressed={selected.includes(file.id)} disabled={busy}
        className={`p-2 rounded-xl border-2 ${selected.includes(file.id) ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-600'}`}
        onClick={() => setSelected(current => current.includes(file.id) ? current.filter(id => id !== file.id) : multiple ? [...current, file.id] : [file.id])}>
        <img src={`/api/transferencias/${file.id}/view`} alt="" loading="lazy" className="w-full h-28 object-contain" />
        <span className="block text-sm break-all mt-2">{file.name}</span>
      </button>)}
    </div>
    <div className="flex justify-end gap-3 mt-4">
      <button type="button" onClick={onClose} className="border rounded-xl px-3 py-2">Cancelar</button>
      <button type="button" disabled={!selected.length || busy || loading} onClick={() => void confirm()}
        className="bg-blue-600 text-white rounded-xl px-3 py-2 disabled:opacity-50">{busy ? 'Cargando originales…' : multiple ? `Agregar ${selected.length} fotos` : 'Agregar imagen'}</button>
    </div>
  </dialog>, document.body);
}
