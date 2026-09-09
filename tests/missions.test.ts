import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MissionProgress, objectiveReached, type MissionActor } from '../src/missions/MissionProgress';
import { missionDefinitions, traversalRoute, type MissionDefinition, type TraversalObjective } from '../src/data/missions';
import { settlements, worldLocations } from '../src/data/world';
import { bases } from '../src/data/bases';
import { terrainHeight } from '../src/world/Terrain';
import { worldConfig } from '../src/data/config';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { MissionManager } from '../src/missions/MissionManager';

const goal = (id: string, kind: TraversalObjective['kind'] = 'visit', x = 0): TraversalObjective => ({ id, title: id, description: id, position: [x, 1, 0], radius: 4, kind });
const mission = (id: string, objectives: TraversalObjective[], extra: Partial<MissionDefinition> = {}): MissionDefinition => ({ id, title: id, description: id, category: 'Versorgung', reward: 100, objectives, ...extra });
const actor = (x = 0): MissionActor => ({ position: { x, y: 1, z: 0 }, state: 'ON_FOOT' });
const at = (objective: TraversalObjective): MissionActor => ({ position: { x: objective.position[0], y: objective.position[1], z: objective.position[2] }, state: objective.requiredState ?? 'ON_FOOT' });

test('mission objectives require proximity, correct movement and deliberate interaction', () => {
  const campaign = new MissionProgress([mission('delivery', [goal('pickup', 'interact'), goal('dropoff', 'interact', 50)])]);
  let reward = 0; campaign.onReward = amount => reward += amount;
  campaign.update(1, actor()); assert.equal(campaign.entries[0].step, 0);
  assert.match(campaign.interactionPrompt!, /^E/);
  assert.equal(campaign.interact(actor(20)), false);
  assert.equal(campaign.interact({ ...actor(), state: 'IN_VEHICLE' }), false);
  assert.equal(campaign.interact({ ...actor(), dead: true }), false);
  assert.equal(campaign.interact(actor()), true); assert.equal(campaign.entries[0].step, 1);
  assert.equal(campaign.interact(actor()), false);
  assert.equal(campaign.interact(actor(50)), true); assert.equal(campaign.complete, true);
  assert.equal(reward, 100); assert.equal(campaign.interact(actor(50)), false);
  campaign.update(1, actor(50)); assert.equal(reward, 100);
  assert.equal(objectiveReached({ ...goal('flight'), requiredState: 'WINGSUIT' }, actor().position, 'ON_FOOT'), false);
  assert.equal(objectiveReached({ ...goal('flight'), requiredState: 'WINGSUIT' }, actor().position, 'WINGSUIT'), true);
});

test('continuous reconnaissance resets on leaving or switching, and cannot progress while dead', () => {
  const campaign = new MissionProgress([
    mission('scan', [{ ...goal('signal', 'hold'), holdSeconds: 10 }, goal('report', 'interact', 40)]),
    mission('other', [goal('other-goal', 'interact', 100)]),
  ]);
  campaign.update(6, actor()); assert.equal(campaign.holdProgress, 0.6);
  campaign.update(1, actor(10)); assert.equal(campaign.holdProgress, 0);
  campaign.update(4, actor()); campaign.setTracked('other'); campaign.setTracked('scan'); assert.equal(campaign.holdProgress, 0);
  campaign.update(20, { ...actor(), dead: true }); assert.equal(campaign.holdProgress, 0);
  campaign.update(9, actor()); assert.equal(campaign.entries[0].step, 0);
  campaign.update(1, actor()); assert.equal(campaign.entries[0].step, 1);
});

