import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ViewFile = { id: string; name: string; type: string };

export default function TransferenciasViewer({ file, onClose }: { file: ViewFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    close.current?.focus();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  const source = `/api/transferencias/${file.id}/view`;
  return createPortal(
    <dialog ref={dialog} aria-labelledby={titleId}
      className="m-auto w-[90vw] max-w-6xl max-h-[90vh] rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-0 shadow-2xl backdrop:bg-black/70"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 p-3">
        <h2 id={titleId} className="font-semibold break-all">{file.name}</h2>
        <button ref={close} type="button" onClick={onClose} aria-label="Cerrar visor"
          className="shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={22} /></button>
      </div>
      <div className="flex items-center justify-center h-[70vh] p-3 bg-black">
        {failed ? <p role="status" className="text-white text-center">El navegador no puede mostrar este archivo o ya no está disponible. Podés descargarlo desde el listado.</p>
          : file.type.startsWith('video/')
            ? <video src={source} controls playsInline preload="metadata" aria-label={file.name} className="w-full h-full object-contain" onError={() => setFailed(true)} />
            : <img src={source} alt={file.name} className="w-full h-full object-contain" onError={() => setFailed(true)} />}
      </div>
    </dialog>, document.body,
  );
}
