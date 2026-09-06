// 井字過三關 - 測試
// 跑測試: node --test
// TDD 流程：先寫失敗的測試，再去 game.js 寫最小實作讓它變綠

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWinner, getWinningLine, pickAIMove, analyzeMovesForAIBoard, nextTurnPlayer, isAiTurnInPvE, loadScore, saveScore, loadTheme, saveTheme, VALID_THEMES, THEME_LABELS, loadMute, saveMute, calculateProgress } from './game.js';

// 記憶體 storage 模擬器（Node 沒有 localStorage）
function createMemoryStorage() {
  const data = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, val) { data[key] = String(val); }
  };
}

test('checkWinner: 空棋盤沒有贏家', () => {
  const emptyBoard = ['', '', '', '', '', '', '', '', ''];
  assert.equal(checkWinner(emptyBoard), null);
});

test('checkWinner: 頂列三個 X 連線 → "X"', () => {
  const board = ['X', 'X', 'X', '', '', '', '', '', ''];
  assert.equal(checkWinner(board), 'X');
});

test('checkWinner: 中欄三個 O 連線 → "O"', () => {
  const board = ['X', 'O', '', '', 'O', 'X', '', 'O', ''];
  assert.equal(checkWinner(board), 'O');
});

test('checkWinner: 主對角線三個 X 連線 → "X"', () => {
  const board = ['X', '', '', '', 'X', '', '', '', 'X'];
  assert.equal(checkWinner(board), 'X');
});

test('checkWinner: 副對角線三個 O 連線 → "O"', () => {
  const board = ['', '', 'O', '', 'O', '', 'O', '', ''];
  assert.equal(checkWinner(board), 'O');
});

test('pickAIMove (easy): 空棋盤回傳 0-8 之間的索引', () => {
  const emptyBoard = ['', '', '', '', '', '', '', '', ''];
  const move = pickAIMove(emptyBoard, 'easy', 'X');
  assert.ok(move >= 0 && move <= 8, `move 應在 0-8 之間，得到 ${move}`);
  assert.ok(Number.isInteger(move), 'move 應為整數');
});

test('pickAIMove (easy): 只回傳空格子的索引（跳過已佔位）', () => {
  // 已經下了三個 X，AI 只能選剩下的 6 個空格
  const board = ['X', 'X', 'O', '', '', '', 'O', '', ''];
  for (let i = 0; i < 50; i++) {
    const move = pickAIMove(board, 'easy', 'X');
    assert.equal(board[move], '', `move=${move} 處應為空，但有 ${board[move]}`);
  }
});

test('pickAIMove (easy): AI 有 2-in-row 時取贏', () => {
  // AI = X，已有 0,1 兩格，只剩 2 能贏
  const board = ['X', 'X', '', '', 'O', '', '', 'O', ''];
  const move = pickAIMove(board, 'easy', 'X');
  assert.equal(move, 2, `應取 2 贏，但取了 ${move}`);
});

test('pickAIMove (easy): 對手有 2-in-row 時阻擋', () => {
  // 對手 = O 已有 3,4 兩格，AI (X) 必須擋 5（必須每次都擋，不能隨機）
  const board = ['', '', '', 'O', 'O', '', 'X', '', ''];
  for (let i = 0; i < 20; i++) {
    const move = pickAIMove(board, 'easy', 'X');
    assert.equal(move, 5, `第 ${i + 1} 次：應擋 5，但取了 ${move}`);
  }
});

test('pickAIMove (hard): 中盤有必勝機會必取（不允許錯過）', () => {
  // AI = X 已有 0,1，剩 2 可完成頂列連線
  // 對手 = O 在 4,5
  // 任何 minimax 都必須取 2（否則就是 bug）
  const board = ['X', 'X', '', 'O', 'O', '', '', '', ''];
  for (let i = 0; i < 5; i++) {
    const move = pickAIMove(board, 'hard', 'X');
    assert.equal(move, 2, `第 ${i + 1} 次：必須取 2 贏，但取了 ${move}`);
  }
});

