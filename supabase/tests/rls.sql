-- LOCAL TEST HARNESS ONLY. Test users are synthetic, not Supabase accounts.
begin;
create schema tests;
grant usage on schema tests to anon, authenticated;
create function tests.ok(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end; $$;
create function tests.denied(command text, expected_state text, label text) returns void language plpgsql security invoker as $$
begin
  begin
    execute command;
  exception when others then
    if sqlstate <> expected_state then raise exception 'FAIL: %: expected %, got % (%)', label, expected_state, sqlstate, sqlerrm; end if;
    raise notice 'PASS: %', label;
    return;
  end;
  raise exception 'FAIL: %: command was allowed', label;
end; $$;

insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
select tests.ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in (
  'public.profiles'::regclass,'public.wardrobe_items'::regclass,'public.saved_outfits'::regclass,
  'public.outfit_items'::regclass,'public.clothing_metadata'::regclass)), 'RLS is enabled and forced on all application tables');
select tests.ok((select not public and file_size_limit = 10485760 from storage.buckets where id='wardrobe-images'), 'Image bucket is private and size-limited');
select tests.ok((select count(*) = 5 from pg_policies where schemaname='storage' and policyname like 'silvet_images_%'), 'All five image policies exist');
select tests.ok((select count(*) = 0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'silvet_%' and p.prosecdef), 'No SILVET function bypasses RLS with SECURITY DEFINER');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.profiles(id, display_name, style_preferences) values (auth.uid(), 'User A', array['fusion']);
insert into public.wardrobe_items(id,name,category_slug,subcategory_slug,style_tags)
  values ('00000000-0000-4000-8000-000000000101','Kurta','tops','kurtas',array['fusion','traditional']);
insert into public.saved_outfits(id,name,source) values ('00000000-0000-4000-8000-000000000201',null,'suggestion');
insert into public.outfit_items(id,outfit_id,item_id,slot,position)
  values ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','top',0);
insert into storage.objects(bucket_id,name) values ('wardrobe-images','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/full.webp');
select tests.ok((select count(*)=1 from public.profiles), 'Authenticated user can create/read own profile');
select tests.ok((select count(*)=1 from public.wardrobe_items), 'Authenticated user can create/read own wardrobe');
select tests.ok((select count(*)=1 from public.saved_outfits where source='suggestion' and name is null), 'Suggestion source and optional name are retained');
select tests.ok((select count(*)=1 from public.outfit_items), 'Authenticated user can create/read own outfit relationship');
select tests.ok((select count(*) > 100 from public.clothing_metadata), 'Authenticated users can read shared taxonomy');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
insert into public.profiles(id) values (auth.uid());
insert into public.wardrobe_items(id,name,category_slug,subcategory_slug) values ('00000000-0000-4000-8000-000000000102','Saree','one-piece','sarees');
insert into public.saved_outfits(id) values ('00000000-0000-4000-8000-000000000202');
insert into public.outfit_items(outfit_id,item_id,slot,position)
  values ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000102','one_piece',0);
insert into storage.objects(bucket_id,name) values ('wardrobe-images','00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000102/full.webp');
select tests.ok((select count(*)=1 from public.profiles), 'User B cannot read user A profile');
select tests.ok((select count(*)=1 from public.wardrobe_items), 'User B cannot read user A wardrobe');
select tests.ok((select count(*)=1 from public.saved_outfits), 'User B cannot read user A saved outfits');
select tests.ok((select count(*)=1 from public.outfit_items), 'User B cannot read user A relationships');
select tests.ok((select count(*)=1 from storage.objects), 'User B cannot read user A image keys');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
with changed as (update public.profiles set display_name='Forbidden' where id='00000000-0000-4000-8000-000000000002' returning 1)
  select tests.ok((select count(*)=0 from changed), 'Cross-user profile updates affect no rows');
with changed as (update public.wardrobe_items set name='Forbidden' where id='00000000-0000-4000-8000-000000000102' returning 1)
  select tests.ok((select count(*)=0 from changed), 'Cross-user wardrobe updates affect no rows');
with changed as (delete from public.saved_outfits where id='00000000-0000-4000-8000-000000000202' returning 1)
  select tests.ok((select count(*)=0 from changed), 'Cross-user outfit deletion affects no rows');
with changed as (delete from public.outfit_items where outfit_id='00000000-0000-4000-8000-000000000202' returning 1)
  select tests.ok((select count(*)=0 from changed), 'Cross-user relationship deletion affects no rows');
