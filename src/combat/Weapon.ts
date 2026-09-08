import type { WeaponDefinition } from '../data/weapons';
export class Weapon {
  ammo: number;
  reserve: number;
  cooldown = 0;
  reloadRemaining = 0;
  constructor(readonly definition: WeaponDefinition) { this.ammo = definition.magazineSize; this.reserve = definition.reserve; }
  get reloading() { return this.reloadRemaining > 0; }
  get reloadProgress() { return this.reloading ? 1 - this.reloadRemaining / this.definition.reloadTime : 0; }
  update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - dt);
      if (!this.reloadRemaining) { const count = Math.min(this.definition.magazineSize - this.ammo, this.reserve); this.ammo += count; this.reserve -= count; }
    }
  }
  fire() {
    if (this.cooldown > 0 || this.reloading || this.ammo <= 0) return false;
    this.ammo--; this.cooldown = 1 / this.definition.fireRate; return true;
  }
  reload() {
    if (this.reloading || this.reserve <= 0 || this.ammo === this.definition.magazineSize) return false;
    this.reloadRemaining = this.definition.reloadTime; return true;
  }
  reset() { this.ammo = this.definition.magazineSize; this.reserve = this.definition.reserve; this.cooldown = this.reloadRemaining = 0; }
}
