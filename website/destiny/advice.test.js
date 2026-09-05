import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,place,tick,DEFS,restore,serialize} from './world.js';
import {opportunities,buildingStatus} from './advice.js';
function town(){const s=createWorld('advice',0,true);s.tiles.fill(0);place(s,'hearth',30,22);for(let i=0;i<120;i++)tick(s,.1);s.stock={wood:150,stone:150,food:100,water:100,planks:0,tools:0,meals:0};s.campGather=false;return s;}
function add(s,type,x=24,y=18){const b={id:s.nextId++,type,x,y,rot:0,progress:1,hp:DEFS[type].hp};s.buildings.push(b);return b;}
test('waiting for winter still offers accessible industry and discovery',()=>{
 const s=town();add(s,'lumber');s.day=8;s.chapters=[0,1,2];
 const options=opportunities(s);assert.ok(options.some(a=>a.type==='workshop'));assert.ok(options.some(a=>a.site!==undefined));assert.ok(options.length<=3);
 add(s,'workshop',20,20);assert.ok(!opportunities(s).some(a=>a.type==='workshop'));assert.ok(opportunities(s).some(a=>a.type==='forge'));
 s.lost=true;assert.deepEqual(opportunities(s),[]);
});
test('critical needs outrank optional trades and completed discoveries lead to blessings',()=>{
 const s=town(),well=add(s,'well');add(s,'store',20,20);s.day=5;s.stock.water=0;s.relicReady=true;
 const options=opportunities(s);assert.equal(options[0].building,well.id);assert.equal(options[0].urgent,true);assert.ok(options.some(a=>a.id==='blessing'));
 s.blessing='industry';assert.ok(!opportunities(s).some(a=>a.id==='blessing'));
});
test('building explanations distinguish paused, full storage and unstaffed production',()=>{
 const s=town(),well=add(s,'well');well.paused=true;assert.match(buildingStatus(s,well),/paused/);
 well.paused=false;s.stock.water=180;assert.match(buildingStatus(s,well),/Storage target/);
 s.stock.water=30;assert.match(buildingStatus(s,well),/Available for a worker/);
 well.progress=.4;assert.match(buildingStatus(s,well),/Construction queued/);
});
test('site priority changes a real worker assignment and persists across reload',()=>{
 const s=town(),near=add(s,'farm',27,28),far=add(s,'workshop',17,18);far.priority=true;
 s.stock.planks=0;for(const p of s.people){p.task=null;p.path=[];p.carry=null;p.idle=1;p.resting=false;p.energy=100;}
 tick(s,.1);assert.equal(s.people[0].task?.id,far.id);assert.equal(restore(serialize(s)).buildings.find(b=>b.id===far.id).priority,true);
 s.buildings.find(b=>b.id===near.id).priority='bad';assert.throws(()=>restore(serialize(s)),/priority/);
});
