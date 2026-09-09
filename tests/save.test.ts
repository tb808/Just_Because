import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearGameSave, isGameSave, loadGameSave, saveKey, storeGameSave, type GameSave } from '../src/core/SaveGame';

const valid: GameSave = {
  version: 1, savedAt: 123, player: [-20, 7, -300], missions: { index: 2, elapsed: 42 },
  combat: {
    score: 1200, health: 75, selectedBase: 1, liberatedBaseIds: ['orbis'], defeatedEnemyIds: ['enemy-0'], destroyedTankIds: ['fuel-0'],
    weapons: { selected: 'launcher', rifle: { ammo: 20, reserve: 180 }, launcher: { ammo: 0, reserve: 5 } },
  },
};

test('privacy restrictions on accessing localStorage cannot stop the game', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {configurable:true,value:{get localStorage() {throw new Error('Storage access denied');}}});
  try {
    assert.equal(loadGameSave(),undefined);
    assert.equal(storeGameSave(valid),false);
    assert.doesNotThrow(()=>clearGameSave());
  } finally {
    if(original) Object.defineProperty(globalThis,'window',original);
    else Reflect.deleteProperty(globalThis,'window');
  }
});

test('local save games round-trip and malformed data is rejected', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key) };
  assert.equal(storeGameSave(valid, storage), true); assert.deepEqual(loadGameSave(storage), valid);
  values.set(saveKey, '{bad json'); assert.equal(loadGameSave(storage), undefined);
  assert.equal(isGameSave({ ...valid, player: [Infinity, 0, 0] }), false);
});

test('expanded campaign and discovered towns are optional, validated save fields', () => {
  const campaign = {
    ...valid, missions: { index: 4, elapsed: 90, trackedId: 'supply-estela', records: {
      heights: { step: 4, elapsed: 90, hold: 0, complete: true },
      'supply-estela': { step: 1, elapsed: 22, hold: 0, complete: false },
    } }, world: { discoveredSettlementIds: ['ventosa', 'estela'], surveyedMapCells: ['21:19','22:19'], elapsed: 430 },
  };
  assert.equal(isGameSave(campaign), true);
  assert.equal(isGameSave({ ...campaign, world: { ...campaign.world, surveyedMapCells: [3] } }), false);
  assert.equal(isGameSave(valid), true, 'legacy saves remain supported');
  assert.equal(isGameSave({ ...campaign, missions: { ...campaign.missions, records: [] } }), false);
  assert.equal(isGameSave({ ...campaign, missions: { ...campaign.missions, records: { broken: { step: -1, elapsed: 1, hold: 0, complete: false } } } }), false);
  assert.equal(isGameSave({ ...campaign, missions: { ...campaign.missions, records: { broken: { step: 1, elapsed: Infinity, hold: 0, complete: false } } } }), false);
  assert.equal(isGameSave({ ...campaign, missions: { ...campaign.missions, records: { broken: { step: 1, elapsed: 1, hold: 0, complete: 'yes' } } } }), false);
  assert.equal(isGameSave({ ...campaign, world: { discoveredSettlementIds: [3], elapsed: 30 } }), false);
  assert.equal(isGameSave({ ...campaign, world: { discoveredSettlementIds: [], elapsed: -1 } }), false);
  assert.equal(isGameSave({ ...campaign, combat: { ...campaign.combat, difficulty: 'nightmare' } }), false);
  assert.equal(isGameSave({ ...campaign, combat: { ...campaign.combat, difficulty: 'hard' } }), true);
});
