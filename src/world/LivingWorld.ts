import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CharacterAnimator } from '../core/CharacterAnimator';
import type { AssetManager } from '../core/AssetManager';
import type { WorldManager } from './WorldManager';
import type { WorldVehicle } from './WorldManager';
import { assets, residentCharacterModels } from '../data/assets';
import { bases } from '../data/bases';
import { miradaResidentRoute, settlements, worldRoads, type GroundPoint, type SettlementDefinition } from '../data/world';
import { terrainHeight } from './Terrain';
import { roadSurfaceHeight } from './RoadSurface';
import { approachSpeed, buildTrafficCircuit, directionToDestination, distanceSquared, planEscape, residentActivity, residentRoles, routineDestination, segmentHitsObstacle, trafficTargetSpeed, wrapIndex, type GroundObstacle, type ResidentActivity, type ResidentRole, type RoadUser } from './AmbientBehavior';

interface Resident {
  root: TransformNode; animator: CharacterAnimator; route: Vector3[]; groundRoute: readonly GroundPoint[];
  next: number; direction: number; waiting: number; fear: number; shelter: number; active: boolean;
  baseId?: string; town?: SettlementDefinition; role: ResidentRole; activity: ResidentActivity;
  index: number; speed: number; talkTarget?: Vector3; threat?: Vector3; socialTarget?: Resident;
  initial: Vector3; initialNext: number; blockedTime: number; destination: number; returning: boolean;
}
interface Traffic {
  root: TransformNode; route: Vector3[]; next: number; speed: number; cruise: number;
  waiting: number; initial: Vector3; initialNext: number; active: boolean; vehicle: WorldVehicle; wasOccupied: boolean;
}
interface Obstacle extends GroundObstacle { mesh: AbstractMesh; minY: number; maxY: number }
const point = (vector: Vector3): GroundPoint => [vector.x, vector.z];
const roleNames: Record<ResidentRole, string> = { merchant:'Händlerin', worker:'Handwerker', courier:'Kurierin', fisher:'Fischer', gardener:'Gärtnerin', neighbor:'Anwohner' };
const activityNames: Record<ResidentActivity, string> = { market:'am Markt', work:'bei der Arbeit', social:'im Gespräch', rest:'in einer Pause' };
const clothingColors = ['#b66247','#427c87','#c6a04b','#708559','#9d7182','#657994','#b17f53','#e0c89b'];

/** Sidewalk routines and two-lane traffic share the world's authored street network. */
export class LivingWorld {
  private residents: Resident[] = [];
  private traffic: Traffic[] = [];
  private obstacles = new Map<string, Obstacle[]>();
  private friendly = new Set<string>();
  private time = 0;
  private socialTimer = 0;
  activeCount = 0;
  get populationCount() { return this.residents.filter(npc => !npc.baseId || this.friendly.has(npc.baseId)).length; }
  get trafficCount() { return this.traffic.length; }
  get activitySummary() { return this.residents.filter(npc => npc.active).reduce((counts, npc) => { counts[npc.fear > 0 ? 'sheltering' : npc.activity]++; return counts; }, {market:0,work:0,social:0,rest:0,sheltering:0}); }
  constructor(private world: WorldManager) {}

