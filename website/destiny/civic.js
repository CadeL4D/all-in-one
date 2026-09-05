// Optional workforce planning and recurring caravan decisions.
export const ROLES = {
  builder: {name:"Builders", jobs:["build","project"]},
  grower: {name:"Growers", jobs:["farm","well","heal"]},
  gatherer: {name:"Gatherers", jobs:["harvest","mine","plant"]},
  artisan: {name:"Artisans", jobs:["craft"]},
};
export function initCivic(s) {
  s.workforce ??= {builder:0,grower:0,gatherer:0,artisan:0};
  s.caravanTrades ??= [];
}
export function validateCivic(s) {
  initCivic(s);
  if(!s.workforce || !Object.keys(ROLES).every(k=>Number.isInteger(s.workforce[k])&&s.workforce[k]>=0&&s.workforce[k]<=48))throw Error("Invalid workforce plan");
  if(!Array.isArray(s.caravanTrades)||s.caravanTrades.some((v,i,a)=>!Number.isInteger(v)||v<0||a.indexOf(v)!==i))throw Error("Invalid caravan history");
}
export function setWorkforce(s,role,change) {
  initCivic(s);
  if(!ROLES[role] || ![-1,1].includes(change))return "Choose a worker role.";
  const total=Object.values(s.workforce).reduce((a,b)=>a+b,0);
  if(change>0 && total>=s.people.length-1)return "Keep one general worker available for urgent jobs.";
  s.workforce[role]=Math.max(0,s.workforce[role]+change);return "";
}
export function workerRole(s,p) {
  let index=s.people.indexOf(p);
  if(index<0 || index===s.people.length-1)return null;
  for(const k of Object.keys(ROLES)){index-=(s.workforce?.[k]||0);if(index<0)return k;}
  return null;
}
export function favorJob(s,p,job) {
  const role=workerRole(s,p);
  if(role && ROLES[role].jobs.includes(job.kind))job.priority-=3;
  // Specializations never outrank an immediate food/water shortage or care.
  if(job.kind==="heal" || job.kind==="farm"&&s.stock.food<10 || job.kind==="well"&&s.stock.water<10)job.priority-=30;
}
export function caravan(s) {
  if(s.day<5)return {arriving:5,open:false};
  const visit=Math.floor((s.day-5)/4),start=5+visit*4;
  const open=s.day<start+2;
  return {visit,open,arriving:open?start:start+4,leaves:start+2,traded:s.caravanTrades?.includes(visit)};
}
export const OFFERS = [
  {id:"provisions",name:"Feed the road",cost:{meals:12},reward:{stone:35},description:"12 meals for 35 stone. Feed the caravan and restock defenses."},
  {id:"craft",name:"Equip the travelers",cost:{tools:6},reward:{food:40,water:30},description:"6 tools for 40 food and 30 water. Trade workshop output for reserves."},
  {id:"timber",name:"Timber for the frontier",cost:{wood:40},reward:{planks:12,tools:4},description:"40 timber for 12 planks and 4 tools. A shortcut with a substantial timber cost."},
];
export function tradeCaravan(s,id,limit) {
  initCivic(s);
  const visit=caravan(s),offer=OFFERS.find(v=>v.id===id);
  if(!visit.open || visit.traded)return "The next caravan will bring another trade.";
  if(!s.buildings.some(b=>b.type==="store"&&b.progress>=1))return "Build a Keepshed to receive the caravan.";
  if(!offer)return "Choose a caravan offer.";
  for(const [k,n]of Object.entries(offer.cost))if((s.stock[k]||0)<n)return `Need ${n} ${k}.`;
  for(const [k,n]of Object.entries(offer.reward))if((s.stock[k]||0)+n>limit)return `Make room for ${n} ${k} in storage.`;
  for(const [k,n]of Object.entries(offer.cost))s.stock[k]-=n;
  for(const [k,n]of Object.entries(offer.reward))s.stock[k]=(s.stock[k]||0)+n;
  s.caravanTrades.push(visit.visit);
  s.morale=Math.min(100,s.morale+5);
  s.events.unshift({day:s.day,text:`Caravan trade completed: ${offer.name}. Village morale +5.`});
  return "";
}
