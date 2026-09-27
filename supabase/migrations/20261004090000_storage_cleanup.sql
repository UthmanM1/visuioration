-- Scheduled clean-up of dataset files whose database records no longer exist.
--
-- A file in the private "datasets" bucket is an orphan only when ALL of these hold:
--   * its path is <workspace uuid>/<dataset uuid>/<file>          (anything else is never touched)
--   * no dataset with that id exists in that same workspace         (ownership is part of the check)
--   * it is older than the grace period                             (never races an upload in progress)
-- Files of active datasets therefore can't be selected. Deletion itself goes through the Storage API
-- (see app/api/cron/storage-cleanup/route.ts), which re-checks every file immediately before removing it.

create or replace function public.storage_orphan_candidates(p_min_age_seconds integer default 86400, p_limit integer default 500)
returns table (name text, workspace_id uuid, dataset_id uuid, created_at timestamptz, reason text)
language sql
stable
security definer
set search_path = public, storage
as $$
  with parsed as (
    select o.name, o.created_at,
           (storage.foldername(o.name))[1] as ws_text,
           (storage.foldername(o.name))[2] as ds_text
    from storage.objects o
    where o.bucket_id = 'datasets'
      and o.created_at < now() - make_interval(secs => greatest(p_min_age_seconds, 3600))
  )
  select p.name, p.ws_text::uuid, p.ds_text::uuid, p.created_at,
         case when not exists (select 1 from public.workspaces w where w.id = p.ws_text::uuid) then 'workspace_deleted' else 'dataset_deleted' end
  from parsed p
  where p.ws_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and p.ds_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and not exists (
      select 1 from public.datasets d
      where d.id = p.ds_text::uuid and d.workspace_id = p.ws_text::uuid
    )
  order by p.created_at
  limit least(greatest(p_limit, 1), 1000);
$$;

-- Re-check just before deletion: returns the subset of names that are still orphans.
create or replace function public.storage_orphans_recheck(p_names text[], p_min_age_seconds integer default 86400)
returns setof text
language sql
stable
security definer
set search_path = public, storage
as $$
  select c.name
  from public.storage_orphan_candidates(p_min_age_seconds, 1000) c
  where c.name = any (p_names);
$$;

-- One row per clean-up run, for monitoring and retries.
create table public.storage_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  dry_run boolean not null default false,
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  candidates integer not null default 0,
  deleted integer not null default 0,
  failed integer not null default 0,
  rate_limit_rows_removed integer not null default 0,
  error text
);
alter table public.storage_cleanup_runs enable row level security;
revoke all on public.storage_cleanup_runs from public, anon, authenticated;

revoke execute on function public.storage_orphan_candidates(integer, integer) from public, anon, authenticated;
revoke execute on function public.storage_orphans_recheck(text[], integer) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.storage_orphan_candidates(integer, integer) to service_role';
    execute 'grant execute on function public.storage_orphans_recheck(text[], integer) to service_role';
    execute 'grant select, insert, update on public.storage_cleanup_runs to service_role';
  end if;
end;
$$;
