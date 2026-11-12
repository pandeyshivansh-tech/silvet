begin;

-- One RPC call is one PostgreSQL transaction. Any exception rolls back the outfit
-- row AND all piece changes, including a failed replacement of existing pieces.
create function public.silvet_save_outfit(_input jsonb, _id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_id uuid;
  piece jsonb;
  garment public.wardrobe_items%rowtype;
  garment_id uuid;
  piece_slot text;
  expected_slot text;
  outfit_name text;
  outfit_notes text;
  outfit_source text;
  live_top integer := 0;
  live_bottom integer := 0;
  live_set integer := 0;
  live_outerwear integer := 0;
  live_footwear integer := 0;
  live_accessories integer := 0;
  standalone_outerwear boolean := false;
  seen_ids uuid[] := '{}';
  accessory_types text[] := '{}';
begin
  if owner_id is null then
    raise exception 'An authenticated account is required' using errcode = '42501';
  end if;
  if _input is null or jsonb_typeof(_input) <> 'object' then
    raise exception 'Expected an outfit object' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(_input) k
             where k not in ('name', 'notes', 'source', 'pieces')) then
    raise exception 'Unknown outfit field' using errcode = '22023';
  end if;
  if jsonb_typeof(_input->'pieces') is distinct from 'array' then
    raise exception 'Expected outfit pieces' using errcode = '22023';
  end if;
  if jsonb_array_length(_input->'pieces') = 0 then
    raise exception 'An outfit needs pieces' using errcode = '22023';
  end if;
  if (_input ? 'name' and jsonb_typeof(_input->'name') not in ('string','null'))
     or (_input ? 'notes' and jsonb_typeof(_input->'notes') not in ('string','null'))
     or (_input ? 'source' and jsonb_typeof(_input->'source') <> 'string') then
    raise exception 'Invalid outfit fields' using errcode = '22023';
  end if;
  outfit_name := nullif(btrim(_input->>'name'), '');
  outfit_notes := nullif(btrim(_input->>'notes'), '');
  outfit_source := coalesce(_input->>'source', 'manual');
  if char_length(outfit_name) > 60 or char_length(outfit_notes) > 500
     or outfit_source not in ('manual','suggestion') then
    raise exception 'Invalid outfit details' using errcode = '22023';
  end if;
  if _id is not null then
    select o.id into saved_id from public.saved_outfits o
      where o.id = _id and o.user_id = owner_id for update;
    if not found then
      raise exception 'Outfit not found for this account' using errcode = 'P0002';
    end if;
  end if;

  -- Lock live garments in stable ID order. Deletion/metadata edits cannot race validation and
  -- insertion; the composite foreign keys additionally enforce ownership.
  for piece in select value from jsonb_array_elements(_input->'pieces')
               order by value->>'itemId', value->>'position'
  loop
    if jsonb_typeof(piece) <> 'object' then
      raise exception 'Invalid outfit piece' using errcode = '22023';
    end if;
    if not (piece ?& array['slot','itemId','position'])
       or exists (select 1 from jsonb_object_keys(piece) k
                  where k not in ('slot','itemId','position'))
       or jsonb_typeof(piece->'slot') <> 'string'
       or jsonb_typeof(piece->'itemId') not in ('string','null')
       or jsonb_typeof(piece->'position') <> 'number' then
      raise exception 'Invalid outfit piece shape' using errcode = '22023';
    end if;
    if (piece->>'position')::numeric < 0
       or (piece->>'position')::numeric > 2147483647
       or trunc((piece->>'position')::numeric) <> (piece->>'position')::numeric then
      raise exception 'Invalid piece position' using errcode = '22023';
    end if;
    piece_slot := piece->>'slot';
    if piece_slot not in ('top','bottom','outerwear','one_piece','footwear','accessory') then
      raise exception 'Invalid piece slot' using errcode = '22023';
    end if;
    garment_id := (piece->>'itemId')::uuid;
    -- Removed references retain slot/position, but never count as selected
    -- garments, occupied slots, accessory capacity, or a wearable base.
    if garment_id is null then continue; end if;
    if garment_id = any(seen_ids) then
      raise exception 'Duplicate garment' using errcode = '22023';
    end if;
    seen_ids := array_append(seen_ids, garment_id);
    select * into garment from public.wardrobe_items w
      where w.id = garment_id and w.user_id = owner_id for share;
    if not found then
      raise exception 'Garment is unavailable for this account' using errcode = '22023';
    end if;
    select m.slot into expected_slot from public.clothing_metadata m
      where m.kind = 'category' and m.slug = garment.category_slug;
    if piece_slot is distinct from expected_slot then
      raise exception 'Garment slot mismatch' using errcode = '22023';
    end if;
    case piece_slot
      when 'top' then live_top := live_top + 1;
      when 'bottom' then live_bottom := live_bottom + 1;
      when 'one_piece' then live_set := live_set + 1;
      when 'outerwear' then
        live_outerwear := live_outerwear + 1;
        standalone_outerwear := garment.subcategory_slug in ('hoodies','sweatshirts','sweaters','shackets');
      when 'footwear' then live_footwear := live_footwear + 1;
      when 'accessory' then
        live_accessories := live_accessories + 1;
        if garment.subcategory_slug is not null then
          if garment.subcategory_slug = any(accessory_types) then
            raise exception 'Duplicate accessory type' using errcode = '22023';
          end if;
          accessory_types := array_append(accessory_types, garment.subcategory_slug);
        end if;
    end case;
  end loop;
  if greatest(live_top, live_bottom, live_set, live_outerwear, live_footwear) > 1
     or live_accessories > 2 or (live_set > 0 and live_top + live_bottom > 0) then
    raise exception 'Conflicting outfit pieces' using errcode = '22023';
  end if;
  if not (live_set = 1 or (live_bottom = 1 and
         (live_top = 1 or (live_outerwear = 1 and coalesce(standalone_outerwear, false))))) then
    raise exception 'Outfit needs a wearable base' using errcode = '22023';
  end if;

  if _id is null then
    insert into public.saved_outfits(user_id, name, notes, source)
      values (owner_id, outfit_name, outfit_notes, outfit_source) returning id into saved_id;
  else
    update public.saved_outfits set name = outfit_name, notes = outfit_notes, source = outfit_source
      where id = saved_id and user_id = owner_id;
    delete from public.outfit_items where outfit_id = saved_id and user_id = owner_id;
  end if;
  insert into public.outfit_items(user_id, outfit_id, item_id, slot, position)
    select owner_id, saved_id, (p->>'itemId')::uuid, p->>'slot', (p->>'position')::numeric::integer
      from jsonb_array_elements(_input->'pieces') p;
  return saved_id;
end;
$$;

revoke all on function public.silvet_save_outfit(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.silvet_save_outfit(jsonb, uuid) to authenticated;
comment on function public.silvet_save_outfit(jsonb, uuid) is
  'Atomic owner-scoped outfit create/update. Invoker RLS; null garment references are removed placeholders.';
commit;
