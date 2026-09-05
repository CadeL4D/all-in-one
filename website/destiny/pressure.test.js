import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,place,tick,raidDay,nextRaidDay,raidPlan,raidInfo,serialize,restore,DEFS} from './world.js';
import {buildingSignal} from './signals.js';
function town(mode='survival'){
  const s=createWorld('difficulty-curves',0,mode);s.tiles.fill(0);place(s,'hearth',30,22);for(let i=0;i<120;i++)tick(s,.1);return s;
}
test('Survival changes to two nights of pressure and one clear night after the opening',()=>{
  const s=town();assert.deepEqual(Array.from({length:12},(_,i)=>i+4).filter(d=>raidDay(s,d)),[4,6,8,10,12,14]);
  assert.deepEqual(Array.from({length:9},(_,i)=>i+16).filter(d=>raidDay(s,d)),[16,17,19,20,22,23]);
  s.day=17;s.raided=17;assert.equal(nextRaidDay(s),19);
});
test('Onslaught preserves a two-shot first raider and has smaller patrols every third attack',()=>{
  const s=town('onslaught');assert.ok(raidPlan(s).every(m=>Math.ceil(m.hp/18)===2));
  for(const day of [5,8,11,14,17]){assert.equal(raidInfo(s,day).kind,'patrol');assert.ok(raidPlan(s,day).length<raidPlan(s,day+1).length);}
  assert.equal(raidInfo(s,200).kind,'patrol');assert.ok(raidPlan(s,200).length<raidPlan(s,201).length);
});
test('late attacks vary composition, timing and approaches without reacting to towers or wealth',()=>{
  const s=town(),days=Array.from({length:30},(_,i)=>i+16).filter(d=>raidDay(s,d));
  const kinds=new Set(days.map(d=>raidInfo(s,d).kind));assert.equal(kinds.size,4);
  assert.ok(days.some(d=>raidInfo(s,d).pincer));assert.ok(new Set(days.map(d=>raidInfo(s,d).phase)).size>=3);
  const before=raidPlan(s,28);s.stock.stone=999;s.stock.ammo=999;
  for(let i=0;i<8;i++)s.buildings.push({id:s.nextId++,type:'tower',x:4+i*4,y:10,rot:0,progress:1,hp:DEFS.tower.hp});
  assert.deepEqual(raidPlan(s,28),before);
});
test('a scouted force stays fixed through growth, reload, and the announced arrival time',()=>{
  const s=town();s.day=16;s.time=1501;tick(s,.1);const scouted=raidPlan(s,16);
  for(let i=0;i<18;i++)s.people.push({...s.people[0],id:s.nextId++,path:[],task:null,carry:null});
  assert.deepEqual(raidPlan(s,16),scouted);const copy=restore(serialize(s));assert.deepEqual(raidPlan(copy,16),scouted);
  const timing=raidInfo(copy,16);copy.time=1500+timing.phase*100-.2;tick(copy,.1);assert.notEqual(copy.raided,16);
  tick(copy,.2);assert.equal(copy.raided,16);assert.ok(copy.enemies.length>0);
  copy.raidForecast.monsters[0].hp=-1;assert.throws(()=>restore(serialize(copy)),/raid forecast/);
});
test('Survival repairs require a project or power, while Settler retains slow recovery',()=>{
  for(const mode of ['survival','settler']){const s=town(mode),b=s.buildings[0];b.hp-=50;const before=b.hp;tick(s,.2);assert.equal(b.hp>before,mode==='settler');}
  const s=town(),b=s.buildings[0];b.hp=DEFS.hearth.hp*.4;
  assert.equal(buildingSignal(s,b).code,'repair');assert.match(buildingSignal(s,b).detail,/4 timber and 2 stone/);
});
