# 井字過三關

純 vanilla JS、零依賴、雙擊 HTML 即可玩的井字過三關。AI 有「簡單」（半智能）和「困難」（minimax 不可戰勝）兩種難度。

---

## 玩法（給玩家）

1. 雙擊 `tic-tac-toe.html` 用瀏覽器打開
2. 選難度：
   - **簡單**：AI 能贏就贏，否則阻擋，否則隨機
   - **困難**：minimax 不可戰勝，最優解永遠平局
3. 點「**開始遊戲**」—— 每局 50/50 隨機決定你是 X（先手）還是 O（後手）
4. 點格子落子，或按 **數字鍵 1-9**（1 = 左上、9 = 右下）
5. 終局後按 **R** 或點「**再玩一次**」重玩
6. 計分和難度選擇會跨刷新保留（localStorage）

---

## 開發指南（給開發者）

### 環境需求

- Node.js ≥ 18（用內建 `node:test`，零 npm 套件依賴）
- 任何現代瀏覽器（Chrome、Edge、Firefox 都可）

### 命令

```powershell
# 跑單元測試（直接對 game.js，27 個測試）
cmd /c "npm test"

# 改 game.js 後重新產生 game-inline.js（瀏覽器版）
cmd /c "npm run build"

# build + test 一次跑（CI 用）
cmd /c "npm run verify"
```

> PowerShell 預設擋 npm 腳本（`UnauthorizedAccess`），用 `cmd /c` 繞過。

### 改 game.js 後的工作流

```
1. 改 game.js（或加新 export）
2. 改 game.test.js 加對應測試
3. 跑 `npm run verify`：build → 測試
4. 雙擊 HTML 瀏覽器手動驗證
```

---

## 專案結構

```
井字過三關/
├── tic-tac-toe.html    ← UI shell，HTML + CSS + JS
├── game.js             ← 純邏輯（ES module，Node 測試單一真實來源）
├── game-inline.js      ← ← build.js 自動產出，瀏覽器載入用
├── game.test.js        ← Node.js 內建 node:test，49 個邏輯測試
├── build.test.js       ← Node.js 內建 node:test，4 個 build 契約測試
├── build.js            ← 把 game.js 的 export 拿掉，產生 game-inline.js
├── package.json        ← npm scripts（build / test / verify）
└── README.md
```

### 為什麼有 `game-inline.js`？

Chrome / Edge 透過 `file://` 載入 HTML 時，CORS 規則會擋 ES module 的 `import` —— `<script type="module">` 整個失敗，所有按鈕都沒有 event handler。

解法：
- `game.js` 保留為 ES module（有 `export`），Node 測試直接 import
- `build.js` 把 `export function` 替換成 `function`，產生 `game-inline.js`
- HTML 載入 `<script src="./game-inline.js"></script>`（非 module，沒 CORS 問題）
- 函式直接變成全域，HTML 後續 `<script>` 直接使用

---

## 技術細節

### TDD 紅綠循環紀錄

按 `tdd` skill（從 mattpocock/skills 移植）走紅綠循環：先寫失敗測試，再寫最小實作讓它綠。

| Cycle | 內容 | 結果 |
|---|---|---|
| 1 | `checkWinner`：空棋盤 → null | 0/1 → 1/1 |
| 2-5 | `checkWinner`：行/欄/對角線判定 | 5/5 → 5/5 |
| 6-7 | `pickAIMove`：隨機 + 跳過已佔位 | 7/7 → 7/7 |
| 8 | `loadScore` / `saveScore`：預設值 + 來回 | 9/9 → 9/9 |
| 10 | Refactor：`pickAIMove(board, difficulty, aiSide)` 介面 | 9/9 → 9/9 |
| 11-12 | easy AI：能贏 + 阻擋 | 11/11 → 11/11 |
| 13-15 | hard AI：minimax（取贏 / 阻擋 / property test）| 14/14 → 14/14 |
| **v3** | `analyzeMovesForAIBoard`：9 項 / 只空格 / 取贏最高 / 阻擋較高 | 14/18 → 18/18 |
| **v4** | `nextTurnPlayer`：0→X / 1→O / 2→X / 8→X | 18/22 → 22/22 |
| **v5** | `getWinningLine`：空 → null / 頂列 X / 中欄 O / 對角線 / 中段無連線 | 22/27 → 27/27 |
| **v6** | `isAiTurnInPvE`：玩家 X / 玩家 O（AI 先手）兩種情境下 moveCount 與 AI 回合判定 | 27/29 → 29/29 |
| **v7** | `VALID_THEMES` / `loadTheme` / `saveTheme`：4 個合法主題 + 未知值退回預設 + 來回往返 | 29/34 → 34/34 |
| **v8** | `loadMute` / `saveMute`：空 / "true" / "false" / 奇怪值退回 false + 來回往返 | 34/39 → 39/39 |
| **v10** | `calculateProgress`：起點/中段/終點/超時/負數/total=0/小數/整數 — 8 個邊界 | 45/53 → 53/53 |