test('pickAIMove (hard): 對手即將贏必阻擋', () => {
  // 對手 = O 在 0,1，AI = X 必須擋 2
  const board = ['O', 'O', '', '', 'X', '', '', 'X', ''];
  for (let i = 0; i < 5; i++) {
    const move = pickAIMove(board, 'hard', 'X');
    assert.equal(move, 2, `第 ${i + 1} 次：必須擋 2，但取了 ${move}`);
  }
});

test('pickAIMove (hard) property: vs 最優玩家對奕 50 局永不輸', () => {
  // 雙方都用 minimax 對奕，理論上只能平局或AI 贏，不可能 AI 輸
  // （除非兩個 minimax 實作有 bug 或不同步）
  let wins = 0, draws = 0, losses = 0;
  for (let game = 0; game < 50; game++) {
    let board = Array(9).fill('');
    const aiFirst = game % 2 === 0;
    let aiSide, playerSide;
    if (aiFirst) { aiSide = 'X'; playerSide = 'O'; } else { aiSide = 'O'; playerSide = 'X'; }
    for (let turn = 0; turn < 9; turn++) {
      const isAiTurn = aiFirst ? turn % 2 === 0 : turn % 2 === 1;
      const sym = isAiTurn ? aiSide : playerSide;
      const move = pickAIMove(board, 'hard', sym);
      board[move] = sym;
      const winner = checkWinner(board);
      if (winner) {
        if (winner === aiSide) wins++;
        else losses++;
        break;
      }
    }
    if (!checkWinner(board) && board.every(c => c !== '')) draws++;
  }
  assert.equal(losses, 0, `AI 不應輸任何一局，但輸了 ${losses} 局`);
  assert.ok(wins + draws === 50, '每局必須有結果');
});

