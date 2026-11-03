-- dungeonPOE 市集（真人交易）：在 Supabase SQL Editor 跑一次
-- 上架：直接 insert（只能用自己的帳號）；買、下架、領錢：用下面的函式（一次只會成交一個人）
-- 注意：金幣和道具存在玩家自己的存檔（瀏覽器），伺服器不驗證道具是不是真的打到的
create table if not exists public.dungeon_market (
  id uuid primary key default gen_random_uuid(),
  seller uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seller_name text not null default '',
  item jsonb not null,
  kind text not null default '',
  price int not null check (price between 1 and 99999),
  status text not null default 'open' check (status in ('open', 'sold', 'cancel')),
  buyer uuid,
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create index if not exists dungeon_market_open on public.dungeon_market (status, created_at desc);
alter table public.dungeon_market enable row level security;
drop policy if exists "market_read" on public.dungeon_market;
create policy "market_read" on public.dungeon_market for select using (status = 'open' or seller = auth.uid() or buyer = auth.uid());
drop policy if exists "market_insert" on public.dungeon_market;
create policy "market_insert" on public.dungeon_market for insert
  with check (seller = auth.uid() and status = 'open' and buyer is null and not claimed
    and (select count(*) from public.dungeon_market m where m.seller = auth.uid() and m.status = 'open') < 20);

-- 買：成交就回傳道具（買不到回傳空的：被別人先買走、下架了、或是自己的）
create or replace function public.market_buy(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  update public.dungeon_market set status = 'sold', buyer = auth.uid(), sold_at = now()
    where id = p_id and status = 'open' and seller <> auth.uid() and auth.uid() is not null
    returning jsonb_build_object('item', item, 'price', price) into r;
  return r;
end $$;

-- 下架：還沒賣掉的拿回來
create or replace function public.market_cancel(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  update public.dungeon_market set status = 'cancel'
    where id = p_id and status = 'open' and seller = auth.uid()
    returning item into r;
  return r;
end $$;

-- 領錢：賣掉還沒領的，扣 10% 手續費
create or replace function public.market_claim()
returns int language plpgsql security definer set search_path = public as $$
declare total int;
begin
  with c as (
    update public.dungeon_market set claimed = true
      where seller = auth.uid() and status = 'sold' and not claimed
      returning price
  ) select coalesce(sum(floor(price * 0.9)), 0) into total from c;
  return total;
end $$;
revoke execute on function public.market_buy(uuid), public.market_cancel(uuid), public.market_claim() from public, anon;
grant execute on function public.market_buy(uuid), public.market_cancel(uuid), public.market_claim() to authenticated;
