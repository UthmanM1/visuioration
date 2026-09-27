-- Phase 4: dashboards with validated widget layouts.
--
-- dashboards.layout is an ordered JSON array of widgets:
--   [{ "id": "w_abc123", "visualizationId": "<uuid>", "size": "sm" | "md" | "lg" | "full", "height": "regular" | "tall" }]
-- Order in the array is display order.

alter table public.dashboards
  add constraint dashboards_layout_is_array check (jsonb_typeof(layout) = 'array');

-- Validates widget shape and that every widget points at a visualization in the same workspace.
create or replace function public.validate_dashboard_layout()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  widget jsonb;
  ids text[] := array[]::text[];
  viz uuid;
begin
  if jsonb_typeof(new.layout) is distinct from 'array' then
    raise exception 'Dashboard layout must be a list of widgets.' using errcode = '22023';
  end if;
  if jsonb_array_length(new.layout) > 50 then
    raise exception 'A dashboard can hold up to 50 widgets.' using errcode = '22023';
  end if;
  for widget in select * from jsonb_array_elements(new.layout) loop
    if jsonb_typeof(widget) <> 'object'
      or coalesce(widget ->> 'id', '') !~ '^[A-Za-z0-9_-]{1,40}$'
      or coalesce(widget ->> 'size', '') not in ('sm', 'md', 'lg', 'full')
      or coalesce(widget ->> 'height', '') not in ('regular', 'tall') then
      raise exception 'Invalid widget in dashboard layout.' using errcode = '22023';
    end if;
    if (widget ->> 'id') = any (ids) then
      raise exception 'Widget ids must be unique.' using errcode = '22023';
    end if;
    ids := ids || (widget ->> 'id');
    begin
      viz := (widget ->> 'visualizationId')::uuid;
    exception when others then
      raise exception 'Invalid widget in dashboard layout.' using errcode = '22023';
    end;
    if not exists (select 1 from visualizations v where v.id = viz and v.workspace_id = new.workspace_id) then
      raise exception 'A widget refers to a chart that isn''t in this workspace.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

create trigger dashboards_validate_layout
  before insert or update of layout on public.dashboards
  for each row execute function public.validate_dashboard_layout();

-- Deleting a chart removes its widgets from every dashboard in the workspace.
create or replace function public.remove_deleted_visualization_widgets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dashboards d
  set layout = coalesce((
    select jsonb_agg(w order by ord)
    from jsonb_array_elements(d.layout) with ordinality as e(w, ord)
    where w ->> 'visualizationId' <> old.id::text
  ), '[]'::jsonb)
  where d.workspace_id = old.workspace_id
    and d.layout @> jsonb_build_array(jsonb_build_object('visualizationId', old.id::text));
  return old;
end;
$$;

create trigger visualizations_remove_widgets
  after delete on public.visualizations
  for each row execute function public.remove_deleted_visualization_widgets();

revoke execute on function public.remove_deleted_visualization_widgets() from public, anon, authenticated;

create index if not exists dashboards_layout_gin on public.dashboards using gin (layout jsonb_path_ops);
