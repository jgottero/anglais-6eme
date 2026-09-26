-- =====================================================================
-- The family account's copy of the saves. See SAUVEGARDE.md.
--
-- Paste the whole file into Supabase: SQL Editor -> New query -> Run.
-- Running it again changes nothing.
--
-- One row per save the app keeps in localStorage, under the same key:
--
--     anglais-profiles-v1          the list of profiles
--     anglais-progress-v1:<id>     a profile's words, points and days
--     reward-property-v1:<id>      a profile's property
--
-- `rev` is moved on by the server at every write. The app only ever
-- updates a row on top of the revision it last read, so two telephones
-- cannot overwrite each other unseen.
-- =====================================================================

create table if not exists public.saves (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 120),
  data       jsonb       not null check (octet_length(data::text) < 2000000),
  rev        bigint      not null default 1,
  updated_at timestamptz not null default now(),
  primary key (owner, key)
);

-- A new row always starts at revision 1; each update moves it on by
-- one and stamps the time. Neither the owner nor the key ever changes.
create or replace function public.saves_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.rev := 1;
  else
    new.owner := old.owner;
    new.key := old.key;
    new.rev := old.rev + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists saves_stamp on public.saves;
create trigger saves_stamp
  before insert or update on public.saves
  for each row execute function public.saves_stamp();

-- Each family sees and writes its own rows, and nothing else.
alter table public.saves enable row level security;

drop policy if exists "saves: read own" on public.saves;
create policy "saves: read own" on public.saves
  for select to authenticated
  using ((select auth.uid()) = owner);

drop policy if exists "saves: add own" on public.saves;
create policy "saves: add own" on public.saves
  for insert to authenticated
  with check ((select auth.uid()) = owner);

drop policy if exists "saves: change own" on public.saves;
create policy "saves: change own" on public.saves
  for update to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

drop policy if exists "saves: remove own" on public.saves;
create policy "saves: remove own" on public.saves
  for delete to authenticated
  using ((select auth.uid()) = owner);

-- Signed-in families only; a visitor with the public key alone gets nothing.
revoke all on public.saves from anon;
grant select, insert, update, delete on public.saves to authenticated;
