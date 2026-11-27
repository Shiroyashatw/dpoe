/* dungeonPOE · Supabase 雲端存檔（匿名登入；資料表 dungeon_saves，跟《塞令老師》的 saves 分開） */
'use strict';
/* SB_KEY 是公開的 anon key，可以放前端；絕對不要放 service_role key */
/* ================= cloud save (Supabase) ================= */
const SB_URL = 'https://eugkdfhkoaxvqhztvptc.supabase.co',
  SB_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Z2tkZmhrb2F4dnFoenR2cHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTQ4MTksImV4cCI6MjEwNzg5MDgxOX0.2-ExM_i01y2BErjIvrfvPVeSsIHP73-6nz2wKHOaLK4';
const CLOUD = {
  sb: null,
  uid: null,
  anon: true,
  email: null,
  no: null,
  pending: null,
  status: '連線中…',
  busy: false,
  dirty: false
};
/* 記下目前登入的帳號；正式帳號順便領取（或查回）玩家編號 */
async function cloudUser(user) {
  CLOUD.uid = user.id;
  CLOUD.anon = !!user.is_anonymous;
  CLOUD.email = CLOUD.anon ? null : user.email;
}
async function cloudFetch() {
  const { data, error } = await CLOUD.sb.from('dungeon_saves').select('data').eq('user_id', CLOUD.uid).maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}
