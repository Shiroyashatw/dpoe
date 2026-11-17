/* M2-31 C1：固定背景、固定淡出階段，舊畫法（描邊跟字一起淡、0.8）vs 新畫法（描邊 fa+0.3、0.95）並排畫，
   輸出成 capture.js 的格式（shots/<size>/<名>.png＋RAW/<size>/<名>.json），再用 analyze.py 的「算描邊」量。
   用法：OUT_DIR=<evidence 資料夾> node c1fixed.js <RAW 資料夾> */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const OUT = process.env.OUT_DIR,
  RAW = process.argv[2];
/* 背景取修改前量到的場景色（火把地板、岩壁、草地、暗處），字色取 phys／crit／hurt */
const BG = ['#ad6633', '#93623c', '#ab7942', '#a08661', '#6c564f', '#612f2c', '#3d4240', '#121a23', '#ffffe2', '#fb591d'];
const FILL = ['#fff3e0', '#ffd166', '#ff5a5a'];
const F = [0, 0.7, 0.8, 0.85]; /* f＝n.t/0.9；fa＝1、0.75、0.5、0.375 */
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium' });
  for (const mode of ['old', 'new']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    await p.setContent('<canvas id="c" width="390" height="844" style="position:fixed;left:0;top:0;width:390px;height:844px"></canvas>');
    const cv = await p.evaluate(
      ([BG, FILL, F, mode]) => {
        const c = document.getElementById('c');
        c.width = 390 * 3;
        c.height = 844 * 3;
        const X = c.getContext('2d');
        X.scale(3, 3);
        const out = [];
        const cw = 390 / BG.length;
        BG.forEach((bg, i) => {
          X.fillStyle = bg;
          X.fillRect(i * cw, 0, cw, 844);
        });
        X.textAlign = 'center';
        X.font = '700 17px sans-serif';
        let row = 0;
        for (const fill of FILL)
          for (const f of F) {
            row++;
            BG.forEach((bg, i) => {
              const x = i * cw + cw / 2,
                y = 30 + row * 44,
                txt = String(10 + ((row * 7 + i) % 90)),
                fa = 1 - Math.max(0, f - 0.6) / 0.4;
              if (mode === 'old') {
                X.globalAlpha = fa;
                X.lineWidth = 4;
                X.strokeStyle = 'rgba(0,0,0,0.8)';
                X.strokeText(txt, x, y);
              } else {
                X.globalAlpha = Math.min(1, fa + 0.3);
                X.lineWidth = 4;
                X.strokeStyle = 'rgba(0,0,0,0.95)';
                X.strokeText(txt, x, y);
                X.globalAlpha = fa;
              }
              X.fillStyle = fill;
              X.fillText(txt, x, y);
              const m = X.measureText(txt);
              out.push({
                canvas: 'c',
                t: txt + ' @' + bg + ' fa' + fa.toFixed(2),
                font: X.font,
                fill,
                ga: fa,
                stroke: mode === 'old' ? 'rgba(0, 0, 0, 0.8) 4px' : 'rgba(0, 0, 0, 0.95) 4px',
                vis: true,
                box: [x - m.width / 2, y - m.actualBoundingBoxAscent, x + m.width / 2, y + m.actualBoundingBoxDescent]
              });
            });
            X.globalAlpha = 1;
          }
        return out;
      },
      [BG, FILL, F, mode]
    );
    const name = '90_C1固定_' + mode;
    fs.mkdirSync(path.join(OUT, 'shots', 'portrait'), { recursive: true });
    fs.mkdirSync(path.join(RAW, 'portrait'), { recursive: true });
    await p.screenshot({ path: path.join(OUT, 'shots', 'portrait', name + '.png') });
    fs.writeFileSync(path.join(RAW, 'portrait', name + '.json'), JSON.stringify({ screen: name, dom: [], canvas: cv, dpr: 3 }));
    await p.close();
  }
  await b.close();
  console.log('ok');
})();
