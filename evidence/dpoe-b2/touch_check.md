# touch_check 六尺寸（HEAD 2e5533e，本機 http.server）

```
390x844 ✅150 ❌5 exit=1
1280x720 ✅64 ❌5 exit=1
667x375 ✅63 ❌6 exit=1
844x390 ✅64 ❌5 exit=1
375x667 ✅150 ❌5 exit=1
1440x900 ✅64 ❌5 exit=1
```

main 98567a4 同一套（舊版 touch_check，沒有 D2-07 掃描）：
```
390x844 ✅148 ❌0 exit=0
1280x720 ✅62 ❌0 exit=0
667x375 ✅61 ❌1 exit=1
844x390 ✅62 ❌0 exit=0
375x667 ✅148 ❌0 exit=0
1440x900 ✅62 ❌0 exit=0
```

## 全部 ❌（D2-07 = PF-D2-6 元素清單）

### tc_1280x720
- ❌ D2-07 熱區（戰場）：2 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button「倉庫」↔button「選單」 間距 6
- ❌ D2-07 熱區（面板 inv）：19 個可點的東西 ≥44／32、間距 ≥8、不重疊 26 筆：button「角色」 46×32、button.on「倉庫」 46×32、button.chip「全部」 34×40、button.chip「武器」 34×40、button.chip「防具」 34×40、button.chip「飾品」 34×40、button.chip「護符」 34×40、button.chip「換排序」 43×40、div.it「細杖」 36×36、div.it「爪」 36×36、div.it「琉璃戒」 36×36、div.it「青金墜」 36×36、div.it「匕首」 36×36、div.it「骨法杖」 36×36、div.it「太刀」 36×36、div.it「小圓盾」 36×36、div.it「綠松墜」 36×36、button.chip「全部」↔div.it「匕首」 間距 5、button.chip「武器」↔div.it「骨法杖」 間距 5、button.chip「防具」↔div.it「骨法杖」 間距 5、button.chip「防具」↔div.it「太刀」 間距 5、button.chip「飾品」↔div.it「太刀」 間距 5、button.chip「飾品」↔div.it「小圓盾」 間距 5、button.chip「護符」↔div.it「小圓盾」 間距 5、button.chip「護符」↔div.it「綠松墜」 間距 5、button.chip「換排序」↔div.it「綠松墜」 間距 5
- ❌ D2-07 熱區（面板 skill）：15 個可點的東西 ≥44／32、間距 ≥8、不重疊 3 筆：button「倉庫」↔button「選單」 間距 6、button.skr-main「冰霜彈Lv 1 」↔button.skr-up「缺靈魂 2」 間距 4、button.skr-main「電弧Lv 1 ·」↔button.skr-up「缺靈魂 2」 間距 4
- ❌ D2-07 熱區（面板 craft）：10 個可點的東西 ≥44／32、間距 ≥8、不重疊 3 筆：button「倉庫」↔button「選單」 間距 6、button.chip「×1」↔button.chip「×10」 間距 6、button.chip「×10」↔button.chip「最大」 間距 6
- ❌ D2-07 熱區（面板 more）：13 個可點的東西 ≥44／32、間距 ≥8、不重疊 4 筆：button.stc「流血」 32×32、button.stc「緩速藤蔓」 32×32、button.stc「流血」↔button.stc「緩速藤蔓」 間距 4、button「倉庫」↔button「選單」 間距 6