#### TDD 中的三個教訓

1. **測試不能因機率巧合通過** —— 「easy 阻擋對手」的測試一開始只跑 1 次，**剛好** 隨機選對就綠了。改成跑 20 次後變紅，才發現邏輯根本沒寫。
2. **測試不能過度指定** —— 「hard AI 空棋盤取中心」的測試在 minimax 裡 9 個位置等價（都是 draw 評分 0）。改成「中盤必勝取贏」場景，才能真正區分 easy 和 hard 的差別。
3. **測試期望值要算對** —— v4 寫 `nextTurnPlayer(8)` 期望 'O'，但 `8 % 2 === 0` 所以是 'X'，紅綠循環抓到。

### Minimax 評分

```js
function minimax(board, depth, isMaximizing, aiSym, oppSym) {
  const winner = checkWinner(board);
  if (winner === aiSym) return 10 - depth;   // AI 贏：鼓勵快贏（深度小）
  if (winner === oppSym) return depth - 10;  // AI 輸：延遲輸（深度大）
  if (board.every(c => c !== '')) return 0;  // 平局
  ...
}
```

Tie-breaking：多個同等最優解時**隨機選一個**，避免 AI 每次下同一處。

### 瀏覽器端對端驗證

20 局批量測試（瀏覽器內 hard vs hard）：**0 敗，20 平局**。證明 hard AI 真的不可戰勝。

---

## 已完成功能

- [x] 棋盤渲染、點擊落子
- [x] 鍵盤 1-9 落子、R 重玩
- [x] 勝利判定（8 條線：3 行 + 3 列 + 2 對角）
- [x] AI 簡單難度（能贏 > 阻擋 > 隨機）
- [x] AI 困難難度（minimax 不可戰勝）
- [x] 跨刷新計分持久化（localStorage）
- [x] 跨刷新難度選擇持久化
- [x] 每局隨機玩家身份（50/50）
- [x] 不同難度的 AI 思考延遲（簡單 0.5s、困難 1s）
- [x] 雙擊 HTML 即可玩（file:// 模組相容性處理）
- [x] 復盤 5 局 + minimax 評分視覺化（v3）
- [x] PvP 雙人模式（v4）
- [x] 樣式 polish：hover 半透明預覽、落子彈跳動畫、勝利線高亮（v5）
- [x] 主題選擇器：4 套配色（預設/深色/海洋/日落）切換 + localStorage 持久化（v7）
- [x] 音效：Web Audio API 合成（落子 X/O、玩家勝、AI 勝、平局）+ 🔊/🔇 切換（v8）
- [x] AI 思考進度條：hard 模式顯示「AI 分析中…」+ 0-100% 進度條，900ms 走完（v10）
- [x] 邏輯層 100% TDD 覆蓋（49 個邏輯測試 + 4 個 build 契約測試 = 53 個全綠）

---

## 未來增強清單

> **2026-10-31 規劃**：15 項新功能（v11 – v25），依「風險 × 價值」分四波。
> 每項都標註 **分支名**（GitHub Desktop 直接開 branch 就能動工）、**TDD seam**（要新增的純函式簽名）、
> **驗收標準**。照著做不必重新想設計。
>
> **動工順序**：Wave 1 → Wave 2 → Wave 3 → Wave 4。
> 其中 **v20 建議優先做** —— 它專門擋「改了 `game.js` 忘了 `npm run build`」這個最常見、也最難察覺的 bug。

### 波次總覽

