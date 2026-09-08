import type { MissionDefinition, TraversalObjective } from '../data/missions';

export interface MissionActor { position: { x: number; y: number; z: number }; state: string; dead?: boolean }
export interface MissionRecord { step: number; elapsed: number; hold: number; complete: boolean }
export interface MissionSaveState {
  /** Kept so saves made before the island campaign still load. */
  index: number;
  elapsed: number;
  trackedId?: string;
  records?: Record<string, MissionRecord>;
}
export type MissionStatus = 'locked' | 'available' | 'active' | 'complete';
export interface MissionEntry {
  definition: MissionDefinition;
  status: MissionStatus;
  step: number;
  total: number;
  progress: number;
}

export function objectiveReached(objective: TraversalObjective, position: MissionActor['position'], state: string) {
  const [x, y, z] = objective.position;
  return (position.x - x) ** 2 + (position.y - y) ** 2 + (position.z - z) ** 2 <= objective.radius ** 2
    && (!objective.requiredState || objective.requiredState === state);
}

const freshRecord = (): MissionRecord => ({ step: 0, elapsed: 0, hold: 0, complete: false });
const safeNumber = (value: number, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;

/** Pure campaign state, independent of scenes, input and rendering. */
export class MissionProgress {
  private records = new Map<string, MissionRecord>();
  private trackedId: string;
  private lastActor?: MissionActor;
  onAdvance: (message: string) => void = () => {};
  onReward: (score: number) => void = () => {};

  constructor(readonly definitions: readonly MissionDefinition[]) {
    if (!definitions.length) throw new Error('A campaign must contain at least one mission.');
    this.trackedId = definitions[0].id;
    this.reset();
  }
  get tracked() { return this.definitions.find(definition => definition.id === this.trackedId)!; }
  private get record() { return this.records.get(this.trackedId)!; }
  get objective() { return this.record.complete ? undefined : this.tracked.objectives[this.record.step]; }
  get complete() { return this.definitions.every(definition => this.records.get(definition.id)!.complete); }
  get completedCount() { return this.definitions.filter(definition => this.records.get(definition.id)!.complete).length; }
  get progress() { return this.record.complete ? 1 : (this.record.step + this.holdProgress) / this.tracked.objectives.length; }
  get holdProgress() { return this.objective?.kind === 'hold' ? Math.min(1, this.record.hold / (this.objective.holdSeconds ?? 8)) : 0; }
  get time() { return this.record.elapsed; }
  get timeRemaining() { return this.tracked.timeLimit === undefined ? undefined : Math.max(0, this.tracked.timeLimit - this.record.elapsed); }
  get hasActiveTimer() { return this.definitions.some(definition => definition.timeLimit !== undefined && this.records.get(definition.id)!.step > 0 && !this.records.get(definition.id)!.complete); }
  get count() {
    const stages = `${Math.min(this.record.step, this.tracked.objectives.length)} / ${this.tracked.objectives.length} ZIELE`;
    if (this.objective?.kind === 'hold') return `${stages} · SIGNAL ${Math.floor(this.record.hold)} / ${this.objective.holdSeconds ?? 8} S`;
    if (this.tracked.timeLimit !== undefined && this.record.step > 0 && !this.record.complete) return `${stages} · ${Math.ceil(this.timeRemaining!)} S ÜBRIG`;
    return `${stages} · ${this.completedCount} / ${this.definitions.length} AUFTRÄGE`;
  }
  get mapTarget() {
    const objective = this.objective;
    return objective ? { position: objective.position, title: objective.title, kind: objective.kind ?? 'visit', missionId: this.trackedId } : undefined;
  }
  get interactionPrompt() {
    return this.lastActor && !this.lastActor.dead && this.objective?.kind === 'interact'
      && this.lastActor.state === 'ON_FOOT' && objectiveReached(this.objective, this.lastActor.position, this.lastActor.state)
      ? `E · ${this.objective.action ?? this.objective.title}` : undefined;
  }
  get entries(): MissionEntry[] {
    return this.definitions.map(definition => {
      const record = this.records.get(definition.id)!;
      return {
        definition, status: this.status(definition), step: record.step, total: definition.objectives.length,
        progress: record.complete ? 1 : record.step / definition.objectives.length,
      };
    });
  }
  private status(definition: MissionDefinition): MissionStatus {
    const record = this.records.get(definition.id)!;
    if (record.complete) return 'complete';
    if (definition.requires?.some(id => !this.records.get(id)?.complete)) return 'locked';
    return record.step > 0 || definition.id === this.trackedId ? 'active' : 'available';
  }
  setTracked(id: string) {
    const definition = this.definitions.find(item => item.id === id);
    if (!definition || this.status(definition) === 'locked' || this.status(definition) === 'complete') return false;
    if (this.trackedId !== id) this.record.hold = 0;
    this.trackedId = id;
    return true;
  }
  cycle() {
    const start = this.definitions.findIndex(definition => definition.id === this.trackedId);
    for (let offset = 1; offset <= this.definitions.length; offset++) {
      const definition = this.definitions[(start + offset) % this.definitions.length];
      if (!this.records.get(definition.id)!.complete && this.status(definition) !== 'locked') { this.setTracked(definition.id); return; }
    }
  }
  update(dt: number, actor: MissionActor, context: { liberatedBaseIds?: readonly string[] } = {}) {
    this.lastActor = actor;
    if (actor.dead || !Number.isFinite(dt) || dt <= 0) return;
    // Started deliveries keep their clock when another mission is tracked.
    let trackedFailed = false;
    for (const definition of this.definitions) {
      const record = this.records.get(definition.id)!;
      if (record.complete || this.status(definition) === 'locked') continue;
      if (record.step > 0 || definition.id === this.trackedId && definition.timeLimit === undefined) record.elapsed += dt;
      if (definition.timeLimit !== undefined && record.step > 0 && record.elapsed >= definition.timeLimit) {
        this.records.set(definition.id, freshRecord());
        trackedFailed ||= definition.id === this.trackedId;
        this.onAdvance(`${definition.title}: Zeit abgelaufen. Hole die Sendung erneut ab; du verlierst keine Punkte.`);
      }
    }
    if (trackedFailed) return;
    const objective = this.objective;
    if (!objective || this.status(this.tracked) === 'locked') return;
    if (objective.kind === 'liberate') {
      if (objective.baseId && context.liberatedBaseIds?.includes(objective.baseId)) this.advance();
      return;
    }
    const reached = objectiveReached(objective, actor.position, actor.state);
    if (objective.kind === 'hold') {
      this.record.hold = reached ? this.record.hold + dt : 0;
      if (this.record.hold >= (objective.holdSeconds ?? 8)) this.advance();
    } else if (objective.kind !== 'interact' && reached) this.advance();
  }
  interact(actor: MissionActor, _liberatedBaseIds: readonly string[] = []) {
    this.lastActor = actor;
    const objective = this.objective;
    if (actor.dead || actor.state !== 'ON_FOOT' || !objective || objective.kind !== 'interact'
      || this.status(this.tracked) === 'locked' || !objectiveReached(objective, actor.position, actor.state)) return false;
    this.advance(); return true;
  }
  private advance() {
    const definition = this.tracked, record = this.record;
    if (record.complete) return;
    record.step++; record.hold = 0;
    if (record.step >= definition.objectives.length) {
      record.complete = true;
      this.onReward(definition.reward);
      this.onAdvance(`${definition.title} abgeschlossen · +${definition.reward.toLocaleString('de-CH')} Punkte · ${this.completedCount}/${this.definitions.length} Aufträge`);
      this.cycle();
    } else this.onAdvance(`Ziel erreicht · ${definition.objectives[record.step].title}`);
  }
  saveState(): MissionSaveState {
    const original = this.records.get(this.definitions[0].id)!;
    return {
      index: original.step, elapsed: original.elapsed, trackedId: this.trackedId,
      records: Object.fromEntries([...this.records].map(([id, record]) => [id, { ...record }])),
    };
  }
  restore(state: MissionSaveState) {
    this.reset();
    if (state.records) {
      for (const definition of this.definitions) {
        const saved = state.records[definition.id];
        if (!saved) continue;
        const step = Math.floor(safeNumber(saved.step, definition.objectives.length));
        const complete = saved.complete === true || step === definition.objectives.length;
        this.records.set(definition.id, {
          step: complete ? definition.objectives.length : step, elapsed: safeNumber(saved.elapsed),
          // A continuous reconnaissance hold resumes from zero after loading.
          hold: 0, complete,
        });
      }
    } else {
      const first = this.definitions[0];
      const step = Math.floor(safeNumber(state.index, first.objectives.length));
      this.records.set(first.id, { step, elapsed: safeNumber(state.elapsed), hold: 0, complete: step === first.objectives.length });
    }
    if (!state.trackedId || !this.setTracked(state.trackedId) || this.record.complete) {
      const next = this.definitions.find(definition => !this.records.get(definition.id)!.complete && this.status(definition) !== 'locked');
      if (next) this.trackedId = next.id;
    }
  }
  reset() {
    this.records.clear();
    this.definitions.forEach(definition => this.records.set(definition.id, freshRecord()));
    this.trackedId = this.definitions[0].id; this.lastActor = undefined;
  }
}
