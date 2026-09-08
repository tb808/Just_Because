import type { BaseManager } from '../world/BaseManager';
import type { Player } from '../player/Player';
import { bases } from '../data/bases';

const pointsOfInterest = [
  { name: 'Aussichtspunkt', x: -26, z: -92, symbol: '△' },
  { name: 'Dorf Ventosa', x: -86, z: -18, symbol: '⌂' },
  { name: 'Markt Ventosa', x: -85, z: -83, symbol: '◇' },
  { name: 'Markt Mirada', x: -199, z: -149, symbol: '◇' },
  { name: 'Hafensteg', x: -290, z: -115, symbol: '⚓' },
  { name: 'Westbrücke', x: -150, z: -100, symbol: '═' },
  { name: 'Tankstelle', x: 26, z: -95, symbol: '+' },
  { name: 'Höhenrelais', x: 36, z: 25, symbol: '△' },
] as const;

export class WorldMap {
  private root: HTMLElement;
  open = false;
  constructor() {
    this.root = document.createElement('aside');
    this.root.className = 'world-map';
    this.root.setAttribute('aria-label', 'Karte von Cala Ventra');
    this.root.innerHTML = `
      <header class="map-header"><div><span class="eyebrow">CALA VENTRA</span><h2>Inselkarte</h2></div><div><strong id="territory-count">0 / 3 FREI</strong><small>TAB · KARTE SCHLIESSEN</small></div></header>
      <div class="map-layout">
        <svg viewBox="-400 -400 800 800" role="img" aria-label="Inselkarte mit Basen, Orten und Spielerposition">
          <defs><filter id="map-shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-opacity=".3"/></filter></defs>
          <ellipse cx="0" cy="0" rx="337" ry="352" fill="#789a7c" stroke="#dfd19f" stroke-width="18" filter="url(#map-shadow)"/>
          <path d="M -135 -155 L -65 -210 L 10 -125 L 130 -60" class="map-ridge"/>
          <path d="M 0 130 L 0 -60 L 100 -151 L 132 -210 M 0 52 L -100 78 L -220 135 L -268 128 M -175 110 L -176 144 L -196 153 L -250 150" class="map-road"/>
          <path d="M -187 104 L -113 100" class="map-bridge"/>
          ${pointsOfInterest.map(point => `<g class="map-poi" transform="translate(${point.x},${-point.z})"><circle r="13"/><text class="poi-symbol" text-anchor="middle" y="7">${point.symbol}</text><text class="poi-label" x="19" y="6">${point.name}</text></g>`).join('')}
          ${bases.map((base, i) => `<g class="map-base" id="map-${base.id}" transform="translate(${base.flag[0]},${-base.flag[2]})"><circle r="22"/><text class="base-number" text-anchor="middle" y="8">${i + 1}</text><text class="base-label" text-anchor="middle" y="-32">${base.name}</text></g>`).join('')}
          <path id="map-player" d="M 0 -18 L 13 14 L 0 8 L -13 14 Z" fill="#fff" stroke="#244d50" stroke-width="4"/>
          <text class="map-north" x="-350" y="-320">N ↑</text>
        </svg>
        <section class="map-panel">
          <span class="eyebrow">VERFOLGTES ZIEL</span><h3 id="map-destination"></h3><p id="map-objective"></p>
          <div class="map-progress"><span id="map-progress"></span></div><small id="map-base-count"></small>
          <div class="map-legend"><span><i class="hostile"></i>Feindliche Basis</span><span><i class="friendly"></i>Befreite Basis</span><span><b>◇</b> Markt</span><span><b>⌂</b> Siedlung</span><span><b>+</b> Nachschub</span><span><b>△</b> Aussicht</span></div>
          <div class="map-controls"><kbd>N</kbd><span>Nächste Basis verfolgen</span><kbd>TAB</kbd><span>Karte schliessen</span></div>
        </section>
      </div>
      <footer><span id="map-mini-destination"></span><small>TAB · KARTE &nbsp; N · NÄCHSTE BASIS</small></footer>`;
    document.getElementById('app')!.append(this.root);
  }
  toggle() { this.open = !this.open; this.root.classList.toggle('open', this.open); return this.open; }
  close() { this.open = false; this.root.classList.remove('open'); }
  update(manager: BaseManager, player: Player) {
    const state = manager.tracked, selected = state.definition;
    const distance = Math.round(Math.hypot(player.position.x - selected.flag[0], player.position.z - selected.flag[2]));
    this.root.querySelector('#territory-count')!.textContent = `${manager.liberatedCount} / ${manager.states.length} FREI`;
    this.root.querySelector('#map-destination')!.textContent = `${selected.name} · ${distance} m`;
    this.root.querySelector('#map-mini-destination')!.textContent = `${selected.name} · ${distance} m`;
    this.root.querySelector('#map-objective')!.textContent = state.liberated ? 'Befreit · Bewohner und Nachschub verfügbar' : selected.description;
    this.root.querySelector('#map-base-count')!.textContent = `${state.guards}/${selected.guards.length} Wachen · ${state.tanks}/${selected.tanks.length} Tanks`;
    const progress = (state.guards + state.tanks + Number(state.liberated)) / (selected.guards.length + selected.tanks.length + 1);
    (this.root.querySelector('#map-progress') as HTMLElement).style.width = `${progress * 100}%`;
    this.root.querySelector('#map-player')!.setAttribute('transform', `translate(${player.position.x},${-player.position.z}) rotate(${player.visual.rotation.y * 180 / Math.PI})`);
    for (const base of manager.states) {
      const marker = this.root.querySelector(`#map-${base.definition.id}`)!;
      marker.classList.toggle('liberated', base.liberated);
      marker.classList.toggle('selected', base === state);
    }
  }
}
