-- Phase 2: dataset columns, previews and processing metadata.
-- Files live in the private "datasets" bucket at <workspace_id>/<dataset_id>/<file name>.

alter table public.datasets drop column if exists columns;
alter table public.datasets
  add column if not exists issues jsonb not null default '[]'::jsonb,
  add column if not exists processed_at timestamptz;

-- Lets child tables reference (dataset_id, workspace_id) so a row can never point at another workspace's dataset.
alter table public.datasets add constraint datasets_id_workspace_key unique (id, workspace_id);

create table public.dataset_columns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null,
  workspace_id uuid not null,
  position integer not null check (position >= 0),
  name text not null check (char_length(name) between 1 and 200),
  data_type text not null check (data_type in ('text', 'integer', 'decimal', 'currency', 'percent', 'boolean', 'date')),
  null_count integer not null default 0,
  distinct_count integer not null default 0,
  -- true when distinct values exceeded the tracking limit, so distinct_count is a lower bound.
  distinct_capped boolean not null default false,
  min_value text,
  max_value text,
  sample_values jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (dataset_id, position),
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on delete cascade
);
create index dataset_columns_dataset_idx on public.dataset_columns (dataset_id);

create table public.dataset_previews (
  dataset_id uuid primary key,
  workspace_id uuid not null,
  -- First rows of the file as an array of arrays, in column order.
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on delete cascade
);

alter table public.dataset_columns enable row level security;
alter table public.dataset_previews enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['dataset_columns', 'dataset_previews'] loop
    execute format('create policy "%1$s: members read" on public.%1$I for select to authenticated using (public.is_workspace_member(workspace_id))', t);
    execute format('create policy "%1$s: writers insert" on public.%1$I for insert to authenticated with check (public.can_edit_workspace(workspace_id))', t);
    execute format('create policy "%1$s: writers update" on public.%1$I for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id))', t);
    execute format('create policy "%1$s: writers delete" on public.%1$I for delete to authenticated using (public.can_edit_workspace(workspace_id))', t);
  end loop;
end;
$$;

grant select, insert, update, delete on public.dataset_columns, public.dataset_previews to authenticated;

-- Files may only be written inside a folder named after a dataset that exists in the same workspace.
-- "objects.name" must be qualified: inside the subquery an unqualified "name" would resolve to datasets.name.
drop policy if exists "dataset files: writers upload" on storage.objects;
create policy "dataset files: writers upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'datasets'
    and exists (
      select 1
      from public.datasets d
      join public.workspace_members m on m.workspace_id = d.workspace_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'member')
        and d.workspace_id::text = (storage.foldername(objects.name))[1]
        and d.id::text = (storage.foldername(objects.name))[2]
    )
  );
