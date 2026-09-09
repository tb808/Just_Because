import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextVehicleSpeed } from '../src/vehicles/VehicleManager';

test('SUV accelerates, coasts to a stop and has a bounded reverse gear',()=>{
  let speed=0;
  for(let i=0;i<600;i++)speed=nextVehicleSpeed(speed,1,1/120);
  assert.ok(speed>30&&speed<=32);
  for(let i=0;i<900;i++)speed=nextVehicleSpeed(speed,0,1/120);
  assert.equal(speed,0);
  for(let i=0;i<300;i++)speed=nextVehicleSpeed(speed,-1,1/120);
  assert.ok(speed< -10&&speed>=-11);
});

test('opposite drive input brakes before selecting the other direction',()=>{
  let speed=20;
  for(let i=0;i<60;i++)speed=nextVehicleSpeed(speed,-1,1/120);
  assert.ok(speed<7&&speed>5);
  for(let i=0;i<60;i++)speed=nextVehicleSpeed(speed,-1,1/120);
  assert.ok(speed<0);
});
