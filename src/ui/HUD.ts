import { Player } from '../player/Player';
import { stateLabels } from '../player/PlayerState';
import type { CombatSystem } from '../combat/CombatSystem';
import { settlements, worldLocations } from '../data/world';

export class HUD {
  private root: HTMLElement;
  private panel: HTMLElement;
  private start: HTMLButtonElement;
  private status: HTMLElement;
  private state: HTMLElement;
  private speed: HTMLElement;
  private altitude: HTMLElement;
  private metrics: HTMLElement;
  private hint: HTMLElement;
  onStart: () => void = () => {};
  onReset: () => void = () => {};
  onSensitivity: (value: number) => void = () => {};
  onQuality: (value: number) => void = () => {};
  onVolume: (value: number) => void = () => {};
  constructor() {
    this.root = document.getElementById('app')!;
    this.root.innerHTML = `
      <header class="topbar"><div class="brand"><span class="brand-symbol">↗</span><div>CALA VENTRA<small>FREIER FALL</small></div></div><div class="location">SÜDKÜSTE <i></i> SEKTOR 01<small>36° 12′ N &nbsp; 18° 04′ E · FIKTIVE REGION</small></div></header>
      <aside class="mission"><div class="eyebrow"><span class="live-dot"></span> ERKUNDUNG</div><h2 id="mission-title">Die Höhenroute</h2><p id="mission-detail">Erkunde die Relaisstationen über der Bucht.</p><div class="mission-progress"><span id="mission-progress"></span></div><small id="mission-count">CALA VENTRA · TRAININGSREGION</small></aside>
      <div class="reticle" id="reticle"><span></span><b></b></div><div id="target-label" class="target-label"></div>
      <div class="hint" id="hint">WASD bewegen · Maus umsehen</div>
      <footer class="bottom"><div class="identity"><span class="eyebrow">NIKA SERRIN</span><strong id="state">ZU FUSS</strong><div class="health-line"></div><small id="altitude">0 M Ü. M.</small></div><div class="abilities"><div id="ability-grapple"><kbd>F</kbd><span>Greifhaken</span></div><div id="ability-wingsuit"><kbd>C</kbd><span>Wingsuit</span></div><div id="ability-parachute"><kbd>Q</kbd><span>Fallschirm</span></div></div><div class="telemetry"><strong id="speed">000</strong><span>KM/H</span><small id="metrics">WEBGL · INITIALISIERUNG</small></div></footer>
      <div class="pause-shade" id="shade"></div><section class="menu" id="menu" role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <span class="eyebrow">CALA VENTRA / OFFENE INSEL</span><h1 id="menu-title">Eine Insel.<br>Tausend Wege.</h1><p>Durch lebendige Altstädte. Über weite Täler.<br>Entdecke acht Orte und befreie die Insel.</p>
        <button class="primary" id="start" disabled>INSEL WIRD GELADEN … <span>↗</span></button><p id="loading" class="loading" role="status">Gelände vorbereiten …</p>
        <div class="controls"><div><kbd>W A S D</kbd><span>Bewegen</span></div><div><kbd>SHIFT</kbd><span>Sprinten</span></div><div><kbd>SPACE</kbd><span>Springen / Seil lösen</span></div><div><kbd>F / C / Q</kbd><span>Haken / Wingsuit / Schirm</span></div><div><kbd>MAUS</kbd><span>Kamera · Mausrad für Zoom</span></div><div><kbd>ESC</kbd><span>Pause</span></div></div>
        <details><summary>Einstellungen & Credits</summary><label>Mausempfindlichkeit<input id="sensitivity" type="range" min="0.0007" max="0.005" step="0.0001" value="0.0022"></label><label>Renderqualität<select id="quality"><option value="1">Hoch</option><option value="1.25" selected>Ausgewogen</option><option value="1.6">Performance</option></select></label><p>3D-Modelle: Kenney · CC0<br>Eigene Welt und Traversal-Strukturen.<br>Movement-Prototyp: Kampf und Fahrzeuge folgen.</p><button id="reset" class="secondary">Zurück zum Startpunkt</button></details>
      </section><div class="toast" id="toast" role="status"></div>`;
    this.root.insertAdjacentHTML('beforeend', `<div class="damage-vignette" id="damage-vignette"></div><div class="combat-top"><span id="alarm">KEIN ALARM</span><span id="score">0000 PUNKTE</span></div><div class="weapon-hud"><span id="weapon-name">STURMGEWEHR · VELA-7</span><div><strong id="ammo">30</strong><span id="reserve"> / 240</span></div><small id="reload-status">1 / 2 WAFFENWECHSEL · R NACHLADEN</small><div class="reload-track"><span id="reload-progress"></span></div></div>`);
    const controls = this.root.querySelector('.controls')!;
    controls.insertAdjacentHTML('beforeend', '<div><kbd>LMB / RMB</kbd><span>Schiessen / Zielen</span></div><div><kbd>1 / 2 · R</kbd><span>Waffenwechsel · Nachladen</span></div><div><kbd>E</kbd><span>Sprechen / Auftrag / Nachschub</span></div><div><kbd>M · B</kbd><span>Journal / Nächster Auftrag</span></div>');
    const details = this.root.querySelector('details')!;
    details.querySelector('summary')!.insertAdjacentHTML('afterend', '<label>Lautstärke<input id="volume" type="range" min="0" max="1" step="0.05" value="0.35"></label>');
    const credit = details.querySelector('p')!; credit.textContent = '3D-Modelle: Kenney · CC0. Eigene Welt, Ausrüstung und synthetisierte Sounds. Der SUV dient als Nachschubpunkt und ist noch nicht fahrbar.';
    this.element('reset').textContent = 'Einsatz neu starten';
    controls.insertAdjacentHTML('beforeend','<div><kbd>TAB</kbd><span>Inselkarte öffnen</span></div><div><kbd>N</kbd><span>Nächste Basis verfolgen</span></div>');
    controls.insertAdjacentHTML('beforeend','<div><kbd>T</kbd><span>Reise zu entdeckten Orten</span></div><div><kbd>↑ ↓ · E</kbd><span>Im Atlas wählen / bestätigen</span></div>');
    this.root.querySelector('.location')!.innerHTML = '<span id="location-name">VENTOSA</span><small id="location-detail">KÜSTENMARKT · 08:30</small>';
    this.root.insertAdjacentHTML('beforeend','<div class="world-compass"><span>W</span><b id="world-heading">NORDOST</b><span>O</span></div>');
    this.root.querySelector('.mission .eyebrow')!.innerHTML = '<span class="live-dot"></span> EINSATZ';
    this.panel = this.element('menu'); this.start = this.element('start') as HTMLButtonElement;
    this.status = this.element('loading'); this.state = this.element('state'); this.speed = this.element('speed');
    this.altitude = this.element('altitude'); this.metrics = this.element('metrics'); this.hint = this.element('hint');
    this.start.onclick = () => this.onStart();
    this.element('reset').onclick = () => this.onReset();
    this.element('sensitivity').oninput = e => this.onSensitivity(Number((e.target as HTMLInputElement).value));
    this.element('quality').onchange = e => this.onQuality(Number((e.target as HTMLSelectElement).value));
    this.element('volume').oninput = e => this.onVolume(Number((e.target as HTMLInputElement).value));
  }
  element(id: string) { return document.getElementById(id)!; }
  loading(done: number, total: number) { this.status.textContent = `Modelle laden · ${done} / ${total}`; }
  ready(failures: number) { this.start.disabled = false; this.start.innerHTML = 'SPIELEN <span>↗</span>'; this.status.textContent = failures ? `${failures} Modelle konnten nicht geladen werden; Ersatzmodelle aktiv.` : 'Bereit · Maus & Tastatur · Kopfhörer optional'; }
  pause(paused: boolean) {
    this.panel.hidden = !paused; this.element('shade').hidden = !paused;
    this.root.classList.toggle('playing', !paused);
    if (paused && !this.start.disabled) { this.start.innerHTML = 'WEITERSPIELEN <span>↗</span>'; this.start.focus(); }
  }
  error(message: string) { this.status.textContent = message; this.status.classList.add('error'); }
  private toastTimer?: ReturnType<typeof setTimeout>;
  notify(text: string) {
    clearTimeout(this.toastTimer); const toast = this.element('toast'); toast.textContent = text; toast.classList.add('visible');
    this.toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
  }
  update(player: Player, fps: number, chunks: number) {
    this.root.dataset.position = player.position.asArray().map(n => n.toFixed(2)).join(',');
    this.state.textContent = stateLabels[player.state];
    this.speed.textContent = Math.round(player.speed * 3.6).toString().padStart(3, '0');
    this.altitude.textContent = `${Math.max(0, Math.round(player.position.y - 0.9))} M Ü. M.`;
    this.metrics.textContent = `${Math.round(fps)} FPS · ${chunks} AKTIVE SEKTOREN`;
    this.hint.textContent = player.state === 'ON_FOOT' ? 'SHIFT sprinten · SPACE springen · F auf eine Oberfläche' : 'F Greifhaken · C Wingsuit · Q Fallschirm';
    for (const [id, state] of [['grapple', 'GRAPPLING'], ['wingsuit', 'WINGSUIT'], ['parachute', 'PARACHUTE']]) this.element(`ability-${id}`).classList.toggle('active', player.state === state);
  }
  updateCombat(combat: CombatSystem) {
    const weapon = combat.weapons.current;
    this.element('weapon-name').textContent = weapon.definition.name;
    this.element('ammo').textContent = String(weapon.ammo).padStart(2, '0');
    this.element('reserve').textContent = ` / ${weapon.reserve}`;
    this.element('reload-status').textContent = weapon.reloading ? `NACHLADEN · ${weapon.reloadRemaining.toFixed(1)} S` : '1 / 2 WAFFENWECHSEL · R NACHLADEN';
    this.element('reload-progress').style.width = `${weapon.reloadProgress * 100}%`;
    this.element('alarm').textContent = combat.liberated ? 'INSEL BEFREIT' : combat.heat ? `ALARM ${'▮'.repeat(combat.heat)}${'▯'.repeat(3 - combat.heat)}` : 'KEIN ALARM';
    this.element('alarm').classList.toggle('wanted', combat.heat > 0);
    this.element('score').textContent = `${String(combat.score).padStart(4, '0')} PUNKTE`;
    this.element('reticle').classList.toggle('hit', combat.hitFlash > 0);
    this.element('reticle').classList.toggle('kill', combat.killFlash && combat.hitFlash > 0);
    this.element('damage-vignette').style.opacity = String(Math.min(0.7, combat.hurtFlash * 2));
    (this.root.querySelector('.health-line') as HTMLElement).style.transform = `scaleX(${combat.health.current / combat.health.max})`;
    this.altitude.textContent += ` · ${Math.ceil(combat.health.current)} HP`;
    if (combat.nearSupply) this.hint.textContent = 'E · Gesundheit und Munition am SUV auffüllen';
    else if(combat.nearResident) this.hint.textContent='E · Mit Bewohner sprechen';
    else this.hint.textContent += ' · M Journal · TAB Atlas';
  }
  updateWorld(player: Player, clock: string, activity: {market:number;work:number;social:number;rest:number;sheltering:number}) {
    const town = settlements.find(place=>Math.hypot(player.position.x-place.center[0],player.position.z-place.center[1])<place.radius+25);
    const landmark = worldLocations.find(place=>Math.hypot(player.position.x-place.position[0],player.position.z-place.position[1])<90);
    this.element('location-name').textContent = (town?.name??landmark?.name??(player.position.y>85?'Zentrales Hochland':'Cala Ventra · Unterwegs')).toUpperCase();
    const mood = activity.sheltering ? 'BEWOHNER SUCHEN SCHUTZ' : activity.social>2 ? 'TREFFPUNKT AM MARKT' : activity.market>2 ? 'MARKT & STADTLEBEN' : 'GASSEN & WERKSTÄTTEN';
    this.element('location-detail').textContent = `${clock} · ${town ? mood : landmark ? 'SEHENSWÜRDIGKEIT' : 'DIE OFFENE INSEL'}`;
    const direction = ((player.visual.rotation.y*180/Math.PI)%360+360)%360;
    this.element('world-heading').textContent = `${['N','NO','O','SO','S','SW','W','NW'][Math.round(direction/45)%8]} · ${Math.round(direction)}°`;
  }
}
