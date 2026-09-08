import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Animation, AnimationGroup, NullEngine, Quaternion, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { Player } from '../src/player/Player';
import { Enemy } from '../src/ai/Enemy';
import { DamageSystem } from '../src/combat/DamageSystem';
import type { AssetManager } from '../src/core/AssetManager';
import type { CombatEffects } from '../src/combat/CombatEffects';
import type { CombatAudio } from '../src/combat/CombatAudio';

for (const actor of ['player', 'enemy'] as const) test(`${actor} restores its standing pose after repeated interrupted and finished deaths`, async () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const model = new TransformNode('model', scene), skeletonRoot = new TransformNode('root', scene), torso = new TransformNode('torso', scene);
  skeletonRoot.parent = model; torso.parent = skeletonRoot;
  skeletonRoot.position.set(0, 0.8, 0); skeletonRoot.rotationQuaternion = Quaternion.Identity();
  const death = new AnimationGroup('actor:die', scene);
  const rotation = new Animation('fall', 'rotationQuaternion', 30, Animation.ANIMATIONTYPE_QUATERNION);
  rotation.setKeys([{ frame: 0, value: Quaternion.Identity() }, { frame: 30, value: Quaternion.RotationAxis(Vector3.Right(), Math.PI / 2) }]);
  const position = new Animation('sink', 'position', 30, Animation.ANIMATIONTYPE_VECTOR3);
  position.setKeys([{ frame: 0, value: new Vector3(0, 0.8, 0) }, { frame: 30, value: new Vector3(0, 0.1, -0.5) }]);
  death.addTargetedAnimation(rotation, skeletonRoot); death.addTargetedAnimation(position, skeletonRoot);
  // Like the imported idle clip, this does not animate the fallen root.
  const idle = new AnimationGroup('actor:idle', scene);
  const breathe = new Animation('breathe', 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT);
  breathe.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 0.02 }]); idle.addTargetedAnimation(breathe, torso);
  const manager = { instantiate: async (definition: { animated?: boolean }) => definition.animated
    ? { root: model, entries: { animationGroups: [idle, death] } }
    : { root: new TransformNode('weapon', scene) } } as unknown as AssetManager;
  const player = new Player(scene);
  const enemy = actor === 'enemy' ? new Enemy('enemy-test', scene, new Vector3(5, 2, 5), player, new DamageSystem(), {} as CombatEffects, {} as CombatAudio) : undefined;
  await (enemy ?? player).load(manager);
  for (const frame of [15, 30, 30]) {
    if (enemy) enemy.health.damage(100);
    else { player.dead = true; player.visual.rotation.x = 1; player.animate(0.016); }
    death.goToFrame(frame);
    assert.ok(Math.abs(skeletonRoot.rotationQuaternion!.x) > 0.1, 'death must actually tip the root');
    if (frame === 30) death.stop();
    if (enemy) enemy.reset(); else player.revive();
    assert.ok(skeletonRoot.rotationQuaternion!.equalsWithEpsilon(Quaternion.Identity()), 'root must stand upright immediately');
    assert.ok(skeletonRoot.position.equalsWithEpsilon(new Vector3(0, 0.8, 0)), 'death translation must be restored');
    if (!enemy) { assert.equal(player.visual.rotation.x, 0); player.state = 'ON_FOOT'; player.animate(0.016); }
    assert.equal(death.isPlaying, false);
  }
  scene.dispose(); engine.dispose();
});
