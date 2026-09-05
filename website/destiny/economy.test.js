import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,place,tick,DEFS,serialize,restore,linePlan,capacity,productionYield,remove,occupancy} from './world.js';
import {syncWarehouses,deposit,supplied,terrainValue,loseWarehouse,freightJobs} from './economy.js';
import {frontierCycle,blighted} from './frontier.js';
const run=(s,n)=>{for(let i=0;i<n*10;i++)tick(s,.1);};
function village(){const s=createWorld('supply-test',0,true);s.tiles.fill(0);place(s,'hearth',30,22);run(s,10);s.campGather=false;s.stock={wood:90,stone:90,food:90,water:90,planks:0,tools:0,meals:0,ammo:0};syncWarehouses(s);return s;}
function add(s,type,x,y){const b={id:s.nextId++,type,x,y,rot:0,progress:1,hp:DEFS[type].hp,buffer:{}};s.buildings.push(b);return b;}
const total=(s,key)=>(s.stock[key]||0)+s.people.reduce((n,p)=>n+(p.carry?.key===key?p.carry.n:0),0)+s.buildings.reduce((n,b)=>n+(b.buffer?.[key]||0)+(b.freight||[]).filter(p=>p.key===key).reduce((v,p)=>v+p.n,0),0);

test('construction waits for physical freight and reload preserves loads in transit',()=>{
  let s=village();assert.equal(place(s,'house',43,22),'');const id=s.buildings.at(-1).id;
  tick(s,.1);assert.equal(s.buildings.at(-1).progress,0);assert.equal(supplied(s,s.buildings.at(-1)),false);
  for(let i=0;i<300&&!s.people.some(p=>p.carry?.target===id);i++)tick(s,.1);
  assert.ok(s.people.some(p=>p.carry?.target===id));
  const before=total(s,'wood');s=restore(serialize(s));assert.equal(total(s,'wood'),before);
  run(s,90);assert.equal(s.buildings.find(b=>b.id===id).progress,1);assert.ok(s.stats.freight>=3);
});
test('line previews do not move warehouse stock or reserve any loads',()=>{
  const s=village();const before=serialize(s);assert.equal(linePlan(s,'wall',{x:14,y:15},{x:19,y:15}).reason,'');assert.equal(serialize(s),before);
});
test('outputs stay in their actual depot and workshops require input deliveries',()=>{
  const s=village(),store=add(s,'store',43,20),workshop=add(s,'workshop',45,27);
  s.stock.wood=0;syncWarehouses(s);deposit(s,store,'wood',16);
  assert.equal(store.bins.wood,16);assert.equal(s.buildings[0].bins.wood,0);
  tick(s,.1);assert.equal(s.stock.planks,0);assert.equal(workshop.buffer.wood||0,0);
  run(s,75);assert.ok(s.stock.planks>0);assert.ok(s.stats.freight>0);
});
test('a severed input route halts manufacturing despite global stock',()=>{
  const s=village(),shop=add(s,'workshop',45,22);
  for(let y=0;y<48;y++)s.tiles[y*64+40]=1;
  run(s,50);assert.equal(s.stock.planks,0);assert.equal(shop.buffer.wood||0,0);assert.equal(s.stock.wood,90);
  s.tiles[24*64+40]=0;run(s,70);assert.ok(s.stock.planks>0);
});
test('towers cannot shoot from global stone and consume only their delivered buffer',()=>{
  const s=village(),tower=add(s,'tower',45,22);s.people=s.people.slice(0,1);s.people[0].idle=-99;s.lost=false;
  s.enemies=[{id:999,kind:'raveler',x:50,y:22,hp:100,age:0,cool:99,path:[]}];
  tick(s,.1);assert.equal(s.enemies[0].hp,100);assert.equal(s.stock.stone,90);
  // Reset population-loss flag to isolate the firing rule without a hauler.
  s.lost=false;tower.buffer.ammo=2;tick(s,.1);assert.equal(s.enemies[0].hp,82);assert.equal(tower.buffer.ammo,1);assert.equal(s.stock.stone,90);
});
test('towers request ammunition while repairs are underway',()=>{
  const s=village(),tower=add(s,'tower',43,22);
  tower.project={kind:'repair',progress:.2};tower.hp=50;
  const job=freightJobs(s,occupancy(s)).find(j=>j.target===tower.id&&j.kind==='supply');
  assert.ok(job,'Repairing a tower must not disable its ammunition route');
  assert.equal(job.good,'stone');assert.equal(job.amount,6);
});
test('destroying a stocked warehouse removes its goods and queues replacement construction loads',()=>{
  const s=village(),store=add(s,'store',43,20);s.stock.wood=0;syncWarehouses(s);deposit(s,store,'wood',30);
  assert.equal(place(s,'house',43,27),'');const house=s.buildings.at(-1);assert.ok(house.freight.some(p=>p.source===store.id));
  const remaining=store.bins.wood;loseWarehouse(s,store);s.buildings=s.buildings.filter(b=>b!==store);
  assert.equal(s.stock.wood,0);assert.equal(remaining,16);assert.equal(house.replacement.wood,14);assert.equal(supplied(s,house),false);
});
test('demolishing an unfinished building cannot duplicate freight',()=>{
  const s=village(),before=total(s,'wood');place(s,'house',43,22);const house=s.buildings.at(-1);
  for(let i=0;i<200&&!s.people.some(p=>p.carry?.target===house.id);i++)tick(s,.1);
  remove(s,house);run(s,40);assert.ok(total(s,'wood')<=before);
});
test('rich seams persist after harvest; water improves land and outposts increase storage',()=>{
  const s=village();delete s.survey;
  for(let y=5;y<9;y++)for(let x=5;x<9;x++)s.tiles[y*64+x]=4;
  for(let y=30;y<36;y++)s.tiles[y*64+50]=1;
  assert.equal(terrainValue(s,9,9).seam,1.5);s.tiles.fill(0);assert.equal(terrainValue(s,9,9).seam,1.5);
  assert.ok(terrainValue(s,47,32).water>terrainValue(s,20,20).water);
  const before=capacity(s);add(s,'outpost',43,20);assert.equal(capacity(s),before+80);
});
test('new Hollow footholds recur, reduce production, and can be warded',()=>{
  const s=village();s.peaceful=false;s.difficulty='survival';for(const v of s.sites)v.done=true;
  s.day=9;frontierCycle(s);const front=s.sites.find(v=>!v.done);assert.ok(front);assert.equal(s.sites.filter(v=>!v.done).length,1);
  frontierCycle(s);assert.equal(s.sites.filter(v=>!v.done).length,1);
  const farm=add(s,'farm',front.x+1,front.y);assert.equal(blighted(s,farm.x,farm.y),true);const poor=productionYield(s,farm);
  add(s,'outpost',front.x+3,front.y);assert.equal(blighted(s,farm.x,farm.y),false);assert.ok(productionYield(s,farm)>poor);
  s.day=17;frontierCycle(s);assert.ok(s.sites.length>=6);
});
test('malformed warehouse, cargo and survey saves are rejected',()=>{
  const s=village();s.buildings[0].bins.wood=-1;assert.throws(()=>restore(serialize(s)),/local supplies/);
  s.buildings[0].bins.wood=10;s.people[0].carry={key:'wood',n:-3,target:1};assert.throws(()=>restore(serialize(s)),/carried/);
  s.people[0].carry=null;s.survey=[1];assert.throws(()=>restore(serialize(s)),/survey/);
});
