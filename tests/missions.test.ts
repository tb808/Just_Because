import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MissionProgress, objectiveReached, type MissionActor } from '../src/missions/MissionProgress';
import { missionDefinitions, traversalRoute, type MissionDefinition, type TraversalObjective } from '../src/data/missions';
import { bases } from '../src/data/bases';
import { terrainHeight } from '../src/world/Terrain';
import { worldConfig } from '../src/data/config';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { MissionManager } from '../src/missions/MissionManager';
import { screenplay, shotText } from '../src/story/Screenplay';

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

test('legacy saves preserve training and side progress but start the new story without rewards', () => {
  const campaign = new MissionProgress(missionDefinitions); let reward = 0; campaign.onReward = value => reward += value;
  campaign.restore({ index: 2, elapsed: 42 });
  assert.equal(campaign.tracked.id, 'story-01'); assert.equal(campaign.pendingScene, 'arrival');
  campaign.finishScene('arrival'); campaign.setTracked('heights');
  assert.equal(campaign.objective!.id, traversalRoute[2].id); assert.equal(campaign.time, 42);
  campaign.restore({ index: 4, elapsed: 80 });
  assert.equal(campaign.entries.find(e => e.definition.id === 'heights')!.status, 'complete');
  assert.equal(reward, 0);
  campaign.restore({ index: 4, elapsed: 80, trackedId: 'community-ventosa', records: {
    heights: {step:4,elapsed:80,hold:0,complete:true},
    'supply-ventosa': {step:1,elapsed:20,hold:0,complete:false},
    'community-ventosa': {step:4,elapsed:50,hold:0,complete:true},
  } });
  assert.equal(campaign.tracked.id, 'story-01');
  assert.equal(campaign.entries.find(e => e.definition.id === 'supply-ventosa')!.step, 1);
  campaign.reset(); assert.equal(campaign.completedCount, 0); assert.equal(campaign.tracked.id, 'story-01');
});

test('focused campaign has eight sequential chapters, optional diversions and reachable objectives', () => {
  assert.equal(missionDefinitions.length, 13);
  const chapters = missionDefinitions.filter(d => d.chapter);
  assert.equal(chapters.length, 8);
  chapters.forEach((d, i) => { assert.equal(d.chapter, i + 1); if (i) assert.deepEqual(d.requires, [chapters[i - 1].id]); });
  assert.equal(new Set(missionDefinitions.map(d => d.id)).size, missionDefinitions.length);
  const objectives = missionDefinitions.flatMap(d => d.objectives);
  assert.equal(new Set(objectives.map(o => o.id)).size, objectives.length);
  for (const definition of missionDefinitions) {
    assert.ok(definition.objectives.length >= 2);
    assert.ok(definition.requires?.every(id => missionDefinitions.some(d => d.id === id)) ?? true);
    for (const objective of definition.objectives) {
      assert.ok(objective.position.every(Number.isFinite));
      assert.ok(Math.abs(objective.position[0]) < worldConfig.size / 2 && Math.abs(objective.position[2]) < worldConfig.size / 2);
      assert.ok(terrainHeight(objective.position[0], objective.position[2]) > 0.3, objective.id);
      assert.ok(objective.position[1] >= terrainHeight(objective.position[0], objective.position[2]));
      if (objective.baseId) assert.ok(bases.some(b => b.id === objective.baseId));
    }
  }
  assert.equal(chapters.flatMap(d => d.objectives).filter(o => o.kind === 'liberate').length, 3, 'story does not require all ten bases');
  const referencedScenes = chapters.flatMap(d => [d.introScene, ...d.objectives.map(o => o.scene)]).filter(Boolean);
  assert.equal(new Set(referencedScenes).size, referencedScenes.length);
  assert.deepEqual([...referencedScenes].sort(), screenplay.map(s => s.id).sort());
  for (const scene of screenplay) {
    assert.ok(scene.shots.length >= 3);
    if (typeof scene.anchor === 'string') assert.ok(objectives.some(o => o.id === scene.anchor));
    for (const shot of scene.shots) { assert.ok(shot.seconds >= 5); assert.ok(shot.text.length); }
  }
});

