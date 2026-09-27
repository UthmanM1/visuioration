-- Workspace access tests (pgTAP). Run with `supabase test db` or `pg_prove` against a database with all
-- migrations applied. Everything runs in a transaction that is rolled back.
--
-- Cast: Alice owns workspace A. Carol is a viewer in A. Mallory owns workspace B and attacks A.
-- An anonymous caller has only the public anon key.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(78);

-- ---------------------------------------------------------------------------
-- Fixtures (as the database owner)
-- ---------------------------------------------------------------------------
\set alice   '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''
\set carol   '''cccccccc-cccc-4ccc-8ccc-cccccccccccc'''
\set mallory '''eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'''
\set as_alice   '''{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}'''
\set as_carol   '''{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}'''
\set as_mallory '''{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}'''

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  (:alice, 'alice@test.example', '{"full_name":"Alice"}', 'authenticated', 'authenticated'),
  (:carol, 'carol@test.example', '{"full_name":"Carol"}', 'authenticated', 'authenticated'),
  (:mallory, 'mallory@test.example', '{"full_name":"Mallory"}', 'authenticated', 'authenticated');

select workspace_id as ws_a from workspace_members where user_id = :alice \gset
select workspace_id as ws_b from workspace_members where user_id = :mallory \gset
insert into workspace_members (workspace_id, user_id, role) values (:'ws_a', :carol, 'viewer');

insert into datasets (id, workspace_id, slug, name, status, row_count, rows_loaded_at, storage_path, created_by)
values ('11111111-1111-4111-8111-111111111111', :'ws_a', 'sales', 'Sales', 'ready', 2, now(), :'ws_a' || '/11111111-1111-4111-8111-111111111111/sales.csv', :alice);
insert into dataset_columns (dataset_id, workspace_id, position, name, data_type) values
  ('11111111-1111-4111-8111-111111111111', :'ws_a', 0, 'Region', 'text'),
  ('11111111-1111-4111-8111-111111111111', :'ws_a', 1, 'Revenue', 'currency');
insert into dataset_previews (dataset_id, workspace_id, rows) values ('11111111-1111-4111-8111-111111111111', :'ws_a', '[["West", 10]]');
insert into dataset_rows (dataset_id, workspace_id, row_number, cells) values
  ('11111111-1111-4111-8111-111111111111', :'ws_a', 1, '["West", 10]'),
  ('11111111-1111-4111-8111-111111111111', :'ws_a', 2, '["East", 5]');
insert into projects (id, workspace_id, slug, name, created_by) values ('22222222-2222-4222-8222-222222222222', :'ws_a', 'q3', 'Q3', :alice);
insert into visualizations (id, workspace_id, dataset_id, name, kind, config, created_by)
values ('33333333-3333-4333-8333-333333333333', :'ws_a', '11111111-1111-4111-8111-111111111111', 'By region', 'bar', '{"version":1}', :alice);
insert into dashboards (workspace_id, name, is_default, layout)
values (:'ws_a', 'Overview', true, '[{"id":"w1","visualizationId":"33333333-3333-4333-8333-333333333333","size":"md","height":"regular"}]');
insert into reports (id, workspace_id, slug, name, sections) values ('44444444-4444-4444-8444-444444444444', :'ws_a', 'review', 'Review', '[]');
insert into shares (workspace_id, resource_type, resource_id, snapshot, snapshot_at, label)
values (:'ws_a', 'report', '44444444-4444-4444-8444-444444444444', '{"name":"Review"}', now(), 'live');
insert into shares (workspace_id, resource_type, resource_id, snapshot, snapshot_at, label, revoked_at)
values (:'ws_a', 'report', '44444444-4444-4444-8444-444444444444', '{"name":"Review"}', now(), 'revoked', now());
insert into shares (workspace_id, resource_type, resource_id, snapshot, snapshot_at, label, created_at, expires_at)
values (:'ws_a', 'report', '44444444-4444-4444-8444-444444444444', '{"name":"Review"}', now(), 'expired', now() - interval '2 days', now() - interval '1 day');
insert into ai_requests (workspace_id, user_id, question, status) values (:'ws_a', :alice, 'q', 'answered');
insert into storage.objects (bucket_id, name) values ('datasets', :'ws_a' || '/11111111-1111-4111-8111-111111111111/sales.csv');

select token as live_token from shares where label = 'live' \gset
select token as revoked_token from shares where label = 'revoked' \gset
select token as expired_token from shares where label = 'expired' \gset

-- ---------------------------------------------------------------------------
-- Catalogue: RLS everywhere, least-privilege grants, fixed search paths
-- ---------------------------------------------------------------------------
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 0, 'every public table has row level security enabled');
select is((select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'), 0, 'anon holds no table privileges');
select is((select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')), 0, 'authenticated cannot TRUNCATE, REFERENCE or TRIGGER');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))), 0, 'every public function has a fixed search_path');
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  array['consume_rate_limit', 'get_shared_report'],
  'anon can execute only get_shared_report() and consume_rate_limit()');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'insert'), 'members cannot be inserted directly (no invitation bypass)');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'email', 'update'), 'profile email is not user-editable');