  async load(manager: AssetManager) {
    this.indexObstacles();
    for (const town of settlements) {
      const count = Math.min(26, Math.max(18, Math.ceil(town.population / 22)));
      for (let i = 0; i < count; i++) await this.addResident(manager, town.residentRoute, i / count, undefined, town);
      const [mx,mz]=town.market;
      const marketRoute: GroundPoint[]=[[mx-10,mz-8],[mx+10,mz-8],[mx+10,mz+8],[mx-10,mz+8]];
      for(let i=0;i<8;i++) await this.addResident(manager,marketRoute,i/8,undefined,town);
    }
    for (let i = 0; i < 6; i++) await this.addResident(manager, miradaResidentRoute, i / 6);
    for (const base of bases) {
      const [x,,z] = base.flag;
      for (let i = 0; i < 4; i++) await this.addResident(manager, [[x-6,z-6],[x+6,z-6],[x+6,z+6],[x-6,z+6]], i / 4, base.id);
    }
    const roads = ['southernCoast','westCoast','southCoast','southeast','eastCoast','northCoast','northwest','mountainPass','eastCrossing','oliveHarbor','northernFrontier','foundryCoast','serenaCoast','sunCoast'];
    const regionalRoadCount=roads.length;
    roads.push(...settlements.map(town => `${town.id}-avenue-0`));
    for (let i = 0; i < roads.length; i++) {
      const circuit = buildTrafficCircuit(worldRoads[roads[i]] ?? [], 2);
      if (circuit.length < 4) continue;
      const model = await manager.instantiate(assets.vehicles.car, `ambient-traffic-${i}`);
      const route = circuit.map(([x,z]) => new Vector3(x, roadSurfaceHeight(x,z)+.2, z));
      const start = i % route.length, next = (start+1) % route.length;
      model.root.position.copyFrom(route[start]);
      model.root.rotation.y = Math.atan2(route[next].x-route[start].x,route[next].z-route[start].z);
      const vehicle=this.world.registerVehicle(model.root,`ambient-traffic-${i}`);
      const trim = MeshBuilder.CreateBox(`traffic-roof-${i}`, {width:1.25,height:.09,depth:1.3},this.world.scene);
      trim.parent = model.root; trim.position.y = 2.02 / model.root.scaling.y; trim.scaling.setAll(1/model.root.scaling.y);
      trim.material = this.world.material(clothingColors[i % clothingColors.length]); trim.isPickable = false;
      model.root.setEnabled(false);
      vehicle.collider.setEnabled(false);
      this.traffic.push({root:model.root,route,next,speed:0,cruise:i<regionalRoadCount?10.5+(i%3):6.5,waiting:(i%4)*.65,initial:route[start].clone(),initialNext:next,active:false,vehicle,wasOccupied:false});
    }
  }

  private async addResident(manager: AssetManager, route: readonly GroundPoint[], fraction: number, baseId?: string, town?: SettlementDefinition) {
    const index = this.residents.length;
    const model = await manager.instantiate(residentCharacterModels[index % residentCharacterModels.length],`resident-${index}`);
    const animator = new CharacterAnimator(model.entries?.animationGroups??[],this.world.scene);
    const points = route.map(([x,z]) => new Vector3(x,terrainHeight(x,z)+.12,z));
    const lengths = points.map((p,i) => Vector3.Distance(p,points[(i+1)%points.length]));
    let along = fraction * lengths.reduce((a,b)=>a+b,0), start = 0;
    while (start < lengths.length-1 && along > lengths[start]) along -= lengths[start++];
    const next = (start+1)%points.length;
    model.root.position.copyFrom(Vector3.Lerp(points[start],points[next],lengths[start] ? along/lengths[start] : 0));
    model.root.rotation.y = Math.atan2(points[next].x-points[start].x,points[next].z-points[start].z);
    const role = residentRoles[index % residentRoles.length];
    this.dressResident(model.root,index,role,!!baseId);
    model.root.setEnabled(false);
    const activity=residentActivity(role,0,index*13);
    this.residents.push({root:model.root,animator,route:points,groundRoute:route,next,direction:1,waiting:0,fear:0,shelter:-1,baseId,town,active:false,role,activity,index,speed:1.1+(index%7)*.095,initial:model.root.position.clone(),initialNext:next,blockedTime:0,destination:routineDestination(role,activity,route.length,next),returning:false});
  }