test('timed deliveries begin on pickup, expire while untracked, and restart without losing unrelated progress', () => {
  const campaign = new MissionProgress([
    mission('express', [goal('pickup', 'interact'), goal('checkpoint', 'visit', 40), goal('delivery', 'interact', 80)], { timeLimit: 20 }),
    mission('side', [goal('side-goal', 'interact', 120)]),
  ]);
  const messages: string[] = []; campaign.onAdvance = message => messages.push(message);
  campaign.update(100, actor(5)); assert.equal(campaign.timeRemaining, 20);
  campaign.interact(actor()); assert.equal(campaign.hasActiveTimer, true);
  campaign.update(9, actor(40)); assert.equal(campaign.entries[0].step, 2);
  campaign.setTracked('side'); campaign.update(11, actor(120));
  assert.equal(campaign.entries[0].step, 0); assert.equal(campaign.hasActiveTimer, false);
  assert.ok(messages.some(message => message.includes('Zeit abgelaufen')));
  campaign.interact(actor(120)); assert.equal(campaign.entries[1].status, 'complete');
  campaign.setTracked('express'); campaign.interact(actor()); campaign.update(1, actor(40)); campaign.interact(actor(80));
  assert.equal(campaign.complete, true); assert.equal(campaign.hasActiveTimer, false);
});

test('liberation depends on actual base state and prerequisites unlock once', () => {
  const campaign = new MissionProgress([
    mission('operation', [{ ...goal('free', 'liberate'), baseId: 'orbis' }, goal('broadcast', 'interact')]),
    mission('aftermath', [goal('meet', 'interact')], { requires: ['operation'] }),
  ]);
  assert.equal(campaign.setTracked('aftermath'), false); assert.equal(campaign.entries[1].status, 'locked');
  campaign.update(1, actor(), { liberatedBaseIds: ['porto'] }); assert.equal(campaign.entries[0].step, 0);
  campaign.update(1, actor(500), { liberatedBaseIds: ['orbis'] }); assert.equal(campaign.entries[0].step, 1);
  campaign.interact(actor()); assert.equal(campaign.tracked.id, 'aftermath');
  assert.equal(campaign.setTracked('operation'), false, 'completed missions cannot be tracked again');
  assert.equal(campaign.setTracked('unknown'), false); assert.equal(campaign.entries[0].status, 'complete');
});

test('campaign save resumes partial work, preserves completed rewards and resets a continuous hold', () => {
  const definitions = [mission('one', [goal('one-a', 'interact')]), mission('two', [goal('two-a', 'interact'), { ...goal('two-b', 'hold', 40), holdSeconds: 10 }])];
  const original = new MissionProgress(definitions);
  original.interact(actor()); original.interact(actor()); original.update(4, actor(40));
  const save = original.saveState(); assert.equal(save.records!.two.hold, 4);
  const restored = new MissionProgress(definitions); let reward = 0; restored.onReward = value => reward += value;
  restored.restore(save);
  assert.equal(restored.tracked.id, 'two'); assert.equal(restored.objective!.id, 'two-b'); assert.equal(restored.holdProgress, 0);
  assert.equal(reward, 0); assert.equal(restored.entries[0].status, 'complete');
  restored.update(10, actor(40)); assert.equal(reward, 100); assert.equal(restored.complete, true);
  restored.restore(restored.saveState()); restored.update(100, actor(40)); assert.equal(reward, 100);
  const snapshot = restored.saveState(); snapshot.records!.one.complete = false;
  assert.equal(restored.entries[0].status, 'complete', 'save must not share mutable records with live state');
});

test('legacy four-checkpoint saves migrate without regranting rewards', () => {
  const campaign = new MissionProgress(missionDefinitions); let reward = 0; campaign.onReward = value => reward += value;
  campaign.restore({ index: 2, elapsed: 42 });
  assert.equal(campaign.objective!.id, traversalRoute[2].id); assert.equal(campaign.time, 42);
  campaign.restore({ index: 4, elapsed: 80 });
  assert.equal(campaign.entries[0].status, 'complete'); assert.notEqual(campaign.tracked.id, 'heights'); assert.equal(reward, 0);
  campaign.reset(); assert.equal(campaign.completedCount, 0); assert.equal(campaign.tracked.id, 'heights');
});