| 波次 | 標題 | 項目 | 風險 | TDD |
|---|---|---|---|---|
| Wave 1 | 樣式與無障礙 | v11 – v13 | 極低 | 少量 |
| Wave 2 | 遊戲邏輯 | v14 – v19 | 低 | 全部 |
| Wave 3 | 開發者體驗 | v20 – v23 | 極低 | 少量 |
| Wave 4 | 大型功能 | v24 – v25 | 高 | 全部 |

---

### Wave 1：樣式與無障礙（純 CSS，零邏輯風險）

#### v11 — 自動深色模式（跟隨系統）｜分支 `feat/auto-dark-mode`

- **價值**：使用者沒手動選主題時，自動配合作業系統的深／淺設定
- **做法**：`VALID_THEMES` 加第 5 個值 `'auto'`；CSS 加 `[data-theme="auto"]` 區塊，
  再加一個 `@media (prefers-color-scheme: dark)` 區塊，裡面再給一份 `[data-theme="auto"]` 的深色變數
- **⚠️ CSS 優先級陷阱**：**不能**寫成 `@media (prefers-color-scheme: dark) { :root { ... } }`。
  `:root` 與 `[data-theme="dark"]` 的優先級同為 (0,1,0)，media query 裡的 `:root` 因為在檔案較後面
  會贏，導致使用者手動選的 `dark` 主題反而被系統淺色蓋掉。必須用 `[data-theme="auto"]` 當錨點
- **TDD seam**：`loadTheme` 對 `'auto'` 要**原樣回傳**（現有白名單邏輯會把它退回 `default`）→ 加 1 個測試
- **驗收**：系統切深色 → 重新整理 → 頁面跟著變深；手動選過主題 → 以手動為準（不再跟系統）
- **風險**：極低 ｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

#### v12 — 移動端優化｜分支 `feat/mobile-responsive`

- **價值**：目前整份 CSS **完全沒有 `@media` 查詢**，小螢幕上格子會被擠壓，手機點格子容易誤觸
- **做法**：
  - `@media (max-width: 480px)`：縮小外距，棋盤改 `width: min(92vw, 360px)`
  - 格子觸控目標 ≥ 44×44 px（Apple HIG 建議）
  - `env(safe-area-inset-*)` 處理 iPhone 瀏海海
  - `@media (hover: none)` 關掉 hover 預覽（觸控裝置的 hover 會「黏住」不放）
- **驗收**：375px（iPhone SE）、390px（Pixel）、1920px（桌機）三種寬度都不破版，棋盤不超過畫面寬
- **注意**：HTML 已有 `<meta name="viewport" content="width=device-width, initial-scale=1.0">`，不用動
- **風險**：極低 ｜ **改動檔案**：`tic-tac-toe.html`（純 CSS，不動 JS）

#### v13 — 鍵盤導覽與無障礙｜分支 `feat/a11y-keyboard-nav`

- **價值**：鍵盤玩家目前只能用 1–9 數字鍵落子，**無法用 Tab／方向鍵在格子間移動**；
  status 變化也沒通知螢幕閱讀器，無障礙有明顯缺口
- **做法**：
  - 棋盤容器加 `role="grid"` + `aria-label="井字棋盤"`，格子加 `role="gridcell"`
  - 方向鍵（↑↓←→）移動 focus，Enter／Space 落子，Esc 取消選取
  - `#status` 加 `aria-live="polite"`，讓「X 贏了」「AI 思考中…」被唸出來
  - focus 樣式用 `:focus-visible`，**不要**用 `:focus`（滑鼠點擊也會亮，不好看）
- **TDD seam**：無（純 DOM/CSS）；若想抽邏輯則 `nextFocusIndex(current, key)` → 0-8
- **驗收**：全程只用鍵盤可以完成一整局；螢幕閱讀器會報出每次落子與勝負
- **風險**：低 ｜ **改動檔案**：`tic-tac-toe.html`

---

### Wave 2：遊戲邏輯（每一項都有純函式 seam，100% TDD）

#### v14 — 中等難度 AI｜分支 `feat/medium-ai`