  private dressResident(root: TransformNode, index: number, role: ResidentRole, liberated: boolean) {
    const scene = this.world.scene, scale = 1/root.scaling.y;
    const attach = (mesh: AbstractMesh, height: number, color: string, bone: string, x = 0, z = 0) => {
      mesh.parent=root; mesh.position.set(x*scale,height*scale,z*scale); mesh.scaling.setAll(scale);
      mesh.material=this.world.material(color); mesh.isPickable=false; mesh.checkCollisions=false;
      const target=root.getDescendants().find(node=>node.name.endsWith(`:${bone}`)) as TransformNode|undefined;
      if(target) { target.computeWorldMatrix(true); mesh.computeWorldMatrix(true); mesh.setParent(target); }
    };
    // Garments reference immutable palette materials; the imported skin and hair stay intact.
    attach(MeshBuilder.CreateBox(`resident-${index}-jacket`,{width:.5,height:role==='merchant'?.6:.43,depth:.32},scene),1.2,liberated?'#a6bc68':clothingColors[index%clothingColors.length],'torso');
    if (index%4!==3) attach(MeshBuilder.CreateCylinder(`resident-${index}-hat`,{diameter:role==='gardener'||role==='fisher'?.68:.48,height:.12,tessellation:10},scene),1.75,['#e3c07d','#cc7b4e','#455d67'][index%3],'head');
    if (role==='courier'||role==='worker') attach(MeshBuilder.CreateBox(`resident-${index}-satchel`,{width:.33,height:.34,depth:.16},scene),1.1,'#745f4a','torso',-.29,-.12);
    if (role==='merchant'||role==='gardener') attach(MeshBuilder.CreateBox(`resident-${index}-apron`,{width:.4,height:.43,depth:.05},scene),.85,'#e4d8b5','torso',0,.2);
  }

  private indexObstacles() {
    this.obstacles.clear();
    for (const mesh of this.world.scene.meshes) {
      if (!mesh.checkCollisions) continue;
      mesh.computeWorldMatrix(true);
      const {minimumWorld:min,maximumWorld:max} = mesh.getBoundingInfo().boundingBox;
      // Merged district geometry spans whole streets; use the original primitive bounds, not the district box.
      const bounds: Omit<Obstacle,'mesh'>[] = mesh.metadata?.navigationObstacles ?? [{minX:min.x,maxX:max.x,minZ:min.z,maxZ:max.z,minY:min.y,maxY:max.y}];
      for(const bound of bounds) {
        if(bound.maxY-bound.minY<.9||bound.maxX-bound.minX>200||bound.maxZ-bound.minZ>200) continue;
        const obstacle: Obstacle={...bound,mesh};
        for (let x=Math.floor(bound.minX/24);x<=Math.floor(bound.maxX/24);x++) for(let z=Math.floor(bound.minZ/24);z<=Math.floor(bound.maxZ/24);z++) {
          const key=`${x},${z}`,list=this.obstacles.get(key)??[];list.push(obstacle);this.obstacles.set(key,list);
        }
      }
    }
  }
  private blocked(from: Vector3, to: Vector3, clearance: number) {
    const visited = new Set<Obstacle>();
    for (let x=Math.floor((Math.min(from.x,to.x)-clearance)/24);x<=Math.floor((Math.max(from.x,to.x)+clearance)/24);x++) for(let z=Math.floor((Math.min(from.z,to.z)-clearance)/24);z<=Math.floor((Math.max(from.z,to.z)+clearance)/24);z++) {
      for (const obstacle of this.obstacles.get(`${x},${z}`)??[]) {
        if (visited.has(obstacle)) continue; visited.add(obstacle);
        if (obstacle.mesh.isEnabled() && obstacle.minY < from.y+1.5 && obstacle.maxY > from.y+.35 && segmentHitsObstacle(point(from),point(to),obstacle,clearance)) return true;
      }
    }
    return false;
  }