test('authored campaign covers all settlements, bases and destinations with reachable land objectives', () => {
  assert.equal(missionDefinitions.length, 52);
  assert.equal(new Set(missionDefinitions.map(definition => definition.id)).size, missionDefinitions.length);
  const objectives = missionDefinitions.flatMap(definition => definition.objectives);
  assert.ok(objectives.length > 100);
  assert.equal(new Set(objectives.map(objective => objective.id)).size, objectives.length);
  for (const definition of missionDefinitions) {
    assert.ok(definition.objectives.length >= 2);
    assert.ok(definition.requires?.every(id => missionDefinitions.some(item => item.id === id)) ?? true);
    for (const objective of definition.objectives) {
      assert.ok(objective.position.every(Number.isFinite));
      assert.ok(Math.abs(objective.position[0]) < worldConfig.size / 2 && Math.abs(objective.position[2]) < worldConfig.size / 2);
      assert.ok(terrainHeight(objective.position[0], objective.position[2]) > 0.3, `${objective.id} must lie on land`);
      if (definition.id !== 'heights') {
        const harbor = worldLocations.some(place => place.kind === 'harbor' && place.position[0] === objective.position[0] && place.position[1] === objective.position[2]);
        const surface = Math.max(terrainHeight(objective.position[0], objective.position[2]), harbor ? 4.5 : -Infinity);
        assert.ok(Math.abs(objective.position[1] - surface - 1) < 0.01);
      }
    }
  }
  for (const town of settlements) {
    assert.ok(missionDefinitions.some(definition => definition.id === `supply-${town.id}`));
    assert.ok(missionDefinitions.some(definition => definition.id === `community-${town.id}`));
  }
  for (const base of bases) assert.ok(objectives.some(objective => objective.baseId === base.id));
  for (const place of worldLocations) assert.ok(objectives.some(objective => objective.position[0] === place.position[0] && objective.position[2] === place.position[1]), place.id);
});

test('all authored missions can complete in order with no prerequisite deadlocks or duplicate rewards', () => {
  const campaign = new MissionProgress(missionDefinitions); let reward = 0, ticks = 0;
  campaign.onReward = value => reward += value;
  while (!campaign.complete && ticks++ < 500) {
    const objective = campaign.objective; assert.ok(objective, `missing objective for ${campaign.tracked.id}`);
    const player = at(objective);
    if (objective.kind === 'interact') assert.equal(campaign.interact(player), true);
    else campaign.update(objective.kind === 'hold' ? objective.holdSeconds! : 1, player, { liberatedBaseIds: bases.map(base => base.id) });
  }
  assert.equal(campaign.complete, true); assert.equal(campaign.completedCount, missionDefinitions.length);
  assert.equal(reward, missionDefinitions.reduce((total, definition) => total + definition.reward, 0));
  const completed = campaign.saveState(); const restored = new MissionProgress(missionDefinitions);
  restored.onReward = () => assert.fail('Restoring a completed campaign must not grant another reward');
  restored.restore(completed); restored.update(1000, actor());
  assert.equal(restored.complete, true); assert.equal(restored.objective, undefined);
});

test('mission scene objects construct, switch and reset without rendering', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const missions = new MissionManager(scene);
  assert.ok(scene.getMeshByName('mission-target-ring'));
  assert.equal(missions.setTracked('supply-ventosa'), true);
  assert.equal(scene.getMeshByName('mission-cargo')!.isEnabled(), true);
  const pickup = missions.objective!;
  missions.update(1 / 60, at(pickup)); assert.match(missions.interactionPrompt!, /E/);
  assert.equal(missions.interact(at(pickup)), true);
  assert.equal(scene.getMeshByName('mission-cargo')!.isEnabled(), false);
  const saved = missions.saveState(); missions.reset(); missions.restore(saved);
  assert.equal(missions.tracked.id, 'supply-ventosa'); assert.equal(missions.entries[1].step, 1);
  missions.reset(); assert.equal(missions.tracked.id, 'heights');
  scene.dispose(); engine.dispose();
});
