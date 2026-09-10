import html from './tool.html?raw';
import pdfLib from '../fotolab/web/assets/vendor/pdf-lib/pdf-lib.min.js?raw';
import pdfJs from './vendor/pdf.min.js?raw';
import workerUrl from './vendor/pdf.worker.min.js?url';

const inlineScript = (source: string) => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
const documentSource = html
  .replace('<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>', () => inlineScript(pdfLib))
  .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>', () => inlineScript(pdfJs))
  .replace('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', () => new URL(workerUrl, window.location.href).href);

// The embedded document keeps the original canvas/PDF workflow and CSS isolated.
export default function FolletosView() {
  return <iframe title="Folletos" srcDoc={documentSource}
    className="w-full h-full border-0" style={{ minHeight: 600 }} />;
}