  liberate(id: string) { this.friendly.add(id); }
  nearby(position: Vector3) {
    let nearest: Resident|undefined, range=4**2;
    for (const npc of this.residents) if(npc.active) { const distance=Vector3.DistanceSquared(position,npc.root.position); if(distance<range) {range=distance;nearest=npc;} }
    return nearest;
  }
  talk(position: Vector3) {
    const npc=this.nearby(position); if(!npc) return;
    npc.waiting=5; npc.talkTarget=position.clone();
    if (npc.fear>0) return 'In Deckung! Ich warte hier, bis es wieder ruhig ist.';
    if(npc.baseId) return 'Endlich ist die Station wieder frei. Am Wagen bekommst du Nachschub. Die Leute trauen sich wieder auf die Straße.';
    const local=npc.town?.name??'Mirada';
    const lines: Record<ResidentRole,readonly string[]> = {
      merchant:[`Frische Ware aus ${local}! Morgens kommen die Lieferwagen, später treffen sich alle am Markt.`,`Die Küstenstraße verbindet Aurora und Bellacosta. Unser Handel braucht freie Straßen.`],
      worker:[`Die Werkstätten von ${local} haben wieder Arbeit. Nachher gehe ich noch über den Markt.`,`An den roten Flaggen stehen Wachen. Ihre Treibstofftanks sind ihre Schwachstelle.`],
      courier:[`Ich liefere gerade in ${local}. Auf der Karte findest du die anderen Städte und Außenposten.`,`Wenn eine Station befreit ist, kommen die Nachschubwagen zurück. Das hilft der ganzen Insel.`],
      fisher:[`In Porto Novo und Bellacosta liegt der Fang am Hafen. Hier in ${local} verkaufen wir ihn weiter.`,`Wenn du Schüsse hörst, verlasse die Straße. Die Gassen bieten mehr Schutz.`],
      gardener:[`Die Gärten von ${local} brauchen täglich Wasser. In Oliveto stehen die ältesten Olivenbäume.`,`Auf den Hügeln gibt es Weinberge, eine Abtei und alte Aussichtspunkte. Schau auch abseits der Städte vorbei.`],
      neighbor:[`Willkommen in ${local}. ${npc.town?.character??'Am Hafen ist immer etwas los.'}`,`Ich bin gerade ${activityNames[npc.activity]}. Wir treffen uns später auf dem Platz.`],
    };
    return `${roleNames[npc.role]}: ${lines[npc.role][Math.floor(this.time/20+npc.index)%2]}`;
  }
  noise(threat: Vector3) {
    for(const npc of this.residents) if((!npc.baseId||this.friendly.has(npc.baseId))&&Vector3.DistanceSquared(threat,npc.root.position)<100**2) {
      const escape=planEscape(npc.groundRoute,point(npc.root.position),point(threat),npc.next,npc.direction);
      npc.fear=14+(npc.index%4); npc.waiting=0; npc.threat=threat.clone(); npc.talkTarget=undefined; npc.socialTarget=undefined;
      npc.next=escape.next; npc.direction=escape.direction; npc.shelter=escape.shelter;
    }
  }

