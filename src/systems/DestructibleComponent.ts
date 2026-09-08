import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import type { WorldDestructible } from '../world/WorldManager';
import { HealthComponent } from './HealthComponent';
import { DamageSystem } from '../combat/DamageSystem';
import { ExplosionSystem } from '../combat/ExplosionSystem';

export class DestructibleComponent {
  readonly health = new HealthComponent(80);
  private wreck: Mesh;
  private shake = 0;
  constructor(scene: Scene, readonly object: WorldDestructible, damage: DamageSystem, explosions: ExplosionSystem) {
    const position = object.collider.position.clone();
    damage.register({ id: object.id, health: this.health, position, faction: 'neutral', radius: 2.5 });
    this.wreck = MeshBuilder.CreateCylinder(`${object.id}-wreck`, { height: 0.65, diameter: 4.5, tessellation: 9 }, scene);
    this.wreck.position.copyFrom(object.root.position); this.wreck.position.y += 0.5; this.wreck.rotation.z = 0.09;
    const material = new StandardMaterial(`${object.id}-burnt`, scene); material.diffuseColor = Color3.FromHexString('#283638'); material.specularColor = Color3.Black(); this.wreck.material = material;
    this.wreck.setEnabled(false); this.wreck.isPickable = false;
    this.health.onDamage = () => this.shake = 0.3;
    this.health.onDeath = () => {
      this.setStreamHidden(true);
      object.root.setEnabled(false); object.collider.setEnabled(false); this.wreck.setEnabled(true);
      explosions.enqueue({ position, radius: 18, damage: 240, source: object.id });
    };
  }
  update(dt: number) { this.shake = Math.max(0, this.shake - dt); if (!this.health.dead) this.object.root.rotation.z = Math.sin(this.shake * 85) * this.shake * 0.09; }
  restoreDestroyed() {
    this.setStreamHidden(true);
    this.health.current = 0; this.object.root.setEnabled(false); this.object.collider.setEnabled(false); this.wreck.setEnabled(true); this.shake = 0;
  }
  private setStreamHidden(hidden: boolean) {
    for (const node of [this.object.root,this.object.collider]) node.metadata = {...node.metadata,streamHidden:hidden};
  }
  reset() { this.setStreamHidden(false); this.health.reset(); this.object.root.setEnabled(true); this.object.root.rotation.z = 0; this.object.collider.setEnabled(true); this.wreck.setEnabled(false); this.shake = 0; }
}
