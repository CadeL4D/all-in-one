import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,existsSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {buildSite,validateSite} from './build-site.mjs';
const output=fileURLToPath(new URL('./test-output/',import.meta.url));mkdirSync(output,{recursive:true});
test('published hub includes its assets and excludes the removed game',()=>{
 const target=buildSite(mkdtempSync(join(output,'site-')));
 for(const file of ['index.html','home.js','tasks.html','tasks.js'])assert.equal(existsSync(join(target,file)),true,file);
 assert.equal(existsSync(join(target,'destiny')),false);
 assert.equal(existsSync(join(target,'package.json')),false);
 assert.ok(validateSite(target)>10);
 unlinkSync(join(target,'home.js'));
 assert.throws(()=>validateSite(target),/Missing published asset.*home\.js/);
});
