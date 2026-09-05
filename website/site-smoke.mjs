import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,mkdtempSync} from 'node:fs';
import {join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSite} from './build-site.mjs';
const output=fileURLToPath(new URL('./test-output/',import.meta.url));mkdirSync(output,{recursive:true});
const root=buildSite(mkdtempSync(join(output,'published-')));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/all-in-one/')){res.writeHead(404).end();return;}
 let file=join(root,url.pathname.slice('/all-in-one/'.length));
 try{if(statSync(file).isDirectory())file=join(file,'index.html');res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(`http://127.0.0.1:${server.address().port}/all-in-one/destiny/`);
 await page.locator('.territory').last().waitFor();assert.equal(await page.locator('.territory').count(),24);
 assert.ok((await page.locator('#territory-detail').textContent()).includes('Fernwake'));
 const colors=await page.locator('#atlas-canvas').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const set=new Set();for(let i=0;i<data.length;i+=16)set.add(data[i]+','+data[i+1]+','+data[i+2]);return set.size;});
 assert.ok(colors>4,'The published atlas contains actual terrain');
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
 await page.reload();await page.locator('.territory').last().waitFor();
 await page.context().setOffline(true);await page.reload();await page.locator('.territory').last().waitFor();assert.equal(await page.locator('.territory').count(),24);
 assert.deepEqual(errors,[]);console.log('PASS: assembled GitHub Pages subpath renders the island and 24 territories, then reloads offline.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
