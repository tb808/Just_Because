import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { ExplosionSystem } from './ExplosionSystem';
import { CombatEffects } from './CombatEffects';
interface Rocket { mesh: Mesh; velocity: Vector3; life: number; trail: number; damage: number; radius: number }
export class ProjectileManager {
  private rockets: Rocket[] = [];
  constructor(private scene: Scene, private explosions: ExplosionSystem, private effects: CombatEffects) {
    const material = new StandardMaterial('rocket-hot', scene); material.emissiveColor = Color3.FromHexString('#ffc25c'); material.disableLighting = true;
    for (let i = 0; i < 8; i++) {
      const mesh = MeshBuilder.CreateSphere(`rocket-${i}`, { diameter: 0.22, segments: 6 }, scene); mesh.material = material; mesh.isPickable = false; mesh.setEnabled(false);
      this.rockets.push({ mesh, velocity: Vector3.Zero(), life: 0, trail: 0, damage: 0, radius: 0 });
    }
  }
  launch(position: Vector3, velocity: Vector3, damage: number, radius: number, range: number) {
    const rocket = this.rockets.find(r => r.life <= 0); if (!rocket) return false;
    rocket.mesh.position.copyFrom(position); rocket.velocity.copyFrom(velocity); rocket.life = range / velocity.length(); rocket.trail = 0;
    rocket.damage = damage; rocket.radius = radius; rocket.mesh.setEnabled(true); return true;
  }
  update(dt: number) {
    for (const rocket of this.rockets) if (rocket.life > 0) {
      const distance = rocket.velocity.length() * dt;
      const hit = this.scene.pickWithRay(new Ray(rocket.mesh.position, rocket.velocity.normalizeToNew(), distance), m => m.checkCollisions || (!!m.metadata?.damageId && m.metadata.damageId !== 'player'));
      rocket.life -= dt;
      if (hit?.hit || rocket.life <= 0) {
        if (hit?.pickedPoint) this.explosions.enqueue({ position: hit.pickedPoint, radius: rocket.radius, damage: rocket.damage, source: 'player' });
        rocket.life = 0; rocket.mesh.setEnabled(false); continue;
      }
      rocket.mesh.position.addInPlace(rocket.velocity.scale(dt)); rocket.trail -= dt;
      if (rocket.trail <= 0) { rocket.trail = 0.035; this.effects.smoke(rocket.mesh.position); }
    }
  }
  reset() { this.rockets.forEach(r => { r.life = 0; r.mesh.setEnabled(false); }); }
}
