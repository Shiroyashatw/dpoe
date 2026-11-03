-- dungeonPOE 雲端存檔（跟《塞令老師》的 public.saves 分開）：在 Supabase SQL Editor 跑一次
create table if not exists public.dungeon_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  game_version text,
  updated_at timestamptz not null default now()
);
alter table public.dungeon_saves enable row level security;
drop policy if exists "dungeon_saves_own" on public.dungeon_saves;
create policy "dungeon_saves_own" on public.dungeon_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
