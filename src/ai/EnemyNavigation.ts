export interface Heading { x:number; z:number }

/** Score clear headings while keeping a persistent side around a blocking wall. */
export function chooseAvoidanceHeading(desired: Heading, clearance: (direction: Heading) => number, side: number): Heading {
  const length=Math.hypot(desired.x,desired.z);
  if(length<1e-6) return {x:0,z:0};
  const forward={x:desired.x/length,z:desired.z/length};
  if(clearance(forward)>=2.8) return forward;
  let best:Heading={x:0,z:0},score=-Infinity;
  for(const angle of [.5,-.5,1,-1,1.5,-1.5,2,-2]) {
    const direction={x:forward.x*Math.cos(angle)+forward.z*Math.sin(angle),z:forward.z*Math.cos(angle)-forward.x*Math.sin(angle)};
    const free=clearance(direction);
    if(free<.8) continue;
    const candidate=Math.min(free,4)*1.7+Math.cos(angle)*1.3+(Math.sign(angle)===side?.45:0);
    if(candidate>score) {score=candidate;best=direction;}
  }
  return best;
}

/** Spread a squad's search points around the last known location instead of piling onto it. */
export function searchOffset(seed: number, elapsed: number): Heading {
  const step=Math.floor(Math.max(0,elapsed)/2.4),angle=seed*.91+step*2.399963;
  const radius=3+Math.min(step,4)*1.8;
  return {x:Math.sin(angle)*radius,z:Math.cos(angle)*radius};
}
