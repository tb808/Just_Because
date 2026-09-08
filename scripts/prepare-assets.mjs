import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

async function embedTextures(source) {
  const raw = await readFile(source);
  const jsonLength = raw.readUInt32LE(12);
  const gltf = JSON.parse(raw.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength;
  let bin = raw.subarray(binStart + 8, binStart + 8 + raw.readUInt32LE(binStart));
  for (const image of gltf.images ?? []) {
    if (!image.uri) continue;
    const png = await readFile(join(dirname(source), image.uri));
    bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
    image.bufferView = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: png.length });
    image.mimeType = 'image/png'; delete image.uri;
    bin = Buffer.concat([bin, png]);
  }
  gltf.buffers[0].byteLength = bin.length;
  const json = Buffer.from(JSON.stringify(gltf));
  const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const paddedBin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + paddedJson.length + paddedBin.length, 8);
  header.writeUInt32LE(paddedJson.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(paddedBin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, paddedJson, binHeader, paddedBin]);
}
const files = [
  ['blocky-characters','GLB format','character-f.glb','characters/nika.glb'],
  ['blocky-characters','GLB format','character-b.glb','characters/soldier.glb'],
  ['blaster-kit','GLB format','blaster-e.glb','weapons/rifle.glb'],
  ['blaster-kit','GLB format','blaster-j.glb','weapons/launcher.glb'],
  ['nature-kit','GLTF format','tree_palmDetailedTall.glb','vegetation/palm.glb'],
  ['nature-kit','GLTF format','tree_oak.glb','vegetation/tree.glb'],
  ['nature-kit','GLTF format','rock_largeA.glb','environment/rock.glb'],
  ['car-kit','GLB format','suv.glb','vehicles/car.glb'],
  ['city-kit-suburban','GLB format','building-type-a.glb','buildings/house.glb'],
  ['city-kit-industrial','GLB format','building-a.glb','buildings/warehouse.glb'],
  ['city-kit-industrial','GLB format','detail-tank-large.glb','props/tank.glb'],
  ['city-kit-industrial','GLB format','shipping-container-a.glb','props/container.glb'],
];
for (const dir of ['characters','vehicles','buildings','vegetation','weapons','props','environment','effects','audio','licenses']) await mkdir(`public/assets/${dir}`,{recursive:true});
const inventory = [];
for (const [pack,format,file,destination] of files) {
  const data = await embedTextures(`.cache/assets/${pack}/Models/${format}/${file}`);
  await writeFile(`public/assets/${destination}`, data);
  await copyFile(`.cache/assets/${pack}/License.txt`, `public/assets/licenses/${pack}.txt`);
  const source = JSON.parse(await readFile(`.cache/assets/${pack}.source.json`, 'utf8'));
  inventory.push({ file: destination, original: file, author: 'Kenney', ...source, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
}
await writeFile('public/assets/licenses/inventory.json', JSON.stringify(inventory,null,2));
console.log(`${inventory.length} GLBs, ${inventory.reduce((s,a)=>s+a.bytes,0)} bytes`);
