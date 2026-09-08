import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bases } from '../src/data/bases';
import { worldConfig } from '../src/data/config';
import { distanceToRoad, landmarks, settlements, worldLocations, worldRoads, type GroundPoint } from '../src/data/world';
import { terrainHeight } from '../src/world/Terrain';

const distanceToSegment = ([px,pz]:GroundPoint,[ax,az]:GroundPoint,[bx,bz]:GroundPoint) => {
  const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(length||1)));
  return Math.hypot(px-(ax+dx*t),pz-(az+dz*t));
};

test('expanded island contains eight populated towns, six bases and a connected dry road network',()=>{
  assert.equal(worldConfig.size,4096);assert.equal(settlements.length,8);assert.equal(bases.length,6);
  assert.ok(settlements.reduce((sum,town)=>sum+town.homes.length,0)>=220,'towns need substantial authored building density');
  assert.ok(worldLocations.length>=16);
  for(const settlement of settlements) {
    assert.equal(terrainHeight(...settlement.center),settlement.elevation);
    assert.equal(terrainHeight(...settlement.market),settlement.elevation);
    assert.ok(settlement.homes.length>=20,`${settlement.name} must contain a real district`);
    for(const home of settlement.homes) {
      assert.equal(terrainHeight(...home),settlement.elevation);
      assert.ok(distanceToRoad(home)>14,`${settlement.name} home overlaps a vehicle corridor`);
    }
    assert.deepEqual(settlement.residentRoute[0],[settlement.market[0],settlement.market[1]-8]);
    assert.ok(settlement.residentRoute.length>=12);
    for(let i=0;i<settlement.residentRoute.length;i++) {
      const a=settlement.residentRoute[i],b=settlement.residentRoute[(i+1)%settlement.residentRoute.length];
      assert.ok(a[0]===b[0]||a[1]===b[1],`${settlement.name} pedestrians must follow streets rather than cut building corners`);
      for(const home of settlement.homes) assert.ok(distanceToSegment(home,a,b)>9,`${settlement.name} pedestrian route hits a building`);
    }
  }
  for(const [name,road] of Object.entries(worldRoads))for(let i=1;i<road.length;i++) {
    const a=road[i-1],b=road[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/10);
    for(let step=0;step<=steps;step++) {
      const t=step/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      assert.ok(terrainHeight(x,z)>worldConfig.seaLevel+1,`${name} road is submerged at ${x}, ${z}`);
    }
  }
});

test('authored roads preserve original routes and ground every compound flag correctly',()=>{
  assert.deepEqual(worldRoads.harborAccess.at(-1),[-400,-220]);
  assert.deepEqual(worldRoads.southernCoast.at(-1),[250,-184]);
  assert.deepEqual(worldRoads.interior.at(-1),[300,300]);
  assert.deepEqual(worldRoads.estela.at(-1),settlements[1].market);
  for(const base of bases)assert.ok(Math.abs(terrainHeight(base.center[0],base.center[2])-(base.center[1]-.2))<.01);
  for(const location of worldLocations)assert.ok(terrainHeight(...location.position)>3,`${location.name} arrival must be dry`);
});

test('map landmarks are unique and include each settlement, market and exploration destination',()=>{
  assert.equal(new Set(landmarks.map(point=>point.name)).size,landmarks.length);
  for(const settlement of settlements) {
    assert.ok(landmarks.some(point=>point.name===settlement.name));
    assert.ok(landmarks.some(point=>point.name===`Markt ${settlement.name}`));
  }
  for(const location of worldLocations)assert.ok(landmarks.some(point=>point.name===location.name));
});
