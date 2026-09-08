import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { CharacterAnimator } from '../core/CharacterAnimator';
import type { AssetManager } from '../core/AssetManager';
import type { WorldManager } from './WorldManager';
import { assets } from '../data/assets';
import { bases } from '../data/bases';
import { terrainHeight } from './Terrain';

interface Resident {
  root: TransformNode; animator: CharacterAnimator; route: Vector3[]; next: number;
  waiting: number; fear: number; baseId?: string; active: boolean;
}
/** Ambient residents follow authored, obstacle-free pedestrian routes, not combat AI. */
export class LivingWorld {
  private residents: Resident[] = [];
  private traffic: Array<{root: TransformNode; z: number; direction: number}> = [];
  private friendly = new Set<string>();
  private time = 0;
  activeCount = 0;
  constructor(private world: WorldManager) {}
  async load(manager: AssetManager) {
    const routes = [
      [[-100,-87],[-70,-87],[-70,-80],[-100,-80]],
      [[-212,-153],[-185,-153],[-185,-146],[-212,-146]],
      [[-128,-68],[-49,-68],[-49,-63],[-128,-63]],
    ];
    for (let i=0;i<12;i++) await this.addResident(manager,i,routes[Math.floor(i/4)],i%4);
    for (const base of bases) {
      const [x,y,z]=base.flag;
      for(let i=0;i<2;i++) await this.addResident(manager,this.residents.length,[[x-4,z-3],[x+4,z-3],[x+4,z+3],[x-4,z+3]],i*2,base.id,y);
    }
    for (let i=0;i<2;i++) {
      const model=await manager.instantiate(assets.vehicles.car,`ambient-traffic-${i}`);
      this.traffic.push({root:model.root,z:-120+i*80,direction:i===0?1:-1});
    }
  }
  private async addResident(manager: AssetManager, index: number, route: number[][], start: number, baseId?: string, ground?: number) {
    const model=await manager.instantiate(index%2?assets.characters.soldier:assets.characters.player,`resident-${index}`);
    const animator=new CharacterAnimator(model.entries?.animationGroups??[],this.world.scene);
    const points=route.map(([x,z])=>new Vector3(x,ground??terrainHeight(x,z),z));
    model.root.position.copyFrom(points[start]);
    // Bright local clothing/accessories distinguish unarmed residents from red-vested guards.
    const hat=MeshBuilder.CreateCylinder(`resident-hat-${index}`,{diameter:.62,height:.12,tessellation:8},this.world.scene);
    hat.parent=model.root; hat.position.y=1.7/model.root.scaling.y;
    hat.scaling.setAll(1/model.root.scaling.y); hat.material=this.world.material(baseId?'#b8e976':['#e9c477','#da8d60','#91bac5'][index%3]); hat.isPickable=false;
    const head=model.root.getDescendants().find(n=>n.name.endsWith(':head')) as TransformNode|undefined;
    if(head) { head.computeWorldMatrix(true); hat.computeWorldMatrix(true); hat.setParent(head); }
    model.root.setEnabled(false);
    this.residents.push({root:model.root,animator,route:points,next:(start+1)%points.length,waiting:index*.17,fear:0,baseId,active:false});
  }
  liberate(id: string) { this.friendly.add(id); }
  nearby(position: Vector3) { return this.residents.find(npc=>npc.active&&Vector3.DistanceSquared(position,npc.root.position)<4**2); }
  talk(position: Vector3) {
    const npc=this.nearby(position); if(!npc) return;
    npc.waiting=4;
    return npc.fear?'In Deckung! Hier wird geschossen!':npc.baseId?'Endlich ist die Station wieder frei. Am Wagen bekommst du Nachschub.':'Die roten Flaggen gehören dem Direktorat. Räume die Wachen und Tanks aus dem Weg und halte dann die Flagge.';
  }
  noise(point: Vector3) {
    for(const npc of this.residents) if(Vector3.DistanceSquared(point,npc.root.position)<70**2) { npc.fear=5; npc.waiting=0; }
  }
  update(dt: number, player: Vector3) {
    this.time+=dt; this.activeCount=0;
    for(const npc of this.residents) {
      const active=(!npc.baseId||this.friendly.has(npc.baseId)) && Vector3.DistanceSquared(npc.root.position,player)<150**2;
      if(active!==npc.active) { npc.root.setEnabled(active); npc.active=active; if(!active) npc.animator.suspend(); }
      if(!active) continue;
      this.activeCount++; npc.fear=Math.max(0,npc.fear-dt); npc.waiting=Math.max(0,npc.waiting-dt);
      const target=npc.route[npc.next], delta=target.subtract(npc.root.position); delta.y=0;
      let moving=npc.waiting===0;
      if(delta.length()<.35) { npc.next=(npc.next+1)%npc.route.length; npc.waiting=npc.fear?0:1.5+(npc.next%2); moving=false; }
      if(moving) {
        const step=Math.min(delta.length(),dt*(npc.fear?4.5:1.35)); delta.normalize(); npc.root.position.addInPlace(delta.scale(step));
        npc.root.position.y=npc.baseId?target.y:terrainHeight(npc.root.position.x,npc.root.position.z)+.12;
        const angle=Math.atan2(delta.x,delta.z), difference=Math.atan2(Math.sin(angle-npc.root.rotation.y),Math.cos(angle-npc.root.rotation.y));
        npc.root.rotation.y+=difference*(1-Math.exp(-8*dt));
      }
      npc.animator.update(dt,moving?(npc.fear?'sprint':'walk'):'idle');
    }
    for(const car of this.traffic) {
      const x=car.direction*2.3;
      // Traffic yields when Nika blocks its lane.
      const blocked=Math.abs(player.x-x)<2.1 && (player.z-car.z)*car.direction>0 && (player.z-car.z)*car.direction<9 && Math.abs(player.y-7)<3;
      if(!blocked) car.z+=car.direction*dt*7;
      if(car.z>66) car.z=-130; if(car.z< -130) car.z=66;
      car.root.position.set(x,terrainHeight(x,car.z)+.2,car.z); car.root.rotation.y=car.direction>0?0:Math.PI;
      car.root.setEnabled(Vector3.DistanceSquared(car.root.position,player)<220**2);
    }
    for(const flag of this.world.flags.values()) { flag.unfreezeWorldMatrix(); flag.rotation.y=Math.sin(this.time*2+flag.position.x)*.12; }
  }
  reset() {
    this.friendly.clear();
    for(const npc of this.residents) { npc.root.position.copyFrom(npc.route[0]); npc.next=1; npc.fear=0; npc.waiting=1; npc.animator.reset(); npc.active=false; npc.root.setEnabled(false); }
  }
}
