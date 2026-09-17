import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { terrainHeight } from './Terrain';

export type DynamicEventKind = 'rescue' | 'supply' | 'signal';

export interface DynamicEventSaveState {
  active?: { siteId: string; remaining: number; progress: number; discovered: boolean };
  cooldown: number;
  sequence: number;
  completed: number;
}

export interface DynamicEventView {
  id: string;
  kind: DynamicEventKind;
  title: string;
  description: string;
  instruction: string;
  position: readonly [number, number, number];
  distance: number;
  remaining: number;
  progress: number;
  reward: number;
  discovered: boolean;
  near: boolean;
  inside: boolean;
}

interface DynamicEventSite {
  id: string;
  kind: DynamicEventKind;
  title: string;
  description: string;
  instruction: string;
  point: readonly [number, number];
  reward: number;
  hold: number;
}

export const dynamicEventSites: readonly DynamicEventSite[] = [
  { id:'west-bridge-call',kind:'rescue',title:'Pannenruf an der Westbrücke',description:'Ein Kurier ist mit einer wichtigen Medikamentenlieferung liegen geblieben.',instruction:'Sichere die Lieferung und sende die Position an Mara.',point:[-235,-286],reward:450,hold:4 },
  { id:'southern-cache',kind:'supply',title:'Verlorene Versorgungskiste',description:'Eine Versorgungskiste wurde nahe der südlichen Raststätte abgeworfen.',instruction:'Öffne die Kiste und registriere den Inhalt.',point:[70,-810],reward:350,hold:3 },
  { id:'waterfall-signal',kind:'signal',title:'Störsignal an den Kaskaden',description:'Ein improvisierter Sender blockiert die zivile Funkfrequenz.',instruction:'Kalibriere den Empfänger und schalte das Störsignal ab.',point:[-425,270],reward:550,hold:5 },
  { id:'old-fort-cache',kind:'supply',title:'Versteck im alten Fort',description:'Bewohner melden ein unbewachtes Direktoratsdepot in den Ruinen.',instruction:'Sichere das Depot, bevor eine Patrouille zurückkehrt.',point:[-1290,750],reward:500,hold:4 },
  { id:'terminal-rescue',kind:'rescue',title:'Notruf am Terminal',description:'Eine Mechanikerin benötigt Ersatzteile für einen liegen gebliebenen Bus.',instruction:'Bestätige die Übergabe der Ersatzteile.',point:[1250,340],reward:400,hold:4 },
  { id:'salt-radio',kind:'signal',title:'Fremdsignal über den Salinen',description:'Ein nicht registrierter Peilsender verfolgt die Fischerboote an der Ostküste.',instruction:'Lösche die Kennungen und deaktiviere den Peilsender.',point:[1160,860],reward:600,hold:5 },
  { id:'north-rescue',kind:'rescue',title:'Vermisste Wanderer am Nordkap',description:'Ein Leuchtsignal aus dem Aussichtsgarten wartet auf Antwort.',instruction:'Übermittle eine sichere Rückroute nach Rocca Alta.',point:[300,1290],reward:500,hold:4 },
  { id:'marina-cache',kind:'supply',title:'Treibgut an der Marina',description:'Eine versiegelte Materialkiste wurde an die Stege von Bellacosta gespült.',instruction:'Berge die Kiste und prüfe ihre Kennnummer.',point:[720,-1090],reward:375,hold:3 },
  { id:'windfarm-signal',kind:'signal',title:'Fehler im Windparknetz',description:'Ein defektes Relais sendet falsche Wetterdaten an die Küstenorte.',instruction:'Starte das Relais neu und gleiche die Messwerte ab.',point:[1320,-480],reward:525,hold:5 },
] as const;

interface ActiveEvent {
  site: DynamicEventSite;
  remaining: number;
  progress: number;
  discovered: boolean;
}

const revealDistance = 560;
const interactionDistance = 13;
const eventLifetime = 360;
const respawnDelay = 55;

/** Rotating open-world incidents with an intentionally small, saveable state. */
export class DynamicEvents {
  private root: TransformNode;
  private ring: Mesh;
  private diamond: Mesh;
  private beam: Mesh;
  private prop: Mesh;
  private active?: ActiveEvent;
  private cooldown = 2;
  private sequence = 0;
  private lastSiteId?: string;
  private animationTime = 0;
  private distance = Number.POSITIVE_INFINITY;
  private hidden = false;
  completed = 0;
  onMessage: (message: string) => void = () => {};
  onReward: (amount: number) => void = () => {};

  constructor(private scene: Scene) {
    this.root = new TransformNode('dynamic-event', scene);
    const cyan = new StandardMaterial('dynamic-event-cyan', scene);
    cyan.diffuseColor = Color3.FromHexString('#68e2dc');
    cyan.emissiveColor = Color3.FromHexString('#237f83');
    cyan.specularColor = Color3.Black();
    this.ring = MeshBuilder.CreateTorus('dynamic-event-ring', {diameter:9,thickness:.22,tessellation:36}, scene);
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = .15;
    this.diamond = MeshBuilder.CreatePolyhedron('dynamic-event-diamond', {type:1,size:.62}, scene);
    this.diamond.position.y = 3.5;
    this.beam = MeshBuilder.CreateCylinder('dynamic-event-beam', {diameter:.18,height:22,tessellation:8}, scene);
    this.beam.position.y = 10.5;
    const beamMaterial = new StandardMaterial('dynamic-event-beam-material', scene);
    beamMaterial.diffuseColor = cyan.diffuseColor; beamMaterial.emissiveColor = cyan.emissiveColor; beamMaterial.alpha = .26;
    this.prop = MeshBuilder.CreateBox('dynamic-event-device', {width:1.25,height:.8,depth:.9}, scene);
    this.prop.position.y = .55;
    const propMaterial = new StandardMaterial('dynamic-event-device-material', scene);
    propMaterial.diffuseColor = Color3.FromHexString('#284b53'); propMaterial.emissiveColor = Color3.FromHexString('#12363c'); propMaterial.specularColor = Color3.Black();
    for (const mesh of [this.ring,this.diamond,this.beam,this.prop]) { mesh.parent=this.root; mesh.isPickable=false; mesh.material=cyan; }
    this.beam.material=beamMaterial; this.prop.material=propMaterial;
    this.root.setEnabled(false);
  }

