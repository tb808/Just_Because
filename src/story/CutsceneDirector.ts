import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetManager, ModelInstance } from '../core/AssetManager';
import { CharacterAnimator } from '../core/CharacterAnimator';
import type { InputManager } from '../core/InputManager';
import { assets } from '../data/assets';
import { missionDefinitions, type TraversalObjective } from '../data/missions';
import { terrainHeight } from '../world/Terrain';
import { pickCollision } from '../world/CollisionQueries';
import { screenplay, shotText, storyChoices, type Framing, type StoryChoice, type StoryScene } from './Screenplay';

type Actor = { model: ModelInstance; animator: CharacterAnimator };
const frames: Record<Framing, { from: number[]; to: number[]; look: number[]; fov: number }> = {
  wide: { from: [12, 8, -16], to: [8, 5, -12], look: [0, 1, 0], fov: .76 },
  nika: { from: [1, 1.8, -3.8], to: [.5, 1.7, -3.2], look: [-1, 1.35, 0], fov: .58 },
  partner: { from: [-1.2, 1.8, -3.6], to: [-.7, 1.65, -3.2], look: [1.1, 1.35, 0], fov: .58 },
  two: { from: [0, 2.2, -6], to: [.8, 2, -5.2], look: [0, 1.15, 0], fov: .68 },
  detail: { from: [2.6, 2.7, -3.2], to: [2, 2.5, -2.8], look: [0, .85, 0], fov: .55 },
  horizon: { from: [6, 4, -9], to: [14, 10, -18], look: [0, 2, 4], fov: .84 },
};

/** Owns only presentation. MissionProgress commits scenes/choices and Game freezes simulation. */
export class CutsceneDirector {
  readonly camera: FreeCamera;
  private root = document.createElement('section');
  private console: TransformNode;
  private screen: DynamicTexture;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private actors = new Map<string, Actor>();
  private clearedStage: TransformNode[] = [];
  private previousCamera?: Camera;
  private current?: StoryScene;
  private anchor = Vector3.Zero();
  private shotIndex = 0;
  private elapsed = 0;
  private age = 0;
  private selectedChoice = 0;
  private choosing = false;
  private choice?: StoryChoice;
  private ctx?: AudioContext;
  private sound?: { gain: GainNode; tones: OscillatorNode[] };
  volume = .35;
  onFinish: (id: string, choice?: StoryChoice) => void = () => {};
  get active() { return !!this.current; }
  get position() { return this.anchor; }

