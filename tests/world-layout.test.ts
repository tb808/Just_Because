import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bases } from '../src/data/bases';
import { worldConfig } from '../src/data/config';
import { landmarks, settlements, worldRoads, type GroundPoint } from '../src/data/world';
import { terrainHeight } from '../src/world/Terrain';

const distanceToSegment = ([px,pz]:GroundPoint,[ax,az]:GroundPoint,[bx,bz]:GroundPoint) => {
  const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/length));
  return Math.hypot(px-(ax+dx*t),pz-(az+dz*t));
};

test('expanded island layout keeps settlements on land and buildings clear of roads',()=>{
  assert.ok(worldConfig.size>=1280);
  const roads=Object.values(worldRoads);
  for(const settlement of settlements) {
    assert.ok(terrainHeight(...settlement.center)>3,`${settlement.name} must be on land`);
    assert.ok(terrainHeight(...settlement.market)>3,`${settlement.name} market must be on land`);
    for(const home of settlement.homes) {
      assert.ok(terrainHeight(...home)>3,`${settlement.name} home must be on land`);
      const roadDistance=Math.min(...roads.flatMap(points=>points.slice(1).map((point,index)=>distanceToSegment(home,points[index],point))));
      assert.ok(roadDistance>8,`${settlement.name} home overlaps a road corridor`);
    }
    for(const point of settlement.residentRoute) {
      assert.ok(Math.abs(point[0]-settlement.market[0])<=21&&Math.abs(point[1]-settlement.market[1])<=12,'resident route must stay on its market square');
    }
  }
});

test('authored roads connect the harbor, villages and military compounds',()=>{
  assert.deepEqual(worldRoads.harborAccess.at(-1),[-400,-220]);
  assert.deepEqual(worldRoads.southernCoast.at(-1),[250,-184]);
  assert.deepEqual(worldRoads.interior.at(-1),[300,300]);
  assert.deepEqual(worldRoads.estela.at(-1),settlements[1].market);
  for(const base of bases) assert.ok(terrainHeight(base.center[0],base.center[2])>=base.center[1]-.3,`${base.name} terrain is too low`);
});

test('map landmarks are unique and include each settlement and market',()=>{
  assert.equal(new Set(landmarks.map(point=>point.name)).size,landmarks.length);
  for(const settlement of settlements) {
    assert.ok(landmarks.some(point=>point.name===settlement.name));
    assert.ok(landmarks.some(point=>point.name===`Markt ${settlement.name.replace('Dorf ','')}`));
  }
});