  get view(): DynamicEventView | undefined {
    const event=this.active;if(!event)return undefined;
    const position=this.position(event.site);
    return {id:event.site.id,kind:event.site.kind,title:event.site.title,description:event.site.description,instruction:event.site.instruction,
      position,distance:this.distance,remaining:event.remaining,progress:event.progress/event.site.hold,reward:event.site.reward,
      discovered:event.discovered,near:this.distance<=revealDistance,inside:this.distance<=interactionDistance};
  }

  get isInside() { return !!this.active && this.distance <= interactionDistance; }

  update(dt: number, player: Vector3, interacting: boolean, available = true) {
    const step=Number.isFinite(dt)?Math.max(0,dt):0;
    this.animationTime+=step;
    if(!this.active) {
      this.cooldown=Math.max(0,this.cooldown-step);
      if(this.cooldown<=0)this.spawn(player);
    }
    const event=this.active;
    if(!event) {this.root.setEnabled(false);return;}
    const position=this.position(event.site);
    this.distance=Math.hypot(player.x-position[0],player.z-position[2]);
    event.remaining=Math.max(0,event.remaining-step);
    if(!event.discovered&&this.distance<=revealDistance) {
      event.discovered=true;
      this.onMessage(`DYNAMISCHES EREIGNIS IN DER NÄHE · ${event.site.title} · ${Math.round(this.distance)} m`);
    }
    if(event.remaining<=0) {this.onMessage(`Ereignis beendet · ${event.site.title}`);this.finish(false);return;}
    const inside=this.distance<=interactionDistance;
    if(inside&&available&&interacting) event.progress=Math.min(event.site.hold,event.progress+step);
    else event.progress=Math.max(0,event.progress-step*1.25);
    if(event.progress>=event.site.hold) {
      const {reward,title}=event.site;this.onReward(reward);this.completed++;
      this.onMessage(`${title.toUpperCase()} ABGESCHLOSSEN · +${reward.toLocaleString('de-CH')} Cr`);
      this.finish(true);return;
    }
    this.root.position.copyFromFloats(...position);
    this.diamond.rotation.y=this.animationTime*1.2;
    this.diamond.position.y=3.5+Math.sin(this.animationTime*2.2)*.28;
    const pulse=1+Math.sin(this.animationTime*2)*.06;this.ring.scaling.setAll(pulse);
    this.root.setEnabled(event.discovered&&this.distance<900&&!this.hidden);
  }

  setHidden(hidden: boolean) {this.hidden=hidden;if(hidden)this.root.setEnabled(false);}

  saveState(): DynamicEventSaveState {
    return {active:this.active?{siteId:this.active.site.id,remaining:this.active.remaining,progress:this.active.progress,discovered:this.active.discovered}:undefined,
      cooldown:this.cooldown,sequence:this.sequence,completed:this.completed};
  }

  restore(state?: DynamicEventSaveState) {
    this.active=undefined;this.distance=Number.POSITIVE_INFINITY;
    this.cooldown=Math.max(0,state?.cooldown??2);this.sequence=Math.max(0,Math.floor(state?.sequence??0));this.completed=Math.max(0,Math.floor(state?.completed??0));
    if(state?.active) {
      const site=dynamicEventSites.find(candidate=>candidate.id===state.active!.siteId);
      if(site)this.active={site,remaining:Math.max(1,state.active.remaining),progress:Math.min(site.hold,Math.max(0,state.active.progress)),discovered:state.active.discovered};
    }
    this.root.setEnabled(false);
  }

  reset() {this.active=undefined;this.cooldown=2;this.sequence=0;this.completed=0;this.lastSiteId=undefined;this.distance=Number.POSITIVE_INFINITY;this.root.setEnabled(false);}

  dispose() {this.root.dispose(false,true);}

  private spawn(player: Vector3) {
    const candidates=dynamicEventSites.filter(site=>site.id!==this.lastSiteId);
    let site:DynamicEventSite;
    if(this.sequence===0) site=candidates.reduce((nearest,candidate)=>this.horizontalDistance(candidate,player)<this.horizontalDistance(nearest,player)?candidate:nearest);
    else site=candidates[(this.sequence*5+this.completed*3)%candidates.length];
    this.sequence++;this.active={site,remaining:eventLifetime,progress:0,discovered:false};
    this.distance=this.horizontalDistance(site,player);
    this.root.position.copyFromFloats(...this.position(site));
  }

  private finish(completed: boolean) {this.lastSiteId=this.active?.site.id;this.active=undefined;this.distance=Number.POSITIVE_INFINITY;this.cooldown=completed?respawnDelay:25;this.root.setEnabled(false);}
  private horizontalDistance(site: DynamicEventSite,player: Vector3) {return Math.hypot(player.x-site.point[0],player.z-site.point[1]);}
  private position(site: DynamicEventSite): readonly [number,number,number] {return [site.point[0],terrainHeight(...site.point)+.25,site.point[1]];}
}
