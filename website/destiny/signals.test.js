import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,place,tick,DEFS,serialize,restore,linePlan} from './world.js';
import {syncWarehouses,pickupFreight,deliverFreight} from './economy.js';
import {initLedger,recordFlow} from './ledger.js';
import {buildingSignal,laborSummary} from './signals.js';
import {setWorkforce} from './civic.js';
function town(){const s=createWorld('readable',0,true);s.tiles.fill(0);place(s,'hearth',30,22);for(let i=0;i<150;i++)tick(s,.1);s.campGather=false;s.marks=[];s.stock={wood:90,stone:90,food:90,water:90,planks:0,tools:0,meals:0,ammo:0};syncWarehouses(s);return s;}
function add(s,type,x=43,y=22){const b={id:s.nextId++,type,x,y,rot:0,progress:1,hp:DEFS[type].hp,buffer:{}};s.buildings.push(b);return b;}
test('the same workshop distinguishes shortage, hauling, transit and a blocked route',()=>{
  const s=town(),b=add(s,'workshop');s.stock.wood=0;syncWarehouses(s);
  assert.equal(buildingSignal(s,b).code,'stock');
  s.stock.wood=1;syncWarehouses(s);assert.equal(buildingSignal(s,b).code,'stock');
  s.stock.wood=20;syncWarehouses(s);assert.equal(buildingSignal(s,b).code,'hauler');
  s.people[0].carry={key:'wood',n:8,target:b.id};assert.equal(buildingSignal(s,b).code,'delivery');
  s.people[0].x=32;s.people[0].y=22;for(let y=0;y<48;y++)s.tiles[y*64+40]=1;
  assert.equal(buildingSignal(s,b).code,'route');
  s.tiles[24*64+40]=0;assert.equal(buildingSignal(s,b).code,'delivery');
  s.people[0].carry=null;b.buffer.wood=8;assert.equal(buildingSignal(s,b).code,'worker');
});
test('tower warnings reflect local shots rather than global stone',()=>{
  const s=town(),tower=add(s,'tower');assert.equal(buildingSignal(s,tower).code,'hauler');
  tower.buffer.ammo=12;assert.equal(buildingSignal(s,tower).code,'ready');
  assert.match(buildingSignal(s,tower).detail,/12 crafted shots/);
});
test('assigned trade wins over unrelated building priority, but urgent food still wins',()=>{
  const s=town(),shop=add(s,'workshop'),farm=add(s,'farm',24,27);shop.buffer.wood=8;farm.priority=true;
  const p=s.people[0];setWorkforce(s,'artisan',1);
  for(const person of s.people){person.path=[];person.task=null;person.carry=null;person.idle=0;}
  p.idle=1;tick(s,.1);assert.equal(p.task.kind,'craft');
  p.path=[];p.task=null;p.idle=1;s.stock.food=0;tick(s,.1);assert.equal(p.task.kind,'farm');
});
test('assigned haulers collect supplies before an unrelated priority job',()=>{
  const s=town(),shop=add(s,'workshop'),farm=add(s,'farm',24,27);farm.priority=true;
  setWorkforce(s,'hauler',1);const p=s.people[0];p.path=[];p.task=null;p.carry=null;p.idle=1;
  tick(s,.1);assert.equal(p.task.kind,'supply');assert.equal(p.task.target,shop.id);
  assert.equal(restore(serialize(s)).workforce.hauler,1);
});
test('production history survives reload, rolls days and does not count transfers or previews',()=>{
  let s=town();recordFlow(s,'ammo',8,'made');recordFlow(s,'ammo',3,'used');
  const before=JSON.stringify(s.ledger);linePlan(s,'path',{x:14,y:14},{x:17,y:14});assert.equal(JSON.stringify(s.ledger),before);
  const shop=add(s,'workshop'),depot=s.buildings[0],p=s.people[0];p.task={kind:'supply',target:shop.id,good:'wood',amount:4};
  pickupFreight(s,p,depot);p.x=42;p.y=22;deliverFreight(s,p);assert.equal(JSON.stringify(s.ledger),before);
  s=restore(serialize(s));s.day++;initLedger(s);assert.equal(s.ledger.previous.made.ammo,8);assert.equal(s.ledger.previous.used.ammo,3);assert.deepEqual(s.ledger.current.made,{});
  s.ledger.current.used.ammo=-1;assert.throws(()=>restore(serialize(s)),/supply history/);
});
test('labor counts distinguish carriers, rest and idle reasons',()=>{
  const s=town();for(const p of s.people){p.task=null;p.carry=null;p.resting=false;p.idleReason='Available jobs already staffed';}
  s.people[0].carry={key:'wood',n:6};s.people[1].resting=true;s.people[2].task={kind:'farm'};
  const report=laborSummary(s);assert.deepEqual(report.counts,{working:1,hauling:1,resting:1,idle:3});assert.equal(report.reasons['Available jobs already staffed'],3);
});
test('actual workers expose lack of demand and actual crafting records transformation',()=>{
  const s=town();for(const p of s.people){p.path=[];p.task=null;p.carry=null;p.idle=1;}
  tick(s,.1);assert.equal(s.people[0].idleReason,'No open orders or production demand');
  const shop=add(s,'workshop');shop.buffer.wood=8;
  for(let i=0;i<400;i++)tick(s,.1);
  assert.ok(s.ledger.current.made.planks>0);
  assert.equal(s.ledger.current.used.wood,s.ledger.current.made.planks*2);
});
