import { frontier } from "./depth.js";
import { caravan, workerRole } from "./civic.js";
import { W, H, noise, hash, footprint, DEFS, season } from "./world.js";
export const TILE = 12;
const rect = (c, color, x, y, w, h) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
export function tree(c, x, y, n = 0) {
  // Stepped crowns and individual leaf clusters stay on the native pixel grid.
  const leaf=n>.6?["#34432c","#4b6032","#687b3b","#8a984a"]:["#293e32","#3b5737","#526d3d","#76884a"];
  rect(c,"#27362970",x-4,y+7,19,4);
  rect(c,"#3b3026",x+3,y-2,4,13);rect(c,"#8d7147",x+4,y+2,2,8);
  if(n>.35){
    rect(c,leaf[0],x-5,y-8,21,13);rect(c,leaf[0],x-2,y-14,15,19);
    rect(c,leaf[1],x-4,y-9,18,12);rect(c,leaf[1],x,y-15,10,20);
    rect(c,leaf[2],x-2,y-11,10,9);rect(c,leaf[2],x+3,y-13,9,7);
    for(let i=0;i<9;i++){const dx=(i*7+Math.floor(n*10))%15,dy=(i*5)%14;rect(c,i%3?leaf[2]:leaf[3],x-2+dx,y-13+dy,2+(i%2),2);}
    rect(c,leaf[0],x-3,y+2,6,3);rect(c,leaf[1],x+9,y-2,5,4);
  }else{
    for(let i=0;i<4;i++){const yy=y-17+i*5,w=5+i*4;rect(c,leaf[0],x+5-Math.floor(w/2),yy+2,w,7);rect(c,leaf[1],x+5-Math.floor(w/2),yy,w-1,5);rect(c,leaf[2],x+5-Math.floor(w/2),yy,Math.ceil(w/2),3);rect(c,leaf[3],x+4-Math.floor(w/2),yy+1,2,1);}
  }
}
export function rock(c, x, y, n = 0) {
  rect(c,"#303b32",x,y+5,12,6);rect(c,"#4f5751",x+1,y+1,10,8);
  rect(c,"#8e9688",x+2,y+1,7,6);rect(c,"#b3b7a0",x+3,y,5,2);
  rect(c,"#646e64",x+7,y+3,4,5);rect(c,"#39483e",x+5,y+4,1,5);
  rect(c,"#8e9688",x-1,y+9,3,2);rect(c,"#b3b7a0",x+9,y+9,2,1);
}
const groundCache = new WeakMap();
export function ground(c,s,time=0) {
  // Terrain changes far less often than people. Cache both ripple frames so the
  // extra native-pixel detail does not require thousands of fills every frame.
  const signature=s.seed+":"+s.region+":"+s.tiles.join("")+":"+s.roads.join(",");
  let entry=groundCache.get(s);
  if(!entry || entry.signature!==signature){entry={signature,frames:[]};groundCache.set(s,entry);}
  const frame=Math.floor(time*.3)%2;
  if(!entry.frames[frame]){
    const layer=typeof OffscreenCanvas!=="undefined"?new OffscreenCanvas(W*TILE,H*TILE):c.canvas.ownerDocument.createElement("canvas");
    layer.width=W*TILE;layer.height=H*TILE;
    paintGround(layer.getContext("2d"),s,frame/.3);
    entry.frames[frame]=layer;
  }
  c.drawImage(entry.frames[frame],0,0);
}
function paintGround(c, s, time = 0) {
  const seed = hash(s.seed);
  rect(c, "#244944", 0, 0, W * TILE, H * TILE);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = s.tiles[y * W + x],
        n = noise(x, y, seed),
        px = x * TILE,
        py = y * TILE;
      if (t === 1) {
        const coast=[[0,-1],[1,0],[0,1],[-1,0]].filter(([dx,dy])=>x+dx>=0&&x+dx<W&&y+dy>=0&&y+dy<H&&s.tiles[(y+dy)*W+x+dx]!==1);
        rect(c, coast.length?"#398a99":n>.5?"#286980":"#27677d",px,py,12,12);
        for(const [dx,dy]of coast){
          const xx=px+(dx===1?10:0),yy=py+(dy===1?10:0);
          rect(c,"#1d4c52",xx,yy,dx?2:12,dy?2:12);
          for(let k=0;k<10;k+=4)rect(c,"#9aa988",xx+(dx?0:k+Math.floor(n*2)),yy+(dy?0:k+Math.floor(n*2)),dx?2:2+Math.floor(n*2),dy?2:2+Math.floor(n*2));
        }
        if (n > 0.7)
          rect(
            c,
            "#65a9af",
            px + 2 + (Math.floor(time * 0.3) % 2),
            py + 5,
            5,
            1,
          );
        continue;
      }
      const patch=Math.sin(x*.28+Math.sin(y*.19)*2+(seed%17)) + Math.cos(y*.25+Math.sin(x*.17)*2);
      const colors = s.region===2?["#73794e","#7c8052","#858756"]:s.region===1?["#88954b","#909c4f","#7e8e47"]:["#768849","#7d8f4d","#6f8145"];
      rect(c, t === 2 ? "#b9ad72" : colors[Math.floor(n * 3)], px, py, 12, 12);
      if(t!==2 && patch>1.05)rect(c,"#a39a5c35",px,py,12,12);
      if(t!==2 && patch<-.9)rect(c,"#384d3529",px,py,12,12);
      for(let k=0;k<5;k++){
        const xx=(Math.floor(n*100)+k*7)%11,yy=(Math.floor(n*83)+k*5)%11;
        rect(c,t===2?(k%2?"#c8b984":"#9d915f"):(k%2?"#a9ad6660":"#415f3838"),px+xx,py+yy,1+k%2,1);
      }
      if (n > 0.62) {
        rect(c, t === 2 ? "#cdc088" : "#91a262", px + 2, py + 3, 1, 2);
        rect(c, t === 2 ? "#9d965d" : "#4d6b40", px + 7, py + 8, 2, 1);
      }
      if (n > 0.965 && t === 0) {
        rect(c, "#d6ce86", px + 4, py + 4, 2, 2);
        rect(c, "#d4b0a1", px + 8, py + 7, 1, 2);
      }
    }
  for (const i of s.roads) {
    const x = (i % W) * TILE,
      y = Math.floor(i / W) * TILE;
    rect(c, "#716343", x, y, 12, 12);
    rect(c, "#b5a272", x+1, y+1, 10, 10);
    for(let k=0;k<3;k++){rect(c,"#cabb8a",x+2+k*3,y+2+(k%2)*3,2,3);rect(c,"#8e7d54",x+2+k*3,y+8,2,1);}
  }
}
function roof(c, x, y, w, h, color = "#76617a") {
  rect(c, "#374738", x + 2, y + h, w + 2, 4);
  rect(c, "#c6b17b", x + 2, y + 4, w - 4, h);
  rect(c, "#9c855d", x + w - 7, y + 5, 5, h - 1);
  rect(c, "#e0c997", x + 4, y + 6, w - 12, 2);
  rect(c, "#684d36", x + w * 0.45, y + h - 3, 6, 8);
  rect(c, "#eaca75", x + 6, y + h - 2, 4, 4);
  const rise=Math.max(7,Math.min(13,Math.floor(w/3)));
  rect(c,"#292a30",x-2,y+2,w+4,6);
  for(let row=0;row<rise;row++){
    const inset=Math.floor((rise-row)*.55);
    rect(c,"#302e37",x-1+inset,y+6-rise+row,w+2-inset*2,1);
    rect(c,color,x+inset,y+6-rise+row,w-inset*2,1);
    if(row%3===1)for(let xx=inset+2;xx<w-inset-2;xx+=5)rect(c,"#24263565",x+xx+(row%2),y+6-rise+row,3,1);
    rect(c,"#e0c5a155",x+inset,y+6-rise+row,1,1);
    rect(c,"#27263265",x+w-inset-3,y+6-rise+row,3,1);
  }
  rect(c,"#b6a2a2",x+Math.floor(rise*.55),y+5-rise,w-2*Math.floor(rise*.55),1);
  rect(c,"#302c32",x,y+6,w,2);
  rect(c, "#c5ba91", x + w - 10, y - 12, 4, 10);
  rect(c, "#66664f", x + w - 11, y - 13, 6, 2);
}
export function structure(c, b, time = 0, state = null) {
  if (b.type === "path") {
    rect(c, "#a89d72", b.x * TILE, b.y * TILE, 12, 12);
    rect(c, "#d0c095", b.x * TILE + 2, b.y * TILE + 3, 5, 2);
    rect(c, "#7f855d", b.x * TILE + 7, b.y * TILE + 8, 3, 2);
    return;
  }
  const cells = footprint(b.type, b.rot),
    minX = b.x * TILE,
    minY = b.y * TILE;
  const width = (Math.max(...cells.map((a) => a[0])) + 1) * TILE,
    height = (Math.max(...cells.map((a) => a[1])) + 1) * TILE;
  const paved=!['farm','garden','wall','gate'].includes(b.type);
  const contains=(x,y)=>cells.some(v=>v[0]===x&&v[1]===y);
  for (const [dx, dy] of cells) {
    rect(
      c,
      b.type === "farm"
        ? "#665c38"
        : b.type === "garden"
          ? "#526e40"
          : "#8a825c",
      minX + dx * TILE,
      minY + dy * TILE,
      12,
      12,
    );
    rect(c, "#ffffff0b", minX + dx * TILE, minY + dy * TILE, 12, 1);
    if(paved){
      for(let k=0;k<3;k++)rect(c,k%2?"#b7aa80":"#685f45",minX+dx*12+2+k*3,minY+dy*12+8+k%2,2,2);
      if(!contains(dx,dy+1))rect(c,"#504733",minX+dx*12,minY+dy*12+11,12,1);
      if(!contains(dx-1,dy))rect(c,"#c1af7f",minX+dx*12,minY+dy*12,1,12);
    }
  }
  if (b.progress < 1) {
    for (const [dx, dy] of cells) {
      const x = minX + dx * TILE,
        y = minY + dy * TILE;
      rect(c, "#cfb777", x, y, 2, 12);
      rect(c, "#a18b55", x, y + 10, 12, 2);
      rect(c,"#3e392c",x+4,y+5,6,4);rect(c,"#aa8e55",x+4,y+4,6,2);
      if(b.progress>.3){rect(c,"#59432f",x+1,y-4,2,15);rect(c,"#baa67a",x+1,y-4,12,2);}
      if(b.progress>.65){rect(c,"#939381",x+3,y+1,8,5);rect(c,"#c2b897",x+3,y,8,2);}
    }
    rect(c, "#354435", minX, minY - 5, width, 3);
    rect(c, "#dec780", minX, minY - 5, Math.round(width * b.progress), 3);
    return;
  }
  if (["workshop","forge","forester","infirmary"].includes(b.type)) {
    const color=b.type==="forge"?"#615c69":b.type==="forester"?"#587756":"#b58b54";
    roof(c,minX+1,minY+5,width-2,Math.max(12,height-10),color);
    if(b.type==="infirmary"){rect(c,"#ede9cd",minX+width/2-2,minY+2,4,12);rect(c,"#ede9cd",minX+width/2-6,minY+6,12,4);}
    if(b.type==="forge") {rect(c,"#383b42",minX+width-12,minY-9,7,22);rect(c,"#edb266",minX+width-11,minY+6,5,5);}
    if(b.type==="workshop") {rect(c,"#68482f",minX+3,minY+height-6,22,4);rect(c,"#ebc886",minX+3,minY+height-7,22,2);rect(c,"#d2d1b8",minX+13,minY+height-11,2,9);}
    if(b.type==="forester") {tree(c,minX+width-10,minY+height-11,1);}
    return;
  }
  if (b.type === "gate") {
    rect(c,"#745b3e",minX,minY-5,3,17);rect(c,"#b69762",minX+9,minY-5,3,17);
    rect(c,"#e0bd77",minX,minY-6,12,3);rect(c,"#98733f",minX+3,minY+1,6,2);return;
  }
  if (b.type === "farm") {
    for (const [dx, dy] of cells) {
      const x = minX + dx * TILE,
        y = minY + dy * TILE;
      rect(c, "#483f2c", x + 2, y + 2, 2, 9);
      rect(c, "#483f2c", x + 7, y + 2, 2, 9);
      for (let i = 0; i < 3; i++) {
        rect(c, (b.cropProgress??1)>.5?"#9cab52":"#6c7e43", x + 2, y + i * 3, 3, (b.cropProgress??1)>.25?3:1);
        rect(c, "#d9bd65", x + 7, y + i * 3 - 1, 2, 3);
      }
    }
    return;
  }
  if (b.type === "quarry") {
    for (const [dx, dy] of cells)
      rock(c, minX + dx * TILE, minY + dy * TILE, 0);
    rect(c, "#a18c59", minX + 4, minY - 7, 3, 22);
    rect(c, "#baaa75", minX + 4, minY - 8, 23, 3);
    rect(c, "#534e39", minX + 21, minY - 5, 1, 14);
    rect(c, "#c4b996", minX + 17, minY + 8, 9, 6);
    return;
  }
  if (b.type === "garden") {
    for (const [dx, dy] of cells) {
      const x = minX + dx * TILE,
        y = minY + dy * TILE;
      rect(c, "#789150", x + 2, y + 2, 8, 8);
      for (let i = 0; i < 3; i++)
        rect(
          c,
          ["#e0a298", "#ebd080", "#adb6d3"][i],
          x + 2 + i * 3,
          y + 3 + (i % 2) * 3,
          2,
          2,
        );
    }
    return;
  }
  if (b.type === "wall") {
    rect(c, "#38463b", minX + 1, minY + 5, 12, 7);
    rect(c, "#92977e", minX, minY - 2, 12, 11);
    rect(c, "#c4bea0", minX, minY - 3, 12, 3);
    rect(c, "#5c6b5c", minX + 6, minY + 1, 1, 4);
    rect(c, "#586457", minX, minY + 5, 12, 1);
    return;
  }
  if (b.type === "well") {
    rect(c, "#ccc49a", minX + 3, minY + 8, 18, 12);
    rect(c, "#74816c", minX + 5, minY + 8, 14, 7);
    rect(c, "#305a55", minX + 7, minY + 9, 10, 5);
    rect(c, "#ac8752", minX + 2, minY, 3, 16);
    rect(c, "#ac8752", minX + 19, minY, 3, 16);
    rect(c, "#b87c49", minX, minY - 4, 24, 7);
    rect(c, "#e1ba75", minX + 2, minY - 5, 20, 2);
    return;
  }
  if (b.type === "beacon") {
    rect(c, "#667d79", minX + 4, minY + 13, 17, 7);
    rect(c, "#adbbaa", minX + 7, minY - 9, 10, 26);
    rect(c, "#546e6c", minX + 13, minY - 8, 4, 24);
    rect(c, "#d0f0c2", minX + 9, minY - 18, 6, 11);
    rect(c, "#edebb3", minX + 7, minY - 14, 10, 4);
    rect(c, "#ffffff", minX + 10, minY - 16, 2, 5);
    return;
  }
  if (b.type === "tower") {
    rect(c, "#554f3b", minX + 3, minY - 10, 4, 32);
    rect(c, "#9a8e65", minX + 17, minY - 10, 4, 32);
    rect(c, "#958661", minX + 4, minY + 4, 15, 4);
    rect(c, "#b3a37b", minX, minY - 13, 24, 9);
    rect(c, "#d8c58a", minX - 2, minY - 16, 28, 4);
    rect(c, "#4b6150", minX + 5, minY - 11, 14, 3);
    rect(c, "#c79850", minX + 10, minY - 24, 2, 10);
    rect(c, "#e5b46c", minX + 12, minY - 24, 9, 5);
    return;
  }
  if (["kitchen", "lumber", "house", "quarry"].includes(b.type)) {
    const has = (x, y) => cells.some((p) => p[0] === x && p[1] === y);
    const color =
      b.type === "lumber"
        ? "#71816a"
        : b.type === "kitchen"
          ? "#a98750"
          : "#76617a";
    // Continuous roof wings follow the rotated logical footprint, including gaps.
    for (const [dx, dy] of cells) {
      const x = minX + dx * 12,
        y = minY + dy * 12;
      rect(c, "#c2ad7b", x, y, 12, 12);
      if (!has(dx, dy + 1)) {
        rect(c, "#dbc48e", x + 1, y + 4, 10, 5);
        rect(c, "#705d3b", x + 4, y + 7, 4, 5);
      }
    }
    for (const [dx, dy] of cells) {
      const x = minX + dx * 12,
        y = minY + dy * 12;
      rect(c, color, x, y - 7, 12, 12);
      if (!has(dx, dy - 1)) {rect(c, "#342f36", x, y - 8, 12, 2);rect(c,"#c4aca1",x+1,y-7,10,1);}
      if (!has(dx + 1, dy)) rect(c, "#38343c", x + 9, y - 7, 3, 12);
      if (!has(dx, dy + 1)) rect(c, "#302d32", x, y + 4, 12, 2);
      if (!has(dx-1,dy)) {for(let k=0;k<5;k++)rect(c,"#e3cbaf60",x+k,y-6+k*2,1,2);}
      for (let j = 0; j < 3; j++)
        rect(
          c,
          b.type === "lumber" ? "#485a48" : b.type === "house"?"#493f52":"#7d643f",
          x + 2 + (j % 2) * 3,
          y - 5 + j * 3,
          5,
          1,
        );
    }
    const top = cells.reduce((a, v) => (v[1] < a[1] ? v : a), cells[0]);
    rect(c, "#bcb394", minX + top[0] * 12 + 4, minY + top[1] * 12 - 13, 4, 8);
    rect(c, "#5b5f50", minX + top[0] * 12 + 3, minY + top[1] * 12 - 14, 6, 2);
    if (b.type === "lumber") {
      rect(c, "#ac854d", minX + width - 16, minY + height - 10, 12, 4);
      rect(c, "#d2ae65", minX + width - 16, minY + height - 10, 12, 1);
    }
    return;
  }
  if (b.type === "hearth") {
    roof(c, minX + 2, minY + 8, 42, 22, "#ac6342");
    rect(c, "#dec785", minX + 19, minY + 24, 7, 12);
    rect(c, "#aeb986", minX + 40, minY - 7, 2, 20);
    rect(c, "#e4cf8a", minX + 42, minY - 7, 9, 6);
    return;
  }
  if (b.type === "store") {
    roof(c, minX + 2, minY + 7, width - 4, height - 9, "#737e65");
    const count=Math.min(5,Math.ceil(((state?.stock.wood??80)+(state?.stock.stone??40))/80));
    for(let i=0;i<count;i++){const x=minX+3+(i%3)*9,y=minY+height-6-Math.floor(i/3)*6;crate(c,x,y,i%2);}
    return;
  }
  // Small irregular cottage: main block plus short wing, leaving a real corner gap.
  roof(c, minX + 1, minY + 4, width - 3, Math.max(10, height - 17));
  if (b.rot === 0) roof(c, minX + 1, minY + height - 12, 21, 8);
}
function crate(c,x,y,stone=false){
  rect(c,"#34352b",x,y,8,6);rect(c,stone?"#8d988c":"#99774b",x+1,y,6,5);rect(c,stone?"#bac0a3":"#c6a56e",x+1,y,6,1);rect(c,"#554b38",x+3,y,1,5);
}
export function person(c, p, t = 0, enemy = false) {
  const x = Math.round(p.x * TILE),
    y = Math.round(p.y * TILE),
    walk = p.path?.length ? Math.sin(t * 13 + p.id) : 0;
  rect(c, "#273c3270", x - 3, y + 2, 7, 3);
  if(p.kind==="guardian") {
    rect(c,"#496c69",x-6,y-9,12,12);rect(c,"#8fa79a",x-4,y-15,8,8);
    rect(c,"#dcf7bb",x-2,y-12,1,2);rect(c,"#dcf7bb",x+2,y-12,1,2);
    rect(c,"#738b7e",x-8,y-7,3,9);rect(c,"#738b7e",x+6,y-7,3,9);
    rect(c,"#425e58",x-4,y+2,3,4);rect(c,"#425e58",x+2,y+2,3,4);return;
  }
  if (enemy && p.kind === "skulker") {
    rect(c, "#334952", x - 4, y - 5, 8, 6);
    rect(c, "#668b8b", x - 3, y - 9, 6, 5);
    rect(c, "#f4d37e", x - 2, y - 7, 1, 1);
    rect(c, "#f4d37e", x + 1, y - 7, 1, 1);
    rect(c, "#27414d", x - 3, y + 1 + Math.round(walk), 2, 3);
    rect(c, "#27414d", x + 2, y + 1 - Math.round(walk), 2, 3);
    return;
  }
  if (enemy && p.kind === "brute") {
    rect(c, "#493345", x - 5, y - 9, 11, 12);
    rect(c, "#927080", x - 4, y - 12, 9, 7);
    rect(c, "#d6ac93", x - 2, y - 10, 2, 2);
    rect(c, "#a5a38b", x + 5, y - 6, 5, 7);
    return;
  }
  rect(
    c,
    enemy ? "#8d5663" : ["#dad5a2", "#e0ac73", "#a7bed0", "#d8a397"][p.id % 4],
    x - 2,
    y - 4,
    5,
    6,
  );
  rect(c, enemy ? "#b38699" : "#e4c99a", x - 2, y - 8, 4, 4);
  rect(c, enemy ? "#443347" : "#74563b", x - 3, y - 9, 5, 2);
  rect(c, "#354637", x - 2, y + 2 + Math.round(walk), 2, 2);
  rect(c, "#354637", x + 1, y + 2 - Math.round(walk), 2, 2);
  if(!enemy && p.health<75){rect(c,"#4b3032",x-4,y-15,9,2);rect(c,"#e8947e",x-4,y-15,Math.ceil(9*p.health/100),2);}
  if(p.toolUses>0) {rect(c,"#755b35",x-5,y-1,1,5);rect(c,"#bcc9c1",x-6,y-2,4,2);}
  if(p.resting) {rect(c,"#e0e6c4",x+4,y-13,4,1);rect(c,"#e0e6c4",x+6,y-12,1,2);rect(c,"#e0e6c4",x+4,y-10,4,1);}
  if (p.carry)
    rect(
      c,
      p.carry.key === "wood"
        ? "#a9814d"
        : p.carry.key === "stone"
          ? "#c1bfaa"
          : "#d9c36d",
      x + 3,
      y - 3,
      4,
      4,
    );
}
export function scene(c, s, t = 0) {
  ground(c, s, t);
  const seasonName=season(s).name;
  if(seasonName==="Winter")rect(c,"#d3ddd532",0,0,W*TILE,H*TILE);
  if(seasonName==="Autumn")rect(c,"#bc884b18",0,0,W*TILE,H*TILE);
  const f=frontier(s);
  if(f.site && !s.peaceful) {
    for(let y=Math.max(0,f.site.y-Math.ceil(f.radius));y<Math.min(H,f.site.y+f.radius);y++)for(let x=Math.max(0,f.site.x-Math.ceil(f.radius));x<Math.min(W,f.site.x+f.radius);x++) {
      if(Math.hypot(x-f.site.x,y-f.site.y)<f.radius && s.tiles[y*W+x]!==1)rect(c,((x+y)%3)?"#60436155":"#9a537c44",x*TILE,y*TILE,TILE,TILE);
    }
  }
  for(const site of s.sites||[]) {
    const x=site.x*TILE,y=site.y*TILE;
    rect(c,site.done?"#6d876b":"#203d37",x-5,y-6,22,17);
    if(site.kind==="cache") {rect(c,"#a9864f",x-2,y-3,16,9);rect(c,"#e7c77c",x+2,y-4,2,11);rect(c,"#d4b477",x-2,y-4,16,2);}
    else if(site.kind==="relic") {rect(c,"#93a7a0",x+2,y-12,8,19);rect(c,site.done?"#b8b188":"#efdc8c",x+4,y-14,4,8);}
    else {rect(c,site.done?"#bace96":"#a979aa",x-1,y-12,4,20);rect(c,site.done?"#bace96":"#a979aa",x+11,y-12,4,20);rect(c,"#292735",x+3,y-10,8,18);rect(c,"#bf95b2",x-1,y-13,16,3);}
    if(site.ordered){rect(c,"#273d38",x-5,y+12,22,3);rect(c,"#edd58b",x-5,y+12,Math.round(22*site.progress),3);}
    if(!site.done && !site.ordered) {rect(c,"#e9d79d",x+5,y-20,3,3);}
  }
  const items = [];
  for (let i = 0; i < s.tiles.length; i++)
    if (s.tiles[i] === 3 || s.tiles[i] === 4)
      items.push({ y: Math.floor(i / W) + 1, kind: s.tiles[i], x: i % W, i });
  for (const b of s.buildings)
    items.push({
      y: b.y + Math.max(...footprint(b.type, b.rot).map((a) => a[1])) + 1,
      b,
    });
  for (const p of s.people) items.push({ y: p.y, p });
  for (const p of s.guardians || []) items.push({y:p.y,p:{...p,kind:"guardian"}});
  for (const p of s.enemies) items.push({ y: p.y, p, enemy: true });
  items.sort((a, b) => a.y - b.y);
  for (const item of items) {
    if (item.b) {
      structure(c, item.b, t, s);
      const b=item.b,worker=s.people.find(p=>p.task?.id===b.id&&!p.path?.length&&!p.resting);
      if(b.progress>=1 && worker){
        const x=b.x*TILE,y=b.y*TILE-5;
        rect(c,"#28382d",x,y,16,3);rect(c,"#b5d983",x+1,y+1,Math.min(14,Math.floor(worker.work%20/20*14)+1),1);
        if(['workshop','forge','quarry'].includes(b.type)){const hit=Math.floor(t*5)%2;rect(c,"#d5c18c",x+10+hit*2,y+12,3,1);rect(c,"#ecd695",x+14,y+10-hit*2,1,2);}
      }
    }
    else if (item.p) {
      person(c, item.p, t, item.enemy);
      const role=!item.enemy&&workerRole(s,item.p);
      if(role)rect(c,({builder:'#e5be70',grower:'#9eb875',gatherer:'#bea187',artisan:'#ada6cb'})[role],item.p.x*TILE-3,item.p.y*TILE-10,6,2);
    }
    else {
      const x = item.x * TILE,
        y = (item.y - 1) * TILE;
      if (item.kind === 3) tree(c, x, y, noise(item.x, item.y, hash(s.seed)));
      else rock(c, x, y);
      if (s.marks.includes(item.i)) {
        rect(c, "#ebd18b", x + 4, y + 7, 5, 1);
        rect(c, "#ebd18b", x + 6, y + 5, 1, 5);
      }
    }
  }
  const visit=caravan(s),depot=s.buildings.find(b=>b.type==='store'&&b.progress>=1);
  if(visit.open && depot){
    const blocked=new Set(s.buildings.flatMap(b=>footprint(b.type,b.rot).map(([x,y])=>(b.y+y)*W+b.x+x)));
    let site=null;
    for(let dy=2;dy<8&&!site;dy++)for(let dx=-3;dx<6;dx++){
      const x=depot.x+dx,y=depot.y+dy;
      if(x>0&&x<W-2&&y>0&&y<H-2&&[0,2].includes(s.tiles[y*W+x])&&[0,2].includes(s.tiles[y*W+x+1])&&!blocked.has(y*W+x)&&!blocked.has(y*W+x+1)){site={x:x*TILE,y:y*TILE};break;}
    }
    if(site){const {x,y}=site;rect(c,'#32392e',x,y+6,23,5);rect(c,'#825d3c',x+2,y-1,18,9);rect(c,'#c4a775',x+1,y-4,20,5);rect(c,'#77949a',x+3,y-3,5,4);rect(c,'#77949a',x+13,y-3,5,4);rect(c,'#2e3029',x+3,y+7,5,5);rect(c,'#2e3029',x+15,y+7,5,5);crate(c,x+8,y+1);}
  }
  for(const b of s.buildings.filter(b=>b.progress>=1 && ["hearth","kitchen","forge"].includes(b.type))) {
    const drift=Math.floor(t*2+b.id)%9;
    rect(c,"#e5d9b64b",b.x*TILE+8+Math.floor(drift/3),b.y*TILE-15-drift,3,3);
  }
  for (const b of s.buildings)
    if (b.hp < DEFS[b.type].hp) {
      rect(c, "#483d36", b.x * TILE, b.y * TILE - 18, 24, 2);
      rect(
        c,
        "#c77c67",
        b.x * TILE,
        b.y * TILE - 18,
        (24 * b.hp) / DEFS[b.type].hp,
        2,
      );
    }
  for (const b of s.buildings) {
    if (b.upgraded) {
      rect(c, "#453d27", b.x * TILE + 2, b.y * TILE - 14, 7, 6);
      rect(c, "#f5d481", b.x * TILE + 4, b.y * TILE - 13, 3, 4);
    }
    if (b.project) {
      rect(c, "#203637", b.x * TILE, b.y * TILE - 10, 24, 3);
      rect(c, "#bace96", b.x * TILE, b.y * TILE - 10, Math.floor(24 * b.project.progress), 3);
    }
  }
  for (const e of s.effects) {
    if (e.ring) {
      c.strokeStyle = "#e5d591";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(
        e.x * TILE,
        e.y * TILE,
        e.ring * TILE * (1.4 - e.life),
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    if (e.tx !== undefined) {
      c.strokeStyle = "#f5db8b";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(e.x * TILE, e.y * TILE);
      c.lineTo(e.tx * TILE, e.ty * TILE);
      c.stroke();
    } // Text is drawn at screen resolution by the UI, separately from pixel art.
  }
  const phase = (s.time % 100) / 100;
  if (phase > 0.7) {
    c.fillStyle =
      "rgba(14,25,48," + Math.sin(((phase - 0.7) / 0.3) * Math.PI) * 0.38 + ")";
    c.fillRect(0, 0, W * TILE, H * TILE);
    for (const b of s.buildings.filter(
      (b) => b.progress >= 1 && ["hearth", "house", "tower"].includes(b.type),
    )) {
      for(let r=3;r>0;r--)rect(c,"#efb34b0b",b.x*TILE+10-r*6,b.y*TILE+12-r*4,r*12,r*8);
      c.fillStyle = "#ffe69c";
      c.fillRect(b.x * TILE + 8, b.y * TILE + 10, 3, 3);
    }
  }
}
export function island(c, seed) {
  const w = c.canvas.width,
    h = c.canvas.height,
    sd = hash(seed);
  c.clearRect(0, 0, w, h);
  const p = (sd % 100) / 10;
  for (let y = 0; y < h; y += 4)
    for (let x = 0; x < w; x += 4) {
      const nx = (x - w * 0.5) / (w * 0.39),
        ny = (y - h * 0.48) / (h * 0.4),
        angle = Math.atan2(ny, nx),
        dist = nx * nx + ny * ny;
      const edge =
        1 + 0.14 * Math.sin(angle * 5 + p) + 0.11 * Math.cos(angle * 3 - p);
      const n = noise(x, y, sd);
      if (dist < edge) {
        const region = x < w * 0.4 ? 0 : y < h * 0.5 ? 2 : 1;
        const border =
          Math.abs(x - w * 0.4) < 3 ||
          (x > w * 0.4 && Math.abs(y - h * 0.5) < 3);
        c.fillStyle = border
          ? "#e1d199"
          : dist > edge - 0.12
            ? "#b7b17c"
            : region === 0
              ? n > 0.5
                ? "#4e764b"
                : "#527b4c"
              : region === 1
                ? n > 0.5
                  ? "#819755"
                  : "#899e5c"
                : n > 0.5
                  ? "#6c7b59"
                  : "#758262";
        c.fillRect(x, y, 4, 4);
        if (n > 0.93 && dist < edge - 0.2) {
          if (region === 2) rock(c, x, y);
          else tree(c, x, y, n);
        }
      } else if (dist < edge + 0.12) {
        rect(c, "#528779", x, y, 4, 4);
      } else if (n > 0.997) rect(c, "#51766b", x, y, 10, 1);
    }
  const labels = [
    ["01 · FERNWAKE", w * 0.27, h * 0.54],
    ["02 · HONEYMEAD", w * 0.64, h * 0.74],
    ["03 · GREYREACH", w * 0.63, h * 0.29],
  ];
  for (const [text, x, y] of labels) {
    c.font = "bold 10px monospace";
    const tw = c.measureText(text).width;
    rect(c, "#1b3a2ee8", x - tw / 2 - 8, y - 12, tw + 16, 22);
    c.fillStyle = "#eee2b4";
    c.fillText(text, x - tw / 2, y + 2);
  }
}
