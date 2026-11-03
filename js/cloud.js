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
