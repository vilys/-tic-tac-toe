// ============================================================
// AUTO-GENERATED from game.js by build.cjs — do not edit.
// 改動 game.js 後跑 `node build.cjs` 重新產生此檔。
// ============================================================

// 井字過三關 - 純邏輯層（棋盤、勝利判定、AI 選步、計分）
// TDD 流程：先寫 game.test.js 的失敗測試，再回這裡寫最小實作

/**
 * 8 條可能的連線：3 行 + 3 欄 + 2 對角線
 * 每條線是 3 個索引的三元組
 */
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // 3 行
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // 3 欄
  [0, 4, 8], [2, 4, 6]              // 2 對角線
];

/**
 * 找出獲勝的 3 格索引（若無獲勝則回傳 null）
 * @param {string[]} board
 * @returns {[number, number, number] | null} 3 個索引的三元組
 */
function getWinningLine(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '' && board[a] === board[b] && board[b] === board[c]) {
      return [a, b, c];
    }
  }
  return null;
}

/**
 * 檢查棋盤上是否有玩家獲勝
 * @param {string[]} board - 長度為 9 的陣列，每格為 "X" | "O" | ""
 * @returns {"X" | "O" | null} 獲勝方，無勝方回傳 null
 */
function checkWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '' && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
}

/**
 * 給定已下步數，回傳下一手該誰下（PvP 模式用）
 * - moveCount 為已完成的步數（不是即將下的是第幾步）
 * - moveCount = 0 → 'X'（還沒人下，X 先手）
 * - moveCount = 1 → 'O'
 * - 依此類推輪替
 * @param {number} moveCount
 * @returns {'X'|'O'}
 */
function nextTurnPlayer(moveCount) {
  return moveCount % 2 === 0 ? 'X' : 'O';
}

/**
 * 判斷 PvE 模式下，給定玩家身份與已下步數，下一手是否為 AI 回合
 * - v6 bug fix：原本用 currentPlayer === AI 直接比 playerSide，在玩家是 O 且 AI 先下的場景會誤判
 *   （此時 currentPlayer 是 playerSide='O'，但 whoseTurn 是 'O' 表示輪到玩家，不是 AI）
 * - 正確做法：先算 whoseTurn，再比 whoseTurn 是否等於 AI 的符號
 * @param {'X'|'O'} playerSide - 玩家這局的棋子符號
 * @param {number} moveCount - 已下步數
 * @returns {boolean} true 表示下一手是 AI
 */
function isAiTurnInPvE(playerSide, moveCount) {
  const aiSym = playerSide === 'X' ? 'O' : 'X';
  return nextTurnPlayer(moveCount) === aiSym;
}

const SCORE_KEY = 'tic-tac-toe-score';
const DEFAULT_SCORE = Object.freeze({ player: 0, ai: 0, draw: 0 });

/**
 * 從 storage 讀取計分；若無資料則回傳預設值
 * @param {{getItem:Function,setItem:Function}} storage
 * @returns {{player:number, ai:number, draw:number}}
 */
function loadScore(storage) {
  const raw = storage.getItem(SCORE_KEY);
  if (raw === null) return { ...DEFAULT_SCORE };
  try {
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SCORE };
  }
}

/**
 * 將計分寫入 storage
 * @param {{player:number, ai:number, draw:number}} score
 * @param {{getItem:Function,setItem:Function}} storage
 */
function saveScore(score, storage) {
  storage.setItem(SCORE_KEY, JSON.stringify(score));
}

// ===== v7：主題選擇器持久化 =====
// 4 套合法主題。順序影響 UI 渲染順序（預設第一個）。
const VALID_THEMES = Object.freeze(['default', 'dark', 'ocean', 'sunset']);
// 主題的中文標籤（給 UI 按鈕用）。key 必須是 VALID_THEMES 之一。
const THEME_LABELS = Object.freeze({
  default: '預設',
  dark: '深色',
  ocean: '海洋',
  sunset: '日落',
});
const THEME_KEY = 'tic-tac-toe-theme';
const DEFAULT_THEME = 'default';

/**
 * 從 storage 讀取主題；若無資料或值不在白名單，回傳預設主題
 * @param {{getItem:Function,setItem:Function}} storage
 * @returns {string} 'default' | 'dark' | 'ocean' | 'sunset'
 */
function loadTheme(storage) {
  const raw = storage.getItem(THEME_KEY);
  if (raw === null) return DEFAULT_THEME;
  return VALID_THEMES.includes(raw) ? raw : DEFAULT_THEME;
}

/**
 * 將主題寫入 storage
 * @param {string} theme - 必須是 VALID_THEMES 之一
 * @param {{getItem:Function,setItem:Function}} storage
 */
function saveTheme(theme, storage) {
  if (!VALID_THEMES.includes(theme)) return;  // 防呆：拒絕非法值
  storage.setItem(THEME_KEY, theme);
}

// ===== v8：音效靜音狀態持久化 =====
// 靜音旗標用字串 "true"/"false" 存（避免 JSON.parse 對 bool 的奇怪 edge case）
const MUTE_KEY = 'tic-tac-toe-mute';