async function cloudInit() {
  try {
    /* 本機不碰正式雲端：自動匿名登入會讓每個乾淨的測試瀏覽器都在正式庫多一個帳號與存檔；要測雲端加 ?cloud=1 */
    if (
      TEST ||
      (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) &&
        !new URLSearchParams(location.search).has('cloud'))
    ) {
      CLOUD.status = TEST ? '測試入口：不連雲端' : '本機測試：不連雲端';
      return null;
    }
    if (!window.supabase) {
      CLOUD.status = '無法載入雲端模組，存檔只在這台裝置';
      return null;
    }
    CLOUD.sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        ...(SLOT ? { storageKey: 'dungeonpoe-auth-p' + SLOT } : {})
      }
    });
    /* 點了重設密碼信的連結回來：Supabase 先用那個帳號登入，再請玩家設定新密碼 */
    CLOUD.sb.auth.onAuthStateChange(ev => {
      if (ev !== 'PASSWORD_RECOVERY') return;
      AUTH.recovery = true;
      setTimeout(() => (closePanels(), openPanel('set')), 0);
    });
    let {
      data: { session }
    } = await CLOUD.sb.auth.getSession();
    if (!session) {
      const r = await CLOUD.sb.auth.signInAnonymously();
      if (r.error) {
        CLOUD.status = '無法登入雲端：' + r.error.message;
        return null;
      }
      session = r.data.session;
    }
    await cloudUser(session.user);
    let save;
    try {
      save = await cloudFetch();
    } catch (e) {
      CLOUD.status = '讀取雲端存檔失敗：' + e.message;
      return null;
    }
    CLOUD.status = '已連線雲端';
    return save;
  } catch (e) {
    CLOUD.status = '雲端連線失敗';
    return null;
  }
}
async function cloudPush() {
  if (!CLOUD.uid || CLOUD.busy || !S) return;
  CLOUD.busy = true;
  CLOUD.dirty = false;
  try {
    const { error } = await CLOUD.sb
      .from('dungeon_saves')
      .upsert({ user_id: CLOUD.uid, data: S, game_version: VER, updated_at: new Date().toISOString() });
    const t = new Date();
    CLOUD.status = error
      ? '同步失敗：' + error.message
      : `已同步 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    if (error) CLOUD.dirty = true;
  } catch (e) {
    CLOUD.status = '同步失敗，稍後重試';
    CLOUD.dirty = true;
  }
  CLOUD.busy = false;
}
setInterval(() => {
  if (CLOUD.dirty && !(typeof B !== 'undefined' && B)) cloudPush();
}, 15000);
document.addEventListener('visibilitychange', () => {
  /* 切到背景、關掉前本機再存一次 */
  if (document.hidden && typeof save === 'function') save();
  if (document.hidden && CLOUD.dirty) cloudPush();
});

/* ================= 帳號（照《塞令老師》0.1.48～0.1.49） ================= */
/* 信箱、密碼、訊息記在 AUTH：面板常被重畫，輸入到一半不能被清掉 */
const AUTH = { em: '', pw: '', msg: '', err: false, busy: false, recovery: false };
const AUTH_ERR = {
  'Invalid login credentials': '信箱或密碼錯誤',
  'Email not confirmed': '這個信箱還沒完成驗證，請先點確認信裡的連結',
  'User already registered': '這個信箱已經註冊過，請改用登入'
};
const authMsg = e =>
  AUTH_ERR[e.message] ||
  (/rate limit|security purposes/i.test(e.message || '') ? '嘗試太多次，請過一分鐘再試' : '') ||
  `失敗：${e.message || e}${e.code ? `（${e.code}）` : ''}`;
const authBack = () => location.origin + location.pathname;
/* 註冊：訪客進度跟著搬到新帳號；要驗證信時，點連結回來第一次啟動就會把本機進度存上去 */
async function authRegister(email, password) {
  const { data, error } = await CLOUD.sb.auth.signUp({ email, password, options: { emailRedirectTo: authBack() } });
  if (error) throw new Error(authMsg(error));
  if (data.user && data.user.identities && !data.user.identities.length)
    throw new Error(AUTH_ERR['User already registered']);
  if (!data.session) return '確認信已寄出，點信裡的連結就完成註冊（進度會跟著帶過去）';
  await cloudUser(data.session.user);
  CLOUD.dirty = true;
  await cloudPush();
  return '註冊完成，進度已存到這個帳號';
}
/* 登入：帳號有雲端存檔就換成它（這台裝置的訪客進度不保留）；還沒有就把目前進度存上去 */
async function authLogin(email, password) {
  const { data, error } = await CLOUD.sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authMsg(error));
  await cloudUser(data.user);
  const remote = await cloudFetch();
  if (remote && remote.v >= 10) {
    /* small-screens S02：本機有訪客進度＝先出兩步確認卡（主鈕取消、危險次鈕確認登入並覆蓋），不直接換 */
    if (guestHas()) return authCfAsk(remote, 'login');
    useSave(remote);
    return '已登入，載入這個帳號的存檔';
  }
  CLOUD.dirty = true;
  await cloudPush();
  return '已登入，目前進度存到這個帳號';
}
async function authReset(email) {
  const { error } = await CLOUD.sb.auth.resetPasswordForEmail(email, { redirectTo: authBack() });
  if (error) throw new Error(authMsg(error));
  return '重設密碼信已寄出，點信裡的連結回來設定新密碼';
}
async function authNewPw(_, password) {
  const { data, error } = await CLOUD.sb.auth.updateUser({ password });
  if (error) throw new Error(authMsg(error));
  AUTH.recovery = false;
  history.replaceState(null, '', location.pathname + location.search);
  await cloudUser(data.user);
  const remote = await cloudFetch();
  if (remote && remote.v >= 10) {
    if (guestHas()) return authCfAsk(remote, 'newpw');
    useSave(remote);
  }
  return '新密碼設定好了';
}
/* 登出：先把進度存上去，這台裝置改回全新的訪客（本機進度留著，之後存到新的訪客身分） */
async function authLogout() {
  if (CLOUD.dirty) await cloudPush();
  await CLOUD.sb.auth.signOut();
  const r = await CLOUD.sb.auth.signInAnonymously();
  if (r.error) throw new Error(authMsg(r.error));
  await cloudUser(r.data.user);
  return '已登出';
}
/* ---------- 登入覆蓋訪客進度的確認卡（small-screens S02）：兩步、不用長按；取消＝登出回訪客、本機進度不動 ---------- */
const AUTH_CF = { on: 0, r: null, k: '' };
/* 本機有訪客進度：有任何角色經驗或倉庫物品 */
const guestHas = () => !!S && (S.lv > 1 || S.xp > 0 || (S.inv && S.inv.items.length > 0));
function authCfAsk(remote, k) {
  Object.assign(AUTH_CF, { on: 1, r: remote, k });
  authCfDraw();
  return '這個帳號已有雲端存檔：確認後才會覆蓋這台裝置的進度';
}
function authCfHTML() {
  const r = AUTH_CF.r || {};
  return `<div class="acfs" data-acf="0"></div><div class="acf" role="alertdialog" aria-modal="true" aria-labelledby="acft">
  <b id="acft">登入會覆蓋這台裝置的訪客進度</b>
  <p class="acfd">這個帳號已有雲端存檔（角色 Lv ${r.lv || 1}）。登入後改用雲端存檔，這台裝置的訪客進度（角色 Lv ${S.lv}）會被覆蓋。</p>
  <p class="acfo">想保留目前進度：按取消，改用「註冊」開新帳號，進度會跟著帶過去。</p>
  <div class="acfw"><b>⚠ 訪客進度覆蓋後不能復原</b><small>訪客進度：角色 Lv ${S.lv}・金 ${Math.floor(S.gold || 0).toLocaleString('en-US')}・倉庫 ${S.inv.items.length} 件</small></div>
  <button class="btn acfy" data-acf="1">確認登入並覆蓋</button><button class="btn pri acfn" data-acf="0">取消</button></div>`;
}
function authCfDraw() {
  const el = $('authcf');
  if (!el) return;
  el.hidden = !AUTH_CF.on;
  el.innerHTML = AUTH_CF.on ? authCfHTML() : '';
  if (AUTH_CF.on) el.querySelector('.acfn').focus();
}
/* yes＝載入雲端存檔；否則登出、換回全新的訪客（本機存檔照舊，之後存到新的訪客身分） */
async function authCf(yes) {
  if (!AUTH_CF.on) return;
  const r = AUTH_CF.r;
  Object.assign(AUTH_CF, { on: 0, r: null });
  authCfDraw();
  if (yes) {
    useSave(r);
    Object.assign(AUTH, { msg: '已登入，載入這個帳號的存檔', err: false });
  } else {
    try {
      if (CLOUD.sb) {
        await CLOUD.sb.auth.signOut();
        const a = await CLOUD.sb.auth.signInAnonymously();
        if (a.error) throw new Error(authMsg(a.error));
        await cloudUser(a.data.user);
        CLOUD.dirty = true;
      }
      Object.assign(AUTH, { msg: '已取消，仍是訪客；這台裝置的進度沒動', err: false });
    } catch (e) {
      Object.assign(AUTH, { msg: e.message, err: true });
    }
  }
  hudPanels();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-acf]');
  if (b) authCf(b.dataset.acf === '1');
});
const AUTHF = { register: authRegister, login: authLogin, reset: authReset, newpw: authNewPw, logout: authLogout };
async function authDo(k) {
  /* 按 Enter 送出時焦點還在輸入框，hudPanels 會跳過重畫 */
  if (document.activeElement) document.activeElement.blur();
  const em = AUTH.em.trim().toLowerCase(),
    pw = AUTH.pw;
  const need =
    k === 'logout'
      ? ''
      : k === 'reset'
        ? em
          ? ''
          : '請輸入信箱'
        : k === 'newpw'
          ? pw.length < 6
            ? '密碼至少 6 個字'
            : ''
          : !em || pw.length < 6
            ? '請輸入信箱和密碼（至少 6 個字）'
            : '';
  if (!CLOUD.sb) Object.assign(AUTH, { msg: '雲端還沒連線', err: true });
  else if (need) Object.assign(AUTH, { msg: need, err: true });
  else {
    Object.assign(AUTH, { busy: true, msg: '處理中…', err: false });
    hudPanels();
    try {
      AUTH.msg = await AUTHF[k](em, pw);
      AUTH.pw = '';
    } catch (e) {
      Object.assign(AUTH, { msg: e.message, err: true });
    }
    AUTH.busy = false;
  }
  hudPanels();
}
document.addEventListener('input', e => {
  if (e.target.id === 'aem') AUTH.em = e.target.value;
  if (e.target.id === 'apw') AUTH.pw = e.target.value;
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ac]');
  if (b && !AUTH.busy) authDo(b.dataset.ac);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.target.id === 'aem' || e.target.id === 'apw')) authDo(AUTH.recovery ? 'newpw' : 'login');
});
