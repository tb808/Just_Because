import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assets, guardCharacterModels, residentCharacterModels } from '../src/data/assets';
import { objectiveReached } from '../src/missions/MissionManager';
import { traversalRoute } from '../src/data/missions';
import { Vector3 } from '@babylonjs/core';

test('every registered GLB is local, self-contained, and has a provenance hash', async () => {
  const inventory = JSON.parse(await readFile('public/assets/licenses/inventory.json', 'utf8'));
  for (const group of Object.values(assets)) for (const asset of Object.values(group)) {
    const bytes = await readFile(`public/${asset.path}`);
    assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(8), bytes.length);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    for (const image of json.images ?? []) { assert.ok(!image.uri); assert.equal(image.mimeType, 'image/png'); }
    for (const buffer of json.buffers ?? []) assert.ok(!buffer.uri);
    const record = inventory.find((entry: { file: string }) => asset.path === `assets/${entry.file}`);
    assert.ok(record); assert.equal(record.license, 'CC0-1.0');
    assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
  }
});
test('the living world uses distinct blocky models for residents and guards', async () => {
  assert.equal(residentCharacterModels.length, 7);
  assert.equal(guardCharacterModels.length, 4);
  const characterModels = [...residentCharacterModels, ...guardCharacterModels];
  assert.equal(new Set(characterModels.map(model => model.path)).size, characterModels.length);
  assert.ok(residentCharacterModels.every(model => model.animated));
  assert.ok(guardCharacterModels.every(model => model.animated));
  const hashes = await Promise.all(characterModels.map(async model =>
    createHash('sha256').update(await readFile(`public/${model.path}`)).digest('hex')));
  assert.equal(new Set(hashes).size, characterModels.length);
});
test('landing checkpoint requires grounded state, flight checkpoint requires wingsuit', () => {
  const flight = traversalRoute[2], landing = traversalRoute[3];
  assert.equal(objectiveReached(flight, Vector3.FromArray(flight.position), 'PARACHUTE'), false);
  assert.equal(objectiveReached(flight, Vector3.FromArray(flight.position), 'WINGSUIT'), true);
  assert.equal(objectiveReached(landing, Vector3.FromArray(landing.position), 'FALLING'), false);
  assert.equal(objectiveReached(landing, Vector3.FromArray(landing.position), 'ON_FOOT'), true);
});