  update(dt: number, player: Vector3) {
    // Small substeps keep braking and separation stable after a short hitch.
    const elapsed=Math.min(Math.max(dt,0),1), steps=Math.max(1,Math.ceil(elapsed/.08));
    for(let step=0;step<steps;step++) this.tick(elapsed/steps,player);
    for(const flag of this.world.flags.values()) {flag.unfreezeWorldMatrix();flag.rotation.y=Math.sin(this.time*2+flag.position.x)*.12;}
  }
  private tick(dt: number, player: Vector3) {
    this.time+=dt; this.activeCount=0;
    const active: Resident[]=[];
    for(const npc of this.residents) {
      const enabled=(!npc.baseId||this.friendly.has(npc.baseId))&&Vector3.DistanceSquared(npc.root.position,player)<205**2;
      if(enabled!==npc.active) {npc.root.setEnabled(enabled);npc.active=enabled;if(!enabled) npc.animator.suspend();}
      npc.fear=Math.max(0,npc.fear-dt);
      const activity=residentActivity(npc.role,this.time,npc.index*13);
      if(activity!==npc.activity) {npc.activity=activity;npc.returning=false;npc.destination=routineDestination(npc.role,activity,npc.route.length,npc.initialNext);}
      if(enabled) {active.push(npc);this.activeCount++;}
    }
    this.socialTimer-=dt;
    if(this.socialTimer<=0) { this.socialTimer=2.5; this.findConversations(active); }
    for(const npc of active) this.updateResident(npc,dt,player,active);
    this.updateTraffic(dt,player,active);
  }
  private findConversations(active: Resident[]) {
    for(const npc of active) {
      if(npc.fear||npc.waiting>0||npc.activity!=='social') continue;
      const friend=active.find(other=>other!==npc&&!other.fear&&!other.talkTarget&&other.waiting<=0&&Vector3.DistanceSquared(npc.root.position,other.root.position)>1&&Vector3.DistanceSquared(npc.root.position,other.root.position)<3.5**2);
      if(friend) {npc.socialTarget=friend;friend.socialTarget=npc;npc.waiting=friend.waiting=5+(npc.index%4);}
    }
  }
  private updateResident(npc: Resident, dt: number, player: Vector3, active: Resident[]) {
    npc.waiting=Math.max(0,npc.waiting-dt);
    if(!npc.waiting) {npc.talkTarget=undefined;npc.socialTarget=undefined;}
    const target=npc.route[npc.next],delta=target.subtract(npc.root.position);delta.y=0;
    let moving=npc.waiting===0;
    if(delta.length()<.28) {
      if(npc.fear>4&&npc.next===npc.shelter) {npc.waiting=.4;moving=false;}
      else {
        if(npc.fear<=0) {
          if(npc.next===npc.destination) {
            npc.waiting=npc.role==='courier'?1.5:npc.activity==='rest'?18:8+(npc.index%9);
            npc.returning=!npc.returning;
            npc.destination=npc.returning?npc.initialNext:routineDestination(npc.role,npc.activity,npc.route.length,npc.initialNext);
            if(npc.destination===npc.next) npc.destination=wrapIndex(npc.next+Math.ceil(npc.route.length/2),npc.route.length);
          }
          npc.direction=directionToDestination(npc.groundRoute,npc.next,npc.destination);
        }
        npc.next=wrapIndex(npc.next+npc.direction,npc.route.length);
        moving=false;
      }
    }
    const facing=npc.talkTarget??npc.socialTarget?.root.position??(npc.fear>4&&npc.waiting>0?npc.threat:undefined);
    if(facing) this.face(npc.root,facing.subtract(npc.root.position),dt);
    if(moving&&delta.lengthSquared()>.001) {
      delta.normalize();
      let speed=npc.speed*(npc.role==='courier'?1.2:1)*(npc.fear>4?3:npc.fear>0?1.5:1);
      for(const other of active) {
        if(other===npc) continue;
        const away=other.root.position.subtract(npc.root.position);away.y=0;
        const ahead=Vector3.Dot(away,delta),lateral=Math.abs(away.x*delta.z-away.z*delta.x);
        if(ahead>.05&&ahead<1.3&&lateral<.5) {
          const theirs=other.route[other.next].subtract(other.root.position).normalize();
          if(Vector3.Dot(theirs,delta)<-.3) {const dx=delta.x;delta.x+=delta.z*.32;delta.z-=dx*.32;delta.normalize();}
          else speed*=Math.max(.08,(ahead-.5)/.8);
        }
      }
      if(Vector3.DistanceSquared(npc.root.position,player)<1.2**2) speed*=.35;
      for(const car of this.traffic) {
        const toNpc=npc.root.position.subtract(car.root.position),forward=car.route[car.next].subtract(car.root.position).normalize();
        if(car.speed>1&&Vector3.Dot(toNpc,forward)>1&&Vector3.Dot(toNpc,forward)<car.speed*1.1+5&&Math.abs(toNpc.x*forward.z-toNpc.z*forward.x)<3) {speed=0;break;}
      }
      const step=Math.min(Vector3.Distance(npc.root.position,target),speed*dt), proposed=npc.root.position.add(delta.scale(step));
      proposed.y=terrainHeight(proposed.x,proposed.z)+.12;
      if(!this.blocked(npc.root.position,proposed,.38)) {npc.root.position.copyFrom(proposed);npc.blockedTime=0;}
      else {moving=false;npc.blockedTime+=dt;if(npc.blockedTime>1.6) {npc.next=wrapIndex(npc.next-npc.direction,npc.route.length);npc.direction*=-1;npc.blockedTime=0;npc.waiting=.6;}}
      if(speed<.05) moving=false;
      if(!facing) this.face(npc.root,delta,dt);
    }
    npc.animator.update(dt,moving?(npc.fear>4?'sprint':'walk'):'idle',npc.talkTarget||npc.socialTarget?'interact-right':undefined);
  }
  private face(root: TransformNode, direction: Vector3, dt: number) {
    if(direction.x*direction.x+direction.z*direction.z<.001) return;
    const angle=Math.atan2(direction.x,direction.z),difference=Math.atan2(Math.sin(angle-root.rotation.y),Math.cos(angle-root.rotation.y));root.rotation.y+=difference*(1-Math.exp(-7*dt));
  }
  private updateTraffic(dt: number, player: Vector3, residents: Resident[]) {
    // Cars outside the visible simulation bubble neither render nor affect local
    // traffic, so avoid route planning, collision queries and matrix updates for them.
    for(const car of this.traffic) {
      const active=car.vehicle.occupied||Vector3.DistanceSquared(car.root.position,player)<420**2;
      if(active!==car.active) {car.root.setEnabled(active);car.vehicle.collider.setEnabled(active);car.active=active;}
    }
    const residentUsers:RoadUser[]=residents.map(npc=>({position:point(npc.root.position),radius:.65}));
    for(const car of this.traffic) {
      if(car.vehicle.occupied) {
        car.wasOccupied=true; car.active=true; car.root.setEnabled(true); car.vehicle.collider.setEnabled(true);
        continue;
      }
      if(!car.active) continue;
      if(car.wasOccupied) {
        let nearest=0,distance=Number.POSITIVE_INFINITY;
        car.route.forEach((point,index)=>{const next=Vector3.DistanceSquared(point,car.root.position);if(next<distance){distance=next;nearest=index;}});
        car.next=nearest;car.speed=0;car.waiting=.6;car.wasOccupied=false;
      }
      car.waiting=Math.max(0,car.waiting-dt);
      const target=car.route[car.next],delta=target.subtract(car.root.position);delta.y=0;
      const remaining=delta.length();
      if(remaining<.22) {car.next=(car.next+1)%car.route.length;continue;}
      delta.normalize();
      const users: RoadUser[]=[{position:point(player),radius:.9},...residentUsers];
      for(const other of this.traffic) if(other!==car&&other.active) users.push({position:point(other.root.position),radius:1.35,speed:other.speed});
      const nextDirection=car.route[(car.next+1)%car.route.length].subtract(target).normalize();
      const turn=Vector3.Dot(delta,nextDirection), cornerSpeed=turn<.8&&remaining<12?Math.max(1.6,car.cruise*Math.max(.25,turn)):car.cruise;
      let desired=car.waiting>0?0:trafficTargetSpeed(point(car.root.position),point(delta),car.speed,cornerSpeed,users);
      const ahead=car.root.position.add(delta.scale(Math.max(4,car.speed*car.speed/9+3)));
      if(this.blocked(car.root.position,ahead,1.1)) desired=0;
      car.speed=approachSpeed(car.speed,desired,dt);
      const proposed=car.root.position.add(delta.scale(Math.min(remaining,car.speed*dt)));
      if(!this.blocked(car.root.position,proposed,1.1)) car.root.position.copyFrom(proposed); else car.speed=0;
      car.root.position.y=roadSurfaceHeight(car.root.position.x,car.root.position.z)+.2;
      this.face(car.root,delta,dt*1.5);
      const c=Math.cos(car.root.rotation.y),s=Math.sin(car.root.rotation.y),offset=car.vehicle.centerOffset;
      car.vehicle.collider.position.set(car.root.position.x+offset.x*c+offset.z*s,car.root.position.y+offset.y,car.root.position.z-offset.x*s+offset.z*c);
      car.vehicle.collider.rotation.y=car.root.rotation.y;car.vehicle.collider.computeWorldMatrix(true);
    }
  }
  reset() {
    this.friendly.clear();this.time=0;this.socialTimer=0;this.activeCount=0;
    for(const npc of this.residents) {npc.root.position.copyFrom(npc.initial);npc.next=npc.initialNext;npc.direction=1;npc.fear=0;npc.waiting=0;npc.shelter=-1;npc.talkTarget=undefined;npc.socialTarget=undefined;npc.threat=undefined;npc.blockedTime=0;npc.activity=residentActivity(npc.role,0,npc.index*13);npc.returning=false;npc.destination=routineDestination(npc.role,npc.activity,npc.route.length,npc.initialNext);npc.animator.reset();npc.active=false;npc.root.setEnabled(false);}
    for(const car of this.traffic) {car.root.position.copyFrom(car.initial);car.root.rotation.y=car.vehicle.initialRotationY;car.next=car.initialNext;car.speed=0;car.waiting=0;car.active=false;car.wasOccupied=false;car.vehicle.occupied=false;car.root.setEnabled(false);car.vehicle.collider.setEnabled(false);}
  }
}