### tc_1440x900
- ❌ D2-07 熱區（戰場）：2 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button「倉庫」↔button「選單」 間距 6
- ❌ D2-07 熱區（面板 inv）：19 個可點的東西 ≥44／32、間距 ≥8、不重疊 26 筆：button「角色」 46×32、button.on「倉庫」 46×32、button.chip「全部」 34×40、button.chip「武器」 34×40、button.chip「防具」 34×40、button.chip「飾品」 34×40、button.chip「護符」 34×40、button.chip「換排序」 43×40、div.it「木魔符」 39×39、div.it「繩帶」 39×39、div.it「符文法珠」 39×39、div.it「藍玉戒」 39×39、div.it「匕首」 39×39、div.it「玉珮」 39×39、div.it「骨法杖」 39×39、div.it「紙面」 39×39、div.it「法鈴」 39×39、button.chip「全部」↔div.it「匕首」 間距 5、button.chip「全部」↔div.it「玉珮」 間距 5、button.chip「武器」↔div.it「玉珮」 間距 5、button.chip「武器」↔div.it「骨法杖」 間距 5、button.chip「防具」↔div.it「骨法杖」 間距 5、button.chip「防具」↔div.it「紙面」 間距 5、button.chip「飾品」↔div.it「紙面」 間距 5、button.chip「飾品」↔div.it「法鈴」 間距 5、button.chip「護符」↔div.it「法鈴」 間距 5
- ❌ D2-07 熱區（面板 skill）：16 個可點的東西 ≥44／32、間距 ≥8、不重疊 3 筆：button「倉庫」↔button「選單」 間距 6、button.skr-main「冰霜彈Lv 1 」↔button.skr-up「缺靈魂 2」 間距 4、button.skr-main「電弧Lv 1 ·」↔button.skr-up「缺靈魂 2」 間距 4
- ❌ D2-07 熱區（面板 craft）：12 個可點的東西 ≥44／32、間距 ≥8、不重疊 3 筆：button「倉庫」↔button「選單」 間距 6、button.chip「×1」↔button.chip「×10」 間距 6、button.chip「×10」↔button.chip「最大」 間距 6
- ❌ D2-07 熱區（面板 more）：12 個可點的東西 ≥44／32、間距 ≥8、不重疊 2 筆：button.stc「中毒」 32×32、button「倉庫」↔button「選單」 間距 6

### tc_375x667
- ❌ D2-07 熱區（戰場）：8 個可點的東西 ≥44／32、間距 ≥8、不重疊 8 筆：button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 inv）：22 個可點的東西 ≥44／32、間距 ≥8、不重疊 23 筆：#phand「面板放大或縮小」 375×24、button.on「角色」↔#phand「面板放大或縮小」 間距 0、button「倉庫」↔#phand「面板放大或縮小」 間距 0、button.x「關閉」↔div.eqs「」 間距 6、button.x「關閉」↔div.it「短劍」 間距 6、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、div.eqs「頭部」↔div.eqs「」 間距 4、div.eqs「頭部」↔div.it「皮甲」 間距 4、div.eqs「」↔div.eqs「手套」 間距 4、div.it「皮甲」↔div.eqs「手套」 間距 4、div.eqs「手套」↔div.eqs「鞋子」 間距 4、div.eqs「」↔div.eqs「副手」 間距 4、div.it「短劍」↔div.eqs「副手」 間距 4、div.eqs「副手」↔div.eqs「項鍊」 間距 4、div.eqs「項鍊」↔div.eqs「戒指」 間距 4、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button.on「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 skill）：13 個可點的東西 ≥44／32、間距 ≥8、不重疊 11 筆：button.stc「冰緩」 32×32、#phand「面板放大或縮小」 375×24、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button.on「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 craft）：12 個可點的東西 ≥44／32、間距 ≥8、不重疊 11 筆：button.stc「冰緩」 32×32、#phand「面板放大或縮小」 375×24、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button.on「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 more）：17 個可點的東西 ≥44／32、間距 ≥8、不重疊 11 筆：button.stc「冰緩」 32×32、#phand「面板放大或縮小」 375×24、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button.on「更多」 間距 0、button.ix「展開」↔button.on「更多」 間距 0

