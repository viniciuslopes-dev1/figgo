create extension if not exists "pgcrypto";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('like', 'comment', 'trade_point', 'trade_point_post', 'reply', 'system')),
  reference_id uuid,
  reference_type text check (reference_type in ('post', 'comment', 'trade_point', 'system')),
  content text not null check (length(trim(content)) > 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_read_idx on public.notifications (user_id, is_read);
create unique index if not exists notifications_like_unique
  on public.notifications (user_id, from_user_id, reference_id, type)
  where type = 'like';

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  device_id text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_user_device_unique unique (user_id, device_id)
);

create index if not exists user_push_tokens_user_idx on public.user_push_tokens (user_id);

create or replace function public.touch_user_push_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_push_tokens_updated_at on public.user_push_tokens;
create trigger trg_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row
execute procedure public.touch_user_push_tokens_updated_at();

alter table public.notifications enable row level security;
alter table public.user_push_tokens enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_insert_target_or_sender" on public.notifications;
create policy "notifications_insert_target_or_sender"
on public.notifications for insert to authenticated
with check (
  auth.uid() = user_id
  or auth.uid() = from_user_id
);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_push_tokens_select_own" on public.user_push_tokens;
create policy "user_push_tokens_select_own"
on public.user_push_tokens for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_push_tokens_insert_own" on public.user_push_tokens;
create policy "user_push_tokens_insert_own"
on public.user_push_tokens for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_update_own" on public.user_push_tokens;
create policy "user_push_tokens_update_own"
on public.user_push_tokens for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_delete_own" on public.user_push_tokens;
create policy "user_push_tokens_delete_own"
on public.user_push_tokens for delete to authenticated
using (auth.uid() = user_id);