select tests.denied($cmd$insert into public.profiles(id) values ('00000000-0000-4000-8000-000000000002')$cmd$, '42501', 'Cannot forge profile ownership');
select tests.denied($cmd$insert into public.wardrobe_items(user_id,name,category_slug) values ('00000000-0000-4000-8000-000000000002','Bad','tops')$cmd$, '42501', 'Cannot forge wardrobe ownership');
select tests.denied($cmd$insert into public.saved_outfits(user_id) values ('00000000-0000-4000-8000-000000000002')$cmd$, '42501', 'Cannot forge outfit ownership');
select tests.denied($cmd$update public.wardrobe_items set user_id='00000000-0000-4000-8000-000000000002'$cmd$, '42501', 'Cannot transfer item ownership');
select tests.denied($cmd$update public.saved_outfits set user_id='00000000-0000-4000-8000-000000000002'$cmd$, '42501', 'Cannot transfer outfit ownership');
select tests.denied($cmd$insert into public.outfit_items(user_id,outfit_id,slot,position) values ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000202','top',9)$cmd$, '42501', 'Cannot forge relationship ownership');
select tests.denied($cmd$insert into public.outfit_items(outfit_id,item_id,slot,position) values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000102','bottom',1)$cmd$, '23503', 'Cannot attach another user item to own outfit');
select tests.denied($cmd$insert into public.outfit_items(outfit_id,item_id,slot,position) values ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000101','bottom',1)$cmd$, '23503', 'Cannot attach own item to another user outfit');
select tests.denied($cmd$update public.clothing_metadata set slug='bad' where kind='style' and slug='fusion'$cmd$, '42501', 'Client cannot mutate shared taxonomy');
select tests.denied($cmd$truncate public.wardrobe_items cascade$cmd$, '42501', 'Authenticated client cannot bypass RLS with TRUNCATE');

select tests.denied($cmd$insert into public.wardrobe_items(name,category_slug,subcategory_slug) values ('Bad','tops','sarees')$cmd$, '23514', 'Subcategory must belong to category');
select tests.denied($cmd$insert into public.wardrobe_items(name,category_slug,primary_color) values ('Bad','tops','invented')$cmd$, '23514', 'Unknown colour is rejected');
select tests.denied($cmd$insert into public.wardrobe_items(name,category_slug,style_tags) values ('Bad','tops',array['invented'])$cmd$, '23514', 'Unknown metadata tags are rejected');
select tests.denied($cmd$insert into public.wardrobe_items(name,category_slug,style_tags) values ('Bad','tops',array['minimal','minimal','minimal','minimal','minimal','minimal'])$cmd$, '23514', 'Tag count limit matches item schema');
select tests.denied($cmd$insert into public.wardrobe_items(name,category_slug,season_tags) values ('Bad','tops',array[null]::text[])$cmd$, '23514', 'Null tag elements are rejected');
select tests.denied($cmd$insert into public.wardrobe_items(name,category_slug) values ('   ','tops')$cmd$, '23514', 'Blank item name is rejected');
select tests.denied($cmd$insert into public.saved_outfits(name) values (repeat('x',61))$cmd$, '23514', 'Outfit name limit matches domain');
select tests.denied($cmd$insert into public.saved_outfits(notes) values (repeat('x',501))$cmd$, '23514', 'Outfit notes limit matches domain');
select tests.denied($cmd$insert into public.saved_outfits(source) values ('ai_invented')$cmd$, '23514', 'Only existing manual/suggestion sources are allowed');
select tests.denied($cmd$insert into public.outfit_items(outfit_id,slot,position) values ('00000000-0000-4000-8000-000000000201','top',-1)$cmd$, '23514', 'Negative outfit positions are rejected');
select tests.denied($cmd$insert into public.outfit_items(outfit_id,slot,position) values ('00000000-0000-4000-8000-000000000201','invented',1)$cmd$, '23514', 'Unknown slots are rejected');
select tests.denied($cmd$insert into public.outfit_items(outfit_id,slot,position) values ('00000000-0000-4000-8000-000000000201','bottom',0)$cmd$, '23505', 'Duplicate outfit positions are rejected');
select tests.denied($cmd$update public.wardrobe_items set image_path='00000000-0000-4000-8000-000000000002/other/full.webp',image_thumb_path='00000000-0000-4000-8000-000000000002/other/thumb.webp'$cmd$, '23514', 'Stored image references must stay in own item namespace');
select tests.denied($cmd$update public.wardrobe_items set image_path='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000101/full.webp'$cmd$, '23514', 'Full/thumb image references are paired');
update public.wardrobe_items set name='Updated kurta', image_path=user_id::text||'/'||id::text||'/full.webp', image_thumb_path=user_id::text||'/'||id::text||'/thumb.webp';
select tests.ok((select count(*)=1 from public.wardrobe_items where name='Updated kurta'), 'Own metadata and valid image references can be updated');
select tests.denied($cmd$insert into storage.objects(bucket_id,name,owner_id) values ('wardrobe-images','00000000-0000-4000-8000-000000000002/stolen.webp','00000000-0000-4000-8000-000000000001')$cmd$, '42501', 'Forged object owner cannot grant cross-user upload');
select tests.denied($cmd$insert into storage.objects(bucket_id,name) values ('wardrobe-images','outside.webp')$cmd$, '42501', 'Uploads outside user folders are rejected');
with changed as (update storage.objects set name=name||'.changed' returning 1)
  select tests.ok((select count(*)=0 from changed), 'No object overwrite/rename policy is granted');
with changed as (delete from storage.objects where name like '00000000-0000-4000-8000-000000000002/%' returning 1)
  select tests.ok((select count(*)=0 from changed), 'Cannot delete another user images');

-- Prove guards still work in the presence of an unrelated overbroad policy.
reset role;
create policy test_unrelated_broad_policy on storage.objects for all to public using (true) with check (true);
set local role authenticated;
select tests.ok((select count(*)=1 from storage.objects where bucket_id='wardrobe-images'), 'Restrictive guard blocks cross-user reads even with a broad permissive policy');
select tests.denied($cmd$update storage.objects set name='00000000-0000-4000-8000-000000000002/renamed.webp'$cmd$, '42501', 'Restrictive guard blocks moving an image into another user folder');
select tests.denied($cmd$insert into storage.objects(bucket_id,name) values ('wardrobe-images','00000000-0000-4000-8000-000000000002/bypass.webp')$cmd$, '42501', 'Restrictive guard blocks cross-user upload with broad policy');
with changed as (delete from storage.objects where name like '00000000-0000-4000-8000-000000000002/%' returning 1)
  select tests.ok((select count(*)=0 from changed), 'Restrictive guard blocks cross-user deletion with broad policy');

set local role anon;
set local request.jwt.claim.sub = '';
select tests.denied('select * from public.profiles', '42501', 'Anonymous clients cannot read profiles');
select tests.denied('select * from public.wardrobe_items', '42501', 'Anonymous clients cannot read wardrobes');
select tests.denied('select * from public.saved_outfits', '42501', 'Anonymous clients cannot read saved outfits');
select tests.denied('select * from public.outfit_items', '42501', 'Anonymous clients cannot read outfit relationships');
select tests.denied('select * from public.clothing_metadata', '42501', 'Anonymous clients cannot read taxonomy through the database');
select tests.denied($cmd$insert into public.saved_outfits default values$cmd$, '42501', 'Anonymous clients cannot create saved outfits');
select tests.ok((select count(*)=0 from storage.objects where bucket_id='wardrobe-images'), 'Anonymous image reads remain blocked with broad policy');
select tests.denied($cmd$insert into storage.objects(bucket_id,name) values ('wardrobe-images','00000000-0000-4000-8000-000000000001/anon.webp')$cmd$, '42501', 'Anonymous image uploads remain blocked with broad policy');

set local role authenticated;
set local request.jwt.claim.sub = '';
select tests.ok((select count(*)=0 from public.wardrobe_items), 'Authenticated role without user identity cannot read user data');
select tests.denied($cmd$insert into public.saved_outfits(user_id) values ('00000000-0000-4000-8000-000000000001')$cmd$, '42501', 'Missing user identity cannot forge ownership');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
delete from public.wardrobe_items where id='00000000-0000-4000-8000-000000000101';
select tests.ok((select item_id is null and user_id=auth.uid() and slot='top' and position=0 from public.outfit_items), 'Deleting an item preserves the original removed-item slot, position and owner');
delete from public.saved_outfits where id='00000000-0000-4000-8000-000000000201';
select tests.ok((select count(*)=0 from public.outfit_items), 'Deleting own outfit cascades only its relationships');
with removed as (delete from storage.objects where bucket_id='wardrobe-images' returning 1)
  select tests.ok((select count(*)=1 from removed), 'Owner can delete own private image');
reset role;
select tests.ok((select count(*)=1 from public.saved_outfits where user_id='00000000-0000-4000-8000-000000000002'), 'Other user outfit survives all user A operations');
select tests.ok((select count(*)=1 from storage.objects where bucket_id='wardrobe-images'), 'Other user image survives user A deletion');
delete from auth.users where id='00000000-0000-4000-8000-000000000002';
select tests.ok((select count(*)=0 from public.profiles where id='00000000-0000-4000-8000-000000000002'), 'Auth user deletion cascades profile records');
select tests.ok((select count(*)=0 from public.wardrobe_items) and (select count(*)=0 from public.saved_outfits)
  and (select count(*)=0 from public.outfit_items), 'Auth user deletion cascades owned data');
rollback;