### tc_390x844
- ❌ D2-07 熱區（戰場）：8 個可點的東西 ≥44／32、間距 ≥8、不重疊 8 筆：button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 inv）：28 個可點的東西 ≥44／32、間距 ≥8、不重疊 26 筆：#phand「面板放大或縮小」 390×24、button.on「角色」↔#phand「面板放大或縮小」 間距 0、button「倉庫」↔#phand「面板放大或縮小」 間距 0、button.x「關閉」↔div.eqs「」 間距 6、button.x「關閉」↔div.it「短劍」 間距 6、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、div.eqs「頭部」↔div.eqs「」 間距 4、div.eqs「頭部」↔div.it「皮甲」 間距 4、div.eqs「」↔div.eqs「手套」 間距 4、div.it「皮甲」↔div.eqs「手套」 間距 4、div.eqs「手套」↔div.eqs「鞋子」 間距 4、div.eqs「鞋子」↔div.eqs「」 間距 4、div.eqs「鞋子」↔div.it「繩帶」 間距 4、div.eqs「」↔div.eqs「副手」 間距 4、div.it「短劍」↔div.eqs「副手」 間距 4、div.eqs「副手」↔div.eqs「項鍊」 間距 4、div.eqs「項鍊」↔div.eqs「戒指」 間距 4、div.eqs「戒指」↔div.eqs「戒指」 間距 4、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button.on「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 skill）：15 個可點的東西 ≥44／32、間距 ≥8、不重疊 14 筆：button.stc「緩速藤蔓」 32×32、#phand「面板放大或縮小」 390×24、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、button.skr-main「斬擊普攻Lv 1」↔button.skr-up「Lv 2 要角色」 間距 4、button.skr「點這裡挑一招。技」↔button.ib「掛機 0 分，下」 重疊、button.skr「點這裡挑一招。技」↔button.ix「展開」 重疊、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button.on「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 craft）：15 個可點的東西 ≥44／32、間距 ≥8、不重疊 13 筆：button.stc「緩速藤蔓」 32×32、#phand「面板放大或縮小」 390×24、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、button.chip「×1」↔button.chip「×10」 間距 6、button.chip「×10」↔button.chip「最大」 間距 6、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button.on「營地1」 間距 0、button.ib「掛機 0 分，下」↔button「更多」 間距 0、button.ix「展開」↔button「更多」 間距 0
- ❌ D2-07 熱區（面板 more）：19 個可點的東西 ≥44／32、間距 ≥8、不重疊 11 筆：button.stc「緩速藤蔓」 32×32、#phand「面板放大或縮小」 390×24、button.x「關閉」↔#phand「面板放大或縮小」 間距 0、button.ib「掛機 0 分，下」↔button.ix「展開」 間距 0、button.ib「掛機 0 分，下」↔button「角色」 間距 0、button.ib「掛機 0 分，下」↔button「鍛造」 間距 0、button.ib「掛機 0 分，下」↔button「技能」 間距 0、button.ib「掛機 0 分，下」↔button「天賦」 間距 0、button.ib「掛機 0 分，下」↔button「營地1」 間距 0、button.ib「掛機 0 分，下」↔button.on「更多」 間距 0、button.ix「展開」↔button.on「更多」 間距 0

