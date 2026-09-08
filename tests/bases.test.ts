import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core';
import { BaseManager } from '../src/world/BaseManager';
import { bases, captureDuration } from '../src/data/bases';
import { terrainHeight } from '../src/world/Terrain';
import { baseCapturePrompt } from '../src/ui/BaseCapturePrompt';

test('each base requires its own targets and an uninterrupted living player in the flag zone',()=>{
  const manager=new BaseManager(), dead=new Set<string>(), events:string[]=[];
  manager.onLiberated=b=>events.push(b.id);
  const first=bases[0], position=Vector3.FromArray(first.flag);
  const update=(dt:number,alive=true)=>manager.update(dt,position,alive,id=>dead.has(id));
  update(10); assert.equal(manager.liberatedCount,0);
  [...first.guards,...first.tanks].forEach(t=>dead.add(t.id));
  update(3); assert.equal(manager.tracked.capture,3);
  update(1,false); assert.equal(manager.tracked.capture,0);
  update(3); position.x+=40; update(1); assert.equal(manager.tracked.capture,0);
  position.copyFrom(Vector3.FromArray(first.flag)); update(captureDuration);
  assert.equal(manager.liberatedCount,1); assert.equal(manager.states[1].guards,0); assert.equal(manager.complete,false);
  update(20); assert.deepEqual(events,[first.id]); manager.reset(); assert.equal(manager.liberatedCount,0); assert.equal(manager.tracked.capture,0);
});
test('base target IDs are unique and all flags and guard spawns are on land',()=>{
  const ids=bases.flatMap(b=>[b.id,...b.guards.map(g=>g.id),...b.tanks.map(t=>t.id)]);
  assert.equal(new Set(ids).size,ids.length);
  for(const base of bases) {
    assert.ok(Math.abs(base.flag[1]-terrainHeight(base.flag[0],base.flag[2]))<.5);
    for(const guard of base.guards) assert.ok(terrainHeight(guard.x,guard.z)>3);
  }
});

test('nearby bases explain every remaining capture step',()=>{
  const manager = new BaseManager();
  const first = manager.states[0];
  const nearby = new Vector3(first.definition.center[0] + 80, first.definition.center[1], first.definition.center[2]);
  assert.equal(manager.nearby(nearby), first);
  assert.equal(manager.nearby(new Vector3(0, 0, 0)), undefined);

  let prompt = baseCapturePrompt(first, nearby);
  assert.match(prompt.detail, /Schalte noch 8 Wachen und 3 rote Tanks aus/);
  assert.match(prompt.detail, /Flagge.*6 Sekunden/);

  first.guards = first.definition.guards.length;
  first.tanks = first.definition.tanks.length;
  prompt = baseCapturePrompt(first, nearby);
  assert.match(prompt.detail, /Gehe jetzt zur Flagge/);

  const flag = Vector3.FromArray(first.definition.flag);
  first.capture = 3.4;
  prompt = baseCapturePrompt(first, flag);
  assert.equal(prompt.hint, 'FLAGGE EINNEHMEN · Im Bereich bleiben · 3/6 S');
});
