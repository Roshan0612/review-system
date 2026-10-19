import test from 'node:test';
import assert from 'node:assert/strict';
import { inputSchema,basicDraft,positiveOptions,negativeOptions,options } from './reviews';
import { POST } from '../app/api/review/route';
import { NextRequest } from 'next/server';
const valid={selected:['Premium quality',"Didn't find my size"],notes:'',language:'English'};
test('twelve choices: ten positive and two negative at the end',()=>{assert.equal(positiveOptions.length,10);assert.equal(negativeOptions.length,2);assert.deepEqual(options.slice(-2),["Didn't find my size",'Limited choices']);});
test('preserves mixed feedback',()=>assert.equal(basicDraft(valid.selected,''),"The quality felt premium. I couldn't find my size."));
test('accepts six and rejects seven selections',()=>{assert.equal(inputSchema.safeParse({...valid,selected:options.slice(0,6)}).success,true);assert.equal(inputSchema.safeParse({...valid,selected:options.slice(0,7)}).success,false);});
test('rejects duplicate or invented selections',()=>{for(const selected of [['Best in India'],['Premium quality','Premium quality']])assert.equal(inputSchema.safeParse({...valid,selected}).success,false);});
test('requires input and accepts notes-only',()=>{assert.equal(inputSchema.safeParse({...valid,selected:[],notes:'  '}).success,false);assert.equal(inputSchema.safeParse({...valid,selected:[],notes:'Please improve delivery.'}).success,true);});
test('negative-only feedback is accepted',()=>assert.equal(inputSchema.safeParse({...valid,selected:[...negativeOptions]}).success,true));
test('limits note length',()=>assert.equal(inputSchema.safeParse({...valid,notes:'x'.repeat(501)}).success,false));
function request(body:unknown,origin='https://shop.example'){return new NextRequest('https://shop.example/api/review',{method:'POST',headers:{origin,host:'shop.example','content-type':'application/json'},body:JSON.stringify(body)});}
test('rejects cross-origin and malformed origins',async()=>{for(const origin of ['https://other.example','invalid'])assert.equal((await POST(request(valid,origin))).status,403);});
test('API rejects over six choices before provider call',async()=>assert.equal((await POST(request({...valid,selected:options.slice(0,7)}))).status,400));
test('returns fallback without credentials',async()=>{delete process.env.XAI_API_KEY;delete process.env.XAI_MODEL;const res=await POST(request(valid));assert.equal(res.status,503);assert.equal((await res.json()).fallback,true);});
