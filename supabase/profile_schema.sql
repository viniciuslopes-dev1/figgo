alter table if exists public.profiles
add column if not exists cover_url text;

alter table if exists public.profiles
add column if not exists followers_count integer not null default 0;

alter table if exists public.profiles
add column if not exists following_count integer not null default 0;

alter table if exists public.profiles
add column if not exists album_total_stickers integer;

alter table if exists public.profiles
add column if not exists album_total_collected integer;

alter table if exists public.profiles
add column if not exists album_total_repeated integer;

alter table if exists public.profiles
add column if not exists album_progress_percent integer;

update public.profiles
set followers_count = 0
where followers_count is null;

update public.profiles
set following_count = 0
where following_count is null;
