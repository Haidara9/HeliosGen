import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: {
  source: { type: 'string' }, output: { type: 'string' },
  'check-only': { type: 'boolean' }, help: { type: 'boolean' },
} });
if (values.help) {
  console.log('npm run video:zameel -- [--source original.mp4] [--output final.mp4] [--check-only]\nInstall once: npm ci --prefix creative/zameel-referral\nRequires Node 22+, FFmpeg and the Hyperframes browser. No AI API calls are made.');
  process.exit(0);
}
const cli = join(root, 'node_modules/hyperframes/bin/hyperframes.mjs');
if (!existsSync(cli)) {
  throw new Error('Install the isolated video dependencies first: npm ci --prefix creative/zameel-referral');
}
function run(command, args, capture = false) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.stderr ?? ''}`);
  return result.stdout;
}
run(process.execPath, [cli, 'check', '--samples', '13']);
if (values['check-only']) process.exit(0);
const source = values.source ? resolve(values.source) : join(root, '.media/source.mp4');
if (!existsSync(source)) throw new Error('Place the original reel in creative/zameel-referral/.media/source.mp4, or pass --source.');
const contract = JSON.parse(readFileSync(join(root, 'source-contract.json'), 'utf8'));
const sourceHash = createHash('sha256').update(readFileSync(source)).digest('hex');
if (sourceHash !== contract.sha256) throw new Error('This timeline is for the supplied referral reel. Source hash differs; review timing before replacing source-contract.json.');
const sourceInfo = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', source], true));
const video = sourceInfo.streams.find(s => s.codec_type === 'video');
if (video.width !== 1080 || video.height !== 1920) throw new Error('Source must be 1080x1920 for this composition.');
const renders = join(root, 'renders');
mkdirSync(renders, { recursive: true });
const header = join(renders, 'header.mp4');
const output = values.output ? resolve(values.output) : join(renders, 'zameel-referral.mp4');
if (output === source) throw new Error('Output cannot overwrite the original source.');
mkdirSync(dirname(output), { recursive: true });
run(process.execPath, [cli, 'render', '--output', header, '--fps', '30', '--quality', 'high', '--workers', '2', '--no-browser-gpu']);
run('ffmpeg', ['-y', '-v', 'warning', '-i', source, '-i', header,
  '-filter_complex', "[0:v][1:v]overlay=0:0:enable='lt(t,44.3)':eof_action=pass[v]",
  '-map', '[v]', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'fast', '-crf', '24',
  '-maxrate', '3500k', '-bufsize', '7000k', '-threads', '4', '-pix_fmt', 'yuv420p',
  '-c:a', 'copy', '-movflags', '+faststart', output]);
run('ffmpeg', ['-v', 'error', '-i', output, '-f', 'null', '-']);
const info = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], true));
const audioHash = path => run('ffmpeg', ['-v', 'error', '-i', path, '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-'], true).trim();
const preservedAudio = audioHash(source) === audioHash(output);
if (!preservedAudio) throw new Error('Original AAC packets were not preserved.');
writeFileSync(join(renders, 'validation.json'), JSON.stringify({ sourceHash, output, duration: info.format.duration, originalAudioPreserved: preservedAudio, video: info.streams.find(s => s.codec_type === 'video'), generativeApiCalls: 0 }, null, 2));
console.log(`Validated render: ${output}\nOriginal audio preserved. Generative AI calls: 0.`);
