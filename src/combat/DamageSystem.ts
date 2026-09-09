import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HealthComponent } from '../systems/HealthComponent';
export interface DamageTarget { id: string; health: HealthComponent; position: Vector3; faction: 'player' | 'enemy' | 'neutral'; radius: number; canDamage?: () => boolean; lastSource?: string }
export class DamageSystem {
  readonly targets = new Map<string, DamageTarget>();
  onHit: (target: DamageTarget, source: string, damage: number) => void = () => {};
  register(target: DamageTarget) { this.targets.set(target.id, target); }
  hit(id: string, amount: number, source: string) {
    const target = this.targets.get(id); if (!target || target.health.dead || target.canDamage?.() === false) return false;
    if (source === 'player' && target.faction === 'player') return false;
    if (source.startsWith('enemy') && target.faction === 'enemy') return false;
    target.lastSource = source;
    const dealt = target.health.damage(amount); if (dealt > 0) this.onHit(target, source, dealt); return dealt > 0;
  }
}
