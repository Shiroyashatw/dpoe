# battle-hud v1.3 正式素材挑定（參考用，不是規格、不是執行時資產）

依據：**mumi 2026-11-20 17:18 定案（經幕僚長轉述）**；規格 `specs/battle-hud/battle-hud.md`、`assets-borrowed.md` **v1.3.1**（v1.3 勘誤，mumi 17:18）。候選與量測由 Game Art Director 做（`/workspace/hud13/README.md`，17:10），UIUX 17:06 審過。

**開發暫停中，進 art/ 另開 PR。** 遊戲不會讀這個資料夾；這裡的檔都沒有放進 `art/`，`js/art.js` 也沒改。下面「之後要進 art/ 的路徑」都是**建議**（看 repo 現有 `art/` 與 art-picks 的寫法推的），進 art/ 時由 AD 確認。

## 挑定結果

| 項 | 選了哪個 | 沒選的（不收） | 檔數 | 之後要進 art/ 的路徑 |
|---|---|---|---|---|
| ① 光環第一批 6 個 | 不用挑，全收：`sk_anger`、`sk_precise`、`sk_hasteaura`、`sk_determination`、`sk_purityaura`、`sk_clarity`，各 10×10、12×12＋`@2x` | `1-aura/spare/`（hatred、wrathaura、grace、discipline、zealotry，遊戲沒有） | 24 | `art/icons/aura/`（建議） |
| ① 光環第二批 12 個（mumi 11/20 17:46 挑 iceshatter B、staticfield B） | `sk_command`、`sk_guardtotem`、`sk_scorch`、`sk_iceshield`、`sk_tesla`、`sk_blight`、`sk_decay`、`sk_souldrain`、`sk_summongod`、`sk_inferno`、`sk_iceshatter`、`sk_staticfield`，各 10×10、12×12＋`@2x`；iceshatter、staticfield 用 B 案，放進來時檔名去掉 `_B` | iceshatter、staticfield 的 A 案 | 48 | `art/icons/aura/`（建議） |
| ② 分頁圖示 | **A**（1 px 線條）：7 個 16×16＋`@2x` 32 | B | 14 | `art/icons/tab/`（建議） |
| ③ sk_gasflask | **B**（token 三階）：`sk_gasflask-s7311h-B.png` 32×32 | A | 1 | `art/icons/skills/`（建議，同 m2-40-skills） |
| ④ 王「上尸」boss_shang | **s6921**：`boss_shang-s6921-f64.png` 64×64 | s6924、s6922 | 1 | `art/monsters/`（建議，照 js/art.js 檔頭「來源 art/monsters/*.png」） |
| ⑥ 藥劑球 | **A**（淺玻璃邊）：`flask_{hp,mp}_{12,14}`＋`@2x` | B | 8 | `art/flasks/flask_hp/`、`art/flasks/flask_mp/`（建議，同 m2-36-d2-first 的 flask 路徑） |

沒收：未選的 B 組、s6924、s6922、`overview/`、`tools/`、`mockctx/`、`1-aura/spare/`。iceshatter、staticfield 的 A 案也不收。觀戰鈕已從規格拿掉（mumi 11/20 17:33 拿掉觀戰鍵），不需要素材。⑤ 菁英標記照 UIUX 維持程式畫，沒有素材。

## 檔案、來源與 sha256

來源根目錄 `/workspace/hud13/`；每個檔都用 `/workspace/hud13/candidates/MANIFEST.csv` 的 sha256 核對過，第一批 48 個全部一致；光環第二批 48 個（2026-11-20 17:46 加）也全部一致，iceshatter、staticfield 對的是 B 案那一列。資料夾內去掉了選項層（`2-tab/A/`→`2-tab/`、`6-potion/A/`→`6-potion/`），檔名不變。

| repo 內檔案 | 來源 | 尺寸 | sha256 |
|---|---|---|---|
| `1-aura/sk_anger_10.png` | `candidates/1-aura/sk_anger_10.png` | 10x10 | `096126dc0ca63c3b53d9103b2d60ab42e9d08ee4dd8ce9965b471a4b1c15dd60` |
| `1-aura/sk_anger_10@2x.png` | `candidates/1-aura/sk_anger_10@2x.png` | 20x20 | `3a90f3a02e2532b9bf6029270ad5356edf87a6d21fb6c0bc8fc5c46dc9c80b40` |
| `1-aura/sk_anger_12.png` | `candidates/1-aura/sk_anger_12.png` | 12x12 | `395a51bccad982ea97296e2a84291ba5899d0204de83eae4215869e4db0b43d9` |
| `1-aura/sk_anger_12@2x.png` | `candidates/1-aura/sk_anger_12@2x.png` | 24x24 | `94da1f43f2f5f52f9335a9b510efed07a36fcad899fb60795d67000dbc0abe02` |
| `1-aura/sk_clarity_10.png` | `candidates/1-aura/sk_clarity_10.png` | 10x10 | `ef41a1cf6430e3bfd196905f6adf21e177f19c5194f4510af98d8c64c652e2e4` |
| `1-aura/sk_clarity_10@2x.png` | `candidates/1-aura/sk_clarity_10@2x.png` | 20x20 | `7251316199e1648f7af06d06357bb778b9b70fe5d7782d065237fbd7080bb5a6` |
| `1-aura/sk_clarity_12.png` | `candidates/1-aura/sk_clarity_12.png` | 12x12 | `64d35c632aee7277671b62ad57ac601d74892c4311a4f291a415a832cd2809e2` |
| `1-aura/sk_clarity_12@2x.png` | `candidates/1-aura/sk_clarity_12@2x.png` | 24x24 | `fb04e80fef8f3917807394d673a4349efc87ca370052c770e3a60c547caf0312` |
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
| `1-aura/sk_command_10.png` | `candidates/1-aura-b2/sk_command_10.png` | 10x10 | `98818bc48b7b3806f2b20d7240c1203e09744337d121e72102d44c62f5a1ce2e` |
| `1-aura/sk_command_10@2x.png` | `candidates/1-aura-b2/sk_command_10@2x.png` | 20x20 | `1b9e74ea48f1db0d7b5e61b596a1dd2740eeff856a67062fac6aaea8b2284a7a` |
| `1-aura/sk_command_12.png` | `candidates/1-aura-b2/sk_command_12.png` | 12x12 | `d41a0362b3414bca60d5630e12522d728f4b28ebb8e1626b7b1e4917562987b9` |
| `1-aura/sk_command_12@2x.png` | `candidates/1-aura-b2/sk_command_12@2x.png` | 24x24 | `fb94277b76c19a604a53c018456e76fb529cd0d90517ac4d339cbcd3a4d1e3e3` |
| `1-aura/sk_guardtotem_10.png` | `candidates/1-aura-b2/sk_guardtotem_10.png` | 10x10 | `b273d1e102ecb3cd3d60e210053e9fb8ca702abfbfe71c2a29fc2febd0438ccd` |
| `1-aura/sk_guardtotem_10@2x.png` | `candidates/1-aura-b2/sk_guardtotem_10@2x.png` | 20x20 | `2af23bae789025db6bb77aaa9c8658e89874ddc6b83e60237edef4269cfc7a13` |
| `1-aura/sk_guardtotem_12.png` | `candidates/1-aura-b2/sk_guardtotem_12.png` | 12x12 | `61f08ac9270c71549873956b22ec9ce50ef3fe83fc361603ae146966f82390e9` |
| `1-aura/sk_guardtotem_12@2x.png` | `candidates/1-aura-b2/sk_guardtotem_12@2x.png` | 24x24 | `9609ff0df6e29693e4847cd3af155cb6b0ec4902a84aecd1df4fb451d4b2bb37` |
| `1-aura/sk_scorch_10.png` | `candidates/1-aura-b2/sk_scorch_10.png` | 10x10 | `1baf6317e140f05c4bca4fd0aa7c279a0f1b9d53449fe2bc7e4a00c80d60fad8` |
| `1-aura/sk_scorch_10@2x.png` | `candidates/1-aura-b2/sk_scorch_10@2x.png` | 20x20 | `7cd305e5a788199760d369556d1546aaf7f45c6ce43a3227ca39e6e6041918c8` |
| `1-aura/sk_scorch_12.png` | `candidates/1-aura-b2/sk_scorch_12.png` | 12x12 | `affe57447f56ca5b4238409c36b0aee0a15cf16de934172e40139b1212b47ca8` |
| `1-aura/sk_scorch_12@2x.png` | `candidates/1-aura-b2/sk_scorch_12@2x.png` | 24x24 | `4b4ffb6a39b9a60aadf548ab51c02c717e09f3ae999f7e686a1feb530b1ed428` |
| `1-aura/sk_iceshield_10.png` | `candidates/1-aura-b2/sk_iceshield_10.png` | 10x10 | `b2cb0f4fe951e4afa0a0ee3e7bd3f55dd2f213274da623ebf965e4271b8a86bc` |
| `1-aura/sk_iceshield_10@2x.png` | `candidates/1-aura-b2/sk_iceshield_10@2x.png` | 20x20 | `40a3002ea5f52846fdc15af46300a91853c6e437cd3043a7eb5816610a7fa370` |
| `1-aura/sk_iceshield_12.png` | `candidates/1-aura-b2/sk_iceshield_12.png` | 12x12 | `764ff89608d8c4dfdc0a602162e2380df58ea7679465a56e2bf43a0cf854d41e` |
| `1-aura/sk_iceshield_12@2x.png` | `candidates/1-aura-b2/sk_iceshield_12@2x.png` | 24x24 | `cf5f82cae23b9c639b1b1a61239a23d915ddcc1b9ec53a09a2332e1ac9835b55` |
| `1-aura/sk_tesla_10.png` | `candidates/1-aura-b2/sk_tesla_10.png` | 10x10 | `1609d14ec57349de6726f13b349f63aed2c23b2f0f38a875e47aec3350f866e8` |
| `1-aura/sk_tesla_10@2x.png` | `candidates/1-aura-b2/sk_tesla_10@2x.png` | 20x20 | `8ac827bef421e990ce59e87e970d8922b7c674034aec0aface7d47fd609fb82a` |
| `1-aura/sk_tesla_12.png` | `candidates/1-aura-b2/sk_tesla_12.png` | 12x12 | `a4b0576a3681deff660b473e34bc0a7ea538ef9dd2f769f9ae4183b077c3c75b` |
| `1-aura/sk_tesla_12@2x.png` | `candidates/1-aura-b2/sk_tesla_12@2x.png` | 24x24 | `a4b0cf69553755d4ef34ecd92f8966228b64c050a49e5aafd03b0c955eaa19c0` |
| `1-aura/sk_blight_10.png` | `candidates/1-aura-b2/sk_blight_10.png` | 10x10 | `6119a3b431dfc3821ed49e853249187c872932b343f36168c3e77c0017b9565e` |
| `1-aura/sk_blight_10@2x.png` | `candidates/1-aura-b2/sk_blight_10@2x.png` | 20x20 | `c42902c957fcd0fd9d2f4d20dc0ec9c01e9930400d9b7d61b1c23a46bb33838a` |
| `1-aura/sk_blight_12.png` | `candidates/1-aura-b2/sk_blight_12.png` | 12x12 | `828c077f62dd0dbc0b539c02e63ea03f01775beeb5d2692f77f4ef1c5919017d` |
| `1-aura/sk_blight_12@2x.png` | `candidates/1-aura-b2/sk_blight_12@2x.png` | 24x24 | `3da42a8b9de82d3b8be60b1752303e8275cc822e7aa1f2f8d8b1fdbb68a7adbf` |
| `1-aura/sk_decay_10.png` | `candidates/1-aura-b2/sk_decay_10.png` | 10x10 | `eb4c75da1ffc6a024abe20390d2fbe4ba1efd7994881ff32652ef44372b64cb1` |
| `1-aura/sk_decay_10@2x.png` | `candidates/1-aura-b2/sk_decay_10@2x.png` | 20x20 | `d507282f47736597e2fb30d03d13a667db841e026ed082e340de3451de3137eb` |
| `1-aura/sk_decay_12.png` | `candidates/1-aura-b2/sk_decay_12.png` | 12x12 | `6484dde946fddcc4fee58b251f5b32cf74935ad37fd6e2e3e0338b169ec08989` |
| `1-aura/sk_decay_12@2x.png` | `candidates/1-aura-b2/sk_decay_12@2x.png` | 24x24 | `dd8ff99b58eddfd195a9b40acc305ff66d9fc7284356535b357eee243d1a3869` |
| `1-aura/sk_souldrain_10.png` | `candidates/1-aura-b2/sk_souldrain_10.png` | 10x10 | `f269871e5bddb65ce6caa8d4828d0aea0b7509f4805410ae98661ca5c941907f` |
| `1-aura/sk_souldrain_10@2x.png` | `candidates/1-aura-b2/sk_souldrain_10@2x.png` | 20x20 | `b306f981c9ea6e5248813bcb8701acff0178f5fa495b5db93acf0f2940b4c1ae` |
| `1-aura/sk_souldrain_12.png` | `candidates/1-aura-b2/sk_souldrain_12.png` | 12x12 | `f70182d3d48d9de7400a1593308362570edd6f21194e86625938e5329d0ef0c5` |
| `1-aura/sk_souldrain_12@2x.png` | `candidates/1-aura-b2/sk_souldrain_12@2x.png` | 24x24 | `e8d0f25e7c98af90591900d44259f044363acf740f88d709e65fe83e13f9c5c8` |
| `1-aura/sk_summongod_10.png` | `candidates/1-aura-b2/sk_summongod_10.png` | 10x10 | `b75c075e7e6bd5c332ce57fa3d54776ddd339db7f619c8a7c118fa50381359bc` |
| `1-aura/sk_summongod_10@2x.png` | `candidates/1-aura-b2/sk_summongod_10@2x.png` | 20x20 | `c8cf56070eaf89d826466271d3bde39e012423451e5df6814b73b05723b9ac6b` |
| `1-aura/sk_summongod_12.png` | `candidates/1-aura-b2/sk_summongod_12.png` | 12x12 | `5875c46d543c2622641e28a4cbc2835acd11cb48270cee1fe2002fb3bf9578f8` |
| `1-aura/sk_summongod_12@2x.png` | `candidates/1-aura-b2/sk_summongod_12@2x.png` | 24x24 | `f2f97a57b7678fbd43143b39cdd6dc3cab0297742f64ba1daf05741f8d9fc45b` |
| `1-aura/sk_inferno_10.png` | `candidates/1-aura-b2/sk_inferno_10.png` | 10x10 | `93de674e63c8f3b04ad3b5f62a43d2d18bf9f170999eb1efd158a5f2c597a2f0` |
| `1-aura/sk_inferno_10@2x.png` | `candidates/1-aura-b2/sk_inferno_10@2x.png` | 20x20 | `a0ab2545942ffa8a16bea30ad113008f5108cfabb40171f84cf512161ced55e4` |
| `1-aura/sk_inferno_12.png` | `candidates/1-aura-b2/sk_inferno_12.png` | 12x12 | `b7809f1324c0ddf78593282c6651aba72c5fba476a0ec5e10f559f6c87a42a4b` |
| `1-aura/sk_inferno_12@2x.png` | `candidates/1-aura-b2/sk_inferno_12@2x.png` | 24x24 | `0c2be2be904037ea4d07c894c68ecc5a9246cb6007e425df7b3df331d95bfb20` |
| `1-aura/sk_iceshatter_10.png` | `candidates/1-aura-b2/sk_iceshatter_B_10.png` | 10x10 | `277b3e7404da0411e2f49e5e06f581860c0b2f473611da450c6d8cedae95ba5b` |
| `1-aura/sk_iceshatter_10@2x.png` | `candidates/1-aura-b2/sk_iceshatter_B_10@2x.png` | 20x20 | `42745d82180a9e0b1068e30f01be3ae950bfd1d1fe63de379ed4bdfcc58e587f` |
| `1-aura/sk_iceshatter_12.png` | `candidates/1-aura-b2/sk_iceshatter_B_12.png` | 12x12 | `bd29c9e94e06b3a5d735b8017072b100f5dd4a9d8fae83ee26d35ea09273c41a` |
| `1-aura/sk_iceshatter_12@2x.png` | `candidates/1-aura-b2/sk_iceshatter_B_12@2x.png` | 24x24 | `8bb3e6c6bccea1c95cb497b9a9b181042eb27b2b2a2501bc5e50b9c4400c09f3` |
| `1-aura/sk_staticfield_10.png` | `candidates/1-aura-b2/sk_staticfield_B_10.png` | 10x10 | `c20da1f8748c8afe2bf62208218ba62bb0649a8ecd092c656f624dd175acb500` |
| `1-aura/sk_staticfield_10@2x.png` | `candidates/1-aura-b2/sk_staticfield_B_10@2x.png` | 20x20 | `797cf9e447c27ec5eb0a5dd331299d99d788c370e80d6f0b51f182d3fb12181a` |
| `1-aura/sk_staticfield_12.png` | `candidates/1-aura-b2/sk_staticfield_B_12.png` | 12x12 | `89d4d52f40e38e5a1a3931b0859b45a5c2c0267cfb5e3f0ba8f15fae0ff8d966` |
| `1-aura/sk_staticfield_12@2x.png` | `candidates/1-aura-b2/sk_staticfield_B_12@2x.png` | 24x24 | `5bf0ac60fbbef55c9f6502c8da5006a747f145c03b19981fa3482a30545a7002` |
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