test('analyzeMovesForAIBoard: 空棋盤回傳 9 個項目（index 0-8）', () => {
  const board = ['', '', '', '', '', '', '', '', ''];
  const result = analyzeMovesForAIBoard(board, 'X');
  assert.equal(result.length, 9);
  const indices = result.map(r => r.index).sort((a, b) => a - b);
  assert.deepEqual(indices, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  for (const r of result) {
    assert.equal(typeof r.score, 'number', `index=${r.index} 的 score 應為數字`);
  }
});

test('analyzeMovesForAIBoard: 只回傳空格的評分（已佔格不出現）', () => {
  // X 在 0、1、4；O 在 3、7。空格 = 2, 5, 6, 8
  const board = ['X', 'X', '', 'O', 'X', '', '', 'O', ''];
  const result = analyzeMovesForAIBoard(board, 'X');
  assert.equal(result.length, 4);
  const indices = result.map(r => r.index).sort((a, b) => a - b);
  assert.deepEqual(indices, [2, 5, 6, 8]);
});

test('analyzeMovesForAIBoard: AI 必勝局面下取贏的評分最高', () => {
  // AI = X 已有 0、1，下在 2 可立刻贏（頂列三連）
  // 對手 = O 在 4、5（阻擋中欄，與本測試無關）
  const board = ['X', 'X', '', '', 'O', 'O', '', '', ''];
  const result = analyzeMovesForAIBoard(board, 'X');
  const move2 = result.find(r => r.index === 2);
  assert.ok(move2, '應包含 index=2 的評分');
  const others = result.filter(r => r.index !== 2).map(r => r.score);
  const maxOther = others.length ? Math.max(...others) : -Infinity;
  assert.ok(move2.score > maxOther,
    `取贏分數 (${move2.score}) 應高於其他最高 (${maxOther})`);
});

test('analyzeMovesForAIBoard: 對手即將贏時，擋住的評分高於不擋', () => {
  // 對手 = O 已有 0、1，AI X 不擋就輸；擋在 2
  const board = ['O', 'O', '', '', '', '', 'X', '', ''];
  const result = analyzeMovesForAIBoard(board, 'X');
  const block2 = result.find(r => r.index === 2);
  const noblock3 = result.find(r => r.index === 3);
  assert.ok(block2 && noblock3, '應包含 index 2 和 3');
  assert.ok(block2.score > noblock3.score,
    `擋 (${block2.score}) 應高於不擋 (${noblock3.score})`);
});

test('loadScore: 空 storage 回傳預設 {player:0, ai:0, draw:0}', () => {
  const storage = createMemoryStorage();
  assert.deepEqual(loadScore(storage), { player: 0, ai: 0, draw: 0 });
});

test('saveScore + loadScore 來回往返保持一致', () => {
  const storage = createMemoryStorage();
  const score = { player: 3, ai: 5, draw: 2 };
  saveScore(score, storage);
  assert.deepEqual(loadScore(storage), score);
});

test('nextTurnPlayer(0): 沒人下過，X 先手', () => {
  assert.equal(nextTurnPlayer(0), 'X');
});

test('nextTurnPlayer(1): X 下過一次，下一個是 O', () => {
  assert.equal(nextTurnPlayer(1), 'O');
});

test('nextTurnPlayer(2): 兩人各一下，下個回到 X', () => {
  assert.equal(nextTurnPlayer(2), 'X');
});

test('nextTurnPlayer(8): 第 9 步（遊戲末期），下一手是 X', () => {
  // 8 步已下 → 偶數 → X
  // 第 9 步若還沒終局就是 X 走（實務上此時已多半終局）
  assert.equal(nextTurnPlayer(8), 'X');
});

test('isAiTurnInPvE (回歸測試): 玩家是 X、AI 是 O，moveCount=0→不是 AI 回合', () => {
  // 玩家先手 → AI 在第 2、4… 步（moveCount 為 1, 3, 5, 7）
  assert.equal(isAiTurnInPvE('X', 0), false);
  assert.equal(isAiTurnInPvE('X', 1), true);
  assert.equal(isAiTurnInPvE('X', 2), false);
  assert.equal(isAiTurnInPvE('X', 3), true);
});

test('isAiTurnInPvE (回歸測試): 玩家是 O、AI 是 X，AI 先下（moveCount=1 後是玩家回合）', () => {
  // 玩家是 O（後手），AI 是 X（先手）
  // moveCount=0 → 還沒人下 → X 該下 → 是 AI 回合
  // moveCount=1 → AI 已下完 → O 該下 → 不是 AI 回合
  // 這是 v6 修掉的 bug：原本用 currentPlayer === AI 直接比 playerSide，在這個場景會誤判
  assert.equal(isAiTurnInPvE('O', 0), true);
  assert.equal(isAiTurnInPvE('O', 1), false);  // ← 這個是 bug 的關鍵場景
  assert.equal(isAiTurnInPvE('O', 2), true);
  assert.equal(isAiTurnInPvE('O', 3), false);
});

test('getWinningLine: 空棋盤無人贏 → null', () => {
  const board = ['', '', '', '', '', '', '', '', ''];
  assert.equal(getWinningLine(board), null);
});

test('getWinningLine: 頂列 X 連線 → [0,1,2]', () => {
  const board = ['X', 'X', 'X', '', '', '', '', '', ''];
  assert.deepEqual(getWinningLine(board), [0, 1, 2]);
});

test('getWinningLine: 中欄 O 連線 → [1,4,7]', () => {
  const board = ['X', 'O', '', '', 'O', '', 'X', 'O', ''];
  assert.deepEqual(getWinningLine(board), [1, 4, 7]);
});

test('getWinningLine: 主對角線 X → [0,4,8]', () => {
  const board = ['X', '', '', '', 'X', '', '', '', 'X'];
  assert.deepEqual(getWinningLine(board), [0, 4, 8]);
});

test('getWinningLine: 中段局面無連線 → null', () => {
  // 已有 5 子但無連線
  const board = ['X', 'O', '', 'O', 'X', '', '', '', ''];
  assert.equal(getWinningLine(board), null);
});

// ===== v7：主題選擇器 =====
test('VALID_THEMES 匯出 4 個合法主題', () => {
  assert.deepEqual([...VALID_THEMES], ['default', 'dark', 'ocean', 'sunset']);
});

test('loadTheme: 空 storage 回傳預設 "default"', () => {
  const storage = createMemoryStorage();
  assert.equal(loadTheme(storage), 'default');
});

test('loadTheme: 存了合法主題正確讀回', () => {
  const storage = createMemoryStorage();
  storage.setItem('tic-tac-toe-theme', 'dark');
  assert.equal(loadTheme(storage), 'dark');
});

test('loadTheme: 存了未知主題（例如舊版存的值被竄改）退回預設', () => {
  const storage = createMemoryStorage();
  storage.setItem('tic-tac-toe-theme', 'hacker'); // 不在白名單
  assert.equal(loadTheme(storage), 'default');
});

test('saveTheme + loadTheme 來回往返保持一致', () => {
  const storage = createMemoryStorage();
  for (const t of VALID_THEMES) {
    saveTheme(t, storage);
    assert.equal(loadTheme(storage), t);
  }
});

// ===== v9（review refactor）：THEME_LABELS 必須涵蓋 VALID_THEMES =====
test('THEME_LABELS 的 key 必須正好等於 VALID_THEMES（防遺漏）', () => {
  const labelKeys = Object.keys(THEME_LABELS);
  assert.deepEqual(labelKeys, [...VALID_THEMES]);
});

test('THEME_LABELS 每個 value 必須是非空字串', () => {
  for (const t of VALID_THEMES) {
    assert.ok(typeof THEME_LABELS[t] === 'string' && THEME_LABELS[t].length > 0,
      `${t} 應有非空 label，得到 ${THEME_LABELS[t]}`);
  }
});

// ===== v8：音效靜音狀態持久化 =====
test('loadMute: 空 storage 回傳預設 false（不靜音）', () => {
  const storage = createMemoryStorage();
  assert.equal(loadMute(storage), false);
});

test('loadMute: 存了 "true" 回傳 true（靜音）', () => {
  const storage = createMemoryStorage();
  storage.setItem('tic-tac-toe-mute', 'true');
  assert.equal(loadMute(storage), true);
});

test('loadMute: 存了 "false" 回傳 false（不靜音）', () => {
  const storage = createMemoryStorage();
  storage.setItem('tic-tac-toe-mute', 'false');
  assert.equal(loadMute(storage), false);
});

test('loadMute: 存了奇怪的值（"yes"）退回預設 false', () => {
  const storage = createMemoryStorage();
  storage.setItem('tic-tac-toe-mute', 'yes');
  assert.equal(loadMute(storage), false);
});

test('saveMute + loadMute 來回往返保持一致', () => {
  const storage = createMemoryStorage();
  saveMute(true, storage);
  assert.equal(loadMute(storage), true);
  saveMute(false, storage);
  assert.equal(loadMute(storage), false);
});

// ===== v10：AI 思考進度條計算（純函數）=====
test('calculateProgress(0, 1000) 回傳 0（剛開始）', () => {
  assert.equal(calculateProgress(0, 1000), 0);
});

test('calculateProgress(1000, 1000) 回傳 100（時間到）', () => {
  assert.equal(calculateProgress(1000, 1000), 100);
});

test('calculateProgress(500, 1000) 回傳 50（一半）', () => {
  assert.equal(calculateProgress(500, 1000), 50);
});

test('calculateProgress 超過 totalMs 回傳 100（不超過上限）', () => {
  // 防呆：AI 思考時間偶爾比預期長，進度條不能超過 100%
  assert.equal(calculateProgress(1500, 1000), 100);
  assert.equal(calculateProgress(999999, 1000), 100);
});

test('calculateProgress 負數 elapsed 回傳 0（不低於下限）', () => {
  // 防呆：setInterval 第一次觸發可能 elapsed 為負（時鐘差）
  assert.equal(calculateProgress(-100, 1000), 0);
  assert.equal(calculateProgress(-0.5, 1000), 0);
});

test('calculateProgress totalMs 為 0 回傳 100（避免除以零）', () => {
  // 防呆：如果 config 錯誤傳了 0，要避免 NaN
  assert.equal(calculateProgress(500, 0), 100);
});

test('calculateProgress 小數 elapsed 也正確（避免整數運算）', () => {
  // rAF 可能給小數毫秒
  assert.equal(calculateProgress(250.5, 1000), 25);  // Math.floor(25.05) = 25
  assert.equal(calculateProgress(333.999, 1000), 33);  // Math.floor(33.3999) = 33
});

test('calculateProgress 回傳整數（給 CSS width % 用）', () => {
  // CSS width: 33.4% 是合法但跳動看起來卡，整數較穩
  assert.equal(Number.isInteger(calculateProgress(333, 1000)), true);
});