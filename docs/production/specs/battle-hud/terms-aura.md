# 光環欄名詞（名詞表 v0.6.36，數值設計師 2026-11-20）

- 精魂 / Spirit；tooltip 行「{名}・預留精魂 {sp}」/ "{Name} · Reserves {sp} Spirit"；動詞一律「預留」不用「保留」
- 總量行（若畫）：「精魂 {used}／{max}」/ "Spirit {used}/{max}"
- {sp} = Math.ceil(實際預留量)（items.js:1087–1091）；used = ceil(各光環實際值總和)，max = floor；不寫小數、不寫 %
- 光環欄最多顯示 7 格；超過 7 個時，畫前 6 個，第 7 格顯示半形「+{k}」，k = auraOn.length − 6（只算生效中的）
- 未生效光環不畫；沒有光環生效時整組不畫
- 讀屏「還有 {k} 個光環」/ "{k} more auras"
- 舊寫法（第 3 格顯示「+{k}」、k = auraOn.length − 2）已作廢
- 玩家字串「保留」待改：data.js:116、data.js:2047–2048（數值設計師列入名詞表）
