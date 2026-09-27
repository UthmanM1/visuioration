-- Phase 6: reports with sections, and expiring share links that serve a frozen snapshot.

alter table public.reports
  add constraint reports_sections_is_array check (jsonb_typeof(sections) = 'array'),
  add constraint reports_sections_limit check (jsonb_array_length(sections) <= 40);

-- A share link freezes the rendered report (text and chart results) at the moment it is created or refreshed.
-- Viewers of the link never run queries and never see anything outside the snapshot.
alter table public.shares
  add column if not exists label text not null default '' check (char_length(label) <= 120),
  add column if not exists snapshot jsonb,
  add column if not exists snapshot_at timestamptz,
  add constraint shares_token_format check (token ~ '^[0-9a-f]{64}$'),
  add constraint shares_expiry_after_creation check (expires_at is null or expires_at > created_at);

-- Only report links for now.
alter table public.shares
  add constraint shares_report_only check (resource_type = 'report');

-- A link must point at a report in the same workspace.
create or replace function public.check_share_resource()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from reports r where r.id = new.resource_id and r.workspace_id = new.workspace_id) then
    raise exception 'That report isn''t in this workspace.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger shares_check_resource
  before insert or update of resource_id, workspace_id on public.shares
  for each row execute function public.check_share_resource();

-- Deleting a report deletes its links.
create or replace function public.delete_report_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.shares where resource_type = 'report' and resource_id = old.id and workspace_id = old.workspace_id;
  return old;
end;
$$;

create trigger reports_delete_shares
  after delete on public.reports
  for each row execute function public.delete_report_shares();

revoke execute on function public.delete_report_shares() from public, anon, authenticated;

-- The only way anyone outside the workspace can read a report: by presenting a valid token.
-- Returns {status: "ok", ...snapshot fields} for a live link, {status: "expired"} for an expired or revoked one,
-- and null for anything else. Never returns data from other tables.
create or replace function public.get_shared_report(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s record;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select sh.snapshot, sh.snapshot_at, sh.expires_at, sh.revoked_at
    into s
    from shares sh
   where sh.token = p_token and sh.resource_type = 'report';
  if not found or s.snapshot is null then
    return null;
  end if;
  if s.revoked_at is not null or (s.expires_at is not null and s.expires_at <= now()) then
    return jsonb_build_object('status', 'expired');
  end if;
  return jsonb_build_object('status', 'ok', 'report', s.snapshot, 'snapshot_at', s.snapshot_at, 'expires_at', s.expires_at);
end;
$$;

revoke execute on function public.get_shared_report(text) from public;
grant execute on function public.get_shared_report(text) to anon, authenticated;
