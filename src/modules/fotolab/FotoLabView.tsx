import html from './web/index.html?raw';
import css from './web/styles.css?raw';
import { useTransferenciasPicker } from '../transferencias/useTransferenciasPicker';

// Preserve the original script order and isolate its document/global listeners.
const scripts = import.meta.glob('./web/**/*.js', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;
const documentSource = html
  .replace('<link rel="stylesheet" href="./styles.css">', () => `<style>${css}</style>`)
  .replace(/<script src="\.\/([^"]+)"><\/script>/g, (_, path: string) => {
    const source = scripts[`./web/${path}`];
    if (!source) throw new Error(`Recurso FotoLab ausente: ${path}`);
    return `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
  });

export default function FotoLabView() {
  const { frame, onLoad, picker } = useTransferenciasPicker([
    { input: '#general-file', after: '#general-add-files', label: 'Desde Transferencias' },
    { input: '#four-file', after: '#four-dropzone', label: 'Desde Transferencias' },
  ]);
  return <><iframe ref={frame} onLoad={onLoad} title="FotoLab" srcDoc={documentSource}
    className="w-full h-full border-0" style={{ minHeight: 600 }} />{picker}</>;
}
