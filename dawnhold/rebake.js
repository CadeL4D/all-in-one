#!/usr/bin/env node
'use strict';
/* ============================================================
   Dawnhold — rebake.js
   Rebuild onefile.html from index.html + css/style.css + js/*.
   The stylesheet <link> becomes an inline <style>; every
   <script src> becomes a labeled inline block, same order:
     <!-- ==== js/core.js ==== -->
     <script> ... </script>
   Run from dawnhold/:  node rebake.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
const css = read('css/style.css');
html = html.replace('<link rel="stylesheet" href="css/style.css">',
  () => '<style>\n' + css + '</style>');

html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, src) =>
  '<!-- ==== ' + src + ' ==== -->\n<script>\n' + read(src) + '</script>');

fs.writeFileSync(path.join(root, 'onefile.html'), html);
console.log('onefile.html rebuilt:', html.length, 'bytes');
