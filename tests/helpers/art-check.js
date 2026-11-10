// 家具の絵の「契約」の検査（tests/room-art*.test.js で共有する。Node 専用）
// 決まりの出どころ：docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §8.1
//
// 使い方（グループ A の例。B・C も同じ形）：
//   import {ART_A} from '../js/room-art-a.js';
//   import {ITEMS} from '../js/room-data.js';
//   import {checkArt,GROUPS} from './helpers/art-check.js';
//   for(const id of GROUPS.A) checkArt(ART_A[id](), id, ITEMS[id].w, ITEMS[id].h);
import assert from 'node:assert/strict';

const XMLNS='http://www.w3.org/2000/svg';

/** どのグループがどの ID の絵を描くか（3 つ合わせて ITEMS の 17 種。順番は ITEMS と同じ） */
export const GROUPS=Object.freeze({
  A:Object.freeze(['rug','rug_pink','rug_mint','shelf','plant','lamp','ball','plush']),
  B:Object.freeze(['bed','sofa','table','chair','desk']),
  C:Object.freeze(['toybox','cushion','tent','slide']),
});

/**
 * §8.1 の「安全」をすべて確かめる（1 つでも破ると assert で落ちる）。
 *  - `<svg` で始まり、SVG の xmlns を持つ
 *  - `<script`・`on…=`・`style=`・`href` が無い
 *  - 外部 URL が無い（`http` は xmlns の 1 回だけ）
 *  - 同じタグに同じ属性を 2 回書かない（XML として読めるように。`<img src="data:…">` で使うため）
 *  - idPrefix を渡したとき：`id="…"` と `url(#…)` はすべて idPrefix で始まる
 * @param {string} svg
 * @param {string} [idPrefix] 家具の絵では 'ri-<アイテムid>-'
 */
export function checkSafe(svg,idPrefix){
  assert.equal(typeof svg,'string','svg は文字列');
  assert.ok(svg.startsWith('<svg'),'<svg で始まる');
  assert.ok(svg.includes(`xmlns="${XMLNS}"`),'xmlns がある');
  const bad=svg.match(/<script|\son\w+=|\sstyle=|href/i);
  assert.equal(bad,null,`書いてはいけないもの: ${bad&&bad[0]}`);
  assert.ok(!/http/i.test(svg.replace(XMLNS,'')),'外部 URL（http）が無い');
  for(const tag of svg.match(/<[^>]+>/g)||[]){
    const names=[...tag.matchAll(/\s([\w:-]+)=/g)].map(m=>m[1]);
    assert.equal(new Set(names).size,names.length,`同じ属性が 2 回: ${tag}`);
  }
  if(idPrefix!==undefined){
    assert.ok(!/\sid='/.test(svg),'id は二重引用符で書く');
    for(const m of svg.matchAll(/\sid="([^"]*)"/g))assert.ok(m[1].startsWith(idPrefix),`id="${m[1]}" は ${idPrefix} で始める`);
    for(const m of svg.matchAll(/url\(\s*#([^)]*)\)/g))assert.ok(m[1].startsWith(idPrefix),`url(#${m[1]}) は ${idPrefix} で始める`);
  }
}

/**
 * 家具の絵 1 枚を確かめる：checkSafe(art.svg,'ri-'+id+'-') ＋ §8.1 の「形式」。
 *  - art.svg は 20,000 文字以下
 *  - art.w・art.h・art.ax・art.ay は有限の正の数
 *  - 足あと（fw×fh マス）のひし形が絵の中に収まる：
 *      左  art.ax        >= fh*32
 *      右  art.w-art.ax  >= fw*32
 *      下  art.h-art.ay  >= (fw+fh)*16
 *  - 高さ art.ay <= 150
 * @param {{svg:string,w:number,h:number,ax:number,ay:number}} art
 * @param {string} id アイテムの ID
 * @param {number} fw 足あとの w（+gx＝画面の右下へのびるマス数。ITEMS[id].w）
 * @param {number} fh 足あとの h（+gy＝画面の左下へのびるマス数。ITEMS[id].h）
 */
export function checkArt(art,id,fw,fh){
  assert.ok(art&&typeof art==='object',`${id}: {svg,w,h,ax,ay} を返す`);
  checkSafe(art.svg,'ri-'+id+'-');
  assert.ok(art.svg.length<=20000,`${id}: svg は 20,000 文字以下（今 ${art.svg.length}）`);
  for(const k of ['w','h','ax','ay'])assert.ok(Number.isFinite(art[k])&&art[k]>0,`${id}: ${k} は有限の正の数（今 ${art[k]}）`);
  assert.ok(art.ax>=fh*32,`${id}: ax>=${fh*32}（今 ${art.ax}）`);
  assert.ok(art.w-art.ax>=fw*32,`${id}: w-ax>=${fw*32}（今 ${art.w-art.ax}）`);
  assert.ok(art.h-art.ay>=(fw+fh)*16,`${id}: h-ay>=${(fw+fh)*16}（今 ${art.h-art.ay}）`);
  assert.ok(art.ay<=150,`${id}: ay<=150（今 ${art.ay}）`);
}
