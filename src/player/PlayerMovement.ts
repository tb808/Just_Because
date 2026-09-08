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
  private stalledFor = 0;
  private recoveryPosition?: Vector3;
  readonly grapple: GrapplingHook;
  private wingsuit: Wingsuit;
  private parachute: Parachute;
  onReset: () => void = () => {};
  onUnstuck: () => void = () => {};
  constructor(private player: Player, private input: InputManager, private camera: ThirdPersonCamera, private scene: Scene, private spawn: Vector3) {
    this.grapple = new GrapplingHook(scene, player, camera); this.wingsuit = new Wingsuit(scene, player); this.parachute = new Parachute(scene, player);
    // Ground, walls and props can all be hit in one sweep. The default of three
    // retries can stop at a seam before Babylon has resolved every contact.
    this.player.body.collisionRetryCount = 8;
  }
  private setState(state: PlayerState) {
    if (state !== 'GRAPPLING') this.grapple.release();
    this.wingsuit.show(state === 'WINGSUIT'); this.parachute.show(state === 'PARACHUTE'); this.player.state = state;
  }
  cancelAbilities() { this.setState('FALLING'); }
  markRecoveryPoint(position = this.player.position) { this.recoveryPosition = position.clone(); }
  unstuck() {
    this.setState('FALLING'); this.player.position.y += 3; this.player.velocity.set(0, 4.5, 0);
    this.coyote = this.stalledFor = 0; this.player.body.computeWorldMatrix(true); this.camera.update(0, true); this.onUnstuck();
  }
  reset() { this.setState('FALLING'); this.player.position.copyFrom(this.spawn); this.player.velocity.setAll(0); this.coyote = this.stalledFor = 0; this.markRecoveryPoint(this.spawn); this.input.clear(); this.camera.update(0, true); this.onReset(); }
  update(dt: number) {
    const p = this.player, v = p.velocity;
    const boundary = worldConfig.size / 2 - 12;
    if (this.input.take('unstuck')) { this.unstuck(); return; }
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
    const displacement = v.scale(dt), attemptedHorizontal = Math.hypot(displacement.x, displacement.z);
    const attemptedDistance = displacement.length(), before = p.position.clone(), movementState = p.state;
    // Several simulation ticks share one render ID. Force the world transform so
    // Babylon's collision sweep starts at this tick's position, not the last frame.
    p.body.computeWorldMatrix(true);
    p.body.moveWithCollisions(displacement);
    const actualHorizontal = Math.hypot(p.position.x - before.x, p.position.z - before.z);
    const actualDistance = Vector3.Distance(p.position, before);
    if (v.y > 0 && p.position.y - before.y < v.y * dt * 0.2) v.y = 0;
    if (Math.abs(p.position.x - before.x) < Math.abs(v.x * dt) * 0.15) v.x = 0;
    if (Math.abs(p.position.z - before.z) < Math.abs(v.z * dt) * 0.15) v.z = 0;
    const walking = movementState === 'ON_FOOT' && wish.lengthSquared() > 0.01 && attemptedHorizontal > 0.001;
    const grappling = movementState === 'GRAPPLING' && attemptedDistance > 0.001;
    const attempted = grappling ? attemptedDistance : attemptedHorizontal;
    const actual = grappling ? actualDistance : actualHorizontal;
    this.stalledFor = (walking || grappling) && actual < Math.max(0.0002, attempted * 0.08) ? this.stalledFor + dt : 0;
    if (grounded && walking && actualHorizontal >= attemptedHorizontal * 0.55) this.markRecoveryPoint();
    if (this.stalledFor > 0.7) this.resolveStall(grappling);
  }

  private resolveStall(grappling: boolean) {
    this.stalledFor = 0;
    if (!this.hasHorizontalEscape()) {
      this.setState('FALLING'); this.player.position.copyFrom(this.recoveryPosition ?? this.spawn);
      this.player.velocity.setAll(0); this.coyote = 0; this.player.body.computeWorldMatrix(true); this.camera.update(0, true); this.onUnstuck();
    } else if (grappling) {
      // A grapple pulling continuously into an intervening surface should not
      // leave the player captured in GRAPPLING until its long global timeout.
      this.setState('FALLING'); this.player.velocity.y = Math.max(this.player.velocity.y, 2);
    }
  }

  private hasHorizontalEscape() {
    const origin = this.player.position.clone(); let freedom = 0;
    for (const direction of [Vector3.Right(), Vector3.Left(), Vector3.Forward(), Vector3.Backward()]) {
      this.player.position.copyFrom(origin); this.player.body.computeWorldMatrix(true);
      this.player.body.moveWithCollisions(direction.scale(0.45));
      freedom = Math.max(freedom, Math.hypot(this.player.position.x - origin.x, this.player.position.z - origin.z));
    }
    this.player.position.copyFrom(origin); this.player.body.computeWorldMatrix(true);
    return freedom > 0.14;
  }
}
