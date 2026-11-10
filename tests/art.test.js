// js/art.js の petSVG のテスト（node --test tests/art.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {petSVG} from '../js/art.js';
import {ZORDER} from '../js/data.js';

const FIX=JSON.parse(readFileSync(new URL('./fixtures/petsvg-v2.4.0.json',import.meta.url),'utf8'));
const OPTS=[{}, {shiny:true}, {final:true}, {arms:'up'}, {arms:'belly'}, {think:'🍙'}, {sil:true}, {pts:2}];
const sha=s=>createHash('sha256').update(s).digest('hex');

test('yaw なしは v2.4.0 と同じ',()=>{
  const keys=Object.keys(FIX);
  assert.ok(keys.length>=35*15*8);
  for(const k of keys){
    const [form,face,i]=k.split('|');
    assert.equal(sha(petSVG(form,face,OPTS[+i])),FIX[k],k);
  }
});

test('yaw を渡すと xmlns 付き',()=>{
  assert.ok(petSVG('puni','normal',{yaw:0}).includes('xmlns="http://www.w3.org/2000/svg"'));
});

test('yaw の出力は XML として壊れていない',()=>{
  const OPT2=[{}, {shiny:true}, {final:true}, {arms:'up'}, {arms:'belly'}, {think:'🍙'}];
  for(const form of ZORDER)for(const face of ['normal','happy','sleep','sick'])for(let yaw=-180;yaw<=165;yaw+=15)for(const o of OPT2){
    const svg=petSVG(form,face,{...o,yaw}),id=`${form}|${face}|${yaw}|${JSON.stringify(o)}`;
    for(const tag of svg.match(/<[^>]+>/g)){
      const names=[...tag.matchAll(/\s([\w:-]+)=/g)].map(m=>m[1]);
      assert.equal(new Set(names).size,names.length,`${id} 属性の重複: ${tag}`);
    }
    assert.ok(!svg.replace('xmlns="http://www.w3.org/2000/svg"','').includes('http'),id+' http');
    assert.ok(!/<script/i.test(svg),id+' script');
    assert.ok(!/\son\w+=/i.test(svg),id+' on*=');
    assert.equal((svg.match(/<svg[\s>]/g)||[]).length,1,id);
  }
});

test('yaw=0 は正面と同じ位置',()=>{
  const s=petSVG('hakase','normal',{yaw:0});
  assert.ok(/translate\(78[ .]|cx="78"/.test(s),'左目');
  assert.ok(/translate\(122[ .]|cx="122"/.test(s),'右目');
});

test('後ろでは顔が出ない',()=>{
  const s=petSVG('puni','normal',{yaw:180});
  assert.ok(!/<circle[^>]*fill="#5B3A55"/.test(s));
  // 目・口は顔の色（#5B3A55）。sleep の Z は まわりに浮くもの なので除く
  for(const face of ['normal','happy','sick','sad','sparkle','pout','tears','hungry','giggle','squint','dizzy'])
    for(const yaw of [135,180,-135]) assert.ok(!petSVG('puni',face,{yaw}).includes('#5B3A55'),face+' '+yaw);
});

test('浮くものは回さない',()=>{
  assert.ok(petSVG('shabon','normal',{yaw:90}).includes('cx="30" cy="56"'));
});

test('たまごは yaw を無視',()=>{
  assert.equal(petSVG('egg','normal',{pts:2,yaw:90}),petSVG('egg','normal',{pts:2}));
});

test('sil は yaw を無視',()=>{
  assert.equal(petSVG('puni','normal',{sil:true,yaw:90}),petSVG('puni','normal',{sil:true}));
});
