create extension if not exists "pgcrypto" with schema "extensions";

create schema if not exists "purchase-app";

create or replace function public.is_authorized_email(email_to_check text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(email_to_check)
      and deleted_at is null
  );
$$;

revoke all on function public.is_authorized_email(text) from public;
revoke all on function public.is_authorized_email(text) from anon;
revoke all on function public.is_authorized_email(text) from authenticated;
grant execute on function public.is_authorized_email(text) to service_role;

create table if not exists public."Profile" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  household_id uuid,
  first_name text,
  last_name text,
  email text,
  avatar_link text,
  created_at timestamp with time zone not null default now()
);

alter table public."Profile" enable row level security;

drop policy if exists "Users can view their own profile" on public."Profile";
create policy "Users can view their own profile"
on public."Profile"
for select
to authenticated
using (auth.uid() = user_id);

grant select on table public."Profile" to authenticated;
grant all on table public."Profile" to service_role;

create table if not exists "purchase-app"."Item" (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  quantity text not null default '',
  unit text not null default 'each',
  price text not null default '',
  purchase_date date,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table "purchase-app"."Item" enable row level security;

drop policy if exists "Users can view their own items" on "purchase-app"."Item";
create policy "Users can view their own items"
on "purchase-app"."Item"
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own items" on "purchase-app"."Item";
create policy "Users can insert their own items"
on "purchase-app"."Item"
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own items" on "purchase-app"."Item";
create policy "Users can update their own items"
on "purchase-app"."Item"
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own items" on "purchase-app"."Item";
create policy "Users can delete their own items"
on "purchase-app"."Item"
for delete
to authenticated
using (auth.uid() = user_id);

grant usage on schema "purchase-app" to authenticated;
grant usage on schema "purchase-app" to service_role;
grant select, insert, update, delete on table "purchase-app"."Item" to authenticated;
grant all on table "purchase-app"."Item" to service_role;