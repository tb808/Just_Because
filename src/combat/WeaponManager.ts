import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AssetManager } from '../core/AssetManager';
import { InputManager } from '../core/InputManager';
import { Player } from '../player/Player';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { assets } from '../data/assets';
import { weapons, weaponIds, isWeaponId, type WeaponId } from '../data/weapons';
import { Weapon } from './Weapon';
import { DamageSystem } from './DamageSystem';
import { ProjectileManager } from './ProjectileManager';
import { CombatEffects } from './CombatEffects';
import { CombatAudio } from './CombatAudio';
import type { WeaponSaveState } from '../core/SaveGame';

export class WeaponManager {
  readonly inventory = Object.fromEntries(weaponIds.map(id => [id, new Weapon(weapons[id])])) as Record<WeaponId, Weapon>;
  readonly owned = new Set<WeaponId>(['pistol']);
  selected: WeaponId = 'pistol';
  onShot: (position: Vector3) => void = () => {};
  onHit: (kill: boolean) => void = () => {};
  private models = new Map<WeaponId, TransformNode>();
  private mount: TransformNode;
  private shotTime = 0;
  private recoil = 0;
  get current() { return this.inventory[this.selected]; }
  constructor(private scene: Scene, private player: Player, private input: InputManager, private camera: ThirdPersonCamera, private damage: DamageSystem, private projectiles: ProjectileManager, private effects: CombatEffects, private audio: CombatAudio) {
    this.mount = new TransformNode('player-weapon-mount', scene); this.mount.parent = player.visual;
  }
  async load(manager: AssetManager) {
    for (const id of weaponIds) {
      const model = await manager.instantiate(assets.weapons[id], `player-${id}`); model.root.parent = this.mount;
      // Kenney's muzzle faces -Z; gameplay and the character face +Z.
      model.root.rotation.y = Math.PI; model.root.position.z = id === 'rifle' ? 0.7 : 0.3;
      this.models.set(id, model.root);
    }
    this.select(this.selected);
  }
  select(id: WeaponId) {
    if (!this.owned.has(id)) return false;
    this.selected = id; this.models.forEach((model, key) => model.setEnabled(key === id)); return true;
  }
  private cycle(direction: number) {
    const ids = weaponIds.filter(id => this.owned.has(id));
    this.select(ids[(ids.indexOf(this.selected) + direction + ids.length) % ids.length]);
  }
  update(dt: number) {
    for (const weapon of Object.values(this.inventory)) weapon.update(dt);
    if (this.input.take('rifle')) this.cycle(-1); if (this.input.take('launcher')) this.cycle(1);
    if (this.input.take('reload') && this.current.reload()) this.audio.play('reload');
    this.shotTime = Math.max(0, this.shotTime - dt); this.recoil *= Math.exp(-22 * dt);
    const firePressed = this.input.take('fire');
    const shooting = (firePressed || this.input.firing || this.input.down('fire')) && this.player.state !== 'WINGSUIT' && this.player.state !== 'IN_VEHICLE' && !this.player.dead;
    if (shooting && this.current.fire()) this.shoot();
    else if (shooting && this.current.ammo === 0 && this.current.reload()) this.audio.play('reload');
    this.player.combatPose = this.current.reloading ? 'reload' : this.shotTime > 0 ? 'shoot' : this.input.aiming ? 'aim' : 'none';
    this.player.aimYaw = this.camera.yaw;
    const reload = Math.sin(this.current.reloadProgress * Math.PI);
    this.mount.position.set(0.3, 1.2 - reload * 0.25, 0.18 - this.recoil);
    this.mount.rotation.set(-this.camera.pitch - this.recoil * 2 + reload * 0.5, 0, -reload * 0.7);
    this.mount.setEnabled(!this.player.dead && this.player.state !== 'WINGSUIT' && this.player.state !== 'IN_VEHICLE');
  }
  private shoot() {
    const definition = this.current.definition;
    this.shotTime = 0.17; this.recoil = this.selected === 'launcher' ? 0.18 : 0.07;
    const view = this.camera.aimRay(definition.range);
    const cameraHit = this.scene.pickWithRay(view, m => m.checkCollisions || (!!m.metadata?.damageId && m.metadata.damageId !== 'player'));
    const aim = cameraHit?.pickedPoint ?? view.origin.add(view.direction.scale(definition.range));
    const origin = this.player.position.add(new Vector3(0, 0.35, 0));
    const proposedMuzzle = origin.add(this.camera.heading.scale(0.85)).add(new Vector3(Math.cos(this.camera.yaw), 0, -Math.sin(this.camera.yaw)).scale(0.3));
    const offset = proposedMuzzle.subtract(origin);
    const wall = this.scene.pickWithRay(new Ray(origin, offset.normalizeToNew(), offset.length()), m => m.checkCollisions);
    const muzzle = wall?.hit ? origin : proposedMuzzle;
    const aimDirection = aim.subtract(muzzle).normalize();
    const spread = definition.spread * (this.input.aiming ? 0.25 : 1);
    for (let pellet = 0; pellet < (definition.pellets ?? 1); pellet++) {
      const direction = aimDirection.clone();
      direction.x += (Math.random() - 0.5) * spread; direction.y += (Math.random() - 0.5) * spread; direction.normalize();
      if (this.selected === 'launcher') this.projectiles.launch(muzzle, direction.scale(definition.projectileSpeed), definition.damage, definition.explosionRadius, definition.range);
      else {
        const hit = this.scene.pickWithRay(new Ray(muzzle, direction, definition.range), m => m.checkCollisions || (!!m.metadata?.damageId && m.metadata.damageId !== 'player'));
        const destination = hit?.pickedPoint ?? muzzle.add(direction.scale(definition.range)); this.effects.trace(muzzle, destination);
        if (hit?.pickedPoint) {
          const id = hit.pickedMesh?.metadata?.damageId as string | undefined;
          this.effects.impact(hit.pickedPoint, !!id);
          if (id && this.damage.hit(id, definition.damage, 'player')) { this.onHit(this.damage.targets.get(id)?.health.dead ?? false); this.audio.play('hit'); }
        }
      }
    }
    this.effects.muzzle(muzzle, aimDirection); this.audio.play(this.selected === 'launcher' ? 'rocket' : 'shot');
    this.camera.kick(definition.recoil * (this.input.aiming ? 0.6 : 1)); this.onShot(muzzle);
  }
  saveState(): WeaponSaveState {
    const ammunition = Object.fromEntries(weaponIds.map(id => [id, { ammo: this.inventory[id].ammo, reserve: this.inventory[id].reserve }])) as Record<WeaponId, { ammo: number; reserve: number }>;
    return { selected: this.selected, owned: [...this.owned], ammunition, rifle: ammunition.rifle, launcher: ammunition.launcher };
  }
  restore(state: WeaponSaveState) {
    this.newGame();
    // Saves from before the economy keep their former inventory; new saves never grant it.
    for (const id of state.owned ?? ['rifle', 'launcher']) if (isWeaponId(id)) this.owned.add(id);
    for (const id of weaponIds) {
      const weapon = this.inventory[id], saved = state.ammunition?.[id] ?? (id === 'rifle' || id === 'launcher' ? state[id] : undefined);
      if (!saved) continue;
      weapon.ammo = Math.max(0, Math.min(weapon.definition.magazineSize, Math.floor(saved.ammo)));
      weapon.reserve = Math.max(0, Math.min(weapon.definition.reserve, Math.floor(saved.reserve)));
    }
    this.select(state.selected);
  }
  reset() { Object.values(this.inventory).forEach(w => w.reset()); this.shotTime = this.recoil = 0; }
  newGame() { this.owned.clear(); this.owned.add('pistol'); this.reset(); this.select('pistol'); }
}