- **價值**：現在只有「簡單（半智能）」和「困難（不可戰勝）」兩級，中間沒有過渡，難度曲線是斷的
- **做法**：`pickAIMove` 加 `'medium'` 分支 —— minimax **深度限制 2 層** + 隨機失準
  （在最佳分數的候選中有 30% 機率選次佳），模擬「會犯規律性錯誤」的中階玩家
- **TDD seam**：`pickAIMove(board, 'medium', aiSide)` —— 既有簽名不變，只多一個 difficulty 值
- **測試要點**（直接套用本 README「TDD 中的三個教訓」）：
  - **不能**只跑一次就斷言（機率巧合會偽綠）→ 跑 100 次統計勝率
  - medium 必須**贏得過 easy**、**輸得過 hard**（各跑 50 局）
  - medium **不是**不可戰勝（hard 才是）→ 要找得到一個讓 medium 輸的棋譜
- **連動**：HTML 的 `VALID_DIFFICULTIES` 加 `'medium'`、`AI_THINK_DELAY_MS` 加 medium 延遲、難度按鈕加一顆
- **風險**：中 ｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

#### v15 — 悔棋｜分支 `feat/undo`

- **價值**：目前落錯子只能整局重來，沒有悔棋
- **做法**：
  - PvE：一次退回**兩步**（玩家一步 + AI 一步），回到自己回合
  - PvP：一次退回**一步**
  - AI 還在思考時按悔棋 → 先取消 AI 的 `setTimeout`／rAF，避免「幽靈落子」
- **TDD seam**：`rewindHistory(history, steps)` → 回傳 `history.slice(0, history.length - steps)`
- **測試要點**：steps=0 → 原樣回傳；steps 大於長度 → 空陣列；不產生負長度切片
- **風險**：低 ｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

#### v16 — 開局偏好（固定 X／固定 O／隨機）｜分支 `feat/player-side-preference`

- **價值**：現在每局 50/50 隨機決定你是 X 還是 O，連續玩時會被隨機噁到；
  進階玩家想固定先手來練開局
- **做法**：`playerSide` 從「每局隨機」改成「玩家選擇 + 隨機預設」，加一個下拉選單
- **TDD seam**：`loadPlayerSide(storage)` / `savePlayerSide(side, storage)`，
  白名單 `['random', 'X', 'O']`，非法值退回 `'random'`（沿用 `loadTheme` 的防呆寫法）
- **連動**：開局時若為 `'random'` 仍走現有的 50/50 邏輯，行為不變
- **風險**：低 ｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

#### v17 — 分難度計分 + 勝率儀表板｜分支 `feat/stats-dashboard`

- **價值**：現在計分只有「我／AI／平手」三欄，贏了 10 局簡單和贏了 10 局困難混在一起，看不出自己的成長
- **做法**：
  - 計分結構改為巢狀：`{ easy: {player, ai, draw}, hard: {...} }`
  - **⚠️ 相容性**：`loadScore` 讀到舊格式（沒有 `easy`／`hard` 鍵）時要**自動升級**成新格式，
    否則老玩家的 localStorage 計分會整個消失
  - 儀表板：每個難度一行，顯示勝／敗／平手數與勝率百分比橫條
- **TDD seam**：
  - `loadScore` 對舊格式 → 自動升級（加測試）
  - `computeStats(games)` → 純函式，算出 `{wins, losses, draws, winRate}`
- **風險**：中（碰到 localStorage 格式遷移）｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

#### v18 — 完整對局紀錄｜分支 `feat/game-history`

- **價值**：現在只存**最近 5 局**復盤紀錄（`MAX_REPLAYS = 5`），而且只存 hard 難度。
  玩了一堆局之後想回顧就沒得回顧
- **做法**：紀錄擴到 50 局、涵蓋所有難度與 PvP；
  每局記 `{difficulty, mode, playerSide, history, winner, timestamp}`
- **TDD seam**：`appendGame(game, list, max)` → 純函式，負責裁切到上限
- **連動**：復盤面板的過濾條件從「只有 hard 才顯示復盤按鈕」放寬成所有難度
- **風險**：中（localStorage 容量；50 局約幾十 KB，離 5MB 上限還很遠）
  ｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

#### v19 — 開局勝率熱區圖｜分支 `feat/opening-heatmap`

- **價值**：這是本專案「復盤／學習」定位的延伸 —— 直接在空格上標出「站在這裡的勝率」，
  把 minimax 的想法視覺化給人看
