-- Visuioration initial schema.
-- Every business record belongs to a workspace. Access is enforced with Row Level Security:
-- every member can read their workspace's data; owners, admins and members can write it; viewers are read-only.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.project_status as enum ('active', 'in_review', 'draft', 'archived');
create type public.dataset_status as enum ('uploading', 'processing', 'ready', 'needs_review', 'failed');
create type public.dataset_source as enum ('csv', 'excel', 'google_sheets', 'api');
create type public.report_status as enum ('draft', 'published', 'scheduled');
create type public.share_resource as enum ('report', 'dashboard', 'visualization');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- "Acme Analytics" -> "acme-analytics-3f9k2a". The random suffix keeps slugs unique without a lookup loop.
create or replace function public.workspace_slug(workspace_name text)
returns text
language sql
volatile
as $$
  select coalesce(nullif(trim(both '-' from left(regexp_replace(lower(workspace_name), '[^a-z0-9]+', '-', 'g'), 60)), ''), 'workspace')
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  job_title text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  -- URL-safe identifier, unique across the platform. Set automatically on insert and kept stable on rename.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  description text not null default '',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_workspace_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.workspace_slug(new.name);
  end if;
  return new;
end;
$$;

create trigger workspaces_set_slug before insert on public.workspaces for each row execute function public.set_workspace_slug();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  slug text not null,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  source public.dataset_source not null default 'csv',
  status public.dataset_status not null default 'uploading',
  storage_path text,
  file_name text,
  size_bytes bigint,
  row_count integer,
  column_count integer,
  columns jsonb not null default '[]'::jsonb,
  error_message text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index datasets_workspace_idx on public.datasets (workspace_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  slug text not null,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  status public.project_status not null default 'draft',
  dataset_id uuid references public.datasets (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index projects_workspace_idx on public.projects (workspace_id);

create table public.visualizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  dataset_id uuid references public.datasets (id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  kind text not null check (kind in ('line', 'bar', 'area', 'donut', 'scatter', 'table', 'kpi', 'heatmap')),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visualizations_workspace_idx on public.visualizations (workspace_id);

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  -- Ordered list of { visualization_id, size } entries.
  layout jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dashboards_workspace_idx on public.dashboards (workspace_id);
create unique index dashboards_one_default_per_workspace on public.dashboards (workspace_id) where is_default;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  slug text not null,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  period text not null default '',
  status public.report_status not null default 'draft',
  -- Ordered list of { type, config } section entries.
  sections jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create index reports_workspace_idx on public.reports (workspace_id);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  resource_type public.share_resource not null,
  resource_id uuid not null,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index shares_workspace_idx on public.shares (workspace_id);
create index shares_resource_idx on public.shares (resource_type, resource_id);

-- updated_at triggers
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger datasets_updated_at before update on public.datasets for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger visualizations_updated_at before update on public.visualizations for each row execute function public.set_updated_at();
create trigger dashboards_updated_at before update on public.dashboards for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership checks. SECURITY DEFINER avoids recursive RLS on workspace_members.
-- ---------------------------------------------------------------------------
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace and user_id = auth.uid() and role = any (allowed)
  );
$$;

create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(target_workspace, array['owner', 'admin', 'member']::public.workspace_role[]);
$$;

create or replace function public.shares_workspace_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and theirs.user_id = other_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Workspace creation and signup bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.create_workspace(workspace_name text, workspace_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  insert into public.workspaces (name, description, created_by)
  values (trim(workspace_name), coalesce(workspace_description, ''), auth.uid())
  returning id into new_id;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_id, auth.uid(), 'owner');
  return new_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  new_workspace uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, display_name)
  on conflict (id) do nothing;

  insert into public.workspaces (name, created_by)
  values (display_name || '''s workspace', new.id)
  returning id into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.datasets enable row level security;
alter table public.projects enable row level security;
alter table public.visualizations enable row level security;
alter table public.dashboards enable row level security;
alter table public.reports enable row level security;
alter table public.shares enable row level security;

-- profiles
create policy "profiles: read self and teammates" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_workspace_with(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- workspaces (creation goes through create_workspace())
create policy "workspaces: members read" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy "workspaces: owners and admins update" on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "workspaces: owners delete" on public.workspaces
  for delete to authenticated using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

-- workspace_members
create policy "members: members read" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members: owners and admins add" on public.workspace_members
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner');
create policy "members: owners and admins change roles" on public.workspace_members
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner');
create policy "members: owners and admins remove, anyone leaves" on public.workspace_members
  for delete to authenticated
  using (
    role <> 'owner'
    and (user_id = auth.uid() or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  );

-- Workspace-scoped content tables share the same policy shape.
do $$
declare
  t text;
begin
  foreach t in array array['datasets', 'projects', 'visualizations', 'dashboards', 'reports', 'shares'] loop
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "%1$s: writers insert" on public.%1$I for insert to authenticated with check (public.can_edit_workspace(workspace_id))', t);
    execute format('create policy "%1$s: writers update" on public.%1$I for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id))', t);
    execute format('create policy "%1$s: writers delete" on public.%1$I for delete to authenticated using (public.can_edit_workspace(workspace_id))', t);
  end loop;
end;
$$;

-- Content cannot be moved between workspaces.
create or replace function public.prevent_workspace_change()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id <> old.workspace_id then
    raise exception 'workspace_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger datasets_lock_workspace before update on public.datasets for each row execute function public.prevent_workspace_change();
create trigger projects_lock_workspace before update on public.projects for each row execute function public.prevent_workspace_change();
create trigger visualizations_lock_workspace before update on public.visualizations for each row execute function public.prevent_workspace_change();
create trigger dashboards_lock_workspace before update on public.dashboards for each row execute function public.prevent_workspace_change();
create trigger reports_lock_workspace before update on public.reports for each row execute function public.prevent_workspace_change();
create trigger shares_lock_workspace before update on public.shares for each row execute function public.prevent_workspace_change();

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects stored under "<workspace_id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('datasets', 'datasets', false, 52428800)
on conflict (id) do nothing;

create policy "dataset files: members read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'datasets'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from public.workspace_members where user_id = auth.uid()
    )
  );

create policy "dataset files: writers upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'datasets'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  );

create policy "dataset files: writers delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'datasets'
    and (storage.foldername(name))[1] in (
      select workspace_id::text from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'member')
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (Supabase grants table privileges to these roles by default; stated explicitly here).
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Clean-up: a workspace with no members left (for example after its only user deletes their account) is removed.
-- ---------------------------------------------------------------------------
create or replace function public.delete_empty_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.workspaces w
  where w.id = old.workspace_id
    and not exists (select 1 from public.workspace_members m where m.workspace_id = old.workspace_id);
  return null;
end;
$$;

create trigger workspace_members_cleanup
  after delete on public.workspace_members
  for each row execute function public.delete_empty_workspace();
