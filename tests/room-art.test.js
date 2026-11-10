// js/room-art.js のテスト（node --test tests/room-art.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import * as RA from '../js/room-art.js';
import {layout,roomSVG,itemSVG,TILE_W,TILE_H,WALL_H} from '../js/room-art.js';
import {SCENE} from '../js/art.js';
import {createHash} from 'node:crypto';
import * as KIT from '../js/room-art-kit.js';
import {ITEMS,FLOORS,WALLS} from '../js/room-data.js';
import {checkArt,checkSafe} from './helpers/art-check.js';

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

test('roomSVG の初期柄は 移す前の絵から ラグを外したものと同じ文字列',()=>{
  // 移す前（3530b45）の roomSVG(n,band) から「ラグ」の描画ブロックを消し、空のグラデーションの id を
  // 'rsky-<band>' → 'rsky-<band>-w_pink' にしたもの 12 枚を改行でつなげた文字列の sha256（はちみつの床・みずたまの壁は そのまま）
  const all=[];
  for(const n of [6,8,10])for(const b of BANDS)all.push(roomSVG(n,b));
  assert.equal(sha(all.join('\n')),'e7ea10a7f4704e4fd6ec51f41b533f75e40334997d1743e9099d0f0903e36606');
});

const FL=Object.keys(FLOORS), WL=Object.keys(WALLS);

test('ゆか・かべの柄：192 枚すべて安全で viewBox が合う',()=>{
  assert.equal(FL.length,4);assert.equal(WL.length,4);
  for(const n of [6,8,10])for(const b of BANDS)for(const f of FL)for(const w of WL){
    const s=roomSVG(n,b,f,w);
    checkSafe(s);
    assert.ok(s.includes(`viewBox="0 0 ${n*64} ${n*32+WALL_H}"`),`${n} ${b} ${f} ${w}`);
  }
});

test('ラグが背景に無い（ラグは家具の rug が描く）',()=>{
  for(const n of [6,8,10])for(const b of BANDS)for(const f of FL)for(const w of WL){
    const s=roomSVG(n,b,f,w);
    assert.ok(!s.includes('#CDB8F0')&&!s.includes('#E6DAFA'),`${n} ${b} ${f} ${w}`);
  }
});

test('既定：省略・知らない ID は はちみつの床と みずたまの壁',()=>{
  const d=roomSVG(6,'hiru');
  assert.equal(d,roomSVG(6,'hiru','f_honey','w_pink'));
  for(const [f,w] of [['zzz','__proto__'],['constructor','toString'],[undefined,null],[7,{}],['','']])assert.equal(roomSVG(6,'hiru',f,w),d);
});

test('柄が違えば絵が違う',()=>{
  const fs=FL.map(f=>roomSVG(6,'hiru',f,'w_pink'));
  assert.equal(new Set(fs).size,4);
  const ws=WL.map(w=>roomSVG(6,'hiru','f_honey',w));
  assert.equal(new Set(ws).size,4);
});

test('かべの 4 柄すべてに まど・カーテン・幅木',()=>{
  for(const w of WL){
    const s=roomSVG(6,'hiru','f_honey',w);
    assert.ok(s.includes(`url(#rsky-hiru-${w})`),w);   // まど（空）
    assert.ok(s.includes('#F7B4D0'),w);                 // カーテン
    assert.ok(s.includes('#B9EAD2'),w);                 // 幅木
  }
});

test('patternSVG：8 柄の見本は安全で 96×64、たがいに違う',()=>{
  assert.equal(typeof RA.patternSVG,'function');
  const all=[...FL,...WL].map(id=>RA.patternSVG(id));
  for(const s of all){checkSafe(s);assert.ok(s.includes('viewBox="0 0 96 64"'));}
  assert.equal(new Set(all).size,8);
  for(const id of ['zzz','','__proto__','constructor',undefined,null,7,{}])assert.equal(RA.patternSVG(id),'');
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

test('itemSVG：カタログのどの ID も 足あとに合った絵を返す',()=>{
  // 専用の絵が まだでも 予備の箱が返る。どちらでも §8.1 の形式に合う（カタログの中身に依存しない書き方）
  for(const id of Object.keys(ITEMS))checkArt(itemSVG(id),id,ITEMS[id].w,ITEMS[id].h);
});

test('itemSVG：知らない ID は 1×1 の予備の箱（落ちない・どれも同じ）',()=>{
  const box=itemSVG('nope');
  checkArt(box,'zzz',1,1);
  assert.ok(box.w<=64+12&&box.h<=24+32+12,'1×1 の大きさ');
  for(const id of ['zzz','','__proto__','constructor','toString',undefined,null,7,123,{}]){
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

test('SVG の ID は時間帯・かべの柄ごとに別（どの 2 枚でも重ならない）',()=>{
  const seen=new Map();
  for(const b of BANDS)for(const w of WL){
    for(const m of roomSVG(6,b,'f_honey',w).matchAll(/\sid="([^"]+)"/g)){
      assert.ok(!seen.has(m[1])||seen.get(m[1])===b+w,`${m[1]} が ${seen.get(m[1])} と ${b+w} で重なる`);
      seen.set(m[1],b+w);
    }
  }
  assert.ok(seen.size>=16);
});
