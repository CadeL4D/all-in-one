import {W,H,DAY,completed,hash,occupancy,route,log} from './world.js';

export function protectedLand(s,x,y){
  return s.buildings.some(b=>b.progress>=1&&['outpost','beacon'].includes(b.type)&&Math.hypot(x-b.x,y-b.y)<(b.type==='outpost'?10:7));
}
export function blighted(s,x,y){
  if(s.peaceful||protectedLand(s,x,y))return false;
  return (s.sites||[]).some(v=>v.kind==='rift'&&!v.done&&Math.hypot(v.x-x,v.y-y)<Math.min(13,2+Math.max(0,s.day-(v.born||4))*.45));
}
export function frontierCycle(s){
  if(s.peaceful||!s.sites||s.day<9||!s.people.length)return;
  const cycle=Math.floor((s.day-9)/8);
  if((s.frontierCycle??-1)>=cycle)return;
  s.frontierCycle=cycle;
  if(s.sites.filter(v=>v.kind==='rift'&&!v.done).length>=3)return;
  const hearth=completed(s,'hearth')[0];if(!hearth)return;
  const grid=occupancy(s),points=[];
  for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){
    if(grid[y*W+x]||protectedLand(s,x,y)||Math.hypot(x-hearth.x,y-hearth.y)<18||s.sites.some(v=>Math.hypot(v.x-x,v.y-y)<8)||s.buildings.some(b=>Math.hypot(b.x-x,b.y-y)<6))continue;
    points.push({x,y,rank:hash(s.seed+':foothold:'+cycle+':'+x+':'+y)});
  }
  points.sort((a,b)=>a.rank-b.rank);
  const site=points.find(v=>route(s,s.people[0].x,s.people[0].y,v.x,v.y,grid)!==null);
  if(!site)return;
  // Retain the original discoveries and a bounded history of reclaimed fronts.
  if(s.sites.length>=24){const old=s.sites.findIndex(v=>v.born&&v.done);if(old>=0)s.sites.splice(old,1);else return;}
  s.sites.push({id:s.nextId++,kind:'rift',name:'Hollow foothold · '+(cycle+1),x:site.x,y:site.y,progress:0,done:false,ordered:false,born:s.day});
  log(s,'A Hollow foothold appeared beyond the village. It blights production and strengthens raids. A frontier depot protects its district.');
  s.effects.push({x:site.x,y:site.y,text:'New Hollow foothold',ring:4,life:3,duration:3,sound:'warning'});
}
export function frontierSummary(s){
  const active=(s.sites||[]).filter(v=>v.kind==='rift'&&!v.done);
  return `${active.length} active Hollow fronts. Blighted farms and wells yield half. Frontier depots ward 10 tiles; spires ward 7. A new foothold can form every 8 days from day 9.`;
}
