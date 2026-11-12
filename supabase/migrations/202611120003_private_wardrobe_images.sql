begin;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass) then
    raise exception 'Supabase Storage RLS must be enabled before applying the SILVET image policies.';
  end if;
end;
$$;
-- 10 MiB images; private even when a bucket with this id already exists.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe-images', 'wardrobe-images', false, 10485760, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive guards prevent an unrelated permissive Storage policy from
-- accidentally broadening access to this bucket. Other buckets are unaffected.
create policy silvet_images_anon_guard on storage.objects as restrictive for all to anon
  using (bucket_id <> 'wardrobe-images') with check (bucket_id <> 'wardrobe-images');
create policy silvet_images_owner_guard on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'wardrobe-images' or (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id <> 'wardrobe-images' or (storage.foldername(name))[1] = (select auth.uid())::text);
create policy silvet_images_read on storage.objects for select to authenticated
  using (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy silvet_images_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy silvet_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'wardrobe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No UPDATE policy is granted here. Existing policies must still be audited;
-- the restrictive owner guard protects paths even if another policy grants UPDATE.
-- Upload with upsert:false; replacement lifecycle is future repository work.
commit;
