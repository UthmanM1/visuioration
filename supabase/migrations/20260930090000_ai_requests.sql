-- Phase 5: audit log and rate limiting for AI questions.
-- Stores the question and outcome (not the answer or any data values).

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  question text not null check (char_length(question) between 1 and 500),
  status text not null check (status in ('answered', 'cannot_answer', 'failed')),
  dataset_id uuid references public.datasets (id) on delete set null,
  model text,
  input_tokens integer,
  output_tokens integer,
  -- true when every number in the model's wording was verified against query results.
  verified boolean,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index ai_requests_user_time_idx on public.ai_requests (user_id, created_at desc);
create index ai_requests_workspace_idx on public.ai_requests (workspace_id, created_at desc);

alter table public.ai_requests enable row level security;

-- Users log their own requests in workspaces they belong to, and can read their own history.
create policy "ai_requests: insert own" on public.ai_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "ai_requests: read own" on public.ai_requests
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Owners and admins can review usage in their workspace.
create policy "ai_requests: admins read workspace" on public.ai_requests
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

grant select, insert on public.ai_requests to authenticated;
