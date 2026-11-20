# battle-hud v1.3 正式素材挑定（參考用，不是規格、不是執行時資產）

依據：**mumi 2026-11-20 17:18 定案（經幕僚長轉述）**；規格 `specs/battle-hud/battle-hud.md`、`assets-borrowed.md` **v1.3.1**（v1.3 勘誤，mumi 17:18）。候選與量測由 Game Art Director 做（`/workspace/hud13/README.md`，17:10），UIUX 17:06 審過。

**開發暫停中，進 art/ 另開 PR。** 遊戲不會讀這個資料夾；這裡的檔都沒有放進 `art/`，`js/art.js` 也沒改。下面「之後要進 art/ 的路徑」都是**建議**（看 repo 現有 `art/` 與 art-picks 的寫法推的），進 art/ 時由 AD 確認。

## 挑定結果

| 項 | 選了哪個 | 沒選的（不收） | 檔數 | 之後要進 art/ 的路徑 |
|---|---|---|---|---|
| ① 光環第一批 6 個 | 不用挑，全收：`sk_anger`、`sk_precise`、`sk_hasteaura`、`sk_determination`、`sk_purityaura`、`sk_clarity`，各 10×10、12×12＋`@2x` | `1-aura/spare/`（hatred、wrathaura、grace、discipline、zealotry，遊戲沒有） | 24 | `art/icons/aura/`（建議） |
| ② 分頁圖示 | **A**（1 px 線條）：7 個 16×16＋`@2x` 32 | B | 14 | `art/icons/tab/`（建議） |
| ③ sk_gasflask | **B**（token 三階）：`sk_gasflask-s7311h-B.png` 32×32 | A | 1 | `art/icons/skills/`（建議，同 m2-40-skills） |
| ④ 王「上尸」boss_shang | **s6921**：`boss_shang-s6921-f64.png` 64×64 | s6924、s6922 | 1 | `art/monsters/`（建議，照 js/art.js 檔頭「來源 art/monsters/*.png」） |
| ⑥ 藥劑球 | **A**（淺玻璃邊）：`flask_{hp,mp}_{12,14}`＋`@2x` | B | 8 | `art/flasks/flask_hp/`、`art/flasks/flask_mp/`（建議，同 m2-36-d2-first 的 flask 路徑） |

沒收：未選的 B 組、s6924、s6922、`overview/`、`tools/`、`mockctx/`、`1-aura/spare/`。待定：光環第二批 12 個（由 Game Art Director 補）。觀戰鈕已從規格拿掉（mumi 11/20 17:33 拿掉觀戰鍵），不需要素材。⑤ 菁英標記照 UIUX 維持程式畫，沒有素材。

## 檔案、來源與 sha256

來源根目錄 `/workspace/hud13/`；每個檔都用 `/workspace/hud13/candidates/MANIFEST.csv` 的 sha256 核對過，48 個全部一致。資料夾內去掉了選項層（`2-tab/A/`→`2-tab/`、`6-potion/A/`→`6-potion/`），檔名不變。

| repo 內檔案 | 來源 | 尺寸 | sha256 |
|---|---|---|---|
| `1-aura/sk_anger_10.png` | `candidates/1-aura/sk_anger_10.png` | 10x10 | `096126dc0ca63c3b53d9103b2d60ab42e9d08ee4dd8ce9965b471a4b1c15dd60` |
| `1-aura/sk_anger_10@2x.png` | `candidates/1-aura/sk_anger_10@2x.png` | 20x20 | `3a90f3a02e2532b9bf6029270ad5356edf87a6d21fb6c0bc8fc5c46dc9c80b40` |
| `1-aura/sk_anger_12.png` | `candidates/1-aura/sk_anger_12.png` | 12x12 | `395a51bccad982ea97296e2a84291ba5899d0204de83eae4215869e4db0b43d9` |
| `1-aura/sk_anger_12@2x.png` | `candidates/1-aura/sk_anger_12@2x.png` | 24x24 | `94da1f43f2f5f52f9335a9b510efed07a36fcad899fb60795d67000dbc0abe02` |
| `1-aura/sk_clarity_10.png` | `candidates/1-aura/sk_clarity_10.png` | 10x10 | `60619f46743258ef395f0c9635f367b830e70454d2fe801219bc79d5efcd415b` |
| `1-aura/sk_clarity_10@2x.png` | `candidates/1-aura/sk_clarity_10@2x.png` | 20x20 | `faf832203edabfb9c56b79e9cfebbfe376dd07707c607bd2ab8f6c82d643d93b` |
| `1-aura/sk_clarity_12.png` | `candidates/1-aura/sk_clarity_12.png` | 12x12 | `d17aae94ba492abdd38e8b9ddd508ddd8a2bcce4338b0f390b78537c6260394b` |
| `1-aura/sk_clarity_12@2x.png` | `candidates/1-aura/sk_clarity_12@2x.png` | 24x24 | `ed3bfcb390efd05502583ab150af63d5c6caadb48e901cc8f728cfdf85325fc5` |
| `1-aura/sk_determination_10.png` | `candidates/1-aura/sk_determination_10.png` | 10x10 | `5121fa108f1ca781349eb10b376e88aac165792cdef6454f0ef12b795fd843b6` |
| `1-aura/sk_determination_10@2x.png` | `candidates/1-aura/sk_determination_10@2x.png` | 20x20 | `6372c1968c07438068775eccfe64fa4f6489f7ffca985ad067988dd9067c49f0` |
| `1-aura/sk_determination_12.png` | `candidates/1-aura/sk_determination_12.png` | 12x12 | `ec1a903ca47a20a3a0f8338393959ac4d7cb1d730c9e3a8a83aabab392a23a2b` |
| `1-aura/sk_determination_12@2x.png` | `candidates/1-aura/sk_determination_12@2x.png` | 24x24 | `75cafc3ae5e7238cc19019b6de48dd4420b49dffd39fd86522dfbdab31922335` |
| `1-aura/sk_hasteaura_10.png` | `candidates/1-aura/sk_hasteaura_10.png` | 10x10 | `a53f7608fa55b297cad64b0c563f280b4454eb71bf80ff64ee3fa22399f5660e` |
| `1-aura/sk_hasteaura_10@2x.png` | `candidates/1-aura/sk_hasteaura_10@2x.png` | 20x20 | `0616413dd5a59c6e2ccaebc477ab8a97bba8d6381e974e95f5841e409330cdc8` |
| `1-aura/sk_hasteaura_12.png` | `candidates/1-aura/sk_hasteaura_12.png` | 12x12 | `f17873305b88b255f30e9490f9dd710fb7181dc3f116404cb205052fc2da8708` |
| `1-aura/sk_hasteaura_12@2x.png` | `candidates/1-aura/sk_hasteaura_12@2x.png` | 24x24 | `224841f4e1b0644f45da07149a34f3abd4e43147dea28542fcd38d6f60c98b23` |
| `1-aura/sk_precise_10.png` | `candidates/1-aura/sk_precise_10.png` | 10x10 | `507a207e286226acf36aee710243e021b2f09e5e08bff55fe740b9b091aeaa64` |
| `1-aura/sk_precise_10@2x.png` | `candidates/1-aura/sk_precise_10@2x.png` | 20x20 | `5ec3e13bb2270707a27ee359a36be51a5605a41a17473434be8d2f39df07fa33` |
| `1-aura/sk_precise_12.png` | `candidates/1-aura/sk_precise_12.png` | 12x12 | `2bc40b430fe4c7ee051ca4442000fab440712831a3dce34e8ccf67b12da499d1` |
| `1-aura/sk_precise_12@2x.png` | `candidates/1-aura/sk_precise_12@2x.png` | 24x24 | `da6ce8d3cbb5bbf47a698dd69ac070ca1db387fd5fb4887990e1bab195e51437` |
| `1-aura/sk_purityaura_10.png` | `candidates/1-aura/sk_purityaura_10.png` | 10x10 | `377949857a4a89987918a268dd382d21367ef190a9674cf1ee257be98dbc25b4` |
| `1-aura/sk_purityaura_10@2x.png` | `candidates/1-aura/sk_purityaura_10@2x.png` | 20x20 | `c3a88130bb100a38a288d9fe8b3226247846eb9e232b532ea9e09be56a91bdac` |
| `1-aura/sk_purityaura_12.png` | `candidates/1-aura/sk_purityaura_12.png` | 12x12 | `ec4a97a3585028b431e7649b661025174382d6968efa506a0048cd230ecf31f6` |
| `1-aura/sk_purityaura_12@2x.png` | `candidates/1-aura/sk_purityaura_12@2x.png` | 24x24 | `175d563cb0d879ec71c353e465e7d610cddaed85884d240f83a0a85183f598bc` |
| `2-tab/tab_camp_16.png` | `candidates/2-tab/A/tab_camp_16.png` | 16x16 | `5a415b5de2839fae649a64c3c7d5719a666710b3e0b6a85db33d753f77655e35` |
| `2-tab/tab_camp_16@2x.png` | `candidates/2-tab/A/tab_camp_16@2x.png` | 32x32 | `b60d6b326e8d8a78599deaf94ff683509f7e13cd238dd73893d7a52ae4a94aa1` |
| `2-tab/tab_char_16.png` | `candidates/2-tab/A/tab_char_16.png` | 16x16 | `3deac7a90706927c0127e448c1896133d819731622444af88726b8a1381cf3cd` |
| `2-tab/tab_char_16@2x.png` | `candidates/2-tab/A/tab_char_16@2x.png` | 32x32 | `a76d0a01ec4e62e9583ecacc189b093cff32e00377e2954ea64d43946df688e9` |
| `2-tab/tab_forge_16.png` | `candidates/2-tab/A/tab_forge_16.png` | 16x16 | `f303adca5e8a0796931683d2f8d96f38c3c4e202cf1b54a3f6f1360079f2afd2` |
| `2-tab/tab_forge_16@2x.png` | `candidates/2-tab/A/tab_forge_16@2x.png` | 32x32 | `0005754f32257760b1f56cf86f5285a553617a3d3eb2ce47b25eccda84d23add` |
| `2-tab/tab_loot_16.png` | `candidates/2-tab/A/tab_loot_16.png` | 16x16 | `c8a4b76de98d4a9de237cd5997da119cc3bc6134bce4e94e941bb2119882c47d` |
| `2-tab/tab_loot_16@2x.png` | `candidates/2-tab/A/tab_loot_16@2x.png` | 32x32 | `27e0503295567b42626f42b2d13b32b26c891b4101c4ed8282d9d2f9523ae02b` |
| `2-tab/tab_more_16.png` | `candidates/2-tab/A/tab_more_16.png` | 16x16 | `184194635fe71cfc810342b0cde7d9b82b608878da4e693525666774a7badbf2` |
| `2-tab/tab_more_16@2x.png` | `candidates/2-tab/A/tab_more_16@2x.png` | 32x32 | `993e69529a08245f1498625ed5f7798c37f8915bfee270fa37d35830ab8d0a5b` |
| `2-tab/tab_skill_16.png` | `candidates/2-tab/A/tab_skill_16.png` | 16x16 | `012e601008aa18f6dd0ce8ecdf421c3946fa999c2fef759b487b54a676e3223b` |
| `2-tab/tab_skill_16@2x.png` | `candidates/2-tab/A/tab_skill_16@2x.png` | 32x32 | `c2c6f071082b0159bda1680d7f636f7291eb3fada3e6ebfdb92152cee273230b` |
| `2-tab/tab_talent_16.png` | `candidates/2-tab/A/tab_talent_16.png` | 16x16 | `096a346d8ceac7c6d89b1af24792340355555a3fab212bb9a95dfad312f40318` |
| `2-tab/tab_talent_16@2x.png` | `candidates/2-tab/A/tab_talent_16@2x.png` | 32x32 | `03d6748075c1d1cb498a095d8cf736eb8c3b837acf88d6c58d1d18ead7e2b860` |
| `3-gasflask/sk_gasflask-s7311h-B.png` | `candidates/3-gasflask/sk_gasflask-s7311h-B.png` | 32x32 | `3cb402feed2e1f66671456c08f9dfb5ea629d5b5de107f7bd2ff910361cea96f` |
| `4-boss/boss_shang-s6921-f64.png` | `candidates/4-boss/boss_shang-s6921-f64.png` | 64x64 | `f1070c4e5ae77c54884bb6af59d6c563be2e9153b77e0ec1f3ac56892c8121b9` |
| `6-potion/flask_hp_12.png` | `candidates/6-potion/A/flask_hp_12.png` | 12x12 | `312138d20d10f1c388189d8147527ec6f8c5725977599ad8ef364c23c387c150` |
| `6-potion/flask_hp_12@2x.png` | `candidates/6-potion/A/flask_hp_12@2x.png` | 24x24 | `b46ae6431209c3fc95a2093184bea38770d7ab53663a31b6c28dfabfb8c31a74` |
| `6-potion/flask_hp_14.png` | `candidates/6-potion/A/flask_hp_14.png` | 14x14 | `27b0b650452055cf3f523f7c1ebd89bd314d2352a6d529c1013056a07dd9b947` |
| `6-potion/flask_hp_14@2x.png` | `candidates/6-potion/A/flask_hp_14@2x.png` | 28x28 | `939ce3e9957b07ad68e9b38b2a27f4e4294029589e92c4553217fc5c88e6c782` |
| `6-potion/flask_mp_12.png` | `candidates/6-potion/A/flask_mp_12.png` | 12x12 | `585e9ade5d0ee8fc3f37d5c6cd527f514dedc84dab0c8fb292065f6181690290` |
| `6-potion/flask_mp_12@2x.png` | `candidates/6-potion/A/flask_mp_12@2x.png` | 24x24 | `d095cc0b2d3482b4eab8dc28d56266a39cd3a18f7d45aa8fe5104f6d8615d22a` |
| `6-potion/flask_mp_14.png` | `candidates/6-potion/A/flask_mp_14.png` | 14x14 | `30ba8b8d12670b2b6f8d263539a688ae549c162c08399cbd088f06c33a580b57` |
| `6-potion/flask_mp_14@2x.png` | `candidates/6-potion/A/flask_mp_14@2x.png` | 28x28 | `d9a24c260c9d9482b5930e0c1ef9dba8cc551ac68a667078dc801d7d764d9803` |
