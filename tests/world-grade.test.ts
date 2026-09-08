import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldRoads } from '../src/data/world';
import { terrainHeight } from '../src/world/Terrain';

test('road approaches do not jump between plateaus or form impassable cliffs',()=>{
  for (const [name,road] of Object.entries(worldRoads)) for(let i=1;i<road.length;i++) {
    const a=road[i-1],b=road[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/2);
    let previous=terrainHeight(...a);
    for(let step=1;step<=steps;step++) {
      const t=step/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,height=terrainHeight(x,z);
      const grade=Math.abs(height-previous)/(length/steps);
      assert.ok(grade<.7,`${name} rises too sharply at ${x},${z}: ${grade}`);
      previous=height;
    }
  }
});
