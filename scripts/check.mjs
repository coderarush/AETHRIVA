import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
async function files(directory) {const result=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const p=path.join(directory,entry.name);if(entry.isDirectory())result.push(...await files(p));else result.push(p);}return result;}
let failures=0;
const runtime = await files(path.join(root,'dist'));
for(const file of runtime.filter(p=>p.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);failures++;}}
const html=await fs.readFile(path.join(root,'dist/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(?:https?:|data:)/.test(match[1]))continue;try{await fs.access(path.join(root,'dist',match[1].split('?')[0]));}catch{console.error(`Missing HTML asset: ${match[1]}`);failures++;}}
for(const file of runtime){if(/\.(?:sqlite|enc|env|log)(?:$|[-.])/.test(file)){console.error('Unexpected private file in runtime');failures++;}}
if(failures)process.exit(1);
console.log(`Syntax and asset checks passed (${runtime.length} runtime files).`);
