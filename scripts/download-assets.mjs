import { mkdir, writeFile } from 'node:fs/promises';

// Only these already-reviewed CC0 packs. Resolve the author's current download link.
const packs = ['nature-kit', 'car-kit', 'blocky-characters', 'city-kit-suburban', 'city-kit-industrial', 'city-kit-roads', 'blaster-kit'];
await mkdir('.cache/assets', { recursive: true });
for (const pack of packs) {
  const page = `https://kenney.nl/assets/${pack}`;
  const response = await fetch(page);
  if (!response.ok) throw new Error(`${page}: ${response.status}`);
  const html = await response.text();
  if (!html.includes('Creative Commons CC0')) throw new Error(`License not confirmed: ${pack}`);
  const zip = html.match(/https:\/\/kenney\.nl\/[^'"\s]+\.zip/)?.[0];
  if (!zip) throw new Error(`No official ZIP found: ${pack}`);
  const download = await fetch(zip);
  if (!download.ok) throw new Error(`Download failed: ${pack}`);
  await writeFile(`.cache/assets/${pack}.zip`, Buffer.from(await download.arrayBuffer()));
  await writeFile(`.cache/assets/${pack}.source.json`, JSON.stringify({ page, zip, license: 'CC0-1.0', checked: '2026-09-07' }, null, 2));
  console.log(`Downloaded ${pack} (CC0 verified before request)`);
}
