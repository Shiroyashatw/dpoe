# 用法：python3 mkprobe.py 來源 touch_check.js 輸出 block毫秒
import sys
src,out,blk=sys.argv[1],sys.argv[2],sys.argv[3]
s=open(src).read()
old="""      navGo('char');
      NAV.full = 1;
      hudPanels();
    });"""
new="""      const L = (window.PRB = []), t0 = performance.now();
      const f = () => {
        const e = document.querySelector('#pinv .doll2 [data-eq="boots"]'), pv = $('pinv');
        L.push([Math.round(performance.now() - t0), e ? Math.round(e.getBoundingClientRect().top) : null, Math.round(pv.getBoundingClientRect().top), document.getAnimations().filter(a => a.effect && a.effect.target && /pinv|phand/.test(a.effect.target.id)).map(a => (a.animationName || a.transitionProperty) + ':' + a.effect.target.id + ':' + Math.round(a.currentTime)).join('|')]);
        if (performance.now() - t0 < 1500) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
      addEventListener('touchstart', ev => { const t = ev.touches[0], el = document.elementFromPoint(t.clientX, t.clientY); (window.PRBT = window.PRBT || []).push([Math.round(performance.now() - t0), t.clientX, Math.round(t.clientY), el && (el.closest('[data-eq]') || { dataset: {} }).dataset.eq]); }, { capture: true });
      navGo('char');
      NAV.full = 1;
      hudPanels();
      /* 模擬機器忙：開面板後第一格卡 BLK ms（面板 top 轉場晚起跑） */
      if (BLK) requestAnimationFrame(() => { const t = performance.now(); while (performance.now() - t < BLK); });
    });""".replace('BLK',blk)
assert old in s
s=s.replace(old,new,1)
t="""    await tapIn('#pinv .doll2 [data-eq="boots"]');\n"""
s=s.replace(t,t+"""    console.log('PRB 按下 [ms, x, y, 手指底下] ' + JSON.stringify(await p.evaluate(() => PRBT)) + ' 鞋子欄上緣／#pinv 上緣逐格 ' + JSON.stringify(await p.evaluate(() => PRB.filter((x, i, A) => !i || x[1] !== A[i - 1][1]).map(x => x.slice(0, 3)))));\n""",1)
open(out,'w').write(s)
