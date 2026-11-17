/* dungeonPOE · 色票（M2-34-0）：CSS 的 :root 是唯一來源，開機時把 token 讀進 PAL，canvas 一律用 PAL。
   --el-fire → PAL.elFire；-rgb 三元組 → PAL.rgb.elFire = '255,138,76'（拼 `rgba(${PAL.rgb.x},a)`）；
   --scene-<地形>-<ground|mid|light|edge|dark|glow> → PAL.scene.<地形>.<欄位>。JS 不准再寫色碼 */
'use strict';
const PAL = (() => {
  const P = { rgb: {}, scene: {} },
    camel = s => s.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
    put = (k, v) => {
      const m = k.match(/^--(.+?)-rgb(-v\d+)?$/),
        sc = k.match(/^--scene-(ice|lava|tomb|temple|hide)-(ground|mid|light|edge|dark|glow)(-rgb)?$/);
      if (m) P.rgb[camel(m[1] + (m[2] || ''))] = v.replace(/\s/g, '');
      else P[camel(k.slice(2))] = v;
      if (sc) (P.scene[sc[1]] = P.scene[sc[1]] || {})[sc[2]] = sc[3] ? v.replace(/\s/g, '') : v;
    };
  if (typeof document !== 'undefined' && document.styleSheets) {
    const cs = getComputedStyle(document.documentElement);
    for (const sh of document.styleSheets) {
      let rules;
      try {
        rules = sh.cssRules;
      } catch (e) {
        continue;
      }
      for (const r of rules)
        if (r.selectorText === ':root')
          for (const k of r.style) if (k.startsWith('--')) put(k, cs.getPropertyValue(k).trim());
    }
  } else if (typeof PAL_CSS === 'string') {
    /* Node 的檢查工具：tools 把 css/style.css 的全文放在 PAL_CSS */
    const root = PAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '').match(/:root\s*\{([^}]*)\}/)[1];
    for (const m of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) put(m[1], m[2].trim());
  }
  return P;
})();
