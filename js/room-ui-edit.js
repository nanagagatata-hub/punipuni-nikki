// おへや：もようがえ の画面（#roomTray・#editDone）。中身は Task 14 で作る。いまは口だけ（何もしない）
// 設計書 docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §4.4
// room-ui.js は #roomView の中で押されるたびに isEditing() を見て #roomView に .editing を付け外しする
// （.editing の間は #roomPet がタップを受けず、Canvas の onCell に届く）。onCell は mount のあとに登録すること。
/** @typedef {import('./room-ui.js').RoomCtx} RoomCtx */

/** もようがえ を始める（おへやが開いて mount したあとに呼ばれる） @param {RoomCtx} ctx */
export function startEdit(ctx){}
/** もようがえ を終える（していなければ何もしない） */
export function endEdit(){}
/** もようがえ 中か @returns {boolean} */
export function isEditing(){return false;}
