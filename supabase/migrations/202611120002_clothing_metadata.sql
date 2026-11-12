begin;
-- Constraint allowlists projected from src/domain/taxonomy.ts.
-- Labels, formality, tradition and recommendation policy remain in that source.
-- The parity test fails if taxonomy/slots change without a matching migration.
insert into public.clothing_metadata(kind, slug, slot)
select 'category', key, value #>> '{}' from jsonb_each('{
  "tops":"top","bottoms":"bottom","outerwear":"outerwear",
  "one-piece":"one_piece","footwear":"footwear","accessories":"accessory"
}'::jsonb);

insert into public.clothing_metadata(kind, slug, category_slug, slot)
select 'subcategory', sub.slug, category.slug, category.slot
from public.clothing_metadata category
join jsonb_each('{
  "tops":["t-shirts","shirts","polos","blouses","crop-tops","tank-tops","kurtas","short-kurtis"],
  "bottoms":["jeans","trousers","cargos","shorts","joggers","skirts","leggings","churidars-salwars","palazzos","dhoti-pants"],
  "outerwear":["hoodies","sweatshirts","sweaters","jackets","shackets","blazers","nehru-jackets","shrugs"],
  "one-piece":["dresses","jumpsuits","rompers","co-ord-sets","kurta-sets","anarkalis","sarees","lehenga-sets","sherwani-sets"],
  "footwear":["sneakers","sandals","boots","loafers","flats","heels","formal-shoes","kolhapuris","juttis"],
  "accessories":["watches","caps-hats","belts","bags","sunglasses","jewellery","scarves-stoles","dupattas"]
}'::jsonb) grouped on grouped.key = category.slug
cross join lateral jsonb_array_elements_text(grouped.value) sub(slug)
where category.kind = 'category';

insert into public.clothing_metadata(kind, slug)
select grouped.key, slug from jsonb_each('{
  "color":["black","white","cream","grey","charcoal","navy","beige","brown","khaki","denim","olive","blue","teal","green","red","maroon","pink","purple","yellow","mustard","orange","gold","silver","multicolour"],
  "pattern":["solid","striped","checked","printed","graphic","embroidered","other"],
  "style":["minimal","casual","streetwear","classic","sporty","vintage","y2k","fusion","traditional"],
  "occasion":["everyday","college","work","party","date","festive","wedding","travel","active","lounge"],
  "season":["summer","monsoon","winter","all-season"]
}'::jsonb) grouped
cross join lateral jsonb_array_elements_text(grouped.value) value(slug);
commit;
