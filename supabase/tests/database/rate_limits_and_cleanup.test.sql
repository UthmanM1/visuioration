-- Rate limiting and storage clean-up selection (pgTAP). Rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(24);

\set u1 '''a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'''
\set u2 '''b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2'''
\set as_u1 '''{"sub":"a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1","role":"authenticated"}'''
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  (:u1, 'u1@test.example', '{"full_name":"U1"}', 'authenticated', 'authenticated'),
  (:u2, 'u2@test.example', '{"full_name":"U2"}', 'authenticated', 'authenticated');
select workspace_id as ws1 from workspace_members where user_id = :u1 \gset
select workspace_id as ws2 from workspace_members where user_id = :u2 \gset
update rate_limit_policies set max_hits = 2 where bucket in ('report_pdf', 'workspace_create', 'dataset_upload_start', 'share_pdf_ip');

-- ---------------------------------------------------------------- rate limits
select ok((select relrowsecurity from pg_class where oid = 'public.rate_limit_counters'::regclass), 'counters have RLS');
select ok(not has_table_privilege('authenticated', 'public.rate_limit_counters', 'select'), 'users cannot read counters');
select ok(not has_table_privilege('authenticated', 'public.rate_limit_policies', 'update'), 'users cannot change limits');
select ok(not has_function_privilege('authenticated', 'public.rate_limit_gc()', 'execute'), 'users cannot purge counters');

set local role authenticated;
select set_config('request.jwt.claims', :as_u1, true);
select is(consume_rate_limit('report_pdf') ->> 'allowed', 'true', 'first request allowed');
select is(consume_rate_limit('report_pdf') ->> 'allowed', 'true', 'second request allowed');
select is(consume_rate_limit('report_pdf') ->> 'allowed', 'false', 'third request over the limit');
select ok((consume_rate_limit('report_pdf') ->> 'retry_after')::int > 0, 'limited responses say when to retry');
select is(consume_rate_limit('report_pdf', 'another-user') ->> 'allowed', 'false', 'a supplied subject cannot escape a user bucket');
select throws_ok($$select consume_rate_limit('no_such_bucket')$$, '22023', null, 'unknown buckets are rejected');
select lives_ok($$select create_workspace('One')$$, 'workspace creation within the limit');
select lives_ok($$select create_workspace('Two')$$, 'second workspace within the limit');
select throws_ok($$select create_workspace('Three')$$, 'PT429', null, 'workspace creation is limited in the database');
select lives_ok(format('insert into datasets (workspace_id, slug, name) values (%L, %L, %L)', :'ws1', 'd1', 'D1'), 'dataset creation within the limit');
select lives_ok(format('insert into datasets (workspace_id, slug, name) values (%L, %L, %L)', :'ws1', 'd2', 'D2'), 'second dataset within the limit');
select throws_ok(format('insert into datasets (workspace_id, slug, name) values (%L, %L, %L)', :'ws1', 'd3', 'D3'), 'PT429', null, 'direct API dataset creation is limited too');
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select consume_rate_limit('report_pdf')$$, '42501', null, 'anonymous callers cannot use user buckets');
select throws_ok($$select consume_rate_limit('share_pdf_ip', 'bad subject!')$$, '22023', null, 'public subjects are validated');
select is((select array_agg(consume_rate_limit('share_pdf_ip', 'ip_test') ->> 'allowed') from generate_series(1, 3)), array['true', 'true', 'false'], 'public buckets count per subject');
reset role;

-- ---------------------------------------------------------------- storage clean-up selection
insert into datasets (id, workspace_id, slug, name) values ('c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c0c0', :'ws1', 'active', 'Active');
insert into storage.objects (bucket_id, name, created_at) values
  ('datasets', :'ws1' || '/c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c0c0/active.csv', now() - interval '3 days'),
  ('datasets', :'ws1' || '/d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d0d0/deleted.csv', now() - interval '3 days'),
  ('datasets', :'ws1' || '/e0e0e0e0-e0e0-4e0e-8e0e-e0e0e0e0e0e0/recent.csv', now() - interval '10 minutes'),
  ('datasets', :'ws2' || '/c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c0c0/wrong-workspace.csv', now() - interval '3 days'),
  ('datasets', 'notes/readme.csv', now() - interval '3 days'),
  ('avatars', :'ws1' || '/d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d0d0/other-bucket.png', now() - interval '3 days');
select is(
  (select array_agg(split_part(name, '/', 3) order by split_part(name, '/', 3)) from storage_orphan_candidates(86400, 100) where name not like '%rltest%' and (name like :'ws1' || '/%' or name like :'ws2' || '/%' or name like 'notes/%')),
  (select array_agg(x order by x) from unnest(array['deleted.csv', 'wrong-workspace.csv']) x),
  'only old files without a matching dataset in the same workspace are candidates');
select ok(not exists (select 1 from storage_orphan_candidates(86400, 1000) where name like '%/active.csv'), 'files of active datasets are never candidates');
select ok(not exists (select 1 from storage_orphan_candidates(0, 1000) where name like '%/recent.csv'), 'the grace period cannot be set below one hour');
select is((select array_agg(x) from storage_orphans_recheck(array[:'ws1' || '/c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c0c0/active.csv', :'ws1' || '/d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d0d0/deleted.csv'], 86400) x), array[:'ws1' || '/d0d0d0d0-d0d0-4d0d-8d0d-d0d0d0d0d0d0/deleted.csv'], 're-check keeps only real orphans');
select ok(not has_function_privilege('authenticated', 'public.storage_orphan_candidates(integer, integer)', 'execute') and not has_function_privilege('anon', 'public.storage_orphan_candidates(integer, integer)', 'execute'), 'only the service role can list orphans');

select * from finish();
rollback;
