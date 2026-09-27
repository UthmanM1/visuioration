-- Phase 3: queryable dataset rows, saved visualizations and the chart query function.

-- ---------------------------------------------------------------------------
-- Dataset rows: every data row, converted to its column types, as a JSON array in column order.
-- ---------------------------------------------------------------------------
create table public.dataset_rows (
  dataset_id uuid not null,
  workspace_id uuid not null,
  row_number integer not null check (row_number > 0),
  cells jsonb not null check (jsonb_typeof(cells) = 'array'),
  primary key (dataset_id, row_number),
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on delete cascade
);

alter table public.dataset_rows enable row level security;

-- Subquery form (evaluated once per statement) rather than a per-row function call: queries scan many rows.
create policy "dataset_rows: members read" on public.dataset_rows
  for select to authenticated
  using (workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id = (select auth.uid())));
create policy "dataset_rows: writers insert" on public.dataset_rows
  for insert to authenticated
  with check (workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'member')));
create policy "dataset_rows: writers delete" on public.dataset_rows
  for delete to authenticated
  using (workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'member')));

grant select, insert, delete on public.dataset_rows to authenticated;

-- rows_loaded_at is set once every row is in dataset_rows; query_row_count may be lower than row_count if capped.
alter table public.datasets
  add column if not exists rows_loaded_at timestamptz,
  add column if not exists query_row_count integer;

-- ---------------------------------------------------------------------------
-- Visualizations: a chart definition (JSON) against one dataset.
-- ---------------------------------------------------------------------------
alter table public.visualizations
  add column if not exists pinned boolean not null default false,
  add constraint visualizations_config_is_object check (jsonb_typeof(config) = 'object');

-- Links to datasets must stay inside the same workspace.
alter table public.visualizations drop constraint if exists visualizations_dataset_id_fkey;
alter table public.visualizations
  add constraint visualizations_dataset_same_workspace
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on delete set null (dataset_id);

alter table public.projects drop constraint if exists projects_dataset_id_fkey;
alter table public.projects
  add constraint projects_dataset_same_workspace
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on delete set null (dataset_id);

create index if not exists visualizations_dataset_idx on public.visualizations (dataset_id);

