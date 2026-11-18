/* M2-42 主流程影片與點擊紀錄（specs/M2-42-ux-audit-checklist-b.md §13）：F-sk、F-fg、F-eq、F-cp、F-tr、F-id、F-cb、F-dk，兩種尺寸。
   真的用滑鼠／觸控點遊戲的按鈕（不呼叫內部函式代替點擊），每一步記「動作 → 畫面」與點擊次數；找不到的控制記「無此控制」。
   影片：Playwright recordVideo 錄整段，ffmpeg 裁成事件前 0.5 秒＋事件＋後 0.5 秒（最長 6 秒）、H.264 yuv420p crf 28、30 fps、沒有聲音。
   用法：先開本機伺服器，node tools/m2_42_flows.js [--only F-sk] [--vp 390x844] [--out docs/production/evidence/m2-42] */
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs'),
  { execFileSync } = require('child_process');
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = arg('out', path.join(__dirname, '..', 'docs', 'production', 'evidence', 'm2-42')),
  URL = arg('url', 'http://localhost:8000/'),
  ONLY = arg('only', '') ? arg('only').split(',') : null,
  VPS = arg('vp', '390x844,1280x720').split(',');
const { U, darkGo } = require('./m2_42_rows.js');
const PAGE = fs.readFileSync(path.join(__dirname, 'm2_42_page.js'), 'utf8');
const VP = { '390x844': [390, 844, 2, 1], '1280x720': [1280, 720, 1, 0], '375x667': [375, 667, 2, 1] };
const TMP = path.join(require('os').tmpdir(), 'm42vid');

/* 一條流程的工具：點、記步驟 */
function rec(p, port) {
  const R = { steps: [], clicks: 0, t: [] };
  /* 面板剛滑進來時元件可能還沒就位：最多等三次 */
  const center = async sel => {
    for (let i = 0; i < 4; i++) {
      const e = typeof sel === 'string' ? await p.$(sel) : sel;
      if (e) {
        await e.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
        const b = await e.boundingBox();
        if (b && b.width > 0) return [b.x + b.width / 2, b.y + b.height / 2];
      }
      if (typeof sel !== 'string') return null;
      await p.waitForTimeout(300);
    }
    return null;
  };
  R.tap = async (sel, what, screen) => {
    const c = await center(sel);
    if (!c) {
      R.steps.push(`${what}：無此控制`);
      return false;
    }
    if (port) await p.touchscreen.tap(c[0], c[1]);
    else await p.mouse.click(c[0], c[1]);
    R.clicks++;
    await p.waitForTimeout(550);
    R.steps.push(`${what} → ${screen || ''}`.trim());
    return true;
  };
  R.key = async (k, what, screen) => {
    await p.keyboard.press(k);
    R.clicks++;
    await p.waitForTimeout(500);
    R.steps.push(`${what}（${k}）→ ${screen}`);
  };
  R.note = s => R.steps.push(s);
  R.ev = (f, a) => p.evaluate(f, a);
  /* 觸控按住：CDP touchStart／touchEnd；桌機：滑鼠或鍵盤按住 */
  R.cdp = null;
  R.touch = async (type, x, y) => {
    R.cdp = R.cdp || (await p.context().newCDPSession(p));
    await R.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  };
  return R;
}
const NAV = port => (port ? '#pnav' : '#dnav');