- **做法**：
  - 內建 `OPENING_WIN_RATES` 靜態表（9 個位置在 X 先手時的勝率），不跑 minimax → 效能零負擔
  - 空格上淡淡地印上百分比，滑過／點擊時加深
  - 可選進階版：改用現成的 `analyzeMovesForAIBoard` 做即時評分交叉驗證
- **TDD seam**：`getOpeningHint(board)` → 回傳每個空格的建議（純函式）
- **注意**：勝率數字要標明是「X 先手時」的數據，別讓人誤解
- **風險**：低 ｜ **改動檔案**：`game.js`、`game.test.js`、`tic-tac-toe.html`

---

### Wave 3：開發者體驗（保護「雙擊即可玩」這條紅線）

#### v20 — game-inline.js 同步契約測試｜分支 `feat/build-sync-test` ⭐ 建議優先

- **價值**：**這是全專案最容易中招的 bug 來源**。改了 `game.js` 忘了跑 `npm run build`，
  測試全綠、瀏覽器跑的卻是舊程式碼，而且完全沒有任何提示
- **做法**：
  1. 把 `build.cjs` 裡的轉換邏輯抽成可匯出的函式：`module.exports = { transform }`
  2. `build.test.js` 加一個測試：`transform(readFileSync('game.js'))` 的結果 === `game-inline.js` 的內容
  3. 不同步就讓測試紅，並在錯誤訊息直接印出「跑 `npm run build`」
- **TDD seam**：無新邏輯，但 `transform(content)` 本身要能被獨立測試
- **⚠️ 注意**：`build.cjs` 是 CommonJS（副檔名 `.cjs`），專案是 `"type": "module"`。
  `build.test.js` 是 ESM，要 `import { transform } from './build.cjs'` ——
  Node 靠 cjs-module-lexer 偵測具名匯出，所以 `module.exports = { transform }` 這種寫法取得到具名匯出
- **驗收**：手動改壞 `game-inline.js` → `npm test` 紅 → 跑 `npm run build` → 綠
- **風險**：極低 ｜ **改動檔案**：`build.cjs`、`build.test.js`

#### v21 — Watch mode｜分支 `feat/watch-mode`

- **價值**：現在每改一次 `game.js` 都要手動跑 `cmd /c "npm run build"`，忘了就出事
- **做法**：`npm run dev` → `node --watch build.cjs`。**Node 18+ 內建 `--watch`，零依賴**，
  不需要舊版 README 寫的 `filewatcher`／`nodemon`
- **TDD seam**：無
- **驗收**：開著 `npm run dev` 存檔 `game.js` → `game-inline.js` 自動更新 → 重整瀏覽器即見
- **風險**：極低 ｜ **改動檔案**：`package.json`、`README.md`

#### v22 — CI / GitHub Actions｜分支 `feat/github-actions-ci`

- **價值**：專案已經推到 GitHub 了，CI 是接下來最自然的投資 —— push 就自動驗證所有測試
- **做法**：新增 `.github/workflows/ci.yml`，在 push / PR 時跑 `npm run verify`（Node 20）
- **TDD seam**：無
- **驗收**：GitHub 頁面 Actions 分頁顯示綠燈；故意推一個壞掉的 commit 應該紅
- **風險**：極低 ｜ **改動檔案**：`.github/workflows/ci.yml`

#### v23 — Git pre-commit hook｜分支 `feat/precommit-hook`

- **價值**：在 commit 之前就擋下壞掉的邏輯，不讓它進到 main
- **做法**：加 `scripts/install-hooks.js`（用 Node 寫 `.git/hooks/pre-commit`，內容呼叫 `npm run verify`），
  避免用 shell 腳本造成 Windows 相容性問題
- **TDD seam**：無
- **⚠️ 注意**：GitHub Desktop 內建的 Git 也讀同一份 `.git/hooks/`，所以這個 hook 對 GUI 提交同樣有效
- **風險**：極低 ｜ **改動檔案**：`scripts/install-hooks.js`、`package.json`

---

### Wave 4：大型功能（動工前先 grilling）

#### v24 — 線上 PvP｜分支 `feat/online-pvp`

