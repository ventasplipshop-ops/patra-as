import html from './tool.html?raw';
import pdfLib from '../fotolab/web/assets/vendor/pdf-lib/pdf-lib.min.js?raw';
import pdfJs from './vendor/pdf.min.js?raw';
import workerUrl from './vendor/pdf.worker.min.js?url';
import layout from './layout.js?raw';
import { useTransferenciasPicker } from '../transferencias/useTransferenciasPicker';

const inlineScript = (source: string) => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
const documentSource = html
  .replace(/<script>\s*pdfjsLib\.GlobalWorkerOptions/, () => `${inlineScript(layout)}\n<script>\npdfjsLib.GlobalWorkerOptions`)
  .replace('<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>', () => inlineScript(pdfLib))
  .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>', () => inlineScript(pdfJs))
  .replace('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', () => new URL(workerUrl, window.location.href).href);

// The embedded document keeps the original canvas/PDF workflow and CSS isolated.
export default function FolletosView() {
  const { frame, onLoad, picker } = useTransferenciasPicker([
    { input: '#archivo', after: '#archivo', label: 'Elegir desde Transferencias' },
  ]);
  function handleLoad() {
    onLoad();
    const document = frame.current?.contentDocument;
    document?.addEventListener('folletos:save', event => {
      const { blob, filename, complete } = (event as CustomEvent<{
        blob: Blob; filename: string; complete: (result: { ok: boolean; error?: string }) => void
      }>).detail;
      void (async () => {
        try {
          const body = new FormData();
          body.append('file', blob, filename);
          const response = await fetch('/api/transferencias', { method: 'POST', body });
          if (response.status !== 201) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || 'No se pudo guardar el PDF en Transferencias.');
          }
          complete({ ok: true });
        } catch (cause) {
          complete({ ok: false, error: cause instanceof Error ? cause.message : 'No se pudo conectar con Transferencias.' });
        }
      })();
    });
  }
  return <><iframe ref={frame} onLoad={handleLoad} title="Folletos" srcDoc={documentSource}
    className="w-full h-full border-0" style={{ minHeight: 600 }} />{picker}</>;
}