const FLOWS = {
  /* 換技能與插／卸輔助 */
  'F-sk': async (p, port, R) => {
    await R.tap(`${NAV(port)} [data-tm="nav:skill"]`, '點「技能」分頁', '技能總覽（半版／右欄）');
    await R.tap('#pskill [data-sk="go:one:1"]', '點震地戰吼', '這一招（孔列）');
    const h3 = await p.$('#pskill [data-sk="hole:2"]');
    if (!h3) R.note('第 3 孔：無此控制（祭壇 Lv6 只開 2 孔，第 3 孔不出現）→ 改點第 2 孔');
    await R.tap(
      h3 ? '#pskill [data-sk="hole:2"]' : '#pskill [data-sk="hole:1"]',
      h3 ? '點第 3 孔' : '點第 2 孔（空孔）',
      '輔助清單（預設篩選「推薦」）'
    );
    const on = await p.$('#pskill [data-sk="f:推薦"].on');
    if (!on) await R.tap('#pskill [data-sk="f:推薦"]', '點篩選「推薦」', '推薦清單');
    await R.tap('#pskill [data-sk="pick:lightadd"]', '點「附加閃電」', '展開（I／II、說明、底部「放上」）');
    await R.tap('#pskill [data-sk^="put:"]', '點「放上附加閃電」', '回到這一招，孔裡是附加閃電');
    const plugged = await p.$('#pskill [data-sk="hole:1"]');
    await R.tap(plugged, '點有附加閃電的那一孔', '這一孔的詳細');
    await R.tap('#pskill [data-sk="unplug"]', '點「卸下」', '孔空了');
    const r = await R.ev(() => S.skills[1].so.join(','));
    return { note: `技能›招›孔›清單 4 層；結束時孔＝[${r}]` };
  },
  /* 鍛造：打造一次看翻牌 */
  'F-fg': async (p, port, R) => {
    await R.ev(() => {
      /* 打造要生鐵：給 500（AUDIT 沒給材料） */
      S.mat.mats['iron:1'] = 500;
      hudPanels();
    });
    await R.tap(`${NAV(port)} [data-tm="nav:forge"]`, '點「鍛造」分頁', '鍛造 › 打造（預設）');
    await R.tap('#pcraft [data-fg="mk:kind:ring"]', '選部位「戒指」', '打造設定');
    await R.tap('#pcraft [data-fg="mk:n:1"]', '選「1 件」', '費用更新');
    await R.tap('#pcraft [data-fg="go"]', '點「打造」', '翻牌（#preveal）');
    await p.waitForTimeout(1200);
    const r = await R.ev(() => ({ rev: M42.vis($('preveal')), n: REV.list.length }));
    R.note(`翻牌${r.rev ? '出現' : '沒出現'}（${r.n} 件）`);
    return { note: '打造 3 層（分頁 › 打造 › 翻牌）；填詞走鍛造台另一條' };
  },
  /* 換裝 */
  'F-eq': async (p, port, R) => {
    await R.ev(() => {
      const it = mkItem(U.base('ring'), 30, 2);
      window.__eqId = it.id;
      S.inv.items.unshift(it);
      hudPanels();
    });
    await R.tap(`${NAV(port)} [data-tm="nav:bag"]`, '點「戰利品」分頁', '戰利品格子');
    if (!port) {
      const e = await p.$('#pinv .it');
      const b = await e.boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await p.waitForTimeout(600);
      R.steps.push('滑鼠停在第一件（稀有戒指）→ 對比說明框（#tip）');
    }
    await R.tap(
      '#pinv .it',
      port ? '點第一件（稀有戒指）' : '點一下',
      port ? '對比卡（身上／這件，DPS／生命差）' : '直接換上'
    );
    if (port) await R.tap('#pinv [data-a="selmove"]', '點「換上」', '換上，舊的進倉庫');
    const r = await R.ev(() => EQS.some(e => S.eq[e.k] && S.eq[e.k].id === window.__eqId));
    return {
      note: `${port ? '' : '桌機：滑鼠停 300 ms 出對比說明框，點一下＝直接換上（quickMove，沒有確認）；'}換上了=${r}`
    };
  },
  /* 進營地並捲動、上拉全版、展開一座 */
  'F-cp': async (p, port, R) => {
    await R.tap('#pidle [data-a="gocamp"]', '掛機卡點「去營地」', '營地（直立半版／桌機右欄）');
    const sc = await R.ev(() => {
      const e = [...document.querySelectorAll('#pcraft, #pcraft *')].find(
        e => M42.vis(e) && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1
      );
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2, e.scrollHeight - e.clientHeight];
    });
    if (sc) {
      if (port) {
        await R.touch('touchStart', sc[0], sc[1] + 120);
        for (let i = 1; i <= 8; i++) await R.touch('touchMove', sc[0], sc[1] + 120 - i * 30);
        await R.touch('touchEnd');
      } else {
        await p.mouse.move(sc[0], sc[1]);
        await p.mouse.wheel(0, 400);
      }
      R.clicks++;
      await p.waitForTimeout(600);
      R.steps.push(`${port ? '手指往上滑' : '滾輪往下'} → 半版內捲動（可捲 ${sc[2]}px）`);
    } else R.note('捲動：找不到可捲區');
    if (port) {
      const h = await p.$('#phand');
      const b = h && (await h.boundingBox());
      if (b && b.height) {
        const x = b.x + b.width / 2,
          y = b.y + b.height / 2;
        await R.touch('touchStart', x, y);
        for (let i = 1; i <= 10; i++) await R.touch('touchMove', x, y - i * 30);
        await R.touch('touchEnd');
        /* 把手是 pointer 事件；CDP 觸控會轉成 pointer。沒成功就用滑鼠拖一次 */
        await p.waitForTimeout(400);
        if (!(await R.ev(() => NAV.full))) {
          await p.mouse.move(x, y);
          await p.mouse.down();
          for (let i = 1; i <= 10; i++) await p.mouse.move(x, y - i * 30);
          await p.mouse.up();
        }
        R.clicks++;
        await p.waitForTimeout(600);
        R.steps.push(`上拉把手 → ${(await R.ev(() => NAV.full)) ? '全版' : '仍是半版'}`);
      } else R.note('上拉把手：無此控制');
    } else R.note('全版：桌機沒有把手（右欄固定）');
    await p.waitForTimeout(300);
    const cards = await p.$$('#pcraft [data-fg^="cc:"]');
    let card = null;
    for (const c of cards) if (!card && (await c.isVisible())) card = c;
    if (!card) R.note(`設施卡：找不到（面板開著=${await R.ev(() => PANEL.craft)}，卡 ${cards.length} 張）`);
    await R.tap(card, '點一座設施的卡', '展開（升級鈕、費用）');
    return {
      note: `捲動層 ${await R.ev(() => [...document.querySelectorAll('#pcraft, #pcraft *')].filter(e => M42.vis(e) && /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1).length)}`
    };
  },
  /* 點天賦 */
  'F-tr': async (p, port, R) => {
    await R.tap(`${NAV(port)} [data-tm="nav:tree"]`, '點「天賦」分頁', '天賦樹（蓋滿）');
    const id = await R.ev(() => {
      const n = PTREE.N.find(n => treeCan(n.id) && !(S.pt || []).includes(n.id) && !n.s.attr);
      treeFly(n.x, n.y, 1);
      return n.id;
    });
    await p.waitForTimeout(700);
    const left0 = await R.ev(() => ptLeft());
    const el = await p.$(`#tg [data-n="${id}"]`);
    await R.tap(el, '點一個亮著可點的點', port ? '下方卡片（說明＋點亮）' : '直接點亮（桌機點一下就點）');
    if (port) await R.tap('#tcard [data-ta="go"]', '點「點亮」', '點亮、剩餘點數更新');
    const left1 = await R.ev(() => ptLeft());
    return { note: `剩餘點數 ${left0} → ${left1}` };
  },
  /* 掛機卡：找收合或觀戰 */
  'F-id': async (p, port, R) => {
    await p.waitForTimeout(1500);
    const b = await R.ev(() =>
      [...document.querySelectorAll('#pidle button')]
        .map(b => (b.textContent || '').trim() + (b.getAttribute('aria-label') || ''))
        .join('|')
    );
    const shrink = /收|縮|觀戰/.test(b);
    R.note(`觀察掛機卡 1.5 秒；卡上的鈕：${b}`);
    R.note(shrink ? '找到收合／觀戰' : '收合／觀戰：無此控制（idle_shrink=none）');
    const blk = await R.ev(() => {
      const m = M42.measure(TOUCH.on);
      return `${m.sk_block}/${m.sk_area}`;
    });
    return { note: `技能鍵被擋 ${blk} px²${port ? '（直立自動：技能列在掛機卡下面）' : ''}` };
  },
  /* 戰鬥換彈與蓄力 */
  'F-cb': async (p, port, R) => {
    await R.ev(() => {
      act('auto:0');
      U.wpn('w_xbow_0');
      U.skSet(1, 'apshot');
      U.re();
      P.mp = ST.mp;
      /* 第 2 格原本是震地戰吼（冷卻 8 秒），換招後冷卻還掛在格子上：清掉才按得出來 */
      P.cds.s1 = 0;
    });
    await p.waitForTimeout(300);
    /* 穿甲彈：第 2 格（桌機右鍵；直立第 2 顆技能鍵）按住到彈夾打空、開始裝填 */
    const k1 = await p.$('#bar .sk[data-k="s1"]');
    const b1 = k1 && (await k1.boundingBox());
    if (port && b1) {
      await R.touch('touchStart', b1.x + b1.width / 2, b1.y + b1.height / 2);
      await p.waitForTimeout(1300);
      await R.touch('touchEnd');
    } else {
      /* 畫布上沒有 DOM 擋著的一點（右鍵＝第 2 格） */
      const pt = await R.ev(() => {
        for (let y = 300; y < 500; y += 20)
          for (let x = 700; x < 900; x += 20) if (document.elementFromPoint(x, y) === CV) return [x, y];
        return [700, 300];
      });
      await p.mouse.move(pt[0], pt[1]);
      await p.mouse.down({ button: 'right' });
      await p.waitForTimeout(700);
      R.mid = await R.ev(() =>
        P.ammo && P.ammo.apshot ? `彈夾 ${ammoLeft('apshot')} 發` : '還沒開火（P.ammo 沒有穿甲彈）'
      );
      await p.waitForTimeout(600);
      await p.mouse.up({ button: 'right' });
    }
    R.clicks++;
    const am = await R.ev(() => ({
      left: ammoLeft('apshot'),
      reload: !!(P.ammo && P.ammo.apshot && P.ammo.apshot.until > G.t),
      num: U.skNum(1)
    }));
    R.steps.push(
      `按住穿甲彈 1.3 秒${R.mid ? `（0.7 秒時 ${R.mid}）` : ''}→ 彈夾 ${am.left ?? '?'} 發、裝填中=${am.reload}；技能格數字「${am.num}」`
    );
    await p.waitForTimeout(800);
    await R.ev(() => {
      U.wpn('w_mace1_0');
      U.skSet(2, 'chargeslam');
      U.re();
      P.mp = ST.mp;
    });
    await p.waitForTimeout(300);
    const k2 = await p.$('#bar .sk[data-k="s2"]');
    const b2 = k2 && (await k2.boundingBox());
    if (port && b2) {
      await R.touch('touchStart', b2.x + b2.width / 2, b2.y + b2.height / 2);
      await p.waitForTimeout(1400);
      await R.touch('touchEnd');
    } else {
      await p.keyboard.down('q');
      await p.waitForTimeout(1400);
      await p.keyboard.up('q');
    }
    R.clicks++;
    R.steps.push(`按住蓄力重砸 1.4 秒（蓄滿 3 段）→ 放開出手；技能格段數「${await R.ev(() => U.skNum(2))}」`);
    await p.waitForTimeout(700);
    return {
      note: '彈夾剩餘／裝填、蓄力段數在技能格上都沒有數字（hidden=ammo、charge）；蓄力只有腳下條。另：換招後舊招的冷卻留在格子上（P.cds.s1），工具先清 0'
    };
  },
  /* 黑暗層：正常 → 天黑 → 大霧 */
  'F-dk': async (p, port, R) => {
    for (const m of ['normal', 'night', 'fog']) {
      const v = await R.ev(m => {
        const r = darkGo(m);
        DBG.resume();
        return r.v;
      }, m);
      await p.waitForTimeout(1500);
      R.note(
        `${{ normal: '正常', night: '天黑 DBG.night(30)', fog: '大霧 DBG.fog(30)' }[m]}：night=${v.night} fog=${v.fog} 光柱 ${v.beams}、血條 ${v.bars}、數字 ${v.nums}`
      );
    }
    return { note: '掛鉤切換，非玩家操作（0 次點擊）；連拍見 A-D2／A-D3' };
  }
};

