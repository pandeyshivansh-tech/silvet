begin;

-- Supabase supplies auth.users, auth.uid(), anon and authenticated.
-- Taxonomy allowlists are seeded by the next migration from src/domain/taxonomy.ts.
create table public.clothing_metadata (
  kind text not null check (kind in ('category','subcategory','color','pattern','style','occasion','season')),
  slug text not null check (length(slug) > 0),
  category_slug text,
  slot text check (slot in ('top','bottom','outerwear','one_piece','footwear','accessory')),
  primary key (kind, slug),
  check ((kind = 'subcategory') = (category_slug is not null)),
  check ((kind in ('category','subcategory')) = (slot is not null))
);

create function public.silvet_valid_tags(_kind text, tags text[], maximum integer)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select cardinality(tags) <= maximum and array_position(tags, null) is null
    and not exists (
      select 1 from unnest(tags) tag
      where not exists (select 1 from public.clothing_metadata m where m.kind = _kind and m.slug = tag)
    );
$$;

create function public.silvet_valid_item_metadata(
  category text, subcategory text, primary_colour text, secondary_colour text, pattern text
) returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.clothing_metadata where kind = 'category' and slug = category)
    and (subcategory is null or exists (
      select 1 from public.clothing_metadata where kind = 'subcategory' and slug = subcategory and category_slug = category
    ))
    and (primary_colour is null or exists (select 1 from public.clothing_metadata where kind = 'color' and slug = primary_colour))
    and (secondary_colour is null or exists (select 1 from public.clothing_metadata where kind = 'color' and slug = secondary_colour))
    and (pattern is null or exists (select 1 from public.clothing_metadata where kind = 'pattern' and slug = pattern));
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or (display_name = btrim(display_name) and char_length(display_name) between 1 and 80)),
  style_preferences text[] not null default '{}'
    check (public.silvet_valid_tags('style', style_preferences, 9)),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  category_slug text not null,
  subcategory_slug text,
  primary_color text,
  secondary_color text,
  pattern text,
  style_tags text[] not null default '{}' check (public.silvet_valid_tags('style', style_tags, 5)),
  occasion_tags text[] not null default '{}' check (public.silvet_valid_tags('occasion', occasion_tags, 6)),
  season_tags text[] not null default '{}' check (public.silvet_valid_tags('season', season_tags, 4)),
  image_path text,
  image_thumb_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (public.silvet_valid_item_metadata(category_slug, subcategory_slug, primary_color, secondary_color, pattern)),
  check (
    (image_path is null and image_thumb_path is null) or
    (image_path is not null and image_thumb_path is not null
      and starts_with(image_path, user_id::text || '/' || id::text || '/')
      and starts_with(image_thumb_path, user_id::text || '/' || id::text || '/')
      and position('..' in image_path) = 0 and position('..' in image_thumb_path) = 0
      and image_path !~ '[?#]' and image_thumb_path !~ '[?#]')
  )
);

create table public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text check (name is null or (name = btrim(name) and char_length(name) between 1 and 60)),
  notes text check (notes is null or (notes = btrim(notes) and char_length(notes) between 1 and 500)),
  source text not null default 'manual' check (source in ('manual','suggestion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  outfit_id uuid not null,
  item_id uuid,
  slot text not null check (slot in ('top','bottom','outerwear','one_piece','footwear','accessory')),
  position integer not null check (position >= 0),
  foreign key (outfit_id, user_id) references public.saved_outfits(id, user_id) on delete cascade,
  -- PostgreSQL 15+: retain owner/outfit/slot/position when an item is deleted.
  foreign key (item_id, user_id) references public.wardrobe_items(id, user_id) on delete set null (item_id),
  unique (outfit_id, position)
);
create unique index outfit_items_live_item on public.outfit_items(outfit_id, item_id) where item_id is not null;
create unique index outfit_items_live_single_slot on public.outfit_items(outfit_id, slot)
  where item_id is not null and slot <> 'accessory';
create index wardrobe_items_owner on public.wardrobe_items(user_id, updated_at desc);
create index saved_outfits_owner on public.saved_outfits(user_id, updated_at desc);
create index outfit_items_owner on public.outfit_items(user_id);
create index outfit_items_item on public.outfit_items(item_id, user_id);

create function public.silvet_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.silvet_touch_updated_at();
create trigger wardrobe_items_updated before update on public.wardrobe_items for each row execute function public.silvet_touch_updated_at();
create trigger saved_outfits_updated before update on public.saved_outfits for each row execute function public.silvet_touch_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.wardrobe_items enable row level security;
alter table public.wardrobe_items force row level security;
alter table public.saved_outfits enable row level security;
alter table public.saved_outfits force row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_items force row level security;
alter table public.clothing_metadata enable row level security;
alter table public.clothing_metadata force row level security;

-- USING prevents reading/changing others; WITH CHECK prevents forged/transferred ownership.
create policy profiles_owner on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy wardrobe_items_owner on public.wardrobe_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_outfits_owner on public.saved_outfits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy outfit_items_owner on public.outfit_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Shared application taxonomy, not private user data. Clients can read, never modify.
create policy clothing_metadata_read on public.clothing_metadata for select to authenticated using (true);

revoke all on public.profiles, public.wardrobe_items, public.saved_outfits, public.outfit_items, public.clothing_metadata from public, anon, authenticated;
grant usage on schema public to authenticated;
revoke create on schema public from public, anon, authenticated;
grant select, insert, update, delete on public.profiles, public.wardrobe_items, public.saved_outfits, public.outfit_items to authenticated;
grant select on public.clothing_metadata to authenticated;
revoke all on function public.silvet_valid_tags(text,text[],integer) from public, anon;
revoke all on function public.silvet_valid_item_metadata(text,text,text,text,text) from public, anon;
revoke all on function public.silvet_touch_updated_at() from public, anon, authenticated;
grant execute on function public.silvet_valid_tags(text,text[],integer) to authenticated;
grant execute on function public.silvet_valid_item_metadata(text,text,text,text,text) to authenticated;

commit;
