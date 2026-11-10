// js/room-art.js のテスト（node --test tests/room-art.test.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,roomSVG,itemSVG,TILE_W,TILE_H,WALL_H} from '../js/room-art.js';
import {SCENE} from '../js/art.js';

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

test('roomSVG の viewBox と itemSVG の大きさ',()=>{
  assert.ok(roomSVG(6,'hiru').includes(`viewBox="0 0 ${6*64} ${6*32+WALL_H}"`));
  for(const id of ['shelf','plant']){
    const m=itemSVG(id);
    assert.ok(m.w>0&&m.h>0&&m.ax>0&&m.ay>0&&m.ax<m.w&&m.ay<m.h);
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