/**
 * 從 storage 讀取靜音狀態；若無資料或值不是合法 "true"/"false" 字串，回傳預設 false
 * @param {{getItem:Function,setItem:Function}} storage
 * @returns {boolean}
 */
function loadMute(storage) {
  const raw = storage.getItem(MUTE_KEY);
  if (raw === null) return false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return false;  // 任何其他值都視為「不靜音」（防呆）
}

/**
 * 將靜音狀態寫入 storage
 * @param {boolean} muted
 * @param {{getItem:Function,setItem:Function}} storage
 */
function saveMute(muted, storage) {
  storage.setItem(MUTE_KEY, muted ? 'true' : 'false');
}

// ===== v10：AI 思考進度條純函數 =====
//
// 純函數：給 elapsed 毫秒數，回傳 0-100 的整數百分比。
// UI 層把它套到 CSS width 上，或拿來更新 aria-valuenow。
// 這個 seam 是 tdd 約定好的 — 測試在 game.test.js。
//
// 邊界行為（契約）：
//   - elapsed < 0          → 0（防時鐘差）
//   - elapsed > totalMs    → 100（防超時）
//   - totalMs = 0          → 100（防 NaN，不應到但保險）
//   - 回傳整數（CSS 動畫較穩，避免 33.4% 的浮動）
/**
 * @param {number} elapsedMs - 已經過的毫秒數
 * @param {number} totalMs - 預計總毫秒數
 * @returns {number} 0-100 的整數百分比
 */
function calculateProgress(elapsedMs, totalMs) {
  if (totalMs <= 0) return 100;       // 防除以零
  if (elapsedMs <= 0) return 0;       // 防負數
  if (elapsedMs >= totalMs) return 100; // 防超時
  return Math.floor((elapsedMs / totalMs) * 100);
}

/**
 * 評估 AI 在當前 board 狀態下，每個空格的分數（給 UI 視覺化用）
 * 僅在 hard 模式呼叫，AI 自己做決策時不會用
 * @param {string[]} board
 * @param {'X'|'O'} aiSide
 * @returns {Array<{index:number, score:number}>} 只包含空格
 */
function analyzeMovesForAIBoard(board, aiSide) {
  // Cycle 3：呼叫 minimax 評估每個空格的分數
  const oppSym = aiSide === 'X' ? 'O' : 'X';
  const result = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== '') continue;
    board[i] = aiSide;
    const score = minimax(board, 0, false, aiSide, oppSym);
    board[i] = '';
    result.push({ index: i, score });
  }
  return result;
}

/**
 * 根據難度選 AI 下一步
 * @param {string[]} board - 長度為 9 的陣列，每格為 "X" | "O" | ""
 * @param {'easy'|'hard'} difficulty
 *   - 'easy': 半智能（能贏 > 阻擋對手 > 隨機）
 *   - 'hard': minimax 不可戰勝
 * @param {'X'|'O'} aiSide - AI 這局的棋子符號
 * @returns {number} 0-8 的合法索引
 */
/**
 * Minimax 評分本：對某個棋盤狀態評分（+10 AI 贏 / -10 對手贏 / 0 平）
 * 越快達到終局分數越高 / 越低（鼓勵快贏、延遲輸）
 */
function minimax(board, depth, isMaximizing, aiSym, oppSym) {
  const winner = checkWinner(board);
  if (winner === aiSym) return 10 - depth;
  if (winner === oppSym) return depth - 10;
  if (board.every(cell => cell !== '')) return 0;

  const emptyIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') emptyIndices.push(i);
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of emptyIndices) {
      board[i] = aiSym;
      const score = minimax(board, depth + 1, false, aiSym, oppSym);
      board[i] = '';
      if (score > best) best = score;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of emptyIndices) {
      board[i] = oppSym;
      const score = minimax(board, depth + 1, true, aiSym, oppSym);
      board[i] = '';
      if (score < best) best = score;
    }
    return best;
  }
}

function pickAIMove(board, difficulty, aiSide) {
  const emptyIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') emptyIndices.push(i);
  }

  // easy：能贏 → 阻擋 → 隨機
  if (difficulty === 'easy') {
    for (const [a, b, c] of LINES) {
      if (board[a] === aiSide && board[b] === aiSide && board[c] === '') return c;
      if (board[a] === aiSide && board[b] === '' && board[c] === aiSide) return b;
      if (board[a] === '' && board[b] === aiSide && board[c] === aiSide) return a;
    }
    const oppSym = aiSide === 'X' ? 'O' : 'X';
    for (const [a, b, c] of LINES) {
      if (board[a] === oppSym && board[b] === oppSym && board[c] === '') return c;
      if (board[a] === oppSym && board[b] === '' && board[c] === oppSym) return b;
      if (board[a] === '' && board[b] === oppSym && board[c] === oppSym) return a;
    }
  }

  // hard：minimax 不可戰勝（複用 analyzeMovesForAIBoard 的評分）
  if (difficulty === 'hard') {
    const analysis = analyzeMovesForAIBoard(board, aiSide);
    const bestScore = Math.max(...analysis.map(a => a.score));
    const bestMoves = analysis.filter(a => a.score === bestScore).map(a => a.index);
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // 預設 fallback，不應到這裡
  const idx = Math.floor(Math.random() * emptyIndices.length);
  return emptyIndices[idx];
}