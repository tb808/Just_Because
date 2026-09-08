export class HealthComponent {
  current: number;
  onDamage: (amount: number) => void = () => {};
  onDeath: () => void = () => {};
  constructor(readonly max: number) { this.current = max; }
  get dead() { return this.current <= 0; }
  damage(amount: number) {
    if (this.dead || !Number.isFinite(amount) || amount <= 0) return 0;
    const applied = Math.min(this.current, amount); this.current -= applied; this.onDamage(applied);
    if (this.dead) this.onDeath(); return applied;
  }
  heal(amount: number) { if (!this.dead) this.current = Math.min(this.max, this.current + Math.max(0, amount)); }
  reset() { this.current = this.max; }
}
