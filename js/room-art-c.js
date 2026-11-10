// おへやの家具の絵・グループ C（DOM に触れない。import は room-art-kit.js だけ）
// 受け持ち：toybox・cushion・tent・slide（tests/helpers/art-check.js の GROUPS.C）
//
// 書き方（契約のくわしい説明と例は room-art-kit.js の先頭。実例は room-art-a.js の shelf・plant）：
//   1. 引数なしで {svg,w,h,ax,ay} を返す関数を 1 アイテムにつき 1 つ書く（svg は wrapSVG(w,h,body)）。
//   2. 下の ART_C に `アイテムid: 関数` を足す。キーは受け持ちの ID だけ。
//   3. node --test tests/*.test.js と dev/item-sheet.html?g=C で確かめる。
// room-art.js の itemSVG(id) が ART_A → ART_B → ART_C の順に引く（無い ID は予備の箱になる）。

/** @typedef {import('./room-art-kit.js').ItemArt} ItemArt */

/** グループ C の絵の表（凍結・プロトタイプなし。引くときは room-data.js の has(ART_C,id)）
 * @type {Readonly<{[id:string]:()=>ItemArt}>} */
export const ART_C=Object.freeze(Object.assign(Object.create(null),{
}));
