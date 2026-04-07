-- Shared Living App — full Supabase schema (single file)
-- Run in Supabase SQL Editor (greenfield) or: supabase db push
-- Auth → Email: disable "Confirm email" for instant login in dev.

create extension if not exists "pgcrypto";

-- Profiles: display identity (username). id = auth.users.id
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(trim(username)) >= 1)
);

create unique index profiles_username_lower on public.profiles (lower(trim(username)));

-- Shared household container
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Household',
  created_at timestamptz not null default now()
);

-- Membership + role (owner / admin / member)
create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  primary key (household_id, user_id)
);

create index household_members_user_id_idx on public.household_members (user_id);

-- Case-insensitive username lookup for invites (returns at most one row)
create or replace function public.profile_lookup_by_username(lookup text)
returns table (id uuid, username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where lower(trim(p.username)) = lower(trim(lookup))
  limit 1;
$$;

revoke all on function public.profile_lookup_by_username(text) from public;
grant execute on function public.profile_lookup_by_username(text) to authenticated;

-- RLS helpers: policies must not subquery household_members directly (infinite recursion).
create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
  );
$$;

create or replace function public.hm_actor_is_owner_or_admin(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.role in ('owner', 'admin')
  );
$$;

create or replace function public.hm_actor_is_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.role = 'owner'
  );
$$;

create or replace function public.hm_actor_is_admin(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.role = 'admin'
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.hm_actor_is_owner_or_admin(uuid) from public;
revoke all on function public.hm_actor_is_owner(uuid) from public;
revoke all on function public.hm_actor_is_admin(uuid) from public;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.hm_actor_is_owner_or_admin(uuid) to authenticated;
grant execute on function public.hm_actor_is_owner(uuid) to authenticated;
grant execute on function public.hm_actor_is_admin(uuid) to authenticated;

-- Atomically create household + owner row (avoids RLS failure on insert+select from client)
create or replace function public.create_household_as_owner()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  perform set_config('row_security', 'off', true);

  insert into public.households (name) values ('Household') returning id into new_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_id, (select auth.uid()), 'owner');

  return new_id;
end;
$$;

revoke all on function public.create_household_as_owner() from public;
grant execute on function public.create_household_as_owner() to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Profiles
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Households: visible to members (uses helper to avoid RLS recursion on household_members)
create policy "households_select_member"
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

create policy "households_insert_authenticated"
  on public.households for insert
  to authenticated
  with check (true);

create policy "hm_select_member"
  on public.household_members for select
  to authenticated
  using (public.is_household_member(household_id));

-- Insert: bootstrap as owner (self), or owner/admin invites another user
create policy "hm_insert"
  on public.household_members for insert
  to authenticated
  with check (
    (user_id = (select auth.uid()) and role = 'owner')
    or public.hm_actor_is_owner_or_admin(household_id)
  );

-- Delete: owner removes non-owner; admin removes plain members only; users can remove self
create policy "hm_delete"
  on public.household_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.hm_actor_is_owner(household_id)
      and household_members.role <> 'owner'
    )
    or (
      public.hm_actor_is_admin(household_id)
      and household_members.role = 'member'
    )
  );

-- Update roles: household owner only
create policy "hm_update_owner"
  on public.household_members for update
  to authenticated
  using (public.hm_actor_is_owner(household_id))
  with check (public.hm_actor_is_owner(household_id));
