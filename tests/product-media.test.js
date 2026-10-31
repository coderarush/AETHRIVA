import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {deviceCatalog} from '../dist/connections/catalog.js';
import {productMediaById} from '../dist/connections/product-media.js';

test('catalog products have concise definitions and valid local manufacturer photos',async()=>{
  const unique=new Set();
  for(const entry of deviceCatalog){
    const media=productMediaById[entry.id];
    assert.ok(media,entry.id);assert.ok(media.shortType.length<=60,entry.id);assert.ok(media.summary.length>0&&media.summary.length<=100,entry.id);
    if(entry.manufacturer==='Bluetooth standard'){assert.equal(media.imageSrc,null);continue;}
    assert.match(media.imageSrc,/^assets\/devices\/[a-z0-9-]+\.(?:webp|png|jpe?g)$/);
    assert.ok(typeof media.imageAlt==='string'&&media.imageAlt.length>=15,`${entry.id} has a descriptive alternative`);
    unique.add(media.imageSrc);
    const bytes=await fs.readFile(new URL(`../dist/${media.imageSrc}`,import.meta.url));
    const isJpeg=bytes[0]===255&&bytes[1]===216;
    const isPng=bytes.subarray(1,4).toString()==='PNG';
    const isWebp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
    assert.ok(isJpeg||isPng||isWebp,`${entry.id} is an image, not an HTML error page`);
  }
  assert.equal(unique.size,32);
});
