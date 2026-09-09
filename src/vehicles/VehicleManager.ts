import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { InputManager } from '../core/InputManager';
import type { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import type { Player } from '../player/Player';
import { worldConfig } from '../data/config';
import { terrainHeight } from '../world/Terrain';
import type { WorldManager, WorldVehicle } from '../world/WorldManager';

export const carHandling = {maxSpeed:32,reverseSpeed:11,acceleration:15,braking:27,drag:5,steering:1.75} as const;

export function nextVehicleSpeed(speed:number,drive:number,dt:number) {
  const target=drive>0?carHandling.maxSpeed:drive<0?-carHandling.reverseSpeed:0;
  const opposing=drive!==0&&Math.sign(target)!==Math.sign(speed)&&Math.abs(speed)>.25;
  const rate=opposing?carHandling.braking:drive===0?carHandling.drag:carHandling.acceleration;
  const difference=target-speed;
  return speed+Math.sign(difference)*Math.min(Math.abs(difference),rate*Math.max(0,dt));
}

/** Owns enter/exit state and a lightweight arcade car controller for every SUV in the world. */
export class VehicleManager {
  private active?: WorldVehicle;
  private speed=0;
  private lastSafePosition?: Vector3;
  private lastSafeRotation=0;
  onMessage:(message:string)=>void=()=>{};
  onReset:()=>void=()=>{};
  onEnter:()=>void=()=>{};
  constructor(private scene:Scene,private world:WorldManager,private player:Player,private input:InputManager,private camera:ThirdPersonCamera) {}

  get driving() {return !!this.active;}
  get interactionPrompt() {
    if(this.active)return 'E · Aussteigen';
    return this.nearest()?'E · SUV fahren':undefined;
  }

  interact():'entered'|'exited'|undefined {
    if(this.active) {this.exit();return 'exited';}
    if(this.player.state!=='ON_FOOT')return;
    const vehicle=this.nearest();if(!vehicle)return;
    this.onEnter();this.active=vehicle;vehicle.occupied=true;vehicle.root.setEnabled(true);vehicle.collider.setEnabled(true);
    this.speed=0;this.lastSafePosition=vehicle.root.position.clone();this.lastSafeRotation=vehicle.root.rotation.y;
    this.player.state='IN_VEHICLE';this.player.velocity.setAll(0);this.player.visual.setEnabled(false);this.player.body.checkCollisions=false;
    this.syncPlayer();this.camera.yaw=vehicle.root.rotation.y;this.camera.pitch=-.08;this.camera.update(0,true);
    this.onMessage('SUV gestartet · W/S Gas und Bremse · A/D lenken · E aussteigen');
    return 'entered';
  }

  update(dt:number) {
    const vehicle=this.active;if(!vehicle)return;
    if(this.input.take('reset')) {this.exit(false);this.onReset();return;}
    if(this.input.take('unstuck')) {this.unstuck();return;}
    const drive=Number(this.input.down('forward'))-Number(this.input.down('back'));
    const steer=Number(this.input.down('right'))-Number(this.input.down('left'));
    this.speed=nextVehicleSpeed(this.speed,drive,dt);
    const speedRatio=Math.min(1,Math.abs(this.speed)/4),highSpeedGrip=.45+.55*(1-Math.min(1,Math.abs(this.speed)/carHandling.maxSpeed));
    vehicle.root.rotation.y+=steer*carHandling.steering*speedRatio*highSpeedGrip*Math.sign(this.speed||1)*dt;
    vehicle.root.rotation.y=Math.atan2(Math.sin(vehicle.root.rotation.y),Math.cos(vehicle.root.rotation.y));
    const forward=new Vector3(Math.sin(vehicle.root.rotation.y),0,Math.cos(vehicle.root.rotation.y));
    const distance=this.speed*dt,before=vehicle.collider.position.clone();
    vehicle.collider.rotation.y=vehicle.root.rotation.y;vehicle.collider.computeWorldMatrix(true);
    vehicle.collider.moveWithCollisions(forward.scale(distance));
    const moved=Math.hypot(vehicle.collider.position.x-before.x,vehicle.collider.position.z-before.z);
    const expected=Math.abs(distance);
    if(expected>.002&&moved<expected*.3)this.speed*=-.12;
    this.syncRootFromCollider(vehicle);
    const boundary=worldConfig.size/2-15;
    if(Math.abs(vehicle.root.position.x)>boundary||Math.abs(vehicle.root.position.z)>boundary)this.unstuck();
    if(this.lastSafePosition&&Vector3.DistanceSquared(vehicle.root.position,this.lastSafePosition)>36&&(!expected||moved>expected*.75)) {
      this.lastSafePosition=vehicle.root.position.clone();this.lastSafeRotation=vehicle.root.rotation.y;
    }
    this.player.velocity.copyFrom(forward.scale(this.speed));this.syncPlayer();
  }

  reset() {
    if(this.active)this.exit(false);
    for(const vehicle of this.world.vehicles) {
      vehicle.occupied=false;vehicle.root.position.copyFrom(vehicle.initialPosition);vehicle.root.rotation.y=vehicle.initialRotationY;
      this.syncCollider(vehicle);
    }
    this.speed=0;
  }

  leaveForDeath() {if(this.active)this.exit(false);}

  private nearest() {
    let result:WorldVehicle|undefined,range=5.2**2;
    for(const vehicle of this.world.vehicles) {
      if(vehicle.occupied||!vehicle.root.isEnabled()||!vehicle.collider.isEnabled())continue;
      const distance=Vector3.DistanceSquared(this.player.position,vehicle.root.position);
      if(distance<range){range=distance;result=vehicle;}
    }
    return result;
  }

  private exit(placePlayer=true) {
    const vehicle=this.active;if(!vehicle)return;
    vehicle.occupied=false;this.active=undefined;this.speed=0;
    this.player.visual.setEnabled(true);this.player.body.checkCollisions=true;this.player.velocity.setAll(0);this.player.state='FALLING';
    if(placePlayer) {
      const right=new Vector3(Math.cos(vehicle.root.rotation.y),0,-Math.sin(vehicle.root.rotation.y));
      const origin=vehicle.root.position.add(new Vector3(0,1.1,0));
      const leftHit=this.scene.pickWithRay(new Ray(origin,right.scale(-1),3),mesh=>mesh.checkCollisions&&mesh!==vehicle.collider);
      const side=leftHit?.hit?right:right.scale(-1),candidate=vehicle.root.position.add(side.scale(2.8));
      const ground=this.scene.pickWithRay(new Ray(new Vector3(candidate.x,vehicle.root.position.y+7,candidate.z),Vector3.Down(),20),mesh=>mesh.checkCollisions&&mesh!==vehicle.collider);
      candidate.y=(ground?.pickedPoint?.y??terrainHeight(candidate.x,candidate.z))+.92;this.player.position.copyFrom(candidate);
      this.player.body.computeWorldMatrix(true);this.camera.update(0,true);
    }
    this.onMessage('SUV verlassen');
  }

  private unstuck() {
    const vehicle=this.active;if(!vehicle)return;
    vehicle.root.position.copyFrom(this.lastSafePosition??vehicle.initialPosition);vehicle.root.rotation.y=this.lastSafeRotation;
    this.speed=0;this.syncCollider(vehicle);this.syncPlayer();this.camera.update(0,true);this.onMessage('SUV auf eine sichere Position zurückgesetzt');
  }

  private syncRootFromCollider(vehicle:WorldVehicle) {
    const c=Math.cos(vehicle.root.rotation.y),s=Math.sin(vehicle.root.rotation.y),offset=vehicle.centerOffset;
    vehicle.root.position.x=vehicle.collider.position.x-offset.x*c-offset.z*s;
    vehicle.root.position.z=vehicle.collider.position.z+offset.x*s-offset.z*c;
    const surface=this.surfaceHeight(vehicle.root.position.x,vehicle.root.position.z,vehicle.root.position.y);
    vehicle.root.position.y=surface+.2;this.syncCollider(vehicle);
  }

  private syncCollider(vehicle:WorldVehicle) {
    const c=Math.cos(vehicle.root.rotation.y),s=Math.sin(vehicle.root.rotation.y),offset=vehicle.centerOffset;
    vehicle.collider.position.set(vehicle.root.position.x+offset.x*c+offset.z*s,vehicle.root.position.y+offset.y,vehicle.root.position.z-offset.x*s+offset.z*c);
    vehicle.collider.rotation.y=vehicle.root.rotation.y;vehicle.root.computeWorldMatrix(true);vehicle.collider.computeWorldMatrix(true);
  }

  private syncPlayer() {
    const vehicle=this.active;if(!vehicle)return;
    this.player.position.copyFrom(vehicle.root.position).addInPlace(new Vector3(0,1.15,0));
    this.player.visual.rotation.y=vehicle.root.rotation.y;this.player.body.computeWorldMatrix(true);
  }

  private surfaceHeight(x:number,z:number,current:number) {
    const start=Math.max(current+5,terrainHeight(x,z)+6);
    const hit=this.scene.pickWithRay(new Ray(new Vector3(x,start,z),Vector3.Down(),18),mesh=>mesh.checkCollisions&&mesh!==this.active?.collider);
    return hit?.pickedPoint?.y??terrainHeight(x,z);
  }
}