- **價值**：README 原本列的「多人類」項目 —— 跟朋友連線對弈
- **做法**：WebRTC DataChannel 做 P2P，透過手動交換 offer／answer（不需要 signaling server）
- **TDD seam**：`serializeState` / `applyRemoteState` —— 網路傳輸前的狀態編解碼純函式要先測
- **⚠️ 風險最高**：跨瀏覽器相容性、斷線重連、同步競態。
  **必須先 grilling 確定範圍**，再決定要不要退化成「回合制信件式對弈」（純文字、不共時）這種簡單版
- **前置**：v13（鍵盤／DOM 焦點）與 v16（模式切換）的架構要先穩

#### v25 — 動態難度調整｜分支 `feat/adaptive-difficulty`

- **價值**：玩家連勝時自動升級、連敗時降級，讓難度貼合玩家實力
- **做法**：以最近 N 局的勝率為準，跨越門檻就切換難度
- **TDD seam**：`suggestDifficulty(recentResults, currentDifficulty)` → 回傳 `'easy' | 'medium' | 'hard'`
- **⚠️ 設計陷阱**：調整太頻繁會讓玩家挫折（「我明明贏了卻變難了」）。
  需要明確規則：**連續 3 勝才升級、連續 3 敗才降級**，且調整時要明確提示玩家
- **前置**：v14（medium 難度）與 v18（對局紀錄）要先完成，否則沒有 medium 可調、沒有紀錄可分析

---

### 舊待辦 → 新路線圖 映射

原清單的 18 項待辦，現在對應到上面：

| 舊編號 | 項目 | 新位置 |
|---|---|---|
| 1 | 深色模式（`prefers-color-scheme`） | → **v11** |
| 2 | 主題選擇器 | ✅ v7 已完成 |
| 3 | 移動端優化 | → **v12** |
| 4 | AI 思考進度條 | ✅ v10 已完成 |
| 5 | 半智能進階版 | → **v14**（正式命名為 medium 難度） |
| 6 | 動態難度調整 | → **v25** |
| 7 | 線上 PvP | → **v24** |
| 8 | 音效 | ✅ v8 已完成 |
| 9 | 鍵盤快捷鍵擴充 | → **v13**（併入無障礙） |
| 10 | AI 重新計時器 | → 併入 **v19**／v10 進度條的延伸 |
| 11 | 按難度分開計分 | → **v17** |
| 12 | 勝率儀表板 | → **v17**（同批做） |
| 13 | Watch mode | → **v21**（改用內建 `--watch`） |
| 14 | 瀏覽器 console 暴露 minimax | → 併入 **v19**（熱區圖的 debug 開關） |
| 15 | Git pre-commit hook | → **v23** |
| 16 | CI / GitHub Actions | → **v22** |
| 17 | 自動同步 game-inline.js | → **v20**（用契約測試取代 watcher） |
| 18 | 多 build target | → 暫緩（v24 若需要再說） |

### 已完成的增強（從這個清單移走）

- ✅ 樣式 polish（v5）
- ✅ minimax 視覺化（v3）
- ✅ 復盤按鈕（v3）
- ✅ PvP 雙人模式（v4）
- ✅ 主題選擇器（v7）
- ✅ 音效（v8）
- ✅ AI 思考進度條（v10）

---

## 附錄：下次接手指南（休息後重新開始）

### 30 秒上手

- **玩遊戲**：雙擊 `tic-tac-toe.html` 用瀏覽器打開
- **確認專案還活著**：
  ```powershell
  cd 'C:\Users\user\Documents\test\井字過三關'
  cmd /c "npm run verify"
  ```
  應該看到 `tests 27, pass 27, fail 0`

### 新對話如何接續

開新對話時，Copilot 會自動載入 session memory（`/memories/session/tic-tac-toe-project.md`），你只要說：

> 「接續井字過三關專案（v3 已完成），想做 X」

Copilot 就能從上次中斷的地方接。

### 當前真實狀態（v5 已交付）

