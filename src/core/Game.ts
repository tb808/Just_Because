import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
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
import { clearGameSave, loadGameSave, storeGameSave, type GameSave } from './SaveGame';
import { Atmosphere } from '../world/Atmosphere';
import { Exploration, validSavedPosition } from '../world/Exploration';
import { settlements } from '../data/world';
import { baseCapturePrompt } from '../ui/BaseCapturePrompt';
import { difficultyLabels } from '../data/difficulty';
import { VehicleManager } from '../vehicles/VehicleManager';
import { CollisionQueries } from '../world/CollisionQueries';
import { CutsceneDirector } from '../story/CutsceneDirector';

export class Game {
  private engine: Engine;
  private scene: Scene;
  private input: InputManager;
  private assetManager: AssetManager;
  private player: Player;
  private camera: ThirdPersonCamera;
  private world: WorldManager;
  private controller: PlayerMovement;
  private vehicles: VehicleManager;
  private missions: MissionManager;
  private story: CutsceneDirector;
  private combat: CombatSystem;
  private showCombat = false;
  private atmosphere?: Atmosphere;
  private exploration = new Exploration();
  private hud = new HUD();
  private map = new WorldMap();
  private running = false;
  private ready = false;
  private accumulator = 0;
  private uiTimer = 0;
  private saveTimer = 0;
  private abort = new AbortController();
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.engine.setHardwareScalingLevel(1.25);
    this.scene = new Scene(this.engine);
    // Gameplay performs its own explicit raycasts; Babylon's implicit pointer-move
    // picking would otherwise scan the scene throughout mouse-look.
    this.scene.skipPointerMovePicking = true;
    this.scene.skipPointerDownPicking = true;
    this.scene.skipPointerUpPicking = true;
    this.input = new InputManager(canvas); this.assetManager = new AssetManager(this.scene);
    this.player = new Player(this.scene); this.world = new WorldManager(this.scene, this.assetManager);
    this.camera = new ThirdPersonCamera(this.scene, this.player, this.input);
    this.controller = new PlayerMovement(this.player, this.input, this.camera, this.scene, this.world.spawn);
    this.vehicles = new VehicleManager(this.scene,this.world,this.player,this.input,this.camera);
    this.missions = new MissionManager(this.scene);
    this.story = new CutsceneDirector(this.scene, this.input);
    this.story.onFinish = (id, choice) => {
      this.missions.finishScene(id, choice); this.player.visual.setEnabled(true);
      this.missions.setCinematic(false); this.camera.update(0, true); this.accumulator = 0;
      this.world.chunks.update(1, this.player.position); this.saveGame();
      if (id === 'ending') this.hud.storyEnding(this.missions.choice);
      else this.hud.notify(`Weiter: ${this.missions.objective?.title ?? 'Cala Ventra erkunden'}`);
    };
    this.combat = new CombatSystem(this.scene, this.player, this.input, this.camera, this.world);
    this.combat.onMessage = message => this.hud.notify(message);
    this.combat.onRespawn = () => this.controller.reset();
    this.combat.onDeath = () => { this.vehicles.leaveForDeath(); this.controller.cancelAbilities(); };
    this.missions.onAdvance = message => this.hud.notify(message);
    this.missions.onReward = score => { this.combat.score += score; };
    this.missions.onRadio = line => this.hud.radio(line.speaker, line.text);
    this.exploration.onDiscover = name => this.hud.notify(`${name} entdeckt · Schnellreise im Atlas freigeschaltet.`);
    this.map.onTrackMission = id => {
      if (!this.missions.setTracked(id)) { this.hud.notify('Dieser Auftrag ist abgeschlossen oder benötigt zuerst einen vorherigen Auftrag.'); return; }
      this.showCombat = false; this.closeAtlas(); this.hud.notify(`Auftrag verfolgt · ${this.missions.tracked?.title}`);
    };
    this.map.onTrackBase = id => {
      const index = this.combat.bases.states.findIndex(base => base.definition.id === id);
      if (index >= 0) { this.combat.bases.selected = index; this.showCombat = true; this.closeAtlas(); }
    };
    this.map.onTravel = id => this.travel(id);
    this.map.onClose = () => this.closeAtlas();
    this.controller.onReset = () => { this.combat.revive(); this.hud.notify('Zurück am Aussichtspunkt · Ausrüstung aufgefüllt.'); };
    this.controller.onUnstuck = () => {
      this.world.chunks.update(1, this.player.position);
      this.hud.notify('Position befreit · du kannst dich wieder bewegen.');
    };
    this.vehicles.onMessage = message => this.hud.notify(message);
    this.vehicles.onEnter = () => this.controller.cancelAbilities();
    this.vehicles.onReset = () => this.controller.reset();
    this.assetManager.onProgress = (done, total) => this.hud.loading(done, total);
    this.input.onPause = () => { this.running = false; this.story.pauseAudio(true); this.map.close(); this.scene.animationsEnabled = false; this.accumulator = 0; this.hud.pause(true); this.saveGame(); };
    this.hud.onStart = () => void this.start();
    this.hud.onNewGame = () => { this.resetProgress(); void this.start(); };
    this.hud.onReset = () => this.resetProgress();
    this.hud.onVolume = value => { this.combat.audio.volume = value; this.story.volume = value; };
    this.hud.onSensitivity = value => this.camera.sensitivity = value;
    this.hud.onQuality = value => { this.engine.setHardwareScalingLevel(value); this.atmosphere?.setQuality(value); };
    this.hud.onDifficulty = value => { this.combat.setDifficulty(value); this.saveGame(); this.hud.notify(`Schwierigkeit: ${difficultyLabels[value]}`); };
    window.addEventListener('resize', () => this.engine.resize(), { signal: this.abort.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.saveGame(); this.input.dragMode = false; document.exitPointerLock(); this.input.onPause(); } }, { signal: this.abort.signal });
    window.addEventListener('pagehide', () => this.saveGame(), { signal: this.abort.signal });
  }
  async init() {
    await Promise.all([this.world.create(), this.player.load(this.assetManager), this.story.load(this.assetManager)]);
    await this.combat.load(this.assetManager);
    new CollisionQueries(this.scene);
    this.atmosphere = new Atmosphere(this.scene);
    const save = loadGameSave();
    const validPosition = save && validSavedPosition(save.player);
    if (save) { this.player.position.copyFrom(validPosition ? Vector3.FromArray(save.player) : this.world.spawn); this.missions.restore(save.missions); this.combat.restore(save.combat); }
    else this.player.position.copyFrom(this.world.spawn);
    this.hud.setDifficulty(this.combat.difficulty);
    if (save?.world) { this.exploration.restore(save.world.discoveredSettlementIds, save.world.surveyedMapCells); this.atmosphere.elapsed = save.world.elapsed; }
    this.world.chunks.update(1,this.player.position); this.atmosphere.update(0,this.player.position);
    this.player.state = 'FALLING'; this.player.velocity.setAll(0); this.camera.update(0, true);
    await this.scene.whenReadyAsync(); this.scene.render(); this.ready = true;
    this.hud.ready(this.assetManager.failures.size, !!save);
    if (save) this.hud.notify('Lokaler Spielstand geladen.');
    this.engine.runRenderLoop(() => this.frame());
  }
  private async start() {
    this.combat.audio.start();
    this.story.unlockAudio(); this.story.pauseAudio(false);
    try { await this.input.lock(); this.running = true; this.map.close(); this.scene.animationsEnabled = true; this.accumulator = 0; this.input.clear(); this.hud.pause(false); if (this.input.dragMode) this.hud.notify('Kamera: rechte Maustaste ziehen oder Pfeiltasten. ESC pausiert.'); }
    catch { this.hud.error('Die Maussperre wurde blockiert. Öffne das Spiel in einem eigenen Browser-Tab und klicke erneut auf Spielen.'); }
  }
  private frame() {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, movement.maxFrameTime);
    if (this.running && this.input.locked) {
      if (this.playStory(dt)) { this.scene.render(); return; }
      if (this.input.take('map')) { if(this.map.open) this.closeAtlas(); else this.toggleAtlas('world'); }
      else if (this.input.take('mission')) this.toggleAtlas('journal');
      else if (this.input.take('travel')) this.toggleAtlas('travel');
      if (this.map.open) {
        if (this.input.take('lookUp')) this.map.navigate(-1);
        if (this.input.take('lookDown')) this.map.navigate(1);
        if (this.input.take('lookLeft')) this.map.switchView(-1);
        if (this.input.take('lookRight')) this.map.switchView(1);
        this.updateMap();
        if (this.input.take('interact')) this.map.confirm();
        this.input.lookX = this.input.lookY = this.input.zoom = 0;
        this.scene.render(); return;
      }
      this.camera.update(dt);
      this.accumulator += dt;
      while (this.accumulator >= movement.fixedStep) {
        if (!this.player.dead) (this.vehicles.driving ? this.vehicles : this.controller).update(movement.fixedStep);
        this.accumulator -= movement.fixedStep;
      }
      const liberatedBaseIds = this.combat.bases.states.filter(base=>base.liberated).map(base=>base.definition.id);
      if (!this.player.dead && this.input.justPressed('interact') && this.missions.interact(this.player,liberatedBaseIds)) this.input.take('interact');
      if (this.playStory(0)) { this.scene.render(); return; }
      if (!this.player.dead && this.input.justPressed('interact')) {
        const nearSupply=this.combat.nearSupply,event=this.vehicles.interact();
        if(event) {this.input.take('interact');if(event==='entered'&&nearSupply)this.combat.resupply('Nachschub aufgenommen · SUV gestartet · W/S fahren · A/D lenken · E aussteigen');}
      }
      this.combat.update(dt);
      this.saveTimer += dt;
      if (this.saveTimer >= 2) { this.saveGame(); this.saveTimer = 0; }
      if (this.input.take('nextBase')) { this.combat.bases.next(); this.showCombat=true; }
      if (this.input.take('nextMission')) { this.missions.cycle(); this.showCombat=false; this.hud.notify(`Auftrag · ${this.missions.tracked?.title ?? 'Alles erledigt'}`); }
      this.player.animate(dt); this.controller.grapple.render(); this.world.chunks.update(dt, this.player.position);
      this.missions.update(dt, this.player, {liberatedBaseIds});
      if (this.playStory(0)) { this.scene.render(); return; }
      this.story.updateContact(this.missions.objective, dt, this.player.position);
      this.atmosphere?.update(dt,this.player.position); this.exploration.update(this.player.position);
      this.uiTimer += dt;
      if (this.uiTimer > 0.1) {
        this.hud.update(this.player, this.engine.getFps(), this.world.chunks.activeCount);
        this.hud.updateCombat(this.combat);
        this.hud.updateWorld(this.player, this.atmosphere?.clock ?? '08:30', this.combat.living.activitySummary);
        const nearbyBase = this.combat.bases.nearby(this.player.position);
        const interactionPrompt = this.missions.interactionPrompt;
        const vehiclePrompt = this.vehicles.interactionPrompt;
        if (interactionPrompt) this.hud.element('hint').textContent = interactionPrompt;
        else if(vehiclePrompt) this.hud.element('hint').textContent=vehiclePrompt;
        const target = this.controller.grapple.target(); this.hud.element('reticle').classList.toggle('valid', !!target);
        this.hud.element('target-label').textContent = target ? `F · ${Math.round(target.distance)} M` : '';
        this.updateMap();
        const storyBaseId = this.missions.objective?.baseId;
        const base = this.showCombat ? nearbyBase ?? this.combat.bases.tracked
          : this.missions.tracked.chapter ? this.combat.bases.states.find(b => b.definition.id === storyBaseId) : nearbyBase;
        const capture = base ? baseCapturePrompt(base, this.player.position) : undefined;
        this.hud.element('mission-title').textContent = capture?.title ?? (this.missions.tracked?.title ?? 'Cala Ventra erkunden');
        this.hud.element('mission-chapter').textContent = capture ? 'GEBIET BEFREIEN' : this.missions.tracked.chapter ? `${this.missions.tracked.act} · ${this.missions.tracked.chapter}/8` : 'FREIWILLIGER AUFTRAG';
        this.hud.element('mission-detail').textContent = capture?.detail ?? (this.missions.objective?.description ?? 'Erkunde Cala Ventra frei.');
        const progress = capture?.progress ?? this.missions.progress;
        this.hud.element('mission-progress').style.width = `${progress * 100}%`;
        this.hud.element('mission-count').textContent = capture?.count ?? `${this.missions.count} · M JOURNAL`;
        if (nearbyBase && capture && !interactionPrompt && !vehiclePrompt) this.hud.element('hint').textContent = capture.hint;
        this.uiTimer = 0;
      }
    }
    this.scene.render();
  }
  private playStory(dt: number) {
    if (this.player.dead) return false;
    if (!this.story.active && this.missions.pendingScene) {
      this.story.start(this.missions.pendingScene, this.missions.choice);
      this.showCombat = false; this.accumulator = 0; this.missions.setCinematic(true);
      this.player.visual.setEnabled(false); this.world.chunks.update(1, this.story.position);
      this.saveGame();
    }
    if (!this.story.active) return false;
    this.story.update(dt);
    if (this.story.active) this.atmosphere?.update(0, this.story.position);
    return true;
  }
  private updateMap() { this.map.update(this.combat.bases,this.player,this.missions,this.exploration,this.showCombat); }
  private toggleAtlas(view: 'world'|'journal'|'travel') {
    const open = this.map.toggle(view); this.scene.animationsEnabled = !open; this.accumulator = 0; this.input.clear(); this.updateMap();
  }
  private closeAtlas() { this.map.close(); this.scene.animationsEnabled = this.running; this.accumulator = 0; this.input.clear(); }
  private travel(id: string) {
    if (this.missions.hasActiveTimer) { this.hud.notify('Beende zuerst die laufende Zeitroute, bevor du schnell reist.'); return; }
    const destination = this.exploration.destination(id,this.combat.heat>0||this.player.dead,this.player.state==='ON_FOOT');
    if (!destination) { this.hud.notify('Reisen ist zu entdeckten Orten möglich, wenn du am Boden bist und kein Alarm herrscht.'); return; }
    this.controller.cancelAbilities(); this.player.position.copyFrom(destination); this.player.velocity.setAll(0);
    this.controller.markRecoveryPoint(destination);
    this.player.body.computeWorldMatrix(true); this.world.chunks.update(1,destination); this.camera.update(0,true);
    this.atmosphere?.update(0,destination); this.closeAtlas(); this.saveGame();
    this.hud.notify(`Ankunft in ${settlements.find(place=>place.id===id)?.name} · Marktplatz`);
  }
  private saveGame() {
    if (!this.ready || this.player.dead) return;
    const position = this.player.position.asArray() as [number, number, number];
    const save: GameSave = { version: 1, savedAt: Date.now(), player: position, missions: this.missions.saveState(), combat: this.combat.saveState(), world: {discoveredSettlementIds:[...this.exploration.discovered],surveyedMapCells:[...this.exploration.surveyed],elapsed:this.atmosphere?.elapsed??0} };
    storeGameSave(save);
  }
  private resetProgress() {
    this.story.stop(); this.player.visual.setEnabled(true);
    clearGameSave(); this.vehicles.reset(); this.controller.reset(); this.missions.reset(); this.combat.reset(); this.exploration.reset();
    if (this.atmosphere) this.atmosphere.elapsed = 0;
    this.showCombat = false; this.world.chunks.update(1, this.player.position); this.atmosphere?.update(0, this.player.position); this.saveGame();
  }
  dispose() { this.saveGame(); this.story.dispose(); this.abort.abort(); this.input.dispose(); this.combat.dispose(); this.atmosphere?.dispose(); this.engine.stopRenderLoop(); this.scene.dispose(); this.assetManager.dispose(); this.engine.dispose(); }
}
