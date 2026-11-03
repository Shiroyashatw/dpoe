/* dungeonPOE · 市集（真人交易，Supabase 表 dungeon_market）：上架、買、下架、領錢；連不上雲端就不能用 */
'use strict';
const MK = { list: [], mine: [], owed: 0, err: '', busy: false, at: 0 };
const mkOn = () => typeof CLOUD !== 'undefined' && CLOUD.sb && CLOUD.uid;
const mkErr = e =>
  (MK.err = /relation|does not exist|function/.test(e.message || '')
    ? '市集還沒開張（資料表還沒建立）'
    : '連不上市集：' + (e.message || e));
async function mkLoad() {
  if (!mkOn()) return (MK.err = '市集要連上雲端才能用');
  MK.busy = true;
  try {
    const T = () => CLOUD.sb.from('dungeon_market'),
      [a, b] = await Promise.all([
        T()
          .select('id,seller_name,item,price,kind')
          .eq('status', 'open')
          .neq('seller', CLOUD.uid)
          .order('created_at', { ascending: false })
          .limit(60),
        T()
          .select('id,item,price,status,claimed')
          .eq('seller', CLOUD.uid)
          .in('status', ['open', 'sold'])
          .eq('claimed', false)
      ]);
    if (a.error || b.error) throw a.error || b.error;
    MK.list = a.data.map(r => ({ ...r, o: cleanItem(r.item) })).filter(r => r.o);
    MK.mine = b.data.map(r => ({ ...r, o: cleanItem(r.item) })).filter(r => r.o);
    MK.owed = MK.mine.filter(r => r.status === 'sold').reduce((s, r) => s + fl(r.price * 0.9), 0);
    MK.err = '';
    MK.at = Date.now();
  } catch (e) {
    mkErr(e);
  }
  MK.busy = false;
}
/* 上架：先從倉庫拿出來，送出失敗就放回去 */
async function mkSell(u, price) {
  const i = S.wh.findIndex(o => o.u === u);
  if (i < 0 || !mkOn() || !(price >= 1 && price <= 99999)) return false;
  const o = S.wh.splice(i, 1)[0];
  save();
  const { error } = await CLOUD.sb
    .from('dungeon_market')
    .insert({ seller_name: S.name, item: { id: o.id, a: o.a }, kind: baseOf(o).k, price: Math.round(price) });
  if (error) {
    S.wh.push(o);
    save();
    mkErr(error);
    return false;
  }
  return true;
}
async function mkBuy(id) {
  const r = MK.list.find(x => x.id === id);
  if (!r || S.gold < r.price || !mkOn()) return false;
  const { data, error } = await CLOUD.sb.rpc('market_buy', { p_id: id });
  if (error) return mkErr(error), false;
  MK.list = MK.list.filter(x => x.id !== id);
  const o = data && cleanItem(data.item);
  if (!o) return false;
  S.gold -= data.price;
  S.wh.push(o);
  save();
  return o;
}
async function mkCancel(id) {
  if (!mkOn()) return false;
  const { data, error } = await CLOUD.sb.rpc('market_cancel', { p_id: id });
  if (error) return mkErr(error), false;
  MK.mine = MK.mine.filter(x => x.id !== id);
  const o = cleanItem(data);
  if (o) {
    S.wh.push(o);
    save();
  }
  return !!o;
}
async function mkClaim() {
  if (!mkOn()) return 0;
  const { data, error } = await CLOUD.sb.rpc('market_claim');
  if (error) return mkErr(error), 0;
  S.gold += data || 0;
  MK.mine = MK.mine.filter(r => r.status !== 'sold');
  MK.owed = 0;
  save();
  return data || 0;
}