-- ---------------------------------------------------------------------------
-- query_dataset: aggregates dataset_rows for a chart.
--
-- Spec (all column references are positions from dataset_columns):
--   x       { col, grain? }            grouping column; grain for dates: day | week | month | quarter | year
--   y       { col?, agg }              agg: count | count_distinct | sum | avg | min | max
--   series  { col } | null             split into series (text or boolean column)
--   filters [{ col, op, value }]       op: eq | neq | in | not_in | contains | gt | gte | lt | lte | empty | not_empty
--   range   { col, from?, to? } | null inclusive date range on a date column
--   limit   max categories for text x (default 50, max 500)
--
-- Runs as the caller (SECURITY INVOKER), so row-level security limits it to the caller's workspaces.
-- Column types come from dataset_columns, never from the spec; values are passed as quoted literals.
-- ---------------------------------------------------------------------------
create or replace function public.query_dataset(p_dataset uuid, p_spec jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  col_types jsonb;
  x_col int; x_type text; x_grain text; x_expr text; x_order text;
  y_col int; y_type text; y_agg text; y_expr text;
  s_col int; s_type text; s_expr text := 'null::text';
  f jsonb; f_col int; f_type text; f_op text; f_val jsonb; cell text;
  conds text[] := array[]::text[];
  where_sql text;
  lim int := least(greatest(coalesce((p_spec ->> 'limit')::int, 50), 1), 500);
  max_series constant int := 8;
  x_is_category boolean;
  result jsonb;
begin
  if not exists (select 1 from datasets where id = p_dataset) then
    raise exception 'Dataset not found' using errcode = 'PT404'; -- PostgREST returns HTTP 404 for PT404
  end if;
  select coalesce(jsonb_object_agg(position::text, data_type), '{}'::jsonb) into col_types
  from dataset_columns where dataset_id = p_dataset;

  conds := conds || format('r.dataset_id = %L', p_dataset);

  -- Measure
  y_agg := coalesce(p_spec #>> '{y,agg}', 'count');
  if y_agg not in ('count', 'count_distinct', 'sum', 'avg', 'min', 'max') then
    raise exception 'Unsupported aggregation: %', y_agg using errcode = '22023';
  end if;
  if y_agg = 'count' then
    y_expr := 'count(*)';
  else
    y_col := (p_spec #>> '{y,col}')::int;
    y_type := col_types ->> y_col::text;
    if y_type is null then raise exception 'Unknown measure column' using errcode = '22023'; end if;
    if y_agg = 'count_distinct' then
      y_expr := format('count(distinct r.cells ->> %s)', y_col);
    elsif y_type in ('integer', 'decimal', 'currency', 'percent') then
      y_expr := format('%s((r.cells ->> %s)::numeric)', y_agg, y_col);
    else
      raise exception 'Only number columns can be summed or averaged' using errcode = '22023';
    end if;
  end if;

  -- Filters
  for f in select * from jsonb_array_elements(coalesce(p_spec -> 'filters', '[]'::jsonb)) loop
    f_col := (f ->> 'col')::int;
    f_type := col_types ->> f_col::text;
    f_op := f ->> 'op';
    f_val := f -> 'value';
    if f_type is null then raise exception 'Unknown filter column' using errcode = '22023'; end if;
    cell := format('(r.cells ->> %s)', f_col);
    conds := conds || case
      when f_op = 'empty' then format('%s is null', cell)
      when f_op = 'not_empty' then format('%s is not null', cell)
      when f_op in ('in', 'not_in') then
        format('%s %s any(%L::text[])', cell, case when f_op = 'in' then '=' else '<>' end,
          (select coalesce(array_agg(v), '{}') from jsonb_array_elements_text(f_val) v))
      when f_type in ('integer', 'decimal', 'currency', 'percent') and f_op in ('eq', 'neq', 'gt', 'gte', 'lt', 'lte') then
        format('(%s)::numeric %s %L::numeric', cell,
          case f_op when 'eq' then '=' when 'neq' then '<>' when 'gt' then '>' when 'gte' then '>=' when 'lt' then '<' else '<=' end,
          f_val #>> '{}')
      when f_type = 'date' and f_op in ('eq', 'gt', 'gte', 'lt', 'lte') then
        format('(%s)::timestamp %s %L::timestamp', cell,
          case f_op when 'eq' then '=' when 'gt' then '>' when 'gte' then '>=' when 'lt' then '<' else '<=' end,
          f_val #>> '{}')
      when f_op in ('eq', 'neq') then
        format('%s is %s distinct from %L', cell, case when f_op = 'eq' then 'not' else '' end, f_val #>> '{}')
      when f_op = 'contains' then
        format('%s ilike %L', cell, '%' || replace(replace(replace(f_val #>> '{}', '\', '\\'), '%', '\%'), '_', '\_') || '%')
      else null
    end;
    if conds[array_length(conds, 1)] is null then
      raise exception 'Unsupported filter "%" for a % column', f_op, f_type using errcode = '22023';
    end if;
  end loop;

  -- Date range
  if p_spec -> 'range' is not null and jsonb_typeof(p_spec -> 'range') = 'object' then
    f_col := (p_spec #>> '{range,col}')::int;
    if col_types ->> f_col::text is distinct from 'date' then
      raise exception 'Date ranges need a date column' using errcode = '22023';
    end if;
    if p_spec #>> '{range,from}' is not null then
      conds := conds || format('(r.cells ->> %s)::timestamp >= %L::timestamp', f_col, p_spec #>> '{range,from}');
    end if;
    if p_spec #>> '{range,to}' is not null then
      conds := conds || format('(r.cells ->> %s)::timestamp < (%L::date + 1)::timestamp', f_col, p_spec #>> '{range,to}');
    end if;
  end if;

  where_sql := array_to_string(conds, ' and ');

  -- Grouping column (none for a single KPI value)
  if p_spec -> 'x' is null or jsonb_typeof(p_spec -> 'x') <> 'object' then
    execute format(
      'select jsonb_build_object(''rows'', jsonb_build_array(jsonb_build_object(''x'', null, ''s'', null, ''v'', %1$s)), ''total'', %1$s, ''matched'', count(*), ''truncated_x'', false, ''truncated_series'', false) from dataset_rows r where %2$s',
      y_expr, where_sql)
    into result;
    return result;
  end if;

  x_col := (p_spec #>> '{x,col}')::int;
  x_type := col_types ->> x_col::text;
  if x_type is null then raise exception 'Unknown x-axis column' using errcode = '22023'; end if;
  x_grain := coalesce(p_spec #>> '{x,grain}', 'month');
  if x_type = 'date' then
    if x_grain not in ('day', 'week', 'month', 'quarter', 'year') then
      raise exception 'Unsupported date grain: %', x_grain using errcode = '22023';
    end if;
    x_expr := format('to_char(date_trunc(%L, (r.cells ->> %s)::timestamp), ''YYYY-MM-DD'')', x_grain, x_col);
    x_order := 'x';
    x_is_category := false;
    conds := conds || format('(r.cells ->> %s) is not null', x_col);
  elsif x_type in ('integer', 'decimal', 'currency', 'percent') then
    x_expr := format('(r.cells ->> %s)', x_col);
    x_order := 'x::numeric';
    x_is_category := false;
    conds := conds || format('(r.cells ->> %s) is not null', x_col);
  else
    x_expr := format('coalesce(r.cells ->> %s, ''(empty)'')', x_col);
    x_order := 'v desc nulls last, x';
    x_is_category := true;
  end if;
  where_sql := array_to_string(conds, ' and ');

  if p_spec -> 'series' is not null and jsonb_typeof(p_spec -> 'series') = 'object' then
    s_col := (p_spec #>> '{series,col}')::int;
    s_type := col_types ->> s_col::text;
    if s_type is null or s_type not in ('text', 'boolean') then
      raise exception 'Series can only be split by a text or yes/no column' using errcode = '22023';
    end if;
    s_expr := format('coalesce(r.cells ->> %s, ''(empty)'')', s_col);
  end if;

  -- One pass over the rows: GROUPING SETS returns every (x, series) group plus the grand total row.
  execute format($q$
    with scanned as (
      select grouping(%1$s, %2$s) as is_total, %1$s as x, %2$s as s, %3$s as v, count(*) as n
      from dataset_rows r where %4$s
      group by grouping sets ((%1$s, %2$s), ())
    ),
    grouped as (select x, s, v from scanned where is_total = 0),
    x_totals as (select x, %5$s as v from grouped group by x),
    top_x as (select x from x_totals order by %6$s limit %7$s),
    s_totals as (select s, %5$s as v from grouped group by s),
    top_s as (select s from s_totals order by v desc nulls last, s limit %8$s)
    select jsonb_build_object(
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object('x', g.x, 's', g.s, 'v', g.v) order by g.x, g.s)
        from grouped g
        where g.x in (select x from top_x) and (g.s is null or g.s in (select s from top_s))
      ), '[]'::jsonb),
      'total', (select v from scanned where is_total <> 0),
      'matched', coalesce((select n from scanned where is_total <> 0), 0),
      'truncated_x', (select count(*) from x_totals) > %7$s,
      'truncated_series', (select count(*) from s_totals where s is not null) > %8$s
    )
  $q$,
    x_expr, s_expr, y_expr, where_sql,
    -- Combining groups: counts and sums add up; for other aggregations the largest group decides the order.
    case when y_agg in ('count', 'count_distinct', 'sum') then 'sum(v)' when y_agg = 'min' then 'min(v)' else 'max(v)' end,
    case when x_is_category then 'v desc nulls last, x' else x_order end,
    case when x_is_category then lim else 1000 end,
    max_series)
  into result;
  return result;
end;
$$;

revoke execute on function public.query_dataset(uuid, jsonb) from public, anon;
grant execute on function public.query_dataset(uuid, jsonb) to authenticated;

