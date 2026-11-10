// おへや：おみせ の画面（#roomShop）。中身は Task 13 で作る。いまは口だけ（何もしない）
// 設計書 docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §4.3
/** @typedef {import('./room-ui.js').RoomCtx} RoomCtx */

/** おみせ を開く @param {RoomCtx} ctx */
export function openShop(ctx){}
/** おみせ を閉じる（開いていなければ何もしない） */
export function closeShop(){}
/** おみせ が開いているか @returns {boolean} */
export function isShopOpen(){return false;}
