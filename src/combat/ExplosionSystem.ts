import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { DamageSystem } from './DamageSystem';
import { CombatEffects } from './CombatEffects';
import { CombatAudio } from './CombatAudio';
export interface Explosion { position: Vector3; radius: number; damage: number; source: string }
export function radialDamage(distance: number, radius: number, amount: number) { return radius > 0 ? Math.max(0, 1 - distance / radius) * amount : 0; }
export class ExplosionSystem {
  private queue: Explosion[] = [];
  onBlast: (explosion: Explosion) => void = () => {};
  constructor(private scene: Scene, private damage: DamageSystem, private effects: CombatEffects, private audio: CombatAudio, private listener: Vector3) {}
  enqueue(explosion: Explosion) { if (this.queue.length < 32) this.queue.push({ ...explosion, position: explosion.position.clone() }); }
  update() {
    // Bounded queue permits chain reactions without recursion or repeated death events.
    for (let processed = 0; processed < 4 && this.queue.length; processed++) {
      const blast = this.queue.shift()!;
      this.effects.explosion(blast.position, blast.radius); this.audio.play('explosion', Vector3.Distance(blast.position, this.listener)); this.onBlast(blast);
      for (const target of this.damage.targets.values()) {
        if (target.health.dead) continue;
        const difference = target.position.subtract(blast.position), distance = difference.length();
        const amount = radialDamage(Math.max(0, distance - target.radius), blast.radius, blast.damage); if (amount <= 0) continue;
        const cover = distance > 0.1 ? this.scene.pickWithRay(new Ray(blast.position, difference.normalize(), distance), m => m.checkCollisions && !m.metadata?.damageId) : null;
        this.damage.hit(target.id, cover?.hit && cover.distance < distance - target.radius ? amount * 0.15 : amount, blast.source);
      }
    }
  }
  reset() { this.queue.length = 0; }
}
