import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bases } from '../src/data/bases';
import { settlements } from '../src/data/world';
import { territories, territoryAt, territoryForSettlement } from '../src/data/territories';

test('every base controls one region and every settlement belongs to its authored nearby base',()=>{
  assert.equal(territories.length,bases.length);
  assert.deepEqual(new Set(territories.map(region=>region.baseId)),new Set(bases.map(base=>base.id)));
  const assigned=territories.flatMap(region=>region.settlementIds);
  assert.deepEqual(new Set(assigned),new Set(settlements.map(town=>town.id)));
  assert.equal(assigned.length,new Set(assigned).size,'a settlement cannot belong to two bases');
  for(const town of settlements) {
    const authored=territoryForSettlement(town.id); assert.ok(authored,`${town.name} needs a territory`);
    assert.equal(territoryAt(...town.center).baseId,authored.baseId,`${town.name} must lie inside its base region`);
  }
});