-- ---------------------------------------------------------------------------
-- Anonymous caller
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select count(*) from public.datasets', '42501', null, 'anon cannot read datasets');
select throws_ok('select count(*) from public.dataset_rows', '42501', null, 'anon cannot read dataset rows');
select throws_ok('select count(*) from public.reports', '42501', null, 'anon cannot read reports');
select throws_ok('select count(*) from public.shares', '42501', null, 'anon cannot read share tokens');
select throws_ok('select count(*) from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok($$select public.query_dataset('11111111-1111-4111-8111-111111111111', '{"y":{"agg":"count"}}')$$, '42501', null, 'anon cannot run queries');
select throws_ok($$select public.create_workspace('x')$$, '42501', null, 'anon cannot create workspaces');
select is(public.get_shared_report(:'live_token') ->> 'status', 'ok', 'anon can open a live share link');
select is(public.get_shared_report(:'live_token') -> 'report' ->> 'name', 'Review', 'live link returns its snapshot');
select is(public.get_shared_report(:'revoked_token') ->> 'status', 'expired', 'revoked link reports expired');
select ok(public.get_shared_report(:'revoked_token') -> 'report' is null, 'revoked link returns no snapshot');
select is(public.get_shared_report(:'expired_token') ->> 'status', 'expired', 'expired link reports expired');
select ok(public.get_shared_report(:'expired_token') -> 'report' is null, 'expired link returns no snapshot');
select ok(public.get_shared_report(repeat('0', 64)) is null, 'unknown token returns nothing');
select ok(public.get_shared_report($$' or 1=1 --$$) is null, 'malformed token returns nothing');
select ok(public.get_shared_report(upper(:'live_token')) is null, 'tokens are exact (no case folding)');
reset role;

-- ---------------------------------------------------------------------------
-- Alice (owner of A): allowed
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', :as_alice, true);
select is((select count(*)::int from workspaces), 1, 'Alice sees only her workspace');
select is((select count(*)::int from datasets), 1, 'Alice reads her datasets');
select is((select count(*)::int from dataset_rows), 2, 'Alice reads her dataset rows');
select is((select count(*)::int from storage.objects where bucket_id = 'datasets'), 1, 'Alice reads her files');
select is((public.query_dataset('11111111-1111-4111-8111-111111111111', '{"y":{"col":1,"agg":"sum"}}') ->> 'total')::numeric, 15::numeric, 'Alice can query her dataset');
select lives_ok($$insert into projects (workspace_id, slug, name, created_by) values ((select id from workspaces limit 1), 'new', 'New', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$, 'Alice can create a project');
select is((select created_by from projects where slug = 'new'), :alice::uuid, 'created_by is stamped with the real author');
select lives_ok($$update profiles set full_name = 'Alice A.' where id = auth.uid()$$, 'Alice can rename herself');
select throws_ok($$update profiles set email = 'ceo@evil.example' where id = auth.uid()$$, '42501', null, 'Alice cannot spoof her profile email');
select throws_ok(format('update shares set token = %L where label = %L', repeat('0', 64), 'live'), '22023', null, 'share tokens cannot be replaced');
select is((select count(*)::int from profiles), 2, 'Alice sees her own and her teammate''s profile only');
select lives_ok($$delete from workspace_members where user_id = auth.uid()$$, 'owner delete attempt runs');
reset role;
select is((select count(*)::int from workspace_members where user_id = :alice and role = 'owner'), 1, 'the owner row cannot be removed');

-- ---------------------------------------------------------------------------
-- Carol (viewer in A): read-only
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', :as_carol, true);
select is((select count(*)::int from datasets), 1, 'viewer reads datasets');
select is((select count(*)::int from reports), 1, 'viewer reads reports');
select is((select count(*)::int from dataset_rows), 2, 'viewer reads dataset rows');
select throws_ok($$insert into projects (workspace_id, slug, name) values ((select workspace_id from datasets limit 1), 'v', 'V')$$, '42501', null, 'viewer cannot create projects');
select throws_ok($$insert into shares (workspace_id, resource_type, resource_id) values ((select workspace_id from reports limit 1), 'report', '44444444-4444-4444-8444-444444444444')$$, '42501', null, 'viewer cannot create share links');
select throws_ok($$insert into dataset_rows (dataset_id, workspace_id, row_number, cells) values ('11111111-1111-4111-8111-111111111111', (select workspace_id from datasets limit 1), 99, '[]')$$, '42501', null, 'viewer cannot write dataset rows');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('datasets', (select workspace_id::text from datasets limit 1) || '/11111111-1111-4111-8111-111111111111/v.csv')$$, '42501', null, 'viewer cannot upload files');
update datasets set name = 'Viewer edit';
update reports set name = 'Viewer edit';
delete from visualizations;
delete from shares;
update workspaces set name = 'Viewer edit' where id = (select workspace_id from datasets limit 1);
reset role;
select is((select count(*)::int from datasets where name = 'Viewer edit'), 0, 'viewer update of datasets changed nothing');
select is((select count(*)::int from reports where name = 'Viewer edit'), 0, 'viewer update of reports changed nothing');
select is((select count(*)::int from visualizations where workspace_id = :'ws_a'), 1, 'viewer delete of visualizations changed nothing');
select is((select count(*)::int from shares where workspace_id = :'ws_a'), 3, 'viewer delete of share links changed nothing');
select is((select count(*)::int from workspaces where id = :'ws_a' and name = 'Viewer edit'), 0, 'viewer cannot rename the workspace');

-- ---------------------------------------------------------------------------
-- Mallory (owner of B) attacking A: denied
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', :as_mallory, true);
select is((select count(*)::int from workspaces where id = :'ws_a'), 0, 'Mallory cannot see workspace A');
select is((select count(*)::int from workspace_members where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s members');
select is((select count(*)::int from datasets where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s datasets');
select is((select count(*)::int from dataset_columns where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s column profiles');
select is((select count(*)::int from dataset_previews where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s previews');
select is((select count(*)::int from dataset_rows where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s rows');
select is((select count(*)::int from projects where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s projects');
select is((select count(*)::int from visualizations where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s charts');
select is((select count(*)::int from dashboards where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s dashboards');
select is((select count(*)::int from reports where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s reports');
select is((select count(*)::int from shares where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s share tokens');
select is((select count(*)::int from ai_requests where workspace_id = :'ws_a'), 0, 'Mallory cannot see A''s AI log');
select is((select count(*)::int from profiles where id = :alice), 0, 'Mallory cannot see Alice''s profile');
select is((select count(*)::int from storage.objects where name like :'ws_a' || '/%'), 0, 'Mallory cannot see A''s files');
select throws_ok(format($$select public.query_dataset(%L, '{"y":{"agg":"count"}}')$$, '11111111-1111-4111-8111-111111111111'), 'PT404', null, 'Mallory cannot query A''s dataset');
select throws_ok(format('insert into projects (workspace_id, slug, name) values (%L, %L, %L)', :'ws_a', 'm', 'M'), '42501', null, 'Mallory cannot create in A');
select throws_ok(format('insert into dataset_rows (dataset_id, workspace_id, row_number, cells) values (%L, %L, 50, %L)', '11111111-1111-4111-8111-111111111111', :'ws_a', '[]'), '42501', null, 'Mallory cannot inject rows into A''s dataset');
select throws_ok(format('insert into workspace_members (workspace_id, user_id, role) values (%L, %L, %L)', :'ws_a', :mallory, 'member'), '42501', null, 'Mallory cannot join A');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'datasets', :'ws_a' || '/11111111-1111-4111-8111-111111111111/evil.csv'), '42501', null, 'Mallory cannot upload into A''s folder');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'datasets', :'ws_b' || '/not-a-dataset/x.csv'), '42501', null, 'uploads need a matching dataset record');
select throws_ok(format('insert into visualizations (workspace_id, dataset_id, name, kind) values (%L, %L, %L, %L)', :'ws_b', '11111111-1111-4111-8111-111111111111', 'x', 'bar'), '23503', null, 'Mallory cannot point a chart at A''s dataset');
select throws_ok(format('insert into shares (workspace_id, resource_type, resource_id) values (%L, %L, %L)', :'ws_b', 'report', '44444444-4444-4444-8444-444444444444'), '22023', null, 'Mallory cannot share A''s report');
select throws_ok(format('insert into dashboards (workspace_id, name, layout) values (%L, %L, %L)', :'ws_b', 'x', '[{"id":"w1","visualizationId":"33333333-3333-4333-8333-333333333333","size":"md","height":"regular"}]'), '22023', null, 'Mallory cannot put A''s chart on her dashboard');
select throws_ok(format('insert into reports (workspace_id, slug, name, project_id) values (%L, %L, %L, %L)', :'ws_b', 'x', 'x', '22222222-2222-4222-8222-222222222222'), '23503', null, 'Mallory cannot link her report to A''s project');
update datasets set name = 'pwned' where workspace_id = :'ws_a';
update shares set expires_at = null where workspace_id = :'ws_a';
delete from reports where workspace_id = :'ws_a';
-- Supabase blocks direct SQL deletes from storage tables; lift that guard so the RLS policy itself is tested.
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where name like :'ws_a' || '/%';
reset role;
select is((select count(*)::int from datasets where name = 'pwned'), 0, 'Mallory''s update of A changed nothing');
select is((select count(*)::int from shares where workspace_id = :'ws_a' and expires_at is null), 2, 'Mallory cannot extend A''s links');
select is((select count(*)::int from reports where workspace_id = :'ws_a'), 1, 'Mallory''s delete of A changed nothing');
select is((select count(*)::int from storage.objects where name like :'ws_a' || '/%'), 1, 'Mallory cannot delete A''s files');

-- Mallory in her own workspace is fine.
set local role authenticated;
select set_config('request.jwt.claims', :as_mallory, true);
select lives_ok(format('insert into projects (workspace_id, slug, name) values (%L, %L, %L)', :'ws_b', 'mine', 'Mine'), 'Mallory can create in her own workspace');
select is((select count(*)::int from workspaces), 1, 'Mallory sees only her own workspace');
reset role;

select * from finish();
rollback;