| 項目 | 狀態 |
|---|---|
| 邏輯測試 | ✅ 53/53（49 邏輯 + 4 build） |
| 雙擊 HTML | ✅ 可玩（所有按鈕正常）|
| PvE 單人（簡單/困難）| ✅ 含 minimax 不可戰勝 + minimax 視覺化 |
| PvP 雙人 | ✅ 第一個點 = X，不計分，可復盤 |
| 樣式 polish | ✅ hover 預覽、落子動畫、勝利線高亮 |
| 主題選擇器 | ✅ 4 套配色 + localStorage 持久化 |
| 音效 | ✅ 落子 X/O + 3 種終局旋律 + 🔊/🔇 切換 |
| AI 思考進度條 | ✅ hard 模式 rAF 動畫（v10） |
| v11 – v25 路線圖 | 📋 15 項待做，分四波 —— 見上方「未來增強清單」 |
| 已安裝的 skill | [`.github/skills/`](../../.github/skills/) 7 個（移植自 mattpocock/skills）|

### 開發流程提醒

1. **改 `game.js`** → 跑 `cmd /c "npm run build"` → 重新整理瀏覽器
2. **加新功能** → 先 `grilling`（skill 自動觸發）→ 再 TDD → 端對端測試
3. **修 bug** → 用 `diagnosing-bugs` skill 的紅綠假設循環
4. **永遠不能破壞**：雙擊 HTML 即可玩（file:// 載入限制）

### Branch 開發流程（v11+ 新功能）

1. **切出分支**：GitHub Desktop → `Branch` → `New branch`，用路線圖上寫好的分支名
   （例：`feat/medium-ai`、`feat/mobile-responsive`）
2. **在分支上開發**：改 `game.js` → 改 `game.test.js` → `cmd /c "npm run verify"`
3. **Commit + Push**：輸入 commit message → `Commit to <分支名>` → `Publish branch`
4. **合併**：到 GitHub 開 Pull Request → 合併回 `main` → 刪掉功能分支
5. **`main` 永遠保持「雙擊就玩」的穩定版**；要玩新功能就 checkout 對應分支

> 單一資料夾的雙擊行為，永遠對應「目前 checkout 的分支」——
> 切回 `main` 玩穩定版，切到 `feat/xxx` 玩新功能版。

### 環境快速複習

- Node.js 24.19.0 在 `C:\Program Files\nodejs\`（透過 winget 安裝）
- PowerShell 預設擋 npm 腳本（UnauthorizedAccess），用 `cmd /c "..."` 繞過
- 瀏覽器內嵌 Chromium（Playwright 提供），file:// 載入 ES module 會被擋 → 這就是為什麼需要 `build.cjs`
- 參考用的 mattpocock/skills 原始碼在 `.matt-pocock-skills-source/`（zip 解壓）

### 推薦的下一步

**第一個 feature branch 建議做 v20（`feat/build-sync-test`）** —— 它是純邏輯層的小改動，
但能從此根除「改了 `game.js` 忘了 `npm run build`」這個專案最常見的坑，而且做完之後
v11 – v19 每一項新功能都會受惠。

想先看得到效果的就做 **v12（`feat/mobile-responsive`）** —— 純 CSS 媒體查詢，不動任何 JS 邏輯，
風險最低，而且現在這份 CSS 連一條 `@media` 都沒有。

完整 15 項的路線圖、分支名與 TDD seam 都在上方「**未來增強清單**」。

---

## 致謝

- **mattpocock/skills** — `tdd`、`grilling`、`codebase-design` 等 skill 的原版
- **VS Code Copilot + 移植的 skill 系統**（`.github/skills/`）—— 自動觸發 TDD / grilling 紀律
- **`grilling` skill** —— v1～v10 所有設計決策都是用它 pressure-test 出來的（用戶明確確認才動工）
- **`tdd` skill** —— 全部 53 個測試按紅綠循環寫出來
- **`codebase-design` skill** —— `game.js` 重構時的「深模塊 vs 淺模塊」原則
- **`writing-for-agents` skill** —— 這份 README 的格式參考了它的描述撰寫原則

---

## 開發紀律（給未來的自己）

1. **不重複程式碼**：`game.js` 是邏輯唯一來源，瀏覽器版由 build.js 自動產生
2. **測試不繞過**：測試失敗要能定位回 bug，不能因機率或過度指定而偽綠
3. **grilling 先於實作**：v1 與 v2 都先 grilling 確定設計 tree，再 TDD 實作
4. **每個功能都要有驗證**：logic tests + 瀏覽器端對端兩條腿