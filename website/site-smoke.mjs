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
 await page.goto(`http://127.0.0.1:${server.address().port}/all-in-one/`);
 assert.equal(await page.locator('.card').count(),2,'two library cards');
 assert.equal(await page.locator('a[href="destiny/"]').count(),0);
 // The game card draws its cover and links into the ruins.
 await page.waitForFunction(() => document.querySelector('#cover')?.getContext('2d') !== null);
 await page.locator('a[href="ruins/"]').first().click();
 await page.waitForURL('**/ruins/');
 await page.waitForSelector('#world canvas, canvas#world');
 await page.waitForFunction(() => document.getElementById('day')?.textContent?.includes('Day'), null, {timeout: 10000});
 await page.waitForFunction(() => {
   const chips = document.querySelectorAll('.res-chip').length;
   return chips >= 4 && document.querySelector('#toasts, #hint') !== null;
 }, null, {timeout: 10000});
 assert.deepEqual(errors,[]);
 // Back to the hub, then prove the whole thing works offline.
 await page.getByRole('link', {name:'One Hub home', exact:true}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
 await page.reload();
 await page.context().setOffline(true);await page.reload();
 assert.equal(await page.locator('.card').count(),2);
 // And the game boots offline too.
 await page.goto(`http://127.0.0.1:${server.address().port}/all-in-one/ruins/`);
 await page.waitForFunction(() => document.getElementById('day')?.textContent?.includes('Day'), null, {timeout: 10000});
 assert.deepEqual(errors,[]);
 console.log('PASS: hub, ruins game, and offline reload.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
