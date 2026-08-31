#!/usr/bin/env node
'use strict';
/* ============================================================
   Dawnhold — rebake.js
   Incrementally re-embeds every js/*.js and css/style.css block
   into onefile.html between its ==== labeled markers, syncs the
   title-screen lines that legitimately drift, and verifies the
   result (every block equal to source + every script parses).
   Run from dawnhold/:  node rebake.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const D = __dirname;
const FILES = ['core.js', 'art.js', 'world.js', 'path.js', 'buildings.js', 'entities.js',
  'wilds.js', 'game.js', 'powers.js', 'daycraft.js', 'save.js', 'render.js', 'ui.js', 'main.js'];

let one = fs.readFileSync(path.join(D, 'onefile.html'), 'utf8');
const idx = fs.readFileSync(path.join(D, 'index.html'), 'utf8');

// ---- 1. re-embed js blocks ----
for (const f of FILES) {
  const src = fs.readFileSync(path.join(D, 'js', f), 'utf8').replace(/\s+$/, '');
  const re = new RegExp('(<!-- ==== js/' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ==== -->\\n<script>\\n)[\\s\\S]*?(\\n</script>)');
  if (!re.test(one)) { console.error('MARKER NOT FOUND: ' + f); process.exit(1); }
  one = one.replace(re, (m, a, b) => a + src + b);
}

// ---- 1b. re-embed the css block ----
const css = fs.readFileSync(path.join(D, 'css', 'style.css'), 'utf8').replace(/\s+$/, '');
const styleRe = /<style>\n[\s\S]*?\n<\/style>/;
if (!styleRe.test(one)) { console.error('STYLE MARKER NOT FOUND'); process.exit(1); }
one = one.replace(styleRe, () => '<style>\n' + css + '\n</style>');

// ---- 1c. re-embed the body markup (index.html body → onefile, minus scripts) ----
const bodyRe = /<body>[\s\S]*?<noscript>/;
const idxBody = idx.match(bodyRe)[0];
const oneBody = one.match(bodyRe);
if (!oneBody) { console.error('BODY MARKER NOT FOUND'); process.exit(1); }
if (oneBody[0] !== idxBody) one = one.replace(bodyRe, () => idxBody);

// ---- 2. sync changed title-screen lines from index.html ----
const syncLines = [
  /<button class="bigbtn diff" data-diff="peaceful">.*<\/button>/,
  /<button class="bigbtn diff" data-diff="easy">.*<\/button>/,
  /<button class="bigbtn diff" data-diff="normal">.*<\/button>/,
  /<button class="bigbtn diff" data-diff="hard">.*<\/button>/,
  /<div class="verText">.*<\/div>/,
];
for (const re of syncLines) {
  const fromIdx = idx.match(re)[0];
  if (!one.includes(fromIdx)) {
    one = one.replace(re, () => fromIdx);
    console.log('synced from index.html: ' + fromIdx.slice(0, 72) + '...');
  }
}

fs.writeFileSync(path.join(D, 'onefile.html'), one);

// ---- 3. verify ----
let bad = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(D, 'js', f), 'utf8').replace(/\s+$/, '');
  const m = one.match(new RegExp('<!-- ==== js/' + f + ' ==== -->\\n<script>\\n([\\s\\S]*?)\\n</script>'));
  if (!m || m[1] !== src) { console.error('MISMATCH: ' + f); bad++; }
}
const scripts = [...one.matchAll(/<script>([\s\S]*?)\n<\/script>/g)];
let n = 0;
for (const s of scripts) {
  n++;
  try { new Function(s[1]); } catch (e) { console.error('PARSE FAIL block ' + n + ': ' + e.message); bad++; }
}
const style = one.match(/<style>\n([\s\S]*?)\n<\/style>/);
const css2 = fs.readFileSync(path.join(D, 'css', 'style.css'), 'utf8').replace(/\s+$/, '');
console.log('rebaked: ' + FILES.length + ' js blocks equal source, ' + n + ' script blocks parse, style ' + (style[1] === css2 ? 'equal' : 'DIFFERS') + (bad ? ', ' + bad + ' PROBLEMS' : ', all good'));
process.exit(bad ? 1 : 0);
