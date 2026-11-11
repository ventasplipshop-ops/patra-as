import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlipServer } from './plip-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = await createPlipServer({ apiOnly: true });
await new Promise((resolve, reject) => {
  api.once('error', reject);
  api.listen(0, '127.0.0.1', resolve);
});
const address = api.address();
if (!address || typeof address !== 'object') throw new Error('No se pudo iniciar la API de Transferencias.');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const vite = spawn(process.execPath, [viteBin, '--configLoader', 'runner', '--force', ...process.argv.slice(2)], {
  cwd:root,
  stdio:'inherit',
  env:{ ...process.env, PLIP_DEV_API_TARGET:`http://127.0.0.1:${address.port}` },
});

let closing = false;
async function close(signal) {
  if (closing) return;
  closing = true;
  if (!vite.killed) vite.kill(signal);
  await new Promise(resolve => api.close(resolve));
}

vite.once('exit', (code, signal) => void close(signal || 'SIGTERM').finally(() => { process.exitCode = code ?? 1; }));
vite.once('error', error => void close('SIGTERM').finally(() => { throw error; }));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void close(signal).finally(() => process.exit(0)));
