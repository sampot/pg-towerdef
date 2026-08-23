# 迷你塔防（`pg-towerdef`）— 遊戲規劃文檔

> **用途：** 本 repo 的遊戲權威規格——coding agent 改動前必讀：這個遊戲是什麼、規則、設計限制、優化方向。
> **整理方式：** 從本 repo 實作反向整理（2026-08-23）。**改玩法先改此檔再改碼**；本檔與程式碼衝突時，以「規則（§3）」描述的設計意圖為準回報差異。
> **上游契約：** [PG-GAME-AGENT-GUIDE.md](https://github.com/sampot/playgrounds/blob/main/docs/PG-GAME-AGENT-GUIDE.md)（唯一必讀；本檔不重複其全文）· 型錄條目 `playgrounds/catalog/entries/pg-towerdef.yaml`

## 1. 一句話

360×520 直向迷你塔防：三塔三圖三難度，15 波戰役按剩餘生命給星等、無盡模式無限爬波、八項成就與新手引導；致敬塔防類型，非任一商業作品復刻。

## 2. 定案速覽

| 項 | 值 |
| --- | --- |
| catalog id / kind / series | `pg-towerdef` / `game` / `街機` |
| status | `listed`（型錄已上架；「戰役星等、無盡模式」經讀碼屬實，見 §3.5/§3.6） |
| 模式 | 戰役 campaign（15 波）／無盡 endless（無上限）；地圖 3 張逐關解鎖；難度 easy/normal/hard |
| 塔種 | 箭塔（快單體）/炮塔（慢範圍爆炸）/冰塔（減速 50%）各 **5 級**升級＋六折賣回 |
| 敵種 | 斥候/士兵/重甲（18% 護甲）/蟲群/**首領**（22% 護甲）；每 5 波頭目場 |
| 經濟 | 開局金幣 120–180、生命 15–25（隨難度）；殺敵賞金隨波 +4%/波 |
| 素材 | 全程序繪製（canvas sprites）＋WebAudio 合成音效（自製，無取樣檔）；無 assets/ 目錄 |
| 交付形 | 純 HTML＋CSS＋ESM JS；無 build；**零測試**（見 §7） |

## 3. 完整規則（現行實作）

### 3.1 建造與塔資料（實際值）

| 塔 | 造價 | 射程 | 冷卻 | 傷害 | 特性 |
| --- | --- | --- | --- | --- | --- |
| 箭塔 arrow | 55 | 100 | 0.38s | 14 | 單體點殺 |
| 冰塔 frost | 75 | 84 | 0.62s | 10 | 命中緩速 **50% 持續 1.5s**（實際移速 ×0.42） |
| 炮塔 cannon | 95 | 88 | 1.05s | 32 | 濺射半徑 40、邊緣衰減至 55% |

- 升級：費用 `cost×(0.65+level×0.55)` 四捨五入；滿級 **5**。每級：射程 +7%、冷卻 −10%（即射速提升）、傷害 **+38%**、濺射 +12%。賣回＝總投入 ×**0.6**。
- 固定塔位（pads）：蜿蜒谷 16 座／十字關 14／螺旋堡 14；點空位建造、點已建塔選取後可升級/賣掉。目標優先可切 first（最前）/strong（最血）/close（最近），全場共用。

### 3.2 敵人與洩漏

| 型別 | HP | 速度 | 賞金 | 半徑 | 護甲 |
| --- | --- | --- | --- | --- | --- |
| 斥候 scout | 28 | 62 | 5 | 7 | 0 |
| 士兵 grunt | 55 | 42 | 8 | 9 | 0 |
| 重甲 brute | 140 | 28 | 16 | 12 | 18% |
| 蟲群 swarm | 18 | 55 | 3 | 5.5 | 0 |
| 首領 boss | 520 | 24 | 60 | 16 | 22% |

- 護甲直接乘法減傷（dmg×(1−armor)）；投射物追蹤導引（箭 320/s、炮彈 240/s）、命中半徑 r+5、壽命 0.85s。
- 洩漏扣命：boss 扣 **3**♥、brute 扣 **2**♥、其餘 1♥；命歸零即敗。

### 3.3 波次組成（`wavePlan` 實際值，決定性）

- 全域係數：HP `難度×(1+(wave−1)×0.12)`、速度 `難度×(1+min(0.35,(wave−1)×0.02))`；難度 HP easy 0.75/hard 1.35、速度 easy 0.9/hard 1.12。
- 每 **5** 波（頭目場）：grunt 4+⌊wave/3⌋ → brute 2+⌊wave/5⌋ → boss ×1；
- 每 **3** 波：scout 5+wave → swarm 8+wave → grunt 3+⌊wave/2⌋（蟲海）；
- 每 **2** 波：grunt 6+wave → brute 1+⌊wave/4⌋ → scout ×3；
- 奇數波：grunt 5+wave → scout 2+⌊wave/2⌋。同組內依 gap 逐隻入場（0.18–1.2s 不等）。

### 3.4 經濟與節奏

- 開局：easy 金 180/命 25、normal 150/20、hard 120/15。殺敵得賞金 `base×(1+wave×0.04)`；清波獎金 `25+wave×6`。
- 連殺 combo：擊殺累加、洩漏歸零；分數＝`reward×2+min(20,combo)`；通關另加剩餘生命 ×15。
- 操作輔助：×1/×2/×3 倍速、「自動波」開啟後清波 0.85s 自動開下一波、暫停覆蓋層。

### 3.5 戰役星等（型錄標注經讀碼驗證屬實）

- 15 波打完即勝；星等按剩餘生命比：≥80% 三星、≥45% 兩星、其餘一星（`calcStars`）。星等以 `mapId:diff` 為 key 取歷史最高。
- 通關戰役解鎖下一張地圖（serpentine→crossroads→spiral；serpentine 初始解鎖）。

### 3.6 成就（8 項，`meta.js` ACHIEVEMENTS）

初陣告捷（首次通關）、完美防線（任一三星）、三關大師（三圖皆至少一星）、連殺達人（單場 combo ≥20）、鐵壁（困難通關）、無盡十波（endless 撐到第 10 波）、滿級火力（任一塔升到 5 級）、百敵斬（累計擊殺 100）。成就面板頁內切換、✓ 標示已解鎖。

### 3.7 新手引導與邊界處理

- 首次遊玩顯示步進教學浮層（TUTORIAL 步驟陣列，「下一步/跳過」皆記 seenTutorial）。
- 非法操作原樣拒絕並回原因（notplaying/bad/gold/max），UI 以狀態列提示「金幣不足」等；暫停時建設/出波全部封鎖。
- dt 夾 0.05s；倍速只乘在模擬 dt 上。`functions.js` 為 stub（KV 由宿主代理）。

## 4. 操作與畫面

| 輸入 | 動作 |
| --- | --- |
| 點底部塔種 → 點空地基座 | 建造（26px 抓取半徑） |
| 點已建塔 | 選取 → 升級／賣掉 |
| 下一波鈕 | 手動開波（自動波開啟則免） |
| ×1/×2/×3 | 遊戲倍速 |
| 優先鈕 | 最前/最血/最近循環 |
| 暫停鈕／點擊覆蓋層 | 暫停/繼續 |
| 音效鈕 | 開/關 |

- HUD：金幣、生命 ♥、分數、波次、最高分、狀態列訊息；地圖選擇 chips 帶星等顯示與鎖定態。
- 渲染 Canvas 2D 全程序繪製（路徑/基座/塔身旋轉砲管/敵人血條/投射物/粒子爆點/震屏/浮動傷害字）。Mobile-first 直向單欄；禁 `alert`／`confirm`／`prompt`。

## 5. 持久化（KV 權威）

| key | 內容 | 讀寫時機 |
| --- | --- | --- |
| `/api/kv/pg-towerdef-meta-v1`（`meta.js KEY`） | Meta JSON：`{ best, totalKills, stars{map:diff}, unlocked[], achievements[], seenTutorial }` | 每場結束 saveMeta() PUT；載入時 mergeMetaFromKv() GET 與本地合併（max/聯集） |
| localStorage `pg-towerdef-meta-v1` | 同上 JSON 的**本地快取** | loadMeta/saveMeta 讀寫 |
| localStorage `pg-towerdef-best`（`game.js loadBest/saveBest`） | 歷史最高分（字串數字） | 結束時比較寫入 |

- **異常（如實記錄）**：①`game.js` 的 best 分數**只寫 localStorage、完全沒有 KV 回寫**——跨裝置會丟；②meta 的 LS 是快取、KV 為權威的架構已寫對（saveMeta 同步 PUT `/api/kv/pg-towerdef-meta-v1`），但 best 未併入同一份 meta，兩處最高分可能不一致。建議把 best 收進 Meta 一併走 KV，key 已帶 `pg-towerdef-` 前綴（合格）。
- functions.js 是 stub；KV 由宿主 `/api/kv/*` 代理，離線時 LS 快取仍可玩。

## 6. 美術／音效／署名

- **無外部素材**：地形、塔、敵人、投射物全由 `sprites.js` canvas 程序繪製；音效由 `audio.js` WebAudio 振盪器合成（place/shoot×3/hit/boom/kill/leak/wave/win/lose/click，master 0.24）——即型錄所稱「自製音效」。無 `assets/` 目錄、無 ATTRIBUTION.md（目前也不需要；若引入任何外部素材，須新增 assets/＋ATTRIBUTION.md 並同步 manifest）。
- 程序繪製與合成音效的改動不需署名流程，但新增字型/圖庫/取樣一律照專案慣例署名（CC0 也署名）。

## 7. 測試

**零測試**（repo 無任何 test 檔、無 vitest config）。最小必測建議（動手前先補）：①`wavePlan` 波次組成的決定性斷言（5/3/2/奇數波分支、難度係數、HP/速度成長上限）；②`towerStats` 升級曲線（射程/冷卻/傷害公式與滿級值）；③`calcStars` 三段門檻（0.8/0.45 邊界）；④build/upgrade/sell 的金幣守恆與拒絕矩陣；⑤洩漏扣命差別（boss 3/brute 2/其他 1）與敗北條件；⑥`mergeMetaFromKv` 合併語意（max/聯集/tutorial or）；⑦地圖解鎖鏈。

## 8. 硬約束（不可違反）

1. 僅 HTML＋CSS＋JS（ESM）；**無 build**、不入庫 `node_modules`、不安套件；工具一律 `npx <pkg>` 臨時執行。
2. 禁瀏覽器原生 `alert`／`confirm`／`prompt`；提示一律狀態列與頁內面板（暫停/教學/成就皆是 overlay）。
3. Mobile-first：直向 360×520、觸控點選可用即玩，主操作不可 hover-only。
4. 分數/進度以 `/api/kv/{key}` 為權威、LS 只准當快取（meta.js 已是此架構；game.js 的 best 為已知違例，見 §5——修復時不得再新增裸 LS 權威）。
5. 不自行載入 `sdk.js`；宿主注入 `window.PG`。
6. 改動可執行邏輯前先寫失敗測試（TDD）——本 repo 目前零測試，動到哪塊就先補 §7 對應最小測試。
7. 檔案清單變動須同步 `sam-manifest.json`。
8. 音效維持 WebAudio 合成、畫面維持程序繪製；引入外部素材須同步 ATTRIBUTION 流程（§6）。

## 9. 優化建議（可玩性與樂趣）

依優先級；實作前先在此登記並補測試。原則：強化塔種搭配與波間決策，不改變「固定塔位選址防守」的核心認同。

**高優先**

1. **best 分數收編進 KV Meta**：§5 所述違例修正——best 併入 `pg-towerdef-meta-v1`（mergeMetaFromKv 已有 max 合併可直接沿用），刪除 game.js 裸 LS 路徑；這是上架品質問題而非新功能。
2. **第四塔種（毒/電）**：只有三塔且定位重疊度低但深度有限；加中毒 DoT 或連鎖閃電塔（各自獨立彈道邏輯），讓「冰+炮」之外有第三種成型組合。
3. **核心測試補課**：§7 清單落地——wavePlan/stars/經濟是所有平衡調整的地基，8 條最小測試即可覆蓋主要回歸風險。

**中優先**

4. **塔專精分支**：5 級滿級後二選一分支（箭塔→穿甲或連射；炮塔→大範圍或燃燒地面），讓滿級投資有流派差異。
5. **無盡模式強化**：現在只是波次不封頂；加每 10 波遞增的環境 debuff（護甲+5%、速度+5%）與里程碑獎勵介面，撐波數的成就感更明確。
6. **戰績細化**：totalKills 已存；加各圖最佳波數（endless）與使用塔種統計進 Meta，成就面板旁多一頁生涯摘要。

**低優先**

7. **BGM**：只有合成音效；一段極簡循環墊底（WebAudio 序列器即可）能明顯改善長局氛圍。
8. **傷害統計面板**：塔已有 kills 欄位（app 以近似法歸功）；做成點塔看「本塔輸出/擊殺」小卡，幫助玩家判斷賣塔重建時機。