### tc_667x375
- ❌ 營地：點地圖台＝開地點清單（跟分頁同一個面板），主角不動 [333.2733193628842,95.74468085106383]
- ❌ D2-07 熱區（戰場）：2 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button「倉庫」↔button「選單」 間距 6
- ❌ D2-07 熱區（面板 inv）：19 個可點的東西 ≥44／32、間距 ≥8、不重疊 27 筆：button「角色」 46×32、button.on「倉庫」 46×32、button.chip「全部」 34×40、button.chip「武器」 34×40、button.chip「防具」 34×40、button.chip「飾品」 34×40、button.chip「護符」 34×40、button.chip「換排序」 43×40、div.it「道冠」 38×38、div.it「紅玉戒」 38×38、div.it「鎖子甲」 38×38、div.it「道冠」 38×38、div.it「法鈴」 38×38、div.it「手甲」 38×38、div.it「儀式權杖」 38×38、div.it「火箭袋」 38×38、div.it「麻足袋」 38×38、button.chip「全部」↔div.it「法鈴」 間距 5、button.chip「全部」↔div.it「手甲」 間距 5、button.chip「武器」↔div.it「手甲」 間距 5、button.chip「防具」↔div.it「手甲」 間距 7、button.chip「防具」↔div.it「儀式權杖」 間距 5、button.chip「飾品」↔div.it「儀式權杖」 間距 5、button.chip「飾品」↔div.it「火箭袋」 間距 5、button.chip「護符」↔div.it「火箭袋」 間距 5、button.chip「護符」↔div.it「麻足袋」 間距 5、button.chip「換排序」↔div.it「麻足袋」 間距 5
- ❌ D2-07 熱區（面板 skill）：7 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button.skr-main「冰霜彈Lv 1 」↔button.skr-up「升級 14 靈魂」 間距 4
- ❌ D2-07 熱區（面板 craft）：5 個可點的東西 ≥44／32、間距 ≥8、不重疊 2 筆：button.chip「×1」↔button.chip「×10」 間距 6、button.chip「×10」↔button.chip「最大」 間距 6
- ❌ D2-07 熱區（面板 more）：11 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button「倉庫」↔button「選單」 間距 6

### tc_844x390
- ❌ D2-07 熱區（戰場）：2 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button「倉庫」↔button「選單」 間距 6
- ❌ D2-07 熱區（面板 inv）：19 個可點的東西 ≥44／32、間距 ≥8、不重疊 30 筆：button「角色」 46×32、button.on「倉庫」 46×32、button.chip「全部」 34×40、button.chip「武器」 34×40、button.chip「防具」 34×40、button.chip「飾品」 34×40、button.chip「護符」 34×40、button.chip「換排序」 43×40、div.it「鐵棍」 32×32、div.it「手弩」 32×32、div.it「火箭袋」 32×32、div.it「繩帶」 32×32、div.it「麻帶」 32×32、div.it「短矛」 32×32、div.it「火箭袋」 32×32、div.it「琥珀墜」 32×32、div.it「琉璃戒」 32×32、button.chip「全部」↔div.it「手弩」 間距 5、button.chip「全部」↔div.it「火箭袋」 間距 5、button.chip「武器」↔div.it「火箭袋」 間距 5、button.chip「武器」↔div.it「繩帶」 間距 5、button.chip「防具」↔div.it「繩帶」 間距 5、button.chip「防具」↔div.it「麻帶」 間距 5、button.chip「飾品」↔div.it「麻帶」 間距 5、button.chip「飾品」↔div.it「短矛」 間距 5、button.chip「護符」↔div.it「短矛」 間距 5、button.chip「護符」↔div.it「火箭袋」 間距 5、button.chip「換排序」↔div.it「火箭袋」 間距 7、button.chip「換排序」↔div.it「琥珀墜」 間距 5、button.chip「換排序」↔div.it「琉璃戒」 間距 5
- ❌ D2-07 熱區（面板 skill）：8 個可點的東西 ≥44／32、間距 ≥8、不重疊 1 筆：button.skr-main「冰霜彈Lv 1 」↔button.skr-up「缺靈魂 2」 間距 4
- ❌ D2-07 熱區（面板 craft）：7 個可點的東西 ≥44／32、間距 ≥8、不重疊 3 筆：button「倉庫」↔button「選單」 間距 6、button.chip「×1」↔button.chip「×10」 間距 6、button.chip「×10」↔button.chip「最大」 間距 6
- ❌ D2-07 熱區（面板 more）：13 個可點的東西 ≥44／32、間距 ≥8、不重疊 5 筆：button.stc「中毒」 32×32、button.stc「緩速藤蔓」 32×32、button.stc「中毒」↔button.stc「緩速藤蔓」 間距 4、button.stc「中毒」↔button.mrow「全螢幕藏起網址列」 間距 4、button「倉庫」↔button「選單」 間距 6
