import { useRef, useState } from 'react';
import TransferenciasPicker from './TransferenciasPicker';

type Target = { input: string; after: string; label: string };
// Both embedded tools accept these formats through their existing local file inputs.
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function useTransferenciasPicker(targets: Target[]) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  function onLoad() {
    const document = frame.current?.contentDocument;
    if (!document) return;
    for (const target of targets) {
      const original = document.querySelector<HTMLInputElement>(target.input);
      const anchor = document.querySelector(target.after);
      if (!original || !anchor || document.getElementById(`transferencias-${original.id}`)) continue;
      const button = document.createElement('button');
      button.id = `transferencias-${original.id}`; button.type = 'button'; button.textContent = target.label;
      button.style.margin = '8px 0';
      button.addEventListener('click', () => setInput(original));
      anchor.after(button);
    }
  }
  return { frame, onLoad, picker: input && <TransferenciasPicker accept={imageTypes} multiple={input.multiple}
    onClose={() => setInput(null)} onSelect={files => {
      if (!input.isConnected || input.ownerDocument !== frame.current?.contentDocument) throw new Error('La herramienta cambió. Volvé a abrir el selector.');
      // Deliver real Files through the same change listener used by the native chooser.
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      const event = input.ownerDocument.createEvent('Event'); event.initEvent('change', true, false);
      input.dispatchEvent(event);
    }} /> };
}
