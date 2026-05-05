create extension if not exists "pgcrypto";

create table if not exists public.trade_points (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 1),
  address text not null check (length(trim(address)) > 4),
  latitude double precision not null,
  longitude double precision not null,
  facade_image_url text,
  description text,
  available_days text[] not null default '{}',
  opening_time text not null,
  closing_time text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.trade_points enable row level security;

drop policy if exists "trade_points_select_auth" on public.trade_points;
create policy "trade_points_select_auth"
on public.trade_points for select to authenticated
using (true);

drop policy if exists "trade_points_select_anon" on public.trade_points;
create policy "trade_points_select_anon"
on public.trade_points for select to anon
using (true);

drop policy if exists "trade_points_insert_auth" on public.trade_points;
create policy "trade_points_insert_auth"
on public.trade_points for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "trade_points_update_own" on public.trade_points;
create policy "trade_points_update_own"
on public.trade_points for update to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "trade_points_delete_own" on public.trade_points;
create policy "trade_points_delete_own"
on public.trade_points for delete to authenticated
using (auth.uid() = created_by);

insert into storage.buckets (id, name, public)
values ('trade-point-facades', 'trade-point-facades', true)
on conflict (id) do nothing;

drop policy if exists "trade_point_facades_upload_auth" on storage.objects;
create policy "trade_point_facades_upload_auth"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trade-point-facades'
  and auth.uid() is not null
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
);

drop policy if exists "trade_point_facades_read_public" on storage.objects;
create policy "trade_point_facades_read_public"
on storage.objects for select
using (bucket_id = 'trade-point-facades');
