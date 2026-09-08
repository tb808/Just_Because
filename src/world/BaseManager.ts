import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { bases, captureDuration, captureRadius, type BaseDefinition } from '../data/bases';

export interface BaseStatus { definition: BaseDefinition; guards: number; tanks: number; capture: number; liberated: boolean }
/** Progress belongs to stable base IDs, independently of active world chunks. */
export class BaseManager {
  readonly states: BaseStatus[];
  selected = 0;
  onLiberated: (base: BaseDefinition) => void = () => {};
  constructor(definitions = bases) { this.states = definitions.map(definition => ({ definition, guards: 0, tanks: 0, capture: 0, liberated: false })); }
  get tracked() { return this.states[this.selected]; }
  get liberatedCount() { return this.states.filter(b => b.liberated).length; }
  get complete() { return this.liberatedCount === this.states.length; }
  next() { this.selected = (this.selected + 1) % this.states.length; }
  update(dt: number, position: Vector3, alive: boolean, destroyed: (id: string) => boolean) {
    for (const base of this.states) {
      if (base.liberated) continue;
      const def = base.definition;
      base.guards = def.guards.filter(g => destroyed(g.id)).length;
      base.tanks = def.tanks.filter(t => destroyed(t.id)).length;
      const cleared = base.guards === def.guards.length && base.tanks === def.tanks.length;
      const inside = Vector3.DistanceSquared(position, Vector3.FromArray(def.flag)) < captureRadius ** 2;
      if (cleared && inside && alive) {
        base.capture = Math.min(captureDuration, base.capture + dt);
        if (base.capture === captureDuration) { base.liberated = true; this.onLiberated(def); }
      } else base.capture = 0;
    }
  }
  restore(selected: number, liberatedIds: readonly string[]) {
    this.reset(); this.selected = Math.max(0, Math.min(this.states.length - 1, Math.floor(selected)));
    const liberated = new Set(liberatedIds);
    for (const state of this.states) if (liberated.has(state.definition.id)) {
      state.guards = state.definition.guards.length; state.tanks = state.definition.tanks.length;
      state.capture = captureDuration; state.liberated = true;
    }
  }
  reset() { this.selected = 0; for (const state of this.states) { state.guards = state.tanks = state.capture = 0; state.liberated = false; } }
}
