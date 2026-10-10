import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const temp = join(root, 'renders');
mkdirSync(temp, { recursive: true });
const bundle = join(temp, 'make-zip.mjs');
await build({ entryPoints: [join(root, '../../lib/makeZip.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle });
const { makeZip } = await import(pathToFileURL(bundle).href);
const blob = makeZip([
  { name: 'workflow.json', data: new Uint8Array(readFileSync(join(root, 'workflow.json'))) },
  { name: 'assets/reference-6s.mp4', data: new Uint8Array(readFileSync(join(root, 'reference-6s.mp4'))) },
]);
writeFileSync(join(root, 'zameel-helios-workflow.zip'), Buffer.from(await blob.arrayBuffer()));
console.log('Native HeliosGen workflow packaged with the application ZIP builder.');
