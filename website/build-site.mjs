import {mkdirSync,readdirSync,copyFileSync,cpSync,readFileSync,existsSync,statSync} from 'node:fs';
import {dirname,resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const source=fileURLToPath(new URL('.',import.meta.url));
const publicFile=name=>/\.(html|css|js|webmanifest)$/.test(name)&&!name.endsWith('.test.js');
export function validateSite(output){
  const root=resolve(output),files=[];
  function walk(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){const file=join(folder,entry.name);if(entry.isDirectory())walk(file);else files.push(file);}}
  walk(root);
  function required(file,owner){
    const path=resolve(file),rel=relative(root,path);
    if(rel.startsWith('..')||!existsSync(path))throw Error(`Missing published asset: ${rel} (required by ${relative(root,owner)})`);
    if(statSync(path).isDirectory()&&!existsSync(join(path,'index.html')))throw Error(`Missing page in ${rel}`);
  }
  for(const file of files){
    if(file.endsWith('.js')){
      const code=readFileSync(file,'utf8');
      for(const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g))required(resolve(dirname(file),match[1]),file);
      if(file.endsWith('sw.js')){
        const base=new URL(relative(root,file).replaceAll('\\','/'),'https://site.invalid/');
        const assets=runInNewContext(code+'\nASSETS',{URL,self:{location:base,addEventListener(){}}});
        for(const url of assets)required(join(root,new URL(url).pathname),file);
      }
    }
    if(file.endsWith('.html')){
      for(const match of readFileSync(file,'utf8').matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"'#]+)["']/g)){
        if(!/^(https?:|\/\/|data:)/.test(match[1]))required(resolve(dirname(file),match[1]),file);
      }
    }
  }
  return files.length;
}
export function buildSite(output){
  const target=resolve(output);mkdirSync(target,{recursive:true});
  if(readdirSync(target).length)throw Error('Build output must be empty: '+target);
  for(const folder of ['', 'destiny']){
    const from=join(source,folder),to=join(target,folder);mkdirSync(to,{recursive:true});
    for(const entry of readdirSync(from,{withFileTypes:true}))if(entry.isFile()&&publicFile(entry.name))copyFileSync(join(from,entry.name),join(to,entry.name));
    cpSync(join(from,'icons'),join(to,'icons'),{recursive:true});
  }
  const count=validateSite(target);
  console.log(`Assembled and verified ${count} public files.`);
  return target;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))buildSite(process.argv[2]||join(source,'../_site'));
