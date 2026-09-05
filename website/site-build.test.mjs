import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,existsSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {buildSite,validateSite} from './build-site.mjs';
const output=fileURLToPath(new URL('./test-output/',import.meta.url));mkdirSync(output,{recursive:true});
test('published site includes every game module and excludes developer files',()=>{
 const target=buildSite(mkdtempSync(join(output,'site-')));
 for(const file of ['geography.js','depth.js','industry.js','civic.js','advice.js'])assert.equal(existsSync(join(target,'destiny',file)),true,file);
 for(const file of ['world.test.js','playtest.mjs','package.json'])assert.equal(existsSync(join(target,'destiny',file)),false,file);
 assert.ok(validateSite(target)>20);
 // Reproduce the production outage: a missing transitive module must fail.
 unlinkSync(join(target,'destiny','geography.js'));
 assert.throws(()=>validateSite(target),/Missing published asset.*geography\.js/);
});
