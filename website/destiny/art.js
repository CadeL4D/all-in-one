import { W, H, noise, hash, footprint, DEFS } from "./world.js";
export const TILE = 12;
const rect = (c, color, x, y, w, h) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
export function tree(c, x, y, n = 0) {
  if (n > 0.62) {
    rect(c, "#294935", x - 4, y + 5, 18, 5);
    rect(c, "#836642", x + 4, y - 3, 3, 13);
    rect(c, "#305838", x - 5, y - 8, 21, 13);
    rect(c, "#477643", x - 3, y - 13, 17, 17);
    rect(c, "#64874a", x, y - 16, 10, 14);
    rect(c, "#839c58", x + 1, y - 15, 5, 4);
    rect(c, "#547c42", x - 4, y - 7, 8, 7);
    rect(c, "#71914e", x - 2, y - 10, 5, 3);
    return;
  }
  rect(c, "#243f32", x - 3, y + 6, 14, 5);
  rect(c, "#765d3c", x + 4, y, 3, 10);
  rect(c, "#254d3a", x - 3, y - 6, 17, 11);
  rect(c, "#356a45", x - 1, y - 11, 13, 15);
  rect(c, n > 0.5 ? "#547e48" : "#477743", x + 1, y - 15, 9, 13);
  rect(c, "#719553", x + 2, y - 15, 3, 5);
  rect(c, "#91a85d", x + 2, y - 10, 2, 2);
  rect(c, "#31543c", x - 3, y + 2, 6, 3);
}
export function rock(c, x, y, n = 0) {
  rect(c, "#344637", x + 1, y + 7, 12, 4);
  rect(c, "#718278", x + 1, y + 3, 10, 6);
  rect(c, "#a9b0a0", x + 3, y, 7, 5);
  rect(c, "#c5c4ad", x + 4, y, 4, 2);
  rect(c, "#54675f", x + 8, y + 4, 4, 5);
}
export function ground(c, s, time = 0) {
  const seed = hash(s.seed);
  rect(c, "#244944", 0, 0, W * TILE, H * TILE);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = s.tiles[y * W + x],
        n = noise(x, y, seed),
        px = x * TILE,
        py = y * TILE;
      if (t === 1) {
        rect(c, n > 0.5 ? "#2a5450" : "#2c5752", px, py, 12, 12);
        if (n > 0.7)
          rect(
            c,
            "#46766b",
            px + 2 + (Math.floor(time * 0.3) % 2),
            py + 5,
            5,
            1,
          );
        continue;
      }
      const colors =
        s.region === 2
          ? ["#68744e", "#67744e", "#69764e"]
          : s.region === 1
            ? ["#78864c", "#77854b", "#79884d"]
            : ["#63794a", "#627849", "#657b4b"];
      rect(c, t === 2 ? "#b9ad72" : colors[Math.floor(n * 3)], px, py, 12, 12);
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
    rect(c, "#a49a6b", x, y, 12, 12);
    rect(c, "#b7aa7a", x + 2, y + 3, 7, 2);
    rect(c, "#8a885d", x + 7, y + 8, 3, 1);
  }
}
function roof(c, x, y, w, h, color = "#aa6442") {
  rect(c, "#374738", x + 2, y + h, w + 2, 4);
  rect(c, "#c6b17b", x + 2, y + 4, w - 4, h);
  rect(c, "#9c855d", x + w - 7, y + 5, 5, h - 1);
  rect(c, "#e0c997", x + 4, y + 6, w - 12, 2);
  rect(c, "#684d36", x + w * 0.45, y + h - 3, 6, 8);
  rect(c, "#eaca75", x + 6, y + h - 2, 4, 4);
  rect(c, "#603f31", x - 1, y - 1, w + 2, 9);
  rect(c, color, x, y - 3, w, 9);
  rect(c, "#d48a56", x + 3, y - 6, w - 6, 5);
  rect(c, "#edb976", x + 4, y - 6, w - 8, 1);
  for (let yy = 0; yy < 6; yy += 3)
    for (let xx = 3; xx < w - 2; xx += 6)
      rect(c, "#884b37", x + xx + (yy % 2), y + yy, 4, 1);
  rect(c, "#c5ba91", x + w - 10, y - 12, 4, 10);
  rect(c, "#66664f", x + w - 11, y - 13, 6, 2);
}
export function structure(c, b, time = 0) {
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
  }
  if (b.progress < 1) {
    for (const [dx, dy] of cells) {
      const x = minX + dx * TILE,
        y = minY + dy * TILE;
      rect(c, "#cfb777", x, y, 2, 12);
      rect(c, "#a18b55", x, y + 10, 12, 2);
    }
    rect(c, "#354435", minX, minY - 5, width, 3);
    rect(c, "#dec780", minX, minY - 5, Math.round(width * b.progress), 3);
    return;
  }
  if (b.type === "farm") {
    for (const [dx, dy] of cells) {
      const x = minX + dx * TILE,
        y = minY + dy * TILE;
      rect(c, "#483f2c", x + 2, y + 2, 2, 9);
      rect(c, "#483f2c", x + 7, y + 2, 2, 9);
      for (let i = 0; i < 3; i++) {
        rect(c, "#9cab52", x + 2, y + i * 3, 3, 3);
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
          : "#b57049";
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
      if (!has(dx, dy - 1)) rect(c, "#d5ad72", x, y - 8, 12, 2);
      if (!has(dx + 1, dy)) rect(c, "#694d37", x + 11, y - 7, 1, 12);
      if (!has(dx, dy + 1)) rect(c, "#6c4e37", x, y + 4, 12, 2);
      for (let j = 0; j < 3; j++)
        rect(
          c,
          b.type === "lumber" ? "#576d56" : "#925334",
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
    rect(c, "#b18b50", minX + 3, minY + height - 8, 8, 6);
    rect(c, "#d4b06b", minX + 3, minY + height - 8, 8, 1);
    return;
  }
  // Small irregular cottage: main block plus short wing, leaving a real corner gap.
  roof(c, minX + 1, minY + 4, width - 3, Math.max(10, height - 17));
  if (b.rot === 0) roof(c, minX + 1, minY + height - 12, 21, 8);
}
export function person(c, p, t = 0, enemy = false) {
  const x = Math.round(p.x * TILE),
    y = Math.round(p.y * TILE),
    walk = p.path?.length ? Math.sin(t * 13 + p.id) : 0;
  rect(c, "#273c3270", x - 3, y + 2, 7, 3);
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
  for (const p of s.enemies) items.push({ y: p.y, p, enemy: true });
  items.sort((a, b) => a.y - b.y);
  for (const item of items) {
    if (item.b) structure(c, item.b, t);
    else if (item.p) person(c, item.p, t, item.enemy);
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
    } else {
      c.font = "6px monospace";
      c.fillStyle = "#fff0be";
      c.fillText(e.text, e.x * TILE, e.y * TILE - 10 - (2 - e.life) * 5);
    }
  }
  const phase = (s.time % 100) / 100;
  if (phase > 0.7) {
    c.fillStyle =
      "rgba(14,25,48," + Math.sin(((phase - 0.7) / 0.3) * Math.PI) * 0.38 + ")";
    c.fillRect(0, 0, W * TILE, H * TILE);
    for (const b of s.buildings.filter(
      (b) => b.progress >= 1 && ["hearth", "house", "tower"].includes(b.type),
    )) {
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