async function run(b, flow, vpKey) {
  const [W, H, dpr, mob] = VP[vpKey],
    port = !!mob;
  fs.mkdirSync(TMP, { recursive: true });
  const vdir = fs.mkdtempSync(path.join(TMP, flow + '-'));
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: dpr,
    hasTouch: port,
    isMobile: port
  });
  await ctx.route(/supabase/, r => r.abort());
  await ctx.addInitScript(PAGE);
  await ctx.addInitScript(`window.U = (${U.toString()})(); window.darkGo = ${darkGo.toString()};`);
  const t0 = Date.now();
  const p = await ctx.newPage();
  /* 影片：CDP screencast 收每一幀（時間戳）→ ffmpeg concat 成 30 fps（這台的 Playwright 錄影要的 ffmpeg 版本不在，改用 screencast） */
  const frames = [];
  const sc = await ctx.newCDPSession(p);
  sc.on('Page.screencastFrame', async f => {
    frames.push({ t: f.metadata.timestamp * 1000, d: f.data });
    await sc.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await sc.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  if (!port) await p.mouse.move(W + 50, H + 50).catch(() => {});
  await p.goto(URL + '?test=midgame&seed=42&dbg=1');
  await p.waitForFunction(() => typeof G === 'object' && typeof DBG === 'object' && G.scene === 'map');
  await p.waitForTimeout(1800);
  await p.evaluate(() => M42.audit());
  await p.waitForTimeout(700);
  const R = rec(p, port);
  const ts = (Date.now() - t0) / 1000 - 0.5;
  let res;
  try {
    res = await FLOWS[flow](p, port, R);
  } catch (e) {
    res = { note: '流程中斷：' + e.message.split('\n')[0] };
  }
  await p.waitForTimeout(500);
  const te = (Date.now() - t0) / 1000;
  await sc.send('Page.stopScreencast').catch(() => {});
  await ctx.close();
  const rel = `${vpKey}/flow-${flow.slice(2)}.mp4`;
  /* 事件比 6 秒長：整段加速塞進 6 秒（記在備註） */
  const speed = te - ts > 6 ? (te - ts) / 6 : 1;
  const a = t0 + ts * 1000,
    z = t0 + te * 1000;
  const L = frames.filter(f => f.t >= a - 1000 && f.t <= z);
  const lines = [];
  L.forEach((f, i) => {
    const fn = path.join(vdir, String(i).padStart(4, '0') + '.jpg');
    fs.writeFileSync(fn, Buffer.from(f.d, 'base64'));
    const next = i + 1 < L.length ? L[i + 1].t : z;
    const st = Math.max(f.t, a);
    lines.push(`file '${fn}'`, `duration ${Math.max(0.001, (next - st) / 1000 / speed).toFixed(4)}`);
  });
  if (L.length) lines.push(`file '${path.join(vdir, String(L.length - 1).padStart(4, '0') + '.jpg')}'`);
  fs.writeFileSync(path.join(vdir, 'list.txt'), lines.join('\n'));
  fs.mkdirSync(path.join(OUT, vpKey), { recursive: true });
  if (L.length)
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      path.join(vdir, 'list.txt'),
      '-an',
      '-vf',
      `fps=30,scale=${W - (W % 2)}:${H - (H % 2)}:flags=area,format=yuv420p`,
      '-c:v',
      'libx264',
      '-crf',
      '28',
      '-movflags',
      '+faststart',
      '-t',
      '6',
      path.join(OUT, rel)
    ]);
  fs.rmSync(vdir, { recursive: true, force: true });
  const kb = fs.existsSync(path.join(OUT, rel)) ? Math.round(fs.statSync(path.join(OUT, rel)).size / 1024) : 0;
  return {
    flow,
    viewport: vpKey,
    steps: R.steps,
    clicks: R.clicks,
    note: `${res.note || ''}${speed > 1 ? `；影片 ${(te - ts).toFixed(1)} 秒加速 ${speed.toFixed(1)}× 到 6 秒` : ''}${errs.length ? '；pageerror：' + errs.join('|').slice(0, 80) : ''}`,
    video: rel,
    kb
  };
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME_M42 || '/opt/pw-browsers/chromium' });
  const f = path.join(OUT, 'flows.json');
  const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  const out = [];
  const tasks = [];
  for (const fl of Object.keys(FLOWS)) if (!ONLY || ONLY.includes(fl)) for (const vp of VPS) tasks.push([fl, vp]);
  let i = 0;
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (i < tasks.length) {
        const [fl, vp] = tasks[i++];
        const r = await run(b, fl, vp);
        out.push(r);
        console.log(`🎬 ${fl} ${vp} ${r.clicks} 次｜${r.steps.join(' ／ ')}｜${r.note}｜${r.kb} KB`);
      }
    })
  );
  await b.close();
  const key = r => r.flow + '|' + r.viewport;
  const m = new Map(prev.map(r => [key(r), r]));
  for (const r of out) m.set(key(r), r);
  const order = Object.keys(FLOWS);
  fs.writeFileSync(
    f,
    JSON.stringify(
      [...m.values()].sort(
        (a, b) => order.indexOf(a.flow) - order.indexOf(b.flow) || a.viewport.localeCompare(b.viewport)
      ),
      null,
      1
    )
  );
})();
