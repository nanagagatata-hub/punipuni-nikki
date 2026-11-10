// js/room-art.js のテスト（node --test tests/room-art.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,roomSVG,itemSVG,TILE_W,TILE_H,WALL_H} from '../js/room-art.js';
import {SCENE} from '../js/art.js';
import {createHash} from 'node:crypto';
import * as KIT from '../js/room-art-kit.js';
import {ITEMS} from '../js/room-data.js';
import {checkArt} from './helpers/art-check.js';

const sha=s=>createHash('sha256').update(s).digest('hex');

const BANDS=['asa','hiru','yuu','yoru'];
const cells=o=>{const r=[];for(let i=0;i<o.w;i++)for(let j=0;j<o.h;j++)r.push(`${o.x+i},${o.y+j}`);return r;};

test('定数',()=>{assert.equal(TILE_W,64);assert.equal(TILE_H,32);assert.equal(WALL_H,112);});

test('layout は n=6,8,10 で範囲内・重ならない',()=>{
  for(const n of [6,8,10]){
    const L=layout(n),seen=new Set();
    assert.deepEqual(L.items.map(i=>i.id).sort(),['plant','shelf']);
    for(const o of [...L.items,L.rug]){
      for(const c of cells(o)){
        const [x,y]=c.split(',').map(Number);
        assert.ok(x>=0&&x<n&&y>=0&&y<n,`${n}: ${c} out`);
        assert.ok(!seen.has(c),`${n}: ${c} overlap`);seen.add(c);
      }
    }
    for(const i of L.items)assert.equal(i.walk,false);
    assert.equal(L.window.wall,'right');assert.equal(L.window.at,n/2);
  }
});

test('home は通れて、ラグの上',()=>{
  for(const n of [6,8,10]){
    const L=layout(n),h=L.home;
    assert.deepEqual(h,{x:n/2,y:n/2});
    for(const i of L.items)assert.ok(!cells(i).includes(`${h.x},${h.y}`));
    assert.ok(h.x>=L.rug.x&&h.x<L.rug.x+2&&h.y>=L.rug.y&&h.y<L.rug.y+2);
  }
});

test('SVG は安全',()=>{
  const all=[];
  for(const n of [6,8,10])for(const b of BANDS)all.push(roomSVG(n,b));
  all.push(itemSVG('shelf').svg,itemSVG('plant').svg);
  for(const s of all){
    assert.ok(s.startsWith('<svg'));
    assert.ok(s.includes('xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(!/<script|\son\w+=/i.test(s));
    assert.ok(!/http/i.test(s.replace('http://www.w3.org/2000/svg','')));
    for(const tag of s.match(/<[^>]+>/g)){ // 同じタグ内で属性の重複なし（XML として読めるように）
      const names=[...tag.matchAll(/\s([\w:-]+)=/g)].map(m=>m[1]);
      assert.equal(new Set(names).size,names.length,tag);
    }
  }
});

test('roomSVG の viewBox',()=>{
  assert.ok(roomSVG(6,'hiru').includes(`viewBox="0 0 ${6*64} ${6*32+WALL_H}"`));
});

test('roomSVG は部品を kit へ移す前と同じ文字列',()=>{
  // 移す前（3530b45）の roomSVG(n,band) 12 枚を改行でつなげた文字列の sha256
  const all=[];
  for(const n of [6,8,10])for(const b of BANDS)all.push(roomSVG(n,b));
  assert.equal(sha(all.join('\n')),'dbb7eae6d044f87848828f77fbc3973d088355f9d1ddf8936208704131c516ef');
});

test('定数は room-art.js からも kit と同じものが取れる',()=>{
  assert.equal(TILE_W,KIT.TILE_W);assert.equal(TILE_H,KIT.TILE_H);assert.equal(WALL_H,KIT.WALL_H);
});

test('itemSVG：ほんだな は移す前と同じ文字列',()=>{
  // 移す前（3530b45）の itemSVG('shelf') の値
  const m=itemSVG('shelf');
  assert.equal(sha(m.svg),'5b1c1812e9cb3acbe8e2d1ff63f31f41c59d7960817f1d66aa7b2598cd763d4e');
  assert.deepEqual({w:m.w,h:m.h,ax:m.ax,ay:m.ay},{w:108,h:160,ax:70,ay:106});
});

test('itemSVG：しょくぶつ は高さだけ 104→106（足あとを収める）で、中身は移す前と同じ',()=>{
  // 移す前（3530b45）は h=104・ay=74 で、足あとの下の頂点（ay+32=106）が絵からはみ出ていた（§8.1 の形式に合わない）。
  // 絵の中身は変えず、外枠の高さだけ 2 のばした。高さを 104 に書き戻すと 移す前の文字列と同じになる。
  const m=itemSVG('plant');
  assert.deepEqual({w:m.w,h:m.h,ax:m.ax,ay:m.ay},{w:76,h:106,ax:38,ay:74});
  const before=m.svg.replace('viewBox="0 0 76 106"','viewBox="0 0 76 104"').replace('height="106"','height="104"');
  assert.equal(sha(before),'441248523cd3e4351af2f3c1422d0208517165469a6e82c9d9ca66259f4526ac');
});

test('itemSVG：絵がまだ無い ID は足あとの大きさの予備の箱',()=>{
  const bed=itemSVG('bed');
  checkArt(bed,'bed',2,2);
  for(const id of Object.keys(ITEMS))checkArt(itemSVG(id),id,ITEMS[id].w,ITEMS[id].h);
  // 足あとが同じなら同じ箱、ちがえば大きさがちがう
  assert.deepEqual(itemSVG('sofa'),itemSVG('desk'));
  assert.ok(bed.w>itemSVG('sofa').w&&itemSVG('sofa').w>itemSVG('table').w);
});

test('itemSVG：知らない ID は 1×1 の箱（落ちない）',()=>{
  const box=itemSVG('table'); // まだ絵が無い 1×1
  for(const id of ['zzz','','__proto__','constructor','toString',undefined,null,7,{}]){
    const m=itemSVG(id);
    checkArt(m,'zzz',1,1);
    assert.deepEqual(m,box);
  }
});

test('時間帯で空の色が変わる',()=>{
  assert.ok(roomSVG(6,'hiru').includes(SCENE.hiru.sky[0]));
  assert.ok(roomSVG(6,'yoru').includes(SCENE.yoru.sky[0]));
  assert.ok(!roomSVG(6,'hiru').includes(SCENE.yoru.sky[0]));
});

test('SVG の ID は時間帯ごとに別',()=>{
  const ids=b=>[...roomSVG(6,b).matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  const a=ids('asa'),y=ids('yoru');
  assert.ok(a.length>0&&y.length>0);
  for(const i of a)assert.ok(!y.includes(i));
});
