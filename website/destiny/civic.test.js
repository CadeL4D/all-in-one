import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,place,tick,DEFS,serialize,restore,capacity} from './world.js';
import {initCivic,setWorkforce,workerRole,favorJob,caravan,tradeCaravan} from './civic.js';
function town(){const s=createWorld('civic',0,true);s.tiles.fill(0);place(s,'hearth',30,22);for(let i=0;i<120;i++)tick(s,.1);s.buildings.push({id:s.nextId++,type:'store',x:25,y:26,rot:0,progress:1,hp:DEFS.store.hp});initCivic(s);return s;}
test('workforce preserves a general worker and changes preferences without cancelling trips',()=>{
 const s=town(),p=s.people[0];p.task={kind:'harvest'};
 for(let i=0;i<5;i++)assert.equal(setWorkforce(s,'artisan',1),'');
 assert.match(setWorkforce(s,'builder',1),/general/);assert.equal(workerRole(s,p),'artisan');assert.equal(workerRole(s,s.people.at(-1)),null);assert.equal(p.task.kind,'harvest');
 const craft={kind:'craft',priority:1};favorJob(s,p,craft);assert.equal(craft.priority,-2);
 s.stock.food=0;const food={kind:'farm',priority:0};favorJob(s,p,food);assert.ok(food.priority<craft.priority);
 const copy=restore(serialize(s));assert.equal(copy.workforce.artisan,5);
});
test('caravans recur without repeating paid rewards and survive reload',()=>{
 const s=town();assert.deepEqual(caravan(s),{arriving:5,open:false});s.day=5;s.time=400;s.stock.meals=24;
 const before=s.stock.stone;assert.equal(tradeCaravan(s,'provisions',capacity(s)),'');assert.equal(s.stock.meals,12);assert.equal(s.stock.stone,before+35);
 const copy=restore(serialize(s));assert.match(tradeCaravan(copy,'provisions',capacity(copy)),/next caravan/);
 copy.day=7;assert.equal(caravan(copy).open,false);assert.equal(caravan(copy).arriving,9);copy.day=9;assert.equal(tradeCaravan(copy,'provisions',capacity(copy)),'');assert.equal(copy.caravanTrades.length,2);
});
test('caravan failure is atomic for missing goods, depot or storage room',()=>{
 const s=town();s.day=5;s.stock.meals=12;s.stock.stone=capacity(s)-10;
 assert.match(tradeCaravan(s,'provisions',capacity(s)),/room/);assert.equal(s.stock.meals,12);assert.equal(s.caravanTrades.length,0);
 s.stock.tools=0;assert.match(tradeCaravan(s,'craft',capacity(s)),/Need/);
 s.buildings=s.buildings.filter(b=>b.type!=='store');assert.match(tradeCaravan(s,'timber',capacity(s)),/Keepshed/);
});
test('old saves migrate and malformed workforce or receipts are rejected',()=>{
 const s=town();delete s.workforce;delete s.caravanTrades;assert.equal(restore(serialize(s)).workforce.builder,0);
 s.workforce={builder:-1,grower:0,gatherer:0,artisan:0};assert.throws(()=>restore(serialize(s)),/workforce/);
 s.workforce={builder:0,grower:0,gatherer:0,artisan:0};s.caravanTrades=[0,0];assert.throws(()=>restore(serialize(s)),/caravan/);
});
