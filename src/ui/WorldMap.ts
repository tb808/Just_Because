import type { BaseManager } from '../world/BaseManager';
import type { Player } from '../player/Player';
import type { MissionManager } from '../missions/MissionManager';
import type { Exploration } from '../world/Exploration';
import { bases } from '../data/bases';
import { settlements, worldLocations, worldRoads } from '../data/world';
import { worldConfig } from '../data/config';
import { terrainHeight } from '../world/Terrain';
import { territories, territoryAt, territoryForSettlement } from '../data/territories';

type AtlasView = 'world' | 'journal' | 'travel';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const roads = Object.values(worldRoads).map(points => points.map(([x,z], i) => `${i?'L':'M'}${x},${-z}`).join(' ')).join(' ');

/** Terrain-derived contours prevent a decorative atlas from misrepresenting the coast. */
function terrainPath(minimum: number) {
  const n = 64, step = worldConfig.size / n, half = worldConfig.size / 2;
  let path = '';
  for (let z = 0; z < n; z++) {
    let start = -1;
    for (let x = 0; x <= n; x++) {
      const land = x < n && terrainHeight(-half+(x+.5)*step, -half+(z+.5)*step) > minimum;
      if (land && start < 0) start = x;
      if (!land && start >= 0) {
        path += `M${-half+start*step},${half-z*step}h${(x-start)*step}v${-step}h${-(x-start)*step}Z `; start = -1;
      }
    }
  }
  return path;
}

const landPath = terrainPath(.5);

/** Rasterised Voronoi regions follow the real coastline and stay cheap to render as SVG. */
function buildTerritoryGeometry() {
  const n = 96, step = worldConfig.size / n, half = worldConfig.size / 2;
  const owners: Array<string | undefined> = [];
  const paths = Object.fromEntries(territories.map(territory => [territory.baseId, ''])) as Record<string, string>;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const wx = -half + (x + .5) * step, wz = -half + (z + .5) * step;
    owners[z * n + x] = terrainHeight(wx, wz) > .5 ? territoryAt(wx, wz).baseId : undefined;
  }
  for (let z = 0; z < n; z++) {
    let start = 0, owner = owners[z * n];
    for (let x = 1; x <= n; x++) {
      const next = x < n ? owners[z * n + x] : undefined;
      if (next === owner) continue;
      if (owner) paths[owner] += `M${-half + start * step},${half - z * step}h${(x - start) * step}v${-step}h${-(x - start) * step}Z `;
      start = x; owner = next;
    }
  }
  let borders = '';
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const owner = owners[z * n + x]; if (!owner) continue;
    const right = x + 1 < n ? owners[z * n + x + 1] : undefined;
    const below = z + 1 < n ? owners[(z + 1) * n + x] : undefined;
    if (right && right !== owner) borders += `M${-half + (x + 1) * step},${half - z * step}v${-step}`;
    if (below && below !== owner) borders += `M${-half + x * step},${half - (z + 1) * step}h${step}`;
  }
  return { paths, borders };
}
const territoryGeometry = buildTerritoryGeometry();

