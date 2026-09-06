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

### 樣式類（純視覺，低風險）

1. **深色模式** —— 依 `prefers-color-scheme` 自動切換
2. **主題選擇器** —— ✅ v7 已完成
3. **移動端優化** —— 觸控體驗、小螢幕佈局

### AI / 遊戲邏輯類（需 TDD）

4. **AI 思考進度條** —— ✅ v10 已完成（hard 模式 + rAF + 900ms）
5. **半智能進階版** —— 限制 minimax 深度或加隨機度，模擬「中等」人類錯
6. **動態難度調整** —— 根據玩家勝率自動升降難度

### 多人類

7. **線上 PvP** —— WebRTC 或簡單 server relay

### 互動體驗

8. **音效** —— ✅ v8 已完成（落子 X/O、玩家勝、AI 勝、平局 + 靜音切換）
9. **鍵盤快捷鍵擴充** —— 例如方向鍵移動 selector、Enter 確認、Esc 取消
10. **AI 重新計時器** —— 困難 AI 思考時顯示「AI 想了 X 秒」（v3 已有部分但可精進；v10 進度條外加）

### 復盤 / 學習

11. **按難度分開計分** —— 簡單勝 / 困難勝 各計一欄
12. **勝率儀表板** —— 圖表顯示玩家在不同難度下的勝率趨勢

### 開發者體驗

13. **Watch mode** —— `node --watch build.cjs`，game.js 一存檔就自動 rebuild
14. **瀏覽器 console 暴露 minimax** —— 方便進階玩家從 console 學習 AI 思路
15. **Git pre-commit hook** —— commit 前自動跑 `npm run verify`
16. **CI / GitHub Actions** —— push 時自動跑 53 個測試

### 架構改進

17. **自動同步 game-inline.js** —— 用 `filewatcher` 或 `nodemon` 取代手動跑 build
18. **多 build target** —— 如果未來加 SSR / Web Worker 版本，擴充 build.cjs 支援

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
| 18 項未來增強清單（3 完成、15 待做） | 見上方「未來增強清單」 |
| 已安裝的 skill | [`.github/skills/`](../../.github/skills/) 7 個（移植自 mattpocock/skills）|

### 開發流程提醒

1. **改 `game.js`** → 跑 `cmd /c "npm run build"` → 重新整理瀏覽器
2. **加新功能** → 先 `grilling`（skill 自動觸發）→ 再 TDD → 端對端測試
3. **修 bug** → 用 `diagnosing-bugs` skill 的紅綠假設循環
4. **永遠不能破壞**：雙擊 HTML 即可玩（file:// 載入限制）

### 環境快速複習

- Node.js 24.19.0 在 `C:\Program Files\nodejs\`（透過 winget 安裝）
- PowerShell 預設擋 npm 腳本（UnauthorizedAccess），用 `cmd /c "..."` 繞過
- 瀏覽器內嵌 Chromium（Playwright 提供），file:// 載入 ES module 會被擋 → 這就是為什麼需要 `build.cjs`
- 參考用的 mattpocock/skills 原始碼在 `.matt-pocock-skills-source/`（zip 解壓）

### 推薦的下一步

最簡單的增強：**移動端優化**（純 CSS 媒體查詢，不影響邏輯）或**深色模式**（純 CSS + `prefers-color-scheme`，零 JS）。

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