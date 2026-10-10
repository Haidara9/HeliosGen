import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = dirname(fileURLToPath(import.meta.url));
const temp = join(root, 'renders');
mkdirSync(temp, { recursive: true });
const bundle = join(temp, 'import-workflow.mjs');
await build({ entryPoints: [join(root, '../../lib/importWorkflow.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle });
const { importWorkflowZip } = await import(pathToFileURL(bundle).href);
const file = new File([readFileSync(join(root, 'zameel-helios-workflow.zip'))], 'zameel-helios-workflow.zip');
const originalFetch = globalThis.fetch;
let uploads = 0;
globalThis.fetch = async (url, init) => {
  assert.equal(url, '/api/upload-asset', 'The import must not invoke generation or an external provider');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'video/mp4');
  uploads++;
  return Response.json({ cdnUrl: '/generated/references/zameel-test-reference.mp4' });
};
try {
  const imported = await importWorkflowZip(file);
  assert.equal(imported.skipped, 0);
  assert.equal(imported.assetCount, 1);
  assert.equal(uploads, 1);
  const reference = imported.nodes.find(n => n.type === 'videoInputNode');
  assert.equal(reference.data.videoUrl, '/generated/references/zameel-test-reference.mp4');
  const generator = imported.nodes.find(n => n.type === 'videoGeneratorNode');
  assert.equal(generator.data.status, 'idle');
  assert.equal(generator.data.count, 1);
  assert.equal(generator.data.videoModel, 'gemini-omni-video');
  assert.equal(generator.data.duration, 6);
  assert.equal(imported.edges.length, 1);
  assert.equal(imported.edges[0].targetHandle, 'prompt');
  assert.ok(!imported.edges.some(e => e.source === reference.id), 'Presenter footage stays disconnected from generation');
  console.log(`Application import passed: ${imported.nodes.length} nodes, ${imported.assetCount} restored asset, 0 provider calls. Upload route mocked.`);
} finally {
  globalThis.fetch = originalFetch;
}
