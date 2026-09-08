import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Exploration, validSavedPosition } from '../src/world/Exploration';
import { settlements } from '../src/data/world';
import { worldConfig } from '../src/data/config';
import { terrainHeight } from '../src/world/Terrain';

test('discovery unlocks actual destinations once and rejects unvisited or unsafe travel',()=>{
  const exploration = new Exploration(), town=settlements[3]; let discoveries=0;
  exploration.onDiscover=()=>discoveries++;
  assert.equal(exploration.destination(town.id,false,true),undefined);
  const position=new Vector3(town.center[0],town.elevation+1,town.center[1]);
  exploration.update(position); exploration.update(position);
  assert.equal(discoveries,1);
  const destination=exploration.destination(town.id,false,true)!;
  assert.ok(destination); assert.equal(destination.x,town.residentRoute[0][0]);
  assert.equal(destination.y,terrainHeight(destination.x,destination.z)+1.2);
  assert.equal(exploration.destination(town.id,true,true),undefined);
  assert.equal(exploration.destination(town.id,false,false),undefined);
});

test('discovery restoration filters removed places and restart clears unlocks',()=>{
  const exploration=new Exploration(); exploration.restore(['sanremo','removed-town']);
  assert.deepEqual([...exploration.discovered],['ventosa','sanremo']);
  exploration.reset(); assert.deepEqual([...exploration.discovered],['ventosa']);
});

test('new island saves beyond the old reset boundary load while corrupted or buried positions do not',()=>{
  for(const town of settlements) {
    assert.equal(validSavedPosition([town.center[0],town.elevation+1.2,town.center[1]]),true,town.name);
    assert.equal(validSavedPosition([town.center[0],town.elevation-5,town.center[1]]),false);
  }
  assert.equal(validSavedPosition([worldConfig.size,100,0]),false);
  assert.equal(validSavedPosition([NaN,100,0]),false);
  assert.equal(validSavedPosition([0,Infinity,0]),false);
  assert.equal(validSavedPosition([0,100]),false);
});
