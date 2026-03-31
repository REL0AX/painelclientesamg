import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { console, process } = globalThis;

const distAssetsDir = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(distAssetsDir).filter((file) => file.endsWith('.js'));

const budgets = [
  { label: 'index', pattern: /^index-.*\.js$/, maxKb: 340 },
  { label: 'firebase', pattern: /^firebase-.*\.js$/, maxKb: 380, optional: true },
  { label: 'xlsx', pattern: /^xlsx-.*\.js$/, maxKb: 450, optional: true },
  { label: 'AppContext', pattern: /^AppContext-.*\.js$/, maxKb: 40, optional: true },
  { label: 'ClientDrawer', pattern: /^ClientDrawer-.*\.js$/, maxKb: 35, optional: true }
];

const errors = [];

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

for (const budget of budgets) {
  const file = files.find((entry) => budget.pattern.test(entry));
  if (!file) {
    if (budget.optional) {
      console.log(`ok  ${budget.label.padEnd(12)} ausente neste build`);
      continue;
    }

    errors.push(`Chunk ${budget.label} nao encontrado em dist/assets.`);
    continue;
  }

  const sizeBytes = statSync(join(distAssetsDir, file)).size;
  const maxBytes = budget.maxKb * 1024;
  if (sizeBytes > maxBytes) {
    errors.push(
      `Chunk ${budget.label} excedeu o budget: ${formatKb(sizeBytes)} > ${formatKb(maxBytes)}.`
    );
  } else {
    console.log(`ok  ${budget.label.padEnd(12)} ${formatKb(sizeBytes)} / ${formatKb(maxBytes)}`);
  }
}

const totalBytes = files.reduce((total, file) => total + statSync(join(distAssetsDir, file)).size, 0);
const totalMaxBytes = 1450 * 1024;
if (totalBytes > totalMaxBytes) {
  errors.push(`Total JS excedeu o budget: ${formatKb(totalBytes)} > ${formatKb(totalMaxBytes)}.`);
} else {
  console.log(`ok  total-js     ${formatKb(totalBytes)} / ${formatKb(totalMaxBytes)}`);
}

if (errors.length > 0) {
  console.error('\nBundle budget falhou:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