  constructor(private scene: Scene, private input: InputManager) {
    this.camera = new FreeCamera('story-camera', Vector3.Zero(), scene);
    this.camera.minZ = .15; this.camera.maxZ = 5200;
    this.console = new TransformNode('story-console', scene);
    const caseMaterial = new StandardMaterial('story-console-case', scene); caseMaterial.diffuseColor = Color3.FromHexString('#274550'); caseMaterial.specularColor.setAll(.1);
    const housing = MeshBuilder.CreateBox('story-field-recorder', { width: 1, height: .65, depth: .65 }, scene);
    housing.parent = this.console; housing.material = caseMaterial; housing.position.y = .7;
    const legs = MeshBuilder.CreateBox('story-console-stand', {width:.7,height:.38,depth:.45}, scene);
    legs.parent = this.console; legs.position.y = .19; legs.material = caseMaterial;
    const display = MeshBuilder.CreatePlane('story-recorder-display', { width:.85, height:.46 }, scene);
    display.parent = this.console; display.position.set(0,.74,-.332);
    this.screen = new DynamicTexture('story-recording-text', { width:512,height:256 }, scene, false);
    // Upload once during construction: scene.whenReadyAsync also waits for hidden textures.
    this.screen.update();
    const displayMaterial = new StandardMaterial('story-display-material', scene);
    displayMaterial.diffuseColor = Color3.Black(); displayMaterial.emissiveTexture = this.screen; display.material = displayMaterial;
    for (const mesh of this.console.getChildMeshes()) { mesh.isPickable = false; mesh.checkCollisions = false; }
    this.console.setEnabled(false);
    this.root.className = 'cinema'; this.root.hidden = true;
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-label', 'Filmszene');
    this.root.innerHTML = `<div class="cinema-top"><span class="cinema-kicker"></span><span class="cinema-location"></span></div>
      <div class="cinema-title"><span>FREIER FALL</span><h2></h2></div>
      <div class="cinema-subtitles" aria-live="polite"><strong></strong><p></p></div>
      <div class="cinema-choice" hidden><span class="eyebrow">WAS SOLL DIE INSEL HÖREN?</span><h3>Die Wahrheit hat Folgen.</h3><div></div><small>← → wählen · E bestätigen</small></div>
      <div class="cinema-bottom"><div class="cinema-shots"></div><div><button data-next>SPACE · Weiter</button><button data-skip>ENTER · Szene überspringen</button></div></div><div class="cinema-fade"></div>`;
    document.getElementById('app')!.append(this.root);
    this.root.querySelector<HTMLButtonElement>('[data-next]')!.onclick = () => this.next();
    this.root.querySelector<HTMLButtonElement>('[data-skip]')!.onclick = () => this.skip();
  }
  async load(manager: AssetManager) {
    const cast = { nika: assets.characters.player, mara: assets.characters.residentArtisan, tomas: assets.characters.residentHarbor, lia: assets.characters.residentScholar };
    await Promise.all(Object.entries(cast).map(async ([id, definition]) => {
      const model = await manager.instantiate(definition, `story-${id}`);
      model.root.setEnabled(false);
      this.actors.set(id, { model, animator: new CharacterAnimator(model.entries?.animationGroups ?? [], this.scene) });
    }));
  }
  unlockAudio() {
    try { this.ctx ??= new AudioContext(); void this.ctx.resume().catch(() => {}); } catch { /* Subtitles and scenes also work without audio. */ }
  }
  private score(mood: StoryScene['mood']) {
    this.stopSound();
    if (!this.ctx) return;
    const ctx = this.ctx, gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
    gain.gain.linearRampToValueAtTime(this.volume * .035, ctx.currentTime + 1.6);
    const notes = mood === 'danger' ? [110, 116.54, 164.81] : mood === 'hope' ? [130.81, 164.81, 196] : [110, 130.81, 164.81];
    const tones = notes.map(f => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(gain); o.start(); return o; });
    this.sound = { gain, tones };
  }
  private stopSound() { if (this.sound) { this.sound.tones.forEach(o => { o.stop(); o.disconnect(); }); this.sound.gain.disconnect(); this.sound = undefined; } }
  pauseAudio(paused: boolean) { if (this.ctx) { const action = paused ? this.ctx.suspend() : this.ctx.resume(); void action.catch(() => {}); } }
  start(id: string, choice?: StoryChoice) {
    if (this.active) return;
    const definition = screenplay.find(s => s.id === id);
    if (!definition) throw new Error(`Missing scene ${id}`);
    this.hideActors(); this.current = definition; this.choice = choice;
    const objective = typeof definition.anchor === 'string' ? missionDefinitions.flatMap(m => m.objectives).find(o => o.id === definition.anchor) : undefined;
    if (objective) this.anchor = Vector3.FromArray(objective.position).subtract(new Vector3(0, 1, 0));
    else if (Array.isArray(definition.anchor)) { const [x, z] = definition.anchor; this.anchor.set(x, terrainHeight(x, z), z); }
    // Keep the background population, but give the authored cast room to perform.
    this.clearedStage = this.scene.transformNodes.filter(node => /^(resident-\d+|ambient-traffic-\d+)$/.test(node.name)
      && node.isEnabled() && Vector3.DistanceSquared(node.position, this.anchor) < 12 ** 2);
    this.clearedStage.forEach(node => node.setEnabled(false));
    this.previousCamera = this.scene.activeCamera ?? undefined; this.scene.activeCamera = this.camera;
    this.shotIndex = 0; this.elapsed = this.age = 0; this.choosing = false; this.selectedChoice = 0;
    this.input.clear(); this.root.hidden = false;
    document.getElementById('app')!.classList.add('cinematic');
    this.root.querySelector('.cinema-kicker')!.textContent = definition.chapter;
    this.root.querySelector('.cinema-location')!.textContent = definition.location;
    this.root.querySelector('.cinema-title h2')!.textContent = definition.title;
    this.root.querySelector<HTMLElement>('.cinema-choice')!.hidden = true;
    this.root.querySelector<HTMLButtonElement>('[data-next]')!.hidden = false;
    this.root.querySelector<HTMLButtonElement>('[data-skip]')!.hidden = false;
    this.placeActor('nika', -1.1, 0, .55);
    if (definition.cast) this.placeActor(definition.cast, 1.1, 0, -.55);
    this.console.position.copyFrom(this.anchor); this.console.setEnabled(!definition.cast || definition.id === 'mara' || definition.id === 'lia');
    this.score(definition.mood); this.showShot(); this.frameCamera(0);
  }
  private placeActor(id: string, x: number, z: number, yaw: number) {
    const actor = this.actors.get(id); if (!actor) return;
    actor.model.root.position.copyFrom(this.anchor.add(new Vector3(x, 0, z)));
    actor.model.root.rotation.set(0, Math.PI - yaw, 0); actor.model.root.setEnabled(true);
    actor.animator.reset(); actor.animator.update(.1, 'idle');
  }
  updateContact(objective: TraversalObjective | undefined, dt: number, player: Vector3) {
    if (this.active) return;
    const definition = objective?.prop === 'contact' ? screenplay.find(s => s.id === objective.scene) : undefined;
    this.hideActors();
    if (!objective || !definition?.cast || Vector3.DistanceSquared(player, Vector3.FromArray(objective.position)) > 180 ** 2) return;
    const actor = this.actors.get(definition.cast)!;
    actor.model.root.position.copyFromFloats(objective.position[0] + 1.5, objective.position[1] - 1, objective.position[2]);
    actor.model.root.rotation.y = Math.atan2(player.x - actor.model.root.position.x, player.z - actor.model.root.position.z);
    actor.model.root.setEnabled(true); actor.animator.update(dt, 'idle');
  }
  update(dt: number) {
    if (!this.current) return;
    this.age += dt;
    if (this.sound && this.ctx) this.sound.gain.gain.setTargetAtTime(this.volume * .035, this.ctx.currentTime, .15);
    if (this.choosing) {
      if (this.input.take('lookLeft') || this.input.take('lookRight')) { this.selectedChoice = 1 - this.selectedChoice; this.updateChoice(); }
      if (this.input.take('interact')) this.finish(storyChoices[this.selectedChoice].id);
      this.input.clear(); return;
    }
    if (this.input.take('storySkip')) { this.skip(); this.input.clear(); return; }
    if (this.input.take('jump')) { this.next(); this.input.clear(); return; }
    this.elapsed += dt;
    this.frameCamera(dt);
    if (this.elapsed >= this.current.shots[this.shotIndex].seconds) this.next();
    this.input.clear();
  }
  private frameCamera(dt: number) {
    if (!this.current) return;
    const shot = this.current.shots[this.shotIndex], frame = frames[shot.framing];
    const raw = Math.min(1, this.elapsed / shot.seconds), t = this.reducedMotion ? .5 : raw * raw * (3 - 2 * raw);
    const wanted = this.anchor.add(Vector3.Lerp(Vector3.FromArray(frame.from), Vector3.FromArray(frame.to), t));
    wanted.y = Math.max(wanted.y, terrainHeight(wanted.x, wanted.z) + 1.5);
    const target = this.anchor.add(Vector3.FromArray(frame.look));
    const offset = wanted.subtract(target), length = offset.length();
    const hit = pickCollision(this.scene, new Ray(target, offset.scale(1 / length), length));
    this.camera.position.copyFrom(hit?.hit ? target.add(offset.normalize().scale(Math.max(.6, hit.distance - .35))) : wanted);
    this.camera.setTarget(target); this.camera.fov = frame.fov;
    for (const [id, actor] of this.actors) if (actor.model.root.isEnabled()) {
      const speaking = id === 'nika' ? shot.speaker === 'Nika' || shot.speaker.startsWith('Nika ·') : shot.speaker.toLowerCase() === id;
      actor.animator.update(dt, 'idle', speaking && shot.framing !== 'wide' ? 'interact-right' : undefined);
    }
    const fade = Math.max(0, 1 - this.elapsed / .45, 1 - (shot.seconds - this.elapsed) / .4);
    this.root.querySelector<HTMLElement>('.cinema-fade')!.style.opacity = String(fade);
    this.root.querySelector<HTMLElement>('.cinema-title')!.style.opacity = this.age < 4.8 ? '1' : '0';
    this.root.style.setProperty('--shot-progress', `${raw * 100}%`);
  }
  private showShot() {
    if (!this.current) return;
    const shot = this.current.shots[this.shotIndex];
    this.root.querySelector('.cinema-subtitles strong')!.textContent = shot.speaker;
    this.root.querySelector('.cinema-subtitles p')!.textContent = shotText(shot, this.choice);
    const ctx = this.screen.getContext();
    ctx.fillStyle = '#092b32'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#8de4d4'; ctx.font = 'bold 28px monospace'; ctx.fillText('VELA / CANAL 07', 28, 45);
    ctx.font = '20px monospace'; ctx.fillText(this.current.id === 'broadcast' ? 'EMPFANG BESTÄTIGT' : this.current.id === 'signature' ? 'ARCHITEKTUR: N. SERRIN' : 'SIGNAL VERBUNDEN', 28, 93);
    ctx.strokeStyle = '#8de4d4'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 28; x < 485; x += 4) { const y = 160 + Math.sin(x * .13 + this.shotIndex) * Math.sin(x * .023) * 32; if (x === 28) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.font = '16px monospace'; ctx.fillText(`ARCHIV ${String(this.shotIndex + 1).padStart(2, '0')} / CALA VENTRA`, 28, 228); this.screen.update();
    this.root.querySelector('.cinema-shots')!.innerHTML = this.current.shots.map((_, i) => `<i class="${i < this.shotIndex ? 'done' : i === this.shotIndex ? 'current' : ''}"></i>`).join('');
    this.root.dataset.scene = this.current.id; this.root.dataset.shot = String(this.shotIndex);
  }
  private next() {
    if (!this.current || this.choosing || this.age < .4) return;
    if (this.shotIndex < this.current.shots.length - 1) { this.shotIndex++; this.elapsed = 0; this.showShot(); this.frameCamera(0); }
    else if (this.current.choice) this.showChoice();
    else this.finish();
  }
  private skip() { if (!this.current || this.age < .4 || this.choosing) return; if (this.current.choice) this.showChoice(); else this.finish(); }
  private showChoice() {
    this.choosing = true; this.input.clear();
    this.root.querySelector<HTMLElement>('.cinema-choice')!.hidden = false;
    this.root.querySelector<HTMLElement>('.cinema-fade')!.style.opacity = '0';
    this.root.querySelector<HTMLElement>('.cinema-title')!.style.opacity = '0';
    this.root.querySelector('.cinema-subtitles strong')!.textContent = 'Nika · Deine Entscheidung';
    this.root.querySelector('.cinema-subtitles p')!.textContent = 'Eure eigenen Namen bleiben in beiden Fassungen. Entscheide, was mit den Zeugen geschieht.';
    this.root.querySelector<HTMLButtonElement>('[data-next]')!.hidden = true;
    this.root.querySelector<HTMLButtonElement>('[data-skip]')!.hidden = true;
    const options = this.root.querySelector('.cinema-choice > div')!; options.replaceChildren();
    storyChoices.forEach((choice, i) => {
      const button = document.createElement('button');
      const title = document.createElement('strong'), detail = document.createElement('span');
      title.textContent = choice.title; detail.textContent = choice.description; button.append(title, detail);
      button.onclick = () => this.finish(choice.id); button.dataset.choice = String(i); options.append(button);
    });
    this.updateChoice();
  }
  private updateChoice() { this.root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button, i) => { button.classList.toggle('selected', i === this.selectedChoice); button.setAttribute('aria-pressed', String(i === this.selectedChoice)); }); }
  private finish(choice?: StoryChoice) { const id = this.current?.id; if (!id) return; this.stop(); this.onFinish(id, choice); }
  stop() {
    if (this.previousCamera) this.scene.activeCamera = this.previousCamera;
    this.previousCamera = undefined; this.current = undefined; this.root.hidden = true;
    this.clearedStage.forEach(node => { if (!node.isDisposed()) node.setEnabled(true); }); this.clearedStage = [];
    this.console.setEnabled(false); this.hideActors(); this.stopSound(); this.input.clear(); document.getElementById('app')!.classList.remove('cinematic');
  }
  private hideActors() { for (const actor of this.actors.values()) actor.model.root.setEnabled(false); }
  dispose() { this.stop(); this.root.remove(); if (this.ctx) void this.ctx.close().catch(() => {}); this.camera.dispose(); }
}
