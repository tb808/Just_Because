export interface TownPlan {
  halfWidth:number; halfDepth:number; avenues:readonly number[]; streets:readonly number[];
  layout:'village'|'oldtown'|'boulevard'|'promenade'|'harbor'|'industrial';
  spacing:number; floors:number;
  staggered?:boolean;
}
export const townPlans:Record<string,TownPlan>={
  ventosa:{halfWidth:146,halfDepth:146,avenues:[-56,0,56],streets:[-56,0,56],layout:'oldtown',spacing:28,floors:2},
  estela:{halfWidth:145,halfDepth:175,avenues:[-56,0,56],streets:[-90,0,60],layout:'oldtown',spacing:28,floors:2,staggered:true},
  aurora:{halfWidth:240,halfDepth:190,avenues:[-168,-84,0,84,168],streets:[-112,-56,0,56,112],layout:'boulevard',spacing:28,floors:3},
  bellacosta:{halfWidth:235,halfDepth:105,avenues:[-168,-84,0,84,168],streets:[-48,0,48],layout:'promenade',spacing:28,floors:2},
  sanremo:{halfWidth:200,halfDepth:240,avenues:[-112,-56,0,56,112],streets:[-168,-84,0,84,168],layout:'boulevard',spacing:28,floors:4},
  monteluce:{halfWidth:115,halfDepth:155,avenues:[-48,0,48],streets:[-84,0,84],layout:'oldtown',spacing:32,floors:2,staggered:true},
  oliveto:{halfWidth:85,halfDepth:105,avenues:[0],streets:[-48,0,48],layout:'village',spacing:26,floors:1},
  'porto-novo':{halfWidth:100,halfDepth:210,avenues:[-48,0,48],streets:[-140,-70,0,70,140],layout:'harbor',spacing:28,floors:2},
  'rocca-alta':{halfWidth:105,halfDepth:120,avenues:[0],streets:[-56,0,56],layout:'village',spacing:32,floors:1},
  ferravalle:{halfWidth:300,halfDepth:240,avenues:[-224,-112,0,112,224],streets:[-168,-84,0,84,168],layout:'industrial',spacing:28,floors:3},
  'cala-serena':{halfWidth:160,halfDepth:110,avenues:[-84,0,84],streets:[-48,0,48],layout:'promenade',spacing:36,floors:1},
  solara:{halfWidth:190,halfDepth:170,avenues:[-112,-56,0,56,112],streets:[-100,-50,0,50,100],layout:'oldtown',spacing:26,floors:2,staggered:true},
};

/** Alternating half streets create T-junctions and courtyard pockets in the old towns. */
export function townStreetRange(plan:TownPlan,offset:number):readonly[number,number] {
  const edge=plan.halfWidth-15;
  return plan.staggered&&offset!==0?(offset<0?[0,edge]:[-edge,0]):[-edge,edge];
}

/** Signed distance to the authored rectangular footprint (negative inside). */
export function townEdgeDistance(town:{center:readonly[number,number];plan:TownPlan},x:number,z:number) {
  return Math.max(Math.abs(x-town.center[0])-town.plan.halfWidth,Math.abs(z-town.center[1])-town.plan.halfDepth);
}
