// 井字過三關 - build 流程的測試
//
// 為什麼要測 build 而不是測程式邏輯？
// 因為這是「契約」式的測試：保證 build 產出的檔案對瀏覽器無害。
// 如果有人改了 build.cjs 把 export 處理規則刪掉，這測試會紅。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(HERE, 'build.cjs');
const SRC = resolve(HERE, 'game.js');
const DEST = resolve(HERE, 'game-inline.js');

function runBuild() {
  execSync(`node "${BUILD}"`, { cwd: HERE, stdio: 'pipe' });
  return readFileSync(DEST, 'utf8');
}

test('build: 跑 build.cjs 不會爆', () => {
  assert.doesNotThrow(() => runBuild());
});

test('build: 產出的 game-inline.js 不能含任何 "export " 關鍵字', () => {
  const out = runBuild();
  // 用 regex 找所有可能的 export 形式（含 function/const/let/var/default）
  const exportMatches = out.match(/^\s*export\s/gm);
  assert.equal(exportMatches, null, `game-inline.js 還有殘留的 export：${exportMatches}`);
});

test('build: 產出的 game-inline.js 開頭是自動生成的 HEADER 註解', () => {
  const out = runBuild();
  assert.match(out, /AUTO-GENERATED from game\.js by build\.cjs/);
});

test('build: export function/const/let/var 都會被剝除（regression 用 4 種 export 都驗）', () => {
  // 確認 game.js 真的有 export（避免測試誤綠）
  const src = readFileSync(SRC, 'utf8');
  assert.match(src, /^export function/m, 'game.js 至少要有 export function');
  assert.match(src, /^export const/m, 'game.js 至少要有 export const（驗多種類型）');
  // 跑 build 後兩個都不應該出現
  const out = runBuild();
  assert.doesNotMatch(out, /^export function/m);
  assert.doesNotMatch(out, /^export const/m);
});
