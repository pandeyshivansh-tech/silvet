-- DISPOSABLE LOCAL DATABASE ONLY; rolled back. Do not run on hosted accounts.
begin;
create schema tests;
create function tests.ok(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end; $$;
create function tests.denied(statement text, label text, expected_state text default null) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate in ('42501','22023','22P02','23505','P0002')
       and (expected_state is null or sqlstate = expected_state) then
      raise notice 'PASS: %', label; return;
    end if;
    raise;
  end;
  raise exception 'FAIL: % was accepted', label;
end; $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
select tests.ok((select not prosecdef from pg_proc where oid='public.silvet_save_outfit(jsonb,uuid)'::regprocedure), 'Atomic save is SECURITY INVOKER');
select tests.ok(not has_function_privilege('anon','public.silvet_save_outfit(jsonb,uuid)','EXECUTE'), 'Anonymous role has no RPC execution grant');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.wardrobe_items(id,name,category_slug,subcategory_slug) values
 ('00000000-0000-4000-8000-000000000101','Saree','one-piece','sarees'),
 ('00000000-0000-4000-8000-000000000102','Kurta','tops','kurtas'),
 ('00000000-0000-4000-8000-000000000103','Jeans','bottoms','jeans'),
 ('00000000-0000-4000-8000-000000000104','Shacket','outerwear','shackets');
select set_config('tests.look', public.silvet_save_outfit('{"name":"First look","pieces":[{"itemId":"00000000-0000-4000-8000-000000000101","slot":"one_piece","position":0},{"itemId":null,"slot":"accessory","position":4}]}')::text, true);
select tests.ok((select count(*)=1 from public.saved_outfits), 'Authenticated user can create an outfit');
select tests.ok((select count(*)=2 from public.outfit_items), 'All outfit pieces are saved');
select tests.ok((select count(*)=1 from public.outfit_items where item_id is null and slot='accessory' and position=4), 'Removed placeholders preserve slot and position');
select public.silvet_save_outfit('{"name":"Updated","source":"suggestion","pieces":[{"itemId":"00000000-0000-4000-8000-000000000101","slot":"one_piece","position":1}]}', current_setting('tests.look')::uuid);
select tests.ok((select name='Updated' and source='suggestion' from public.saved_outfits), 'Owner can update outfit details');
select tests.ok((select count(*)=1 and min(position)=1 from public.outfit_items), 'Updates replace piece rows rather than append');

select tests.denied($q$select public.silvet_save_outfit('{"name":"Must roll back","pieces":[{"itemId":"00000000-0000-4000-8000-000000000102","slot":"top","position":0},{"itemId":"00000000-0000-4000-8000-000000000103","slot":"bottom","position":0}]}')$q$, 'Piece insert failure rejects a new save', '23505');
select tests.ok((select count(*)=1 from public.saved_outfits), 'Failed new save leaves no parent outfit row');
select tests.ok((select count(*)=1 from public.outfit_items), 'Failed new save leaves no partial piece rows');
select tests.denied(format($q$select public.silvet_save_outfit('{"name":"Must roll back","pieces":[{"itemId":"00000000-0000-4000-8000-000000000102","slot":"top","position":0},{"itemId":"00000000-0000-4000-8000-000000000103","slot":"bottom","position":0}]}', %L::uuid)$q$, current_setting('tests.look')), 'Piece insert failure rejects an update', '23505');
select tests.ok((select name='Updated' from public.saved_outfits), 'Failed update restores the prior outfit details');
select tests.ok((select count(*)=1 and min(position)=1 from public.outfit_items), 'Failed update restores deleted previous pieces');
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-999999999999","slot":"one_piece","position":0}]}')$q$, 'Nonexistent garment references are rejected');
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[{"itemId":null,"slot":"one_piece","position":0}]}')$q$, 'A removed base is not a complete outfit');
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-000000000101","slot":"top","position":0}]}')$q$, 'Mismatched slots are rejected');
select tests.denied($q$select public.silvet_save_outfit('{"pieces":{}}')$q$, 'Malformed piece collections are rejected');
select tests.denied($q$select public.silvet_save_outfit('{"name":false,"pieces":[]}')$q$, 'Invalid field shapes are rejected');
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-000000000101","slot":"one_piece","position":-1}]}')$q$, 'Negative positions are rejected');
select set_config('tests.separates', public.silvet_save_outfit('{"pieces":[{"itemId":null,"slot":"one_piece","position":0},{"itemId":"00000000-0000-4000-8000-000000000102","slot":"top","position":1},{"itemId":"00000000-0000-4000-8000-000000000103","slot":"bottom","position":2},{"itemId":null,"slot":"accessory","position":3},{"itemId":null,"slot":"accessory","position":4},{"itemId":null,"slot":"accessory","position":5}]}')::text, true);
select tests.ok((select count(*)=6 from public.outfit_items where outfit_id=current_setting('tests.separates')::uuid), 'Removed one-piece and accessories do not conflict with live separates');
select set_config('tests.shacket', public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-000000000104","slot":"outerwear","position":0},{"itemId":"00000000-0000-4000-8000-000000000103","slot":"bottom","position":1}]}')::text, true);
select tests.ok((select count(*)=2 from public.outfit_items where outfit_id=current_setting('tests.shacket')::uuid), 'Standalone outerwear follows the existing domain rule');
delete from public.wardrobe_items where id='00000000-0000-4000-8000-000000000102';
select tests.ok((select count(*)=1 from public.outfit_items where outfit_id=current_setting('tests.separates')::uuid and slot='top' and item_id is null), 'Deleting a referenced garment retains a removed placeholder');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
insert into public.wardrobe_items(id,name,category_slug,subcategory_slug) values
 ('00000000-0000-4000-8000-000000000201','Other user lehenga','one-piece','lehenga-sets');
select set_config('tests.other', public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-000000000201","slot":"one_piece","position":0}]}')::text, true);
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-000000000101","slot":"one_piece","position":0}]}')$q$, 'Cross-user garment references are rejected');
select tests.denied(format($q$select public.silvet_save_outfit('{"pieces":[{"itemId":"00000000-0000-4000-8000-000000000201","slot":"one_piece","position":0}]}', %L::uuid)$q$, current_setting('tests.look')), 'Cross-user outfit updates are rejected');
select tests.ok((select count(*)=1 from public.saved_outfits), 'User B sees only their own saved look');
set local request.jwt.claim.sub = '';
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[]}')$q$, 'Missing authenticated identity is rejected');
set local role anon;
select tests.denied($q$select public.silvet_save_outfit('{"pieces":[]}')$q$, 'Anonymous execution is rejected');
rollback;
