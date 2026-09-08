export const bindings = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  sprint: 'ShiftLeft', jump: 'Space', grapple: 'KeyF', parachute: 'KeyQ',
  wingsuit: 'KeyC', interact: 'KeyE', reset: 'Backspace', reload: 'KeyR', rifle: 'Digit1', launcher: 'Digit2', mission: 'KeyM', fire: 'KeyJ',
  lookLeft: 'ArrowLeft', lookRight: 'ArrowRight', lookUp: 'ArrowUp', lookDown: 'ArrowDown', nextBase: 'KeyN', map: 'Tab',
} as const;
type Action = keyof typeof bindings;

export class InputManager {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private abort = new AbortController();
  lookX = 0;
  lookY = 0;
  zoom = 0;
  aiming = false;
  firing = false;
  dragMode = false;
  onPause: () => void = () => {};
  get locked() { return document.pointerLockElement === this.canvas || this.dragMode; }

  constructor(private canvas: HTMLCanvasElement) {
    const signal = this.abort.signal;
    window.addEventListener('keydown', e => {
      if (!this.locked) return;
      if (e.code === 'Escape') { this.dragMode = false; this.clear(); document.exitPointerLock(); this.onPause(); return; }
      if (Object.values(bindings).includes(e.code as typeof bindings[Action])) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    }, { signal });
    window.addEventListener('keyup', e => this.held.delete(e.code), { signal });
    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement === this.canvas || (this.dragMode && (e.buttons & 2))) { this.lookX += e.movementX; this.lookY += e.movementY; }
    }, { signal });
    canvas.addEventListener('mousedown', e => { if (this.locked) { if (e.button === 0) { this.firing = true; this.pressed.add(bindings.fire); } if (e.button === 2) this.aiming = true; } }, { signal });
    window.addEventListener('mouseup', e => { if (e.button === 2) this.aiming = false; if (e.button === 0) this.firing = false; }, { signal });
    canvas.addEventListener('contextmenu', e => e.preventDefault(), { signal });
    canvas.addEventListener('wheel', e => { if (this.locked) { this.zoom += Math.sign(e.deltaY); e.preventDefault(); } }, { signal, passive: false });
    document.addEventListener('pointerlockchange', () => { if (!this.locked) { this.clear(); this.onPause(); } }, { signal });
    window.addEventListener('blur', () => { this.dragMode = false; this.clear(); document.exitPointerLock(); this.onPause(); }, { signal });
  }
  async lock() { this.dragMode = false; try { await this.canvas.requestPointerLock(); } catch { this.dragMode = true; } }
  down(action: Action) { return this.held.has(bindings[action]) || (action === 'sprint' && this.held.has('ShiftRight')); }
  take(action: Action) { const key = bindings[action]; const value = this.pressed.has(key); this.pressed.delete(key); return value; }
  axes() { return { x: Number(this.down('right')) - Number(this.down('left')), z: Number(this.down('forward')) - Number(this.down('back')) }; }
  clear() { this.held.clear(); this.pressed.clear(); this.lookX = this.lookY = this.zoom = 0; this.aiming = this.firing = false; }
  dispose() { this.abort.abort(); }
}
