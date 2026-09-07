import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { type AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { AssetManager } from '../core/AssetManager';
import { assets } from '../data/assets';
import type { PlayerState } from './PlayerState';

export class Player {
  readonly body: Mesh;
  readonly visual: TransformNode;
  readonly velocity = Vector3.Zero();
  state: PlayerState = 'FALLING';
  private animations: AnimationGroup[] = [];
  private activeAnimation?: AnimationGroup;
  constructor(scene: Scene) {
    this.body = MeshBuilder.CreateBox('player-collider', { width: 0.76, height: 1.8, depth: 0.76 }, scene);
    this.body.visibility = 0; this.body.isPickable = false;
    this.body.ellipsoid.set(0.38, 0.9, 0.38);
    this.visual = new TransformNode('player-visual', scene); this.visual.parent = this.body; this.visual.position.y = -0.9;
  }
  get position() { return this.body.position; }
  get speed() { return this.state === 'ON_FOOT' ? Math.hypot(this.velocity.x, this.velocity.z) : this.velocity.length(); }
  async load(assetsManager: AssetManager) {
    const model = await assetsManager.instantiate(assets.characters.player, 'Nika Serrin'); model.root.parent = this.visual;
    this.animations = model.entries?.animationGroups ?? [];
  }
  animate(dt: number) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const name = this.state === 'ON_FOOT' ? speed > 9 ? 'sprint' : speed > 0.7 ? 'walk' : 'idle' : 'holding-both';
    const target = this.animations.find(a => a.name.endsWith(`:${name}`) || a.name === name);
    if (target && target !== this.activeAnimation) { this.activeAnimation?.stop(); target.start(true); this.activeAnimation = target; }
    if (speed > 0.5) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      const delta = Math.atan2(Math.sin(angle - this.visual.rotation.y), Math.cos(angle - this.visual.rotation.y));
      this.visual.rotation.y += delta * (1 - Math.exp(-12 * dt));
    }
    const pitch = this.state === 'WINGSUIT' ? Math.PI / 2.7 : 0;
    this.visual.rotation.x += (pitch - this.visual.rotation.x) * (1 - Math.exp(-8 * dt));
  }
}
