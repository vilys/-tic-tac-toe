// build.js - 從 game.js 產生瀏覽器版 game-inline.js
//
// 為什麼需要這個？
//   Chrome/Edge 在 file:// 載入 HTML 時會擋 ES module 的 import，
//   所以瀏覽器版的 game.js 不能有 export 關鍵字。
//   但我們又想保留 game.js 為 ES module 以便 Node 跑單元測試。
//
// 解法：game.js 是「單一真實來源」，build.js 把 export 關鍵字拿掉
//   變成一般 script，瀏覽器載入時函式直接變成全域。
//
// 用法：  node build.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'game.js');
const DEST = path.join(__dirname, 'game-inline.js');

const HEADER = `// ============================================================
// AUTO-GENERATED from game.js by build.cjs — do not edit.
// 改動 game.js 後跑 \`node build.cjs\` 重新產生此檔。
// ============================================================

`;

let content = fs.readFileSync(SRC, 'utf8');

// 把 "export function" / "export const" 改成一般宣告
// 瀏覽器 <script>（無 type="module"）不能接受 export 關鍵字
content = content.replace(/^export function/gm, 'function');
content = content.replace(/^export const/gm, 'const');
content = content.replace(/^export let/gm, 'let');
content = content.replace(/^export var/gm, 'var');

const finalContent = HEADER + content;

fs.writeFileSync(DEST, finalContent, 'utf8');
console.log(`✓ Built ${path.basename(DEST)} from ${path.basename(SRC)}`);
console.log(`  ${finalContent.length} bytes`);