export class WorldMap {
  private root: HTMLElement;
  private view: AtlasView = 'world';
  private selection = 0;
  private rows: Array<{ id: string; title: string; description: string; label: string; status: string }> = [];
  private listSignature = '';
  private fogRevision = -1;
  private focus = false;
  open = false;
  onTrackMission: (id: string) => void = () => {};
  onTrackBase: (id: string) => void = () => {};
  onTravel: (id: string) => void = () => {};
  onClose: () => void = () => {};
  constructor() {
    this.root = document.createElement('aside'); this.root.className = 'world-map';
    this.root.setAttribute('aria-label', 'Inselatlas und Auftragsjournal');
    const half = worldConfig.size / 2;
    this.root.innerHTML = `
      <header class="map-header"><div><span class="eyebrow">DEIN WEG DURCH CALA VENTRA</span><h2>Der Inselatlas</h2></div><div><strong id="territory-count">0 / ${bases.length} FREI</strong><small id="atlas-discoveries"></small><button class="atlas-close" aria-label="Atlas schliessen">Schliessen · TAB</button></div></header>
      <div class="map-layout"><div class="map-canvas">
        <svg viewBox="${-half} ${-half} ${worldConfig.size} ${worldConfig.size}" role="img" aria-label="Topografische Inselkarte mit Orten, Strassen und aktuellem Ziel">
          <defs>
            <pattern id="sea-grid" width="256" height="256" patternUnits="userSpaceOnUse"><path d="M 256 0 H 0 V 256" fill="none" stroke="#b6d7d3" stroke-opacity=".08" stroke-width="3"/></pattern>
            <mask id="exploration-mask" maskUnits="userSpaceOnUse" x="${-half}" y="${-half}" width="${worldConfig.size}" height="${worldConfig.size}"><rect x="${-half}" y="${-half}" width="${worldConfig.size}" height="${worldConfig.size}" fill="#000"/><path id="map-fog-reveal" fill="#fff"/></mask>
          </defs>
          <rect x="${-half}" y="${-half}" width="${worldConfig.size}" height="${worldConfig.size}" fill="url(#sea-grid)"/>
          <path d="${landPath}" class="map-hidden-land"/>
          <g class="map-revealed" mask="url(#exploration-mask)">
            <path d="${landPath}" class="map-land"/>
            <path d="${terrainPath(35)}" class="map-height map-height-low"/><path d="${terrainPath(75)}" class="map-height map-height-mid"/><path d="${terrainPath(120)}" class="map-height map-height-high"/>
            ${territories.map(territory => `<path id="territory-${territory.baseId}" class="map-territory occupied" d="${territoryGeometry.paths[territory.baseId]}"/>`).join('')}
            <path d="${territoryGeometry.borders}" class="map-territory-border"/>
            <path d="${roads}" class="map-road"/>
            ${worldLocations.map(point => `<g class="map-poi" transform="translate(${point.position[0]},${-point.position[1]})"><circle r="14"/><title>${escape(point.name)}</title></g>`).join('')}
            ${settlements.map(place => `<g class="map-town occupied" id="town-${place.id}" data-territory="${territoryForSettlement(place.id)?.baseId ?? ''}" transform="translate(${place.center[0]},${-place.center[1]})"><rect x="-20" y="-20" width="40" height="40" rx="6"/><text x="31" y="-28">${escape(place.name)}</text></g>`).join('')}
            ${bases.map((base,i) => `<g class="map-base" id="map-${base.id}" transform="translate(${base.flag[0]},${-base.flag[2]})"><circle r="27"/><text class="base-number" text-anchor="middle" y="11">${i+1}</text><title>${escape(base.name)}</title></g>`).join('')}
            <g id="map-objective-marker"><circle r="48"/><path d="M 0 -25 L 20 0 L 0 25 L -20 0 Z"/></g>
          </g>
          <path d="${landPath}" class="map-coast-outline"/>
          <rect x="${-half + 10}" y="${-half + 10}" width="${worldConfig.size - 20}" height="${worldConfig.size - 20}" class="map-world-boundary"/>
          <path id="map-player" d="M 0 -28 L 20 22 L 0 12 L -20 22 Z" fill="#fff" stroke="#244d50" stroke-width="5"/>
          <text class="map-north" x="-1820" y="-1740">N ↑</text><g class="map-scale"><path d="M 1190 1780 V 1810 M 1190 1795 H 1690 M 1690 1780 V 1810"/><text x="1440" y="1750" text-anchor="middle">500 M</text></g>
        </svg><div class="map-territory-legend"><span><i class="occupied"></i>BESETZT</span><span><i class="liberated"></i>BEFREIT</span><span><i class="unknown"></i>UNERKUNDET</span></div><div class="atlas-caption">${settlements.length} SIEDLUNGEN <i>·</i> ${worldLocations.length} AUSFLUGSZIELE <i>·</i> STRASSEN & HÖHENZÜGE</div>
      </div><section class="map-panel"><nav class="atlas-tabs" aria-label="Atlasbereich"><button data-view="world">Insel</button><button data-view="journal">Aufträge</button><button data-view="travel">Reisen</button></nav><p class="atlas-help" id="atlas-help"></p><div class="atlas-list" id="atlas-list" role="list"></div><div class="atlas-detail"><span class="eyebrow" id="atlas-status"></span><h3 id="map-destination"></h3><p id="map-objective"></p><button id="atlas-confirm" class="atlas-confirm">E · ZIEL VERFOLGEN</button></div><div class="map-controls"><kbd>↑ ↓</kbd><span>Eintrag wählen</span><kbd>← →</kbd><span>Bereich wechseln</span><kbd>E</kbd><span>Auswahl bestätigen</span></div></section></div>
      <footer><span id="map-mini-destination"></span><small>TAB · ATLAS &nbsp; M · AUFTRÄGE &nbsp; T · REISEN</small></footer>`;
    document.getElementById('app')!.append(this.root);
    this.root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.onclick = () => this.setView(button.dataset.view as AtlasView));
    (this.root.querySelector('.atlas-close') as HTMLButtonElement).onclick = () => this.onClose();
    (this.root.querySelector('#atlas-confirm') as HTMLButtonElement).onclick = () => this.confirm();
    this.root.querySelector('#atlas-list')!.addEventListener('click', e => {
      const row = (e.target as Element).closest<HTMLButtonElement>('[data-index]');
      if (row) { this.selection = Number(row.dataset.index); this.listSignature = ''; }
    });
  }
  private setView(view: AtlasView) { this.view = view; this.selection = 0; this.rows = []; this.listSignature = ''; this.focus = true; }
  toggle(view: AtlasView = 'world') {
    if (this.open && view === this.view) this.close();
    else { this.open = true; this.root.classList.add('open'); this.setView(view); }
    return this.open;
  }
  close() { this.open = false; this.root.classList.remove('open'); }
  navigate(direction: number) { if (!this.rows.length) return; this.selection = (this.selection + direction + this.rows.length) % this.rows.length; this.focus = true; }
  switchView(direction: number) { const views: AtlasView[] = ['world','journal','travel']; this.setView(views[(views.indexOf(this.view)+direction+3)%3]); }
  confirm() {
    const row = this.rows[this.selection]; if (!row) return;
    if (this.view === 'journal') this.onTrackMission(row.id);
    else if (this.view === 'travel') this.onTravel(row.id);
    else this.onTrackBase(row.id);
  }
  update(manager: BaseManager, player: Player, missions: MissionManager, exploration: Exploration, showCombat: boolean) {
    const state = manager.tracked, base = state.definition;
    const target = !showCombat ? missions.mapTarget : undefined;
    const point = target?.position ?? base.flag, title = target?.title ?? base.name;
    const distance = Math.round(Math.hypot(player.position.x - point[0], player.position.z - point[2]));
    this.text('territory-count', `${manager.liberatedCount} / ${manager.states.length} GEBIETE BEFREIT`);
    this.text('atlas-discoveries', `${exploration.discovered.size} / ${settlements.length} ORTE · ${missions.completedCount} AUFTRÄGE ERLEDIGT`);
    this.text('map-mini-destination', `${title} · ${distance >= 1000 ? `${(distance/1000).toFixed(1)} km` : `${distance} m`}`);
    this.root.querySelector('#map-player')!.setAttribute('transform', `translate(${player.position.x},${-player.position.z}) rotate(${player.visual.rotation.y*180/Math.PI})`);
    this.root.querySelector('#map-objective-marker')!.setAttribute('transform', `translate(${point[0]},${-point[2]})`);
    this.root.querySelector('svg')!.setAttribute('viewBox', this.open ? `${-worldConfig.size/2} ${-worldConfig.size/2} ${worldConfig.size} ${worldConfig.size}` : `${player.position.x-420} ${-player.position.z-420} 840 840`);
    if (this.fogRevision !== exploration.revision) {
      this.fogRevision = exploration.revision;
      this.root.querySelector('#map-fog-reveal')!.setAttribute('d', exploration.visibilityPath());
    }
    for (const place of settlements) {
      const marker = this.root.querySelector(`#town-${place.id}`)!;
      const territory = territoryForSettlement(place.id);
      const liberated = !!territory && manager.states.some(state => state.definition.id === territory.baseId && state.liberated);
      marker.classList.toggle('discovered', exploration.discovered.has(place.id));
      marker.classList.toggle('liberated', liberated); marker.classList.toggle('occupied', !liberated);
    }
    for (const b of manager.states) {
      const marker = this.root.querySelector(`#map-${b.definition.id}`)!;
      marker.classList.toggle('liberated', b.liberated); marker.classList.toggle('selected', b === state && showCombat);
      const region = this.root.querySelector(`#territory-${b.definition.id}`)!;
      region.classList.toggle('liberated', b.liberated); region.classList.toggle('occupied', !b.liberated);
    }
    if (!this.open) return;
    const labels = {locked:'GESPERRT',available:'BEREIT',active:'VERFOLGT',complete:'ERLEDIGT'};
    if (this.view === 'journal') {
      this.rows = missions.entries.map(entry => ({id:entry.definition.id,title:entry.definition.title,description:entry.definition.description,
        label:`${entry.definition.category} · ${entry.step}/${entry.total} · +${entry.definition.reward}`,status:labels[entry.status]}));
      this.text('atlas-help', 'Wähle einen Auftrag. Goldene Ringe markieren das nächste Ziel. E führt vor Ort die angezeigte Aktion aus.');
    } else if (this.view === 'travel') {
      this.rows = settlements.map(place => ({id:place.id,title:place.name,description:place.character,
        label:`${Math.round(Math.hypot(player.position.x-place.center[0],player.position.z-place.center[1]))} m entfernt`,status:exploration.discovered.has(place.id)?'ENTDECKT':'UNERKUNDET'}));
      this.text('atlas-help', 'Entdecke Orte zu Fuss oder aus der Luft. Danach reist du ausserhalb eines Alarms vom Boden direkt zu ihrem Marktplatz.');
    } else {
      this.rows = manager.states.map(b => {
        const territory = territories.find(region => region.baseId === b.definition.id);
        return {id:b.definition.id,title:territory?.name ?? b.definition.name,description:`${b.definition.name} · ${b.definition.description}`,
          label:`${b.guards}/${b.definition.guards.length} Wachen · ${b.tanks}/${b.definition.tanks.length} Tanks`,status:b.liberated?'BEFREIT':'BESETZT'};
      });
      this.text('atlas-help', 'Erkundete Gebiete werden sichtbar. Rot gehört dem Direktorat; mit der Basis werden das Land und seine Städte blau und frei.');
    }
    this.selection = Math.min(this.selection, Math.max(0,this.rows.length-1));
    const signature = JSON.stringify([this.view,this.selection,this.rows.map(r=>[r.id,r.status,r.label])]);
    if (signature !== this.listSignature) {
      this.listSignature = signature;
      this.root.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===this.view));
      this.root.querySelector('#atlas-list')!.innerHTML = this.rows.map((row,i)=>`<button role="listitem" data-index="${i}" aria-current="${i===this.selection}" class="atlas-row ${i===this.selection?'selected':''} ${row.status==='ERLEDIGT'||row.status==='BEFREIT'?'done':''}"><span><strong>${escape(row.title)}</strong><small>${escape(row.label)}</small></span><b>${row.status}</b></button>`).join('');
      const row = this.rows[this.selection];
      this.text('map-destination',row?.title??'Alle Aufträge abgeschlossen'); this.text('map-objective',row?.description??'Die Insel wartet auf deinen nächsten Sprung.'); this.text('atlas-status',row?.status??'');
      this.text('atlas-confirm',this.view==='travel'?'E · ZUM MARKTPLATZ REISEN':'E · ZIEL VERFOLGEN');
      if (this.focus) { this.root.querySelector('.atlas-row.selected')?.scrollIntoView({block:'nearest'}); this.focus = false; }
    }
  }
  private text(id: string, value: string) {
    const element = this.root.querySelector(`#${id}`)!;
    if (element.textContent !== value) element.textContent = value;
  }
}
