import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

type IconSpec = {
  source: string;
  output: string;
  size: number;
  width?: number;
  height?: number;
};

const icons: IconSpec[] = [
  { source: 'favicon.svg', output: 'favicon-16.png', size: 16 },
  { source: 'favicon.svg', output: 'favicon-32.png', size: 32 },
  { source: 'favicon.svg', output: 'icon-192.png', size: 192 },
  { source: 'favicon.svg', output: 'icon-512.png', size: 512 },
  { source: 'favicon.svg', output: 'apple-touch-icon.png', size: 180 },
  { source: 'og-template.svg', output: 'og-image.png', size: 0, width: 1200, height: 630 },
];

async function render(spec: IconSpec): Promise<void> {
  const sourcePath = resolve(publicDir, spec.source);
  const outputPath = resolve(publicDir, spec.output);
  const svg = await readFile(sourcePath);

  const width = spec.width ?? spec.size;
  const height = spec.height ?? spec.size;

  const buffer = await sharp(svg, { density: 384 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
  console.log(`✓ ${spec.output} (${width}×${height})`);
}

async function main(): Promise<void> {
  for (const spec of icons) {
    await render(spec);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
