import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biomeAt,biomeGroundColor,biomeRegions,biomeRelief,landscapeSites } from '../src/data/biomes';
import { settlements,worldRoads } from '../src/data/world';
import { townEdgeDistance } from '../src/data/townPlans';

test('biomes have distinct regional soil, vegetation and continuous terrain transitions',()=>{
  assert.equal(new Set(biomeRegions.map(b=>b.soil)).size,6);
  for(const region of biomeRegions)assert.equal(biomeAt(region.x,region.z).id,region.id);
  assert.equal(biomeAt(500,-400).id,'meadow');
  for(let x=-2100;x<=2100;x+=75)for(let z=-2100;z<=2100;z+=75) {
    const a=biomeGroundColor(x,z,20),b=biomeGroundColor(x+1,z,20);
    assert.ok(a.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
    assert.ok(a.every((c,i)=>Math.abs(c-b[i])<.025),'soil transitions must not have sharp seams');
    assert.ok(Math.abs(biomeRelief(x+1,z)-biomeRelief(x,z))<.5,'regional relief must remain continuous');
  }
  assert.equal(new Set(landscapeSites.map(s=>s.id)).size,landscapeSites.length);
});

test('towns differ materially in footprint, street pattern and building count',()=>{
  const smallest=settlements.reduce((a,b)=>a.homes.length<b.homes.length?a:b);
  const largest=settlements.reduce((a,b)=>a.homes.length>b.homes.length?a:b);
  assert.ok(smallest.homes.length<=16&&largest.homes.length>=100);
  assert.ok(largest.homes.length/smallest.homes.length>=8);
  assert.ok(new Set(settlements.map(t=>t.plan.layout)).size>=6);
  assert.ok(new Set(settlements.map(t=>JSON.stringify([t.plan.avenues,t.plan.streets]))).size>=9);
  for(const town of settlements) {
    assert.ok(town.homes.every(p=>townEdgeDistance(town,...p)<-15));
    assert.equal(!!worldRoads[`${town.id}-ring`],town.plan.layout!=='village');
  }
});
