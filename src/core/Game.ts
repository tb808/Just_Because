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
import { captureDuration } from '../data/bases';
import { clearGameSave, loadGameSave, storeGameSave, type GameSave } from './SaveGame';
import { Atmosphere } from '../world/Atmosphere';
import { Exploration, validSavedPosition } from '../world/Exploration';
import { settlements } from '../data/world';

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
    this.missions.onReward = score => { this.combat.score += score; };
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
      this.hud.notify('Feststecken erkannt · zur letzten sicheren Position zurückgesetzt.');
    };
    this.assetManager.onProgress = (done, total) => this.hud.loading(done, total);
    this.input.onPause = () => { this.running = false; this.map.close(); this.scene.animationsEnabled = false; this.accumulator = 0; this.hud.pause(true); };
    this.hud.onStart = () => void this.start();
    this.hud.onReset = () => { clearGameSave(); this.controller.reset(); this.missions.reset(); this.combat.reset(); this.exploration.reset(); if(this.atmosphere) this.atmosphere.elapsed=0; this.showCombat=false; this.saveGame(); };
    this.hud.onVolume = value => this.combat.audio.volume = value;
    this.hud.onSensitivity = value => this.camera.sensitivity = value;
    this.hud.onQuality = value => { this.engine.setHardwareScalingLevel(value); this.atmosphere?.setQuality(value); };
    window.addEventListener('resize', () => this.engine.resize(), { signal: this.abort.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.saveGame(); this.input.dragMode = false; document.exitPointerLock(); this.input.onPause(); } }, { signal: this.abort.signal });
    window.addEventListener('pagehide', () => this.saveGame(), { signal: this.abort.signal });
  }
  async init() {
    await Promise.all([this.world.create(), this.player.load(this.assetManager)]);
    await this.combat.load(this.assetManager);
    this.atmosphere = new Atmosphere(this.scene);
    const save = loadGameSave();
    const validPosition = save && validSavedPosition(save.player);
    if (save) { this.player.position.copyFrom(validPosition ? Vector3.FromArray(save.player) : this.world.spawn); this.missions.restore(save.missions); this.combat.restore(save.combat); }
    else this.player.position.copyFrom(this.world.spawn);
    if (save?.world) { this.exploration.restore(save.world.discoveredSettlementIds); this.atmosphere.elapsed = save.world.elapsed; }
    this.world.chunks.update(1,this.player.position); this.atmosphere.update(0,this.player.position);
    this.player.state = 'FALLING'; this.player.velocity.setAll(0); this.camera.update(0, true);
    await this.scene.whenReadyAsync(); this.scene.render(); this.ready = true;
    this.hud.ready(this.assetManager.failures.size);
    if (save) this.hud.notify('Lokaler Spielstand geladen.');
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
      while (this.accumulator >= movement.fixedStep) { if (!this.player.dead) this.controller.update(movement.fixedStep); this.accumulator -= movement.fixedStep; }
      const liberatedBaseIds = this.combat.bases.states.filter(base=>base.liberated).map(base=>base.definition.id);
      if (!this.player.dead && this.input.justPressed('interact') && this.missions.interact(this.player,liberatedBaseIds)) this.input.take('interact');
      this.combat.update(dt);
      this.saveTimer += dt;
      if (this.saveTimer >= 2) { this.saveGame(); this.saveTimer = 0; }
      if (this.input.take('nextBase')) { this.combat.bases.next(); this.showCombat=true; }
      if (this.input.take('nextMission')) { this.missions.cycle(); this.showCombat=false; this.hud.notify(`Auftrag · ${this.missions.tracked?.title ?? 'Alles erledigt'}`); }
      this.player.animate(dt); this.controller.grapple.render(); this.world.chunks.update(dt, this.player.position);
      this.missions.update(dt, this.player, {liberatedBaseIds});
      this.atmosphere?.update(dt,this.player.position); this.exploration.update(this.player.position);
      this.uiTimer += dt;
      if (this.uiTimer > 0.1) {
        this.hud.update(this.player, this.engine.getFps(), this.world.chunks.activeCount);
        this.hud.updateCombat(this.combat);
        this.hud.updateWorld(this.player, this.atmosphere?.clock ?? '08:30', this.combat.living.activitySummary);
        if (this.missions.interactionPrompt) this.hud.element('hint').textContent = this.missions.interactionPrompt;
        const target = this.controller.grapple.target(); this.hud.element('reticle').classList.toggle('valid', !!target);
        this.hud.element('target-label').textContent = target ? `F · ${Math.round(target.distance)} M` : '';
        this.updateMap();
        const base=this.combat.bases.tracked, def=base.definition;
        const cleared=base.guards===def.guards.length&&base.tanks===def.tanks.length;
        this.hud.element('mission-title').textContent = this.showCombat ? `${def.name}${base.liberated?' · FREI':''}` : (this.missions.tracked?.title ?? 'Cala Ventra erkunden');
        this.hud.element('mission-detail').textContent = this.showCombat ? (base.liberated?'Die Bewohner sind zurück. Nachschub am SUV verfügbar. N wählt die nächste Basis.':cleared?'Halte den Bereich um die Flagge sechs Sekunden, um diese Basis einzunehmen.':`${def.description} Wachen ausschalten und rote Tanks zerstören.`) : (this.missions.objective?.description ?? 'Erkunde Cala Ventra frei.');
        const progress = this.showCombat ? (base.guards+base.tanks+base.capture/captureDuration)/(def.guards.length+def.tanks.length+1) : this.missions.progress;
        this.hud.element('mission-progress').style.width = `${progress * 100}%`;
        this.hud.element('mission-count').textContent = this.showCombat ? `${base.guards}/${def.guards.length} WACHEN · ${base.tanks}/${def.tanks.length} TANKS${cleared?` · FLAGGE ${Math.floor(base.capture)}/${captureDuration} S`:''}` : `${this.missions.count} · M JOURNAL`;
        this.uiTimer = 0;
      }
    }
    this.scene.render();
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
    if (!this.ready || !this.scene.isReady() || this.player.dead) return;
    const position = this.player.position.asArray() as [number, number, number];
    const save: GameSave = { version: 1, savedAt: Date.now(), player: position, missions: this.missions.saveState(), combat: this.combat.saveState(), world: {discoveredSettlementIds:[...this.exploration.discovered],elapsed:this.atmosphere?.elapsed??0} };
    storeGameSave(save);
  }
  dispose() { this.saveGame(); this.abort.abort(); this.input.dispose(); this.combat.dispose(); this.atmosphere?.dispose(); this.engine.stopRenderLoop(); this.scene.dispose(); this.assetManager.dispose(); this.engine.dispose(); }
}
