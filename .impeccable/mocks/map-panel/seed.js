/* mock 用的存檔：Lv72、打到 13 階、60 碎片。只存在 ?p=mock 這個存檔槽 */
(() => {
  S.lv = 72;
  S.maxT = 13;
  S.frag = 60;
  S.hint0 = 1;
  S.cards = S.cards || null;
  save();
  openPanel('device');
})();
