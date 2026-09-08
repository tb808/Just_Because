import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Collisions/collisionCoordinator';
import { AssetManager } from './AssetManager';
import { InputManager } from './InputManager';
import { Player } from '../player/Player';
import { PlayerMovement } from '../player/PlayerMovement';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { WorldManager } from '../world/WorldManager';
import { HUD } from '../ui/HUD';
import { movement } from '../data/config';
import { MissionManager } from '../missions/MissionManager';
import { CombatSystem } from '../combat/CombatSystem';
import { WorldMap } from '../ui/WorldMap';
import { captureDuration } from '../data/bases';

export class Game {
  private engine: Engine;
  private scene: Scene;
  private input: InputManager;
  private assetManager: AssetManager;
  private player: Player;
  private camera: ThirdPersonCamera;
  private world: WorldManager;
  private controller: PlayerMovement;
  private missions: MissionManager;
  private combat: CombatSystem;
  private showCombat = true;
  private hud = new HUD();
  private map = new WorldMap();
  private running = false;
  private accumulator = 0;
  private uiTimer = 0;
  private abort = new AbortController();
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio) * 1.25);
    this.scene = new Scene(this.engine);
    this.input = new InputManager(canvas); this.assetManager = new AssetManager(this.scene);
    this.player = new Player(this.scene); this.world = new WorldManager(this.scene, this.assetManager);
    this.camera = new ThirdPersonCamera(this.scene, this.player, this.input);
    this.controller = new PlayerMovement(this.player, this.input, this.camera, this.scene, this.world.spawn);
    this.missions = new MissionManager(this.scene);
    this.combat = new CombatSystem(this.scene, this.player, this.input, this.camera, this.world);
    this.combat.onMessage = message => this.hud.notify(message);
    this.combat.onRespawn = () => this.controller.reset();
    this.combat.onDeath = () => this.controller.cancelAbilities();
    this.missions.onAdvance = message => this.hud.notify(message);
    this.controller.onReset = () => { this.combat.revive(); this.hud.notify('Zurück am Aussichtspunkt · Ausrüstung aufgefüllt.'); };
    this.assetManager.onProgress = (done, total) => this.hud.loading(done, total);
    this.input.onPause = () => { this.running = false; this.map.close(); this.scene.animationsEnabled = false; this.accumulator = 0; this.hud.pause(true); };
    this.hud.onStart = () => void this.start();
    this.hud.onReset = () => { this.controller.reset(); this.missions.reset(); this.combat.reset(); };
    this.hud.onVolume = value => this.combat.audio.volume = value;
    this.hud.onSensitivity = value => this.camera.sensitivity = value;
    this.hud.onQuality = value => this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio) * value);
    window.addEventListener('resize', () => this.engine.resize(), { signal: this.abort.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.input.dragMode = false; document.exitPointerLock(); this.input.onPause(); } }, { signal: this.abort.signal });
  }
  async init() {
    await Promise.all([this.world.create(), this.player.load(this.assetManager)]);
    await this.combat.load(this.assetManager);
    this.player.position.copyFrom(this.world.spawn); this.camera.update(0, true);
    await this.scene.whenReadyAsync(); this.scene.render();
    this.hud.ready(this.assetManager.failures.size);
    this.engine.runRenderLoop(() => this.frame());
  }
  private async start() {
    this.combat.audio.start();
    try { await this.input.lock(); this.running = true; this.map.close(); this.scene.animationsEnabled = true; this.accumulator = 0; this.input.clear(); this.hud.pause(false); if (this.input.dragMode) this.hud.notify('Kamera: rechte Maustaste ziehen oder Pfeiltasten. ESC pausiert.'); }
    catch { this.hud.error('Die Maussperre wurde blockiert. Öffne das Spiel in einem eigenen Browser-Tab und klicke erneut auf Spielen.'); }
  }
  private frame() {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, movement.maxFrameTime);
    if (this.running && this.input.locked) {
      if (this.input.take('map')) {
        const open = this.map.toggle(); this.scene.animationsEnabled = !open; this.accumulator = 0; this.input.clear();
      }
      if (this.map.open) { this.map.update(this.combat.bases, this.player); this.scene.render(); return; }
      this.camera.update(dt);
      this.accumulator += dt;
      while (this.accumulator >= movement.fixedStep) { if (!this.player.dead) this.controller.update(movement.fixedStep); this.accumulator -= movement.fixedStep; }
      this.combat.update(dt);
      if (this.input.take('mission')) this.showCombat = !this.showCombat;
      if (this.input.take('nextBase')) { this.combat.bases.next(); this.showCombat=true; }
      this.player.animate(dt); this.controller.grapple.render(); this.world.chunks.update(dt, this.player.position); this.missions.update(dt, this.player);
      this.uiTimer += dt;
      if (this.uiTimer > 0.1) {
        this.hud.update(this.player, this.engine.getFps(), this.world.chunks.activeCount);
        this.hud.updateCombat(this.combat);
        const target = this.controller.grapple.target(); this.hud.element('reticle').classList.toggle('valid', !!target);
        this.hud.element('target-label').textContent = target ? `F · ${Math.round(target.distance)} M` : '';
        this.map.update(this.combat.bases,this.player);
        const base=this.combat.bases.tracked, def=base.definition;
        const cleared=base.guards===def.guards.length&&base.tanks===def.tanks.length;
        this.hud.element('mission-title').textContent = this.showCombat ? `${def.name}${base.liberated?' · FREI':''}` : (this.missions.objective?.title ?? 'Höhenroute geschafft');
        this.hud.element('mission-detail').textContent = this.showCombat ? (base.liberated?'Die Bewohner sind zurück. Nachschub am SUV verfügbar. N wählt die nächste Basis.':cleared?'Halte den Bereich um die Flagge sechs Sekunden, um diese Basis einzunehmen.':`${def.description} Wachen ausschalten und rote Tanks zerstören.`) : (this.missions.objective?.description ?? 'Erkunde Cala Ventra frei.');
        const progress = this.showCombat ? (base.guards+base.tanks+base.capture/captureDuration)/(def.guards.length+def.tanks.length+1) : this.missions.progress;
        this.hud.element('mission-progress').style.width = `${progress * 100}%`;
        this.hud.element('mission-count').textContent = this.showCombat ? `${base.guards}/${def.guards.length} WACHEN · ${base.tanks}/${def.tanks.length} TANKS${cleared?` · FLAGGE ${Math.floor(base.capture)}/${captureDuration} S`:''}` : `${this.missions.count} · ${Math.floor(this.missions.time)} S`;
        this.uiTimer = 0;
      }
    }
    this.scene.render();
  }
  dispose() { this.abort.abort(); this.input.dispose(); this.combat.dispose(); this.engine.stopRenderLoop(); this.scene.dispose(); this.assetManager.dispose(); this.engine.dispose(); }
}
