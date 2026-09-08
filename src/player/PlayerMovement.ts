import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { InputManager } from '../core/InputManager';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { movement, worldConfig } from '../data/config';
import { Player } from './Player';
import { GrapplingHook } from '../abilities/GrapplingHook';
import { Wingsuit } from '../abilities/Wingsuit';
import { Parachute } from '../abilities/Parachute';
import { transition, type PlayerState } from './PlayerState';

export class PlayerMovement {
  private coyote = 0;
  readonly grapple: GrapplingHook;
  private wingsuit: Wingsuit;
  private parachute: Parachute;
  onReset: () => void = () => {};
  constructor(private player: Player, private input: InputManager, private camera: ThirdPersonCamera, private scene: Scene, private spawn: Vector3) {
    this.grapple = new GrapplingHook(scene, player, camera); this.wingsuit = new Wingsuit(scene, player); this.parachute = new Parachute(scene, player);
  }
  private setState(state: PlayerState) {
    if (state !== 'GRAPPLING') this.grapple.release();
    this.wingsuit.show(state === 'WINGSUIT'); this.parachute.show(state === 'PARACHUTE'); this.player.state = state;
  }
  cancelAbilities() { this.setState('FALLING'); }
  reset() { this.setState('FALLING'); this.player.position.copyFrom(this.spawn); this.player.velocity.setAll(0); this.coyote = 0; this.input.clear(); this.camera.update(0, true); this.onReset(); }
  update(dt: number) {
    const p = this.player, v = p.velocity;
    const boundary = worldConfig.size / 2 - 12;
    if (this.input.take('reset') || p.position.y < -4 || Math.abs(p.position.x) > boundary || Math.abs(p.position.z) > boundary) { this.reset(); return; }
    const ground = this.scene.pickWithRay(new Ray(p.position, Vector3.Down(), 1.05), m => m.checkCollisions && m !== p.body);
    const grounded = !!ground?.hit && v.y <= 0.1;
    this.coyote = grounded ? movement.coyoteTime : Math.max(0, this.coyote - dt);
    if (grounded && p.state !== 'GRAPPLING') this.setState(transition(p.state, 'land'));
    else if (!grounded && p.state === 'ON_FOOT') p.state = 'FALLING';
    if (this.input.take('grapple')) {
      if (p.state === 'GRAPPLING') this.setState(transition(p.state, 'release'));
      else if (this.grapple.engage()) this.setState(transition(p.state, 'grapple'));
    }
    if (this.input.take('wingsuit')) this.setState(transition(p.state, 'wingsuit', !grounded));
    if (this.input.take('parachute')) this.setState(transition(p.state, 'parachute', !grounded));
    const { x, z } = this.input.axes();
    const forward = this.camera.heading, right = new Vector3(forward.z, 0, -forward.x);
    const wish = forward.scale(z).add(right.scale(x)); if (wish.lengthSquared() > 1) wish.normalize();
    const speed = this.input.down('sprint') ? movement.sprintSpeed : movement.walkSpeed;
    if (p.state === 'GRAPPLING') { if (!this.grapple.apply(dt)) this.setState('FALLING'); }
    else if (p.state === 'WINGSUIT') this.wingsuit.apply(dt, this.camera.yaw, this.camera.pitch, x, z);
    else if (p.state === 'PARACHUTE') this.parachute.apply(dt, this.camera.yaw, x, z);
    else if (grounded) { const t = 1 - Math.exp(-movement.groundAcceleration * dt); v.x += (wish.x * speed - v.x) * t; v.z += (wish.z * speed - v.z) * t; v.y = -2; }
    else { v.x += wish.x * movement.airAcceleration * dt; v.z += wish.z * movement.airAcceleration * dt; v.y -= movement.gravity * dt; }
    if (this.input.take('jump')) {
      if (p.state === 'GRAPPLING') this.setState('FALLING');
      else if (this.coyote > 0) { v.y = movement.jumpSpeed; this.coyote = 0; p.state = 'FALLING'; }
    }
    if (v.length() > movement.maxSpeed) v.normalize().scaleInPlace(movement.maxSpeed);
    const before = p.position.clone();
    // Several simulation ticks share one render ID. Force the world transform so
    // Babylon's collision sweep starts at this tick's position, not the last frame.
    p.body.computeWorldMatrix(true);
    p.body.moveWithCollisions(v.scale(dt));
    if (v.y > 0 && p.position.y - before.y < v.y * dt * 0.2) v.y = 0;
    if (Math.abs(p.position.x - before.x) < Math.abs(v.x * dt) * 0.15) v.x = 0;
    if (Math.abs(p.position.z - before.z) < Math.abs(v.z * dt) * 0.15) v.z = 0;
  }
}
