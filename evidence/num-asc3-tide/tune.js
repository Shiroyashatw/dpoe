/* num-asc3-tide 調整方案（只動潮汐的數字；jobs.js tune <名> 用）。路徑寫法見 simlib.js 的 applyOv：
   'tide.<點>.<鍵>'＝js/data.js 的 ASC.tide.N（大點的 fx、小點的數值）；'BUFF.tide.st.tideEle'＝js/combat.js:1643 浪潮之心每層的冰冷與閃電傷害提高 */
module.exports = {
  h10: { d: '浪潮之心每層 5% → 10%', ov: { 'BUFF.tide.st.tideEle': 10 } },
  m40: { d: '潮滅更多 25% → 40%', ov: { 'tide.ebb.tideMore': 40 } }
};
module.exports.h10m40 = { d: '浪潮之心每層 5% → 10%＋潮滅更多 25% → 40%', ov: { 'BUFF.tide.st.tideEle': 10, 'tide.ebb.tideMore': 40 } };
