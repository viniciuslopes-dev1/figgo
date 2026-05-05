create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

update public.profiles
set username = lower(trim(username))
where username is not null;

update public.profiles
set username = null
where username = '';

alter table public.profiles
drop constraint if exists profiles_username_format;

alter table public.profiles
add constraint profiles_username_format
check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique_idx
on public.profiles ((lower(username)))
where username is not null;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now(),
  constraint posts_content_or_image check (coalesce(length(trim(content)), 0) > 0 or image_url is not null)
);

alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists content text;
alter table public.posts add column if not exists created_at timestamptz not null default now();

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_unique unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "profiles_select_auth" on public.profiles;
create policy "profiles_select_auth" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_select_anon" on public.profiles;
create policy "profiles_select_anon" on public.profiles for select to anon using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "posts_select_auth" on public.posts;
create policy "posts_select_auth" on public.posts for select to authenticated using (true);
drop policy if exists "posts_select_anon" on public.posts;
create policy "posts_select_anon" on public.posts for select to anon using (true);
drop policy if exists "posts_insert_auth" on public.posts;
create policy "posts_insert_auth" on public.posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "likes_select_auth" on public.post_likes;
create policy "likes_select_auth" on public.post_likes for select to authenticated using (true);
drop policy if exists "likes_select_anon" on public.post_likes;
create policy "likes_select_anon" on public.post_likes for select to anon using (true);
drop policy if exists "likes_insert_auth" on public.post_likes;
create policy "likes_insert_auth" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "likes_delete_own" on public.post_likes;
create policy "likes_delete_own" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "comments_select_auth" on public.post_comments;
create policy "comments_select_auth" on public.post_comments for select to authenticated using (true);
drop policy if exists "comments_select_anon" on public.post_comments;
create policy "comments_select_anon" on public.post_comments for select to anon using (true);
drop policy if exists "comments_insert_auth" on public.post_comments;
create policy "comments_insert_auth" on public.post_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comments_update_own" on public.post_comments;
create policy "comments_update_own" on public.post_comments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "comments_delete_own" on public.post_comments;
create policy "comments_delete_own" on public.post_comments for delete to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post_images_upload_auth" on storage.objects;
create policy "post_images_upload_auth"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and auth.uid() is not null
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
);

drop policy if exists "post_images_read_public" on storage.objects;
create policy "post_images_read_public"
on storage.objects for select
using (bucket_id = 'post-images');