test('all authored missions can complete in order with no prerequisite deadlocks or duplicate rewards', () => {
  const campaign = new MissionProgress(missionDefinitions); let reward = 0, ticks = 0;
  campaign.onReward = value => reward += value;
  while (!campaign.complete && ticks++ < 500) {
    if (campaign.pendingScene) { campaign.finishScene(campaign.pendingScene, 'shield'); continue; }
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
  missions.finishScene('arrival');
  assert.ok(scene.getMeshByName('mission-target-ring'));
  assert.equal(missions.setTracked('supply-ventosa'), true);
  assert.equal(scene.getMeshByName('mission-cargo')!.isEnabled(), true);
  const pickup = missions.objective!;
  missions.update(1 / 60, at(pickup)); assert.match(missions.interactionPrompt!, /E/);
  assert.equal(missions.interact(at(pickup)), true);
  assert.equal(scene.getMeshByName('mission-cargo')!.isEnabled(), false);
  const saved = missions.saveState(); missions.reset(); missions.restore(saved);
  assert.equal(missions.tracked.id, 'supply-ventosa'); assert.equal(missions.entries.find(e => e.definition.id === 'supply-ventosa')!.step, 1);
  missions.reset(); assert.equal(missions.tracked.id, 'story-01');
  scene.dispose(); engine.dispose();
});

for (const choice of ['open', 'shield'] as const) test(`story plays through ${choice} ending without side missions and survives every checkpoint reload`, () => {
  let campaign = new MissionProgress(missionDefinitions), rewards = 0, safety = 0;
  const visited: string[] = [], scenes: string[] = [];
  const bind = () => campaign.onReward = amount => rewards += amount; bind();
  while ((!campaign.storyComplete || campaign.pendingScene) && safety++ < 200) {
    const saved = campaign.saveState();
    const restored = new MissionProgress(missionDefinitions); restored.restore(saved); campaign = restored; bind();
    if (campaign.pendingScene) {
      const id = campaign.pendingScene; scenes.push(id);
      const step = campaign.entries.find(e => e.definition.id === campaign.tracked.id)!.step;
      const target = campaign.objective;
      if (target) { campaign.update(999, at(target), {liberatedBaseIds:bases.map(b => b.id)}); assert.equal(campaign.interact(at(target)), false); }
      assert.equal(campaign.entries.find(e => e.definition.id === campaign.tracked.id)!.step, step, 'cutscene pauses goals and timers');
      if (id === 'decision') assert.equal(campaign.finishScene(id), false, 'skipping a film cannot silently select a moral choice');
      assert.equal(campaign.finishScene('wrong-scene'), false);
      assert.equal(campaign.finishScene(id, choice), true);
      assert.equal(campaign.finishScene(id, choice), false, 'scene cannot commit twice');
      continue;
    }
    assert.ok(campaign.tracked.chapter, 'must not auto-switch into side quests before epilogue');
    const objective = campaign.objective!; visited.push(objective.id);
    if (objective.kind === 'interact') assert.equal(campaign.interact(at(objective)), true);
    else campaign.update(objective.holdSeconds ?? 1, at(objective), {liberatedBaseIds:bases.map(b => b.id)});
  }
  assert.ok(safety < 200); assert.equal(campaign.storyComplete, true); assert.equal(campaign.complete, false);
  assert.equal(campaign.choice, choice); assert.equal(visited.includes('story-shield'), choice === 'shield');
  assert.deepEqual(scenes, screenplay.map(s => s.id));
  assert.equal(campaign.storyCompletedCount, 8);
  assert.equal(rewards, missionDefinitions.filter(d => d.chapter).reduce((sum, d) => sum + d.reward, 0));
  assert.equal(campaign.seen.length, screenplay.length);
  const home = screenplay.find(s => s.id === 'home')!.shots[2];
  assert.match(shotText(home, choice), choice === 'shield' ? /Alma/ : /Adressen/);
});

test('a pending decision and active optional timer round-trip without advancing time', () => {
  const campaign = new MissionProgress(missionDefinitions); campaign.finishScene('arrival');
  campaign.setTracked('timed-south-express'); campaign.interact(at(campaign.objective!));
  const state = campaign.saveState(); state.story!.pending = ['decision'];
  const restored = new MissionProgress(missionDefinitions); restored.restore(state);
  const remaining = restored.timeRemaining;
  restored.update(500, actor()); assert.equal(restored.timeRemaining, remaining);
  assert.equal(restored.pendingScene, 'decision');
  restored.finishScene('decision', 'shield'); assert.equal(restored.choice, 'shield');
  restored.update(2, actor()); assert.equal(restored.timeRemaining, remaining! - 2);
});
