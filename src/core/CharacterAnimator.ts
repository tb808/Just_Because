import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/** Blend locomotion separately from arm/torso overlays, so firing doesn't stop the legs. */
export class CharacterAnimator {
  private weights = new Map<AnimationGroup, number>();
  private clips = new Map<string, AnimationGroup>();
  private overlays = new Map<string, AnimationGroup>();
  private masked = new Map<string, AnimationGroup>();
  private dead = false;
  private restPose: Array<{
    node: TransformNode;
    position: TransformNode['position'];
    rotation: TransformNode['rotation'];
    quaternion: TransformNode['rotationQuaternion'];
    scaling: TransformNode['scaling'];
  }> = [];
  constructor(groups: AnimationGroup[], scene: Scene) {
    for (const group of groups) { this.clips.set(group.name.split(':').pop()!, group); group.stop(); }
    const targets = new Set(groups.flatMap(group => group.targetedAnimations.map(track => track.target)));
    for (const node of targets) if (node instanceof TransformNode) {
      this.restPose.push({ node, position: node.position.clone(), rotation: node.rotation.clone(), quaternion: node.rotationQuaternion?.clone() ?? null, scaling: node.scaling.clone() });
    }
    const idle = this.clips.get('idle'), staticPose = this.clips.get('static');
    if (idle && staticPose) {
      const groundedIdle = new AnimationGroup('grounded:idle', scene);
      for (const target of idle.targetedAnimations) groundedIdle.addTargetedAnimation(target.animation, target.target);
      for (const target of staticPose.targetedAnimations) {
        if (!/root|hip|leg|foot/i.test(target.target.name)) continue;
        const duplicate = idle.targetedAnimations.some(current => current.target === target.target && current.animation.targetProperty === target.animation.targetProperty);
        if (!duplicate) groundedIdle.addTargetedAnimation(target.animation, target.target);
      }
      this.clips.set('idle', groundedIdle);
    }
    for (const name of ['holding-both', 'holding-both-shoot', 'interact-right']) {
      const original = this.clips.get(name); if (!original) continue;
      const upper = new AnimationGroup(`upper:${name}`, scene);
      for (const target of original.targetedAnimations) if (/arm|torso|head/.test(target.target.name)) upper.addTargetedAnimation(target.animation, target.target);
      this.overlays.set(name, upper);
    }
  }
  update(dt: number, locomotion: string, overlay?: string) {
    if (this.dead) return;
    const upper = overlay ? this.overlays.get(overlay) : undefined;
    let base = this.clips.get(locomotion) ?? this.clips.get('idle');
    if (base && upper) {
      const key = `${locomotion}:${overlay}`;
      let masked = this.masked.get(key);
      if (!masked) {
        masked = new AnimationGroup(`lower:${key}`, base.getScene());
        // A target/property belongs to one layer: a full-weight walk must not
        // average the raised shooting arms back toward the walking pose.
        const covered = upper.targetedAnimations;
        for (const target of base.targetedAnimations) {
          if (!covered.some(t => t.target === target.target && t.animation.targetProperty === target.animation.targetProperty)) masked.addTargetedAnimation(target.animation, target.target);
        }
        this.masked.set(key, masked);
      }
      base = masked;
    }
    for (const group of [base, upper]) if (group && !this.weights.has(group)) { group.start(true); group.setWeightForAllAnimatables(0); this.weights.set(group, 0); }
    for (const [group, value] of this.weights) {
      const desired = group === upper || group === base ? 1 : 0;
      const next = value + (desired - value) * (1 - Math.exp(-18 * dt));
      group.setWeightForAllAnimatables(next); this.weights.set(group, next);
      if (desired === 0 && next < 0.005) { group.stop(); this.weights.delete(group); }
    }
  }
  die() { if (this.dead) return; this.dead = true; this.stop(); this.clips.get('die')?.start(false); }
  suspend() { this.stop(); }
  reset() {
    this.stop(); this.clips.get('die')?.stop();
    // Stopping a clip leaves its last transforms in place. Idle does not key
    // every body part (especially the fallen root), so restore the bind pose.
    for (const pose of this.restPose) {
      pose.node.position.copyFrom(pose.position); pose.node.rotation.copyFrom(pose.rotation);
      pose.node.rotationQuaternion = pose.quaternion?.clone() ?? null;
      pose.node.scaling.copyFrom(pose.scaling);
    }
    this.dead = false;
  }
  private stop() { this.weights.forEach((_, g) => g.stop()); this.weights.clear(); }
}
