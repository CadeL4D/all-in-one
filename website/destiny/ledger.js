// Count real production and use, not transfers between warehouses and buffers.
export const FLOW_GOODS=['wood','stone','food','water','planks','tools','meals','ammo'];
export function initLedger(s){
  s.ledger??={current:{day:s.day,made:{},used:{}},previous:null,startedAt:s.time};
  if(s.ledger.current.day!==s.day){
    s.ledger.previous=s.ledger.current.day===s.day-1?s.ledger.current:null;
    s.ledger.current={day:s.day,made:{},used:{}};
  }
  return s.ledger;
}
export function recordFlow(s,key,n,kind){
  if(!FLOW_GOODS.includes(key)||!(n>0))return;
  const bag=initLedger(s).current[kind];bag[key]=(bag[key]||0)+n;
}
export function recordCost(s,cost){for(const [key,n]of Object.entries(cost))recordFlow(s,key,n,'used');}
export function validateLedger(s){
  if(s.ledger===undefined)return;
  const bag=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>FLOW_GOODS.includes(k)&&Number.isFinite(n)&&n>=0&&n<=1e9);
  const row=v=>v&&Number.isInteger(v.day)&&v.day>=1&&v.day<=s.day&&bag(v.made)&&bag(v.used);
  if(!s.ledger||!row(s.ledger.current)||(s.ledger.previous!==null&&!row(s.ledger.previous))||!Number.isFinite(s.ledger.startedAt)||s.ledger.startedAt<0)throw Error('Invalid supply history');
}
