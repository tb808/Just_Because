import type { GroundPoint } from '../data/world';

export type ResidentRole = 'merchant' | 'worker' | 'courier' | 'fisher' | 'gardener' | 'neighbor';
export type ResidentActivity = 'market' | 'work' | 'social' | 'rest';
export const residentRoles: readonly ResidentRole[] = ['merchant', 'worker', 'courier', 'fisher', 'gardener', 'neighbor'];

export const wrapIndex = (index: number, count: number) => ((index % count) + count) % count;
export const distanceSquared = (a: GroundPoint, b: GroundPoint) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

/** A short accelerated day gives each occupation a different, repeatable daily rhythm. */
export function residentActivity(role: ResidentRole, elapsed: number, offset = 0): ResidentActivity {
  const phase = wrapIndex(Math.floor((elapsed + offset) / 65), 6);
  const routines: Record<ResidentRole, readonly ResidentActivity[]> = {
    merchant: ['market', 'market', 'work', 'market', 'social', 'rest'],
    worker: ['work', 'work', 'market', 'work', 'social', 'rest'],
    courier: ['work', 'market', 'work', 'market', 'work', 'social'],
    fisher: ['work', 'market', 'rest', 'work', 'market', 'social'],
    gardener: ['work', 'work', 'rest', 'market', 'social', 'rest'],
    neighbor: ['market', 'social', 'rest', 'work', 'social', 'rest'],
  };
  return routines[role][phase];
}

export function routineDestination(role: ResidentRole, activity: ResidentActivity, count: number, home: number): number {
  if(activity==='market') return 0;
  if(activity==='rest') return home;
  if(activity==='social') return count>6?7:1;
  return wrapIndex(4+residentRoles.indexOf(role)*2,count);
}

/** Choose the shorter way to an errand along sidewalks; never cut straight across a block. */
export function directionToDestination(route: readonly GroundPoint[], from: number, destination: number): number {
  const lengthInDirection=(direction:number)=>{
    let length=0,current=from;
    for(let i=0;i<route.length&&current!==destination;i++) {
      const next=wrapIndex(current+direction,route.length);
      length+=Math.sqrt(distanceSquared(route[current],route[next]));current=next;
    }
    return length;
  };
  return lengthInDirection(-1)<lengthInDirection(1)?-1:1;
}

/** Escape uses the two ends of the current sidewalk segment, never a shortcut through a house. */
export function planEscape(route: readonly GroundPoint[], position: GroundPoint, threat: GroundPoint, next: number, direction: number) {
  if (route.length < 2) return { next: 0, direction: 1, shelter: 0 };
  let back = wrapIndex(next - direction, route.length);
  if (distanceSquared(position, route[back]) < 0.16) back = wrapIndex(back - direction, route.length);
  const initialSafety = (candidate: GroundPoint) => {
    const dx=candidate[0]-position[0],dz=candidate[1]-position[1],length=Math.hypot(dx,dz)||1;
    return (dx*(position[0]-threat[0])+dz*(position[1]-threat[1]))/length;
  };
  const forwardSafety=initialSafety(route[next]),backSafety=initialSafety(route[back]);
  // A far waypoint beyond the threat is not a safe direction: evaluate the first step as well.
  const reverse=backSafety>forwardSafety+.01||(Math.abs(backSafety-forwardSafety)<=.01&&distanceSquared(route[back],threat)>distanceSquared(route[next],threat));
  const escapeDirection = reverse ? -direction : direction;
  const escapeNext = reverse ? back : next;
  let shelter = escapeNext;
  // Stop at the first safe corner before the route would approach the gunfire again.
  for (let i = 1; i < route.length; i++) {
    const candidate = wrapIndex(shelter + escapeDirection, route.length);
    if (distanceSquared(route[candidate], threat) <= distanceSquared(route[shelter], threat)) break;
    shelter = candidate;
  }
  return { next: escapeNext, direction: escapeDirection, shelter };
}

/** Offset both lanes and join their ends with semicircles. The closing edge is local, not a cross-town diagonal. */
export function buildTrafficCircuit(road: readonly GroundPoint[], laneWidth = 2): GroundPoint[] {
  if (road.length < 2) return [];
  const unit = (a: GroundPoint, b: GroundPoint): GroundPoint => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  };
  const tangents = road.map((point, index) => unit(index ? road[index - 1] : point, index === road.length - 1 ? point : road[index + 1]));
  const offset = (index: number, side: number): GroundPoint => [road[index][0] + tangents[index][1] * laneWidth * side, road[index][1] - tangents[index][0] * laneWidth * side];
  const points: GroundPoint[] = road.map((_, index) => offset(index, 1));
  const cap = (index: number, sign: number) => {
    const point = road[index], tangent = tangents[index];
    for (let step = 1; step < 5; step++) {
      const angle = step * Math.PI / 5;
      points.push([point[0] + sign * laneWidth * (tangent[1] * Math.cos(angle) + tangent[0] * Math.sin(angle)), point[1] + sign * laneWidth * (-tangent[0] * Math.cos(angle) + tangent[1] * Math.sin(angle))]);
    }
  };
  cap(road.length - 1, 1);
  for (let i = road.length - 1; i >= 0; i--) points.push(offset(i, -1));
  cap(0, -1);
  return points;
}

export interface RoadUser { position: GroundPoint; radius: number; speed?: number }

/** Only road users ahead and inside this lane demand braking; someone behind a car cannot pin it in place. */
export function trafficTargetSpeed(position: GroundPoint, forward: GroundPoint, speed: number, cruise: number, users: readonly RoadUser[]): number {
  let target = cruise;
  for (const user of users) {
    const dx = user.position[0] - position[0], dz = user.position[1] - position[1];
    const ahead = dx * forward[0] + dz * forward[1];
    const sideways = Math.abs(dx * forward[1] - dz * forward[0]);
    if (ahead < -0.5 || sideways > 1.3 + user.radius) continue;
    const clear = ahead - user.radius - 3.6;
    const allowed = clear <= 0 ? 0 : Math.sqrt(2 * 4.8 * clear);
    target = Math.min(target, allowed + (user.speed ?? 0));
  }
  // Preserve finite output even when callers supply an uninitialised speed.
  return Number.isFinite(speed) ? Math.max(0, target) : 0;
}

export function approachSpeed(speed: number, target: number, dt: number): number {
  const amount = (target < speed ? 5.5 : 2.1) * Math.max(0, dt);
  return speed + Math.max(-amount, Math.min(amount, target - speed));
}

export interface GroundObstacle { minX: number; maxX: number; minZ: number; maxZ: number }
/** Slab intersection catches thin fences as well as large building footprints. */
export function segmentHitsObstacle(from: GroundPoint, to: GroundPoint, obstacle: GroundObstacle, clearance = 0): boolean {
  let enter = 0, exit = 1;
  const mins = [obstacle.minX - clearance, obstacle.minZ - clearance], maxs = [obstacle.maxX + clearance, obstacle.maxZ + clearance];
  for (let axis = 0; axis < 2; axis++) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-8) { if (from[axis] < mins[axis] || from[axis] > maxs[axis]) return false; }
    else {
      const first = (mins[axis] - from[axis]) / delta, last = (maxs[axis] - from[axis]) / delta;
      enter = Math.max(enter, Math.min(first, last)); exit = Math.min(exit, Math.max(first, last));
      if (enter > exit) return false;
    }
  }
  return true;
}
