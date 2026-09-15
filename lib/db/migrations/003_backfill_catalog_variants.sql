-- Backfill the complete sellable variant matrix for existing catalog rows.
-- This migration is idempotent and leaves unrelated products unchanged.

UPDATE products p
SET variants = jsonb_build_array(
  jsonb_build_object('id','general-mug','name','General Mug','price',449,'customizationFee',99,'stock',p.stock,'oneSize',true,'active',true),
  jsonb_build_object('id','love-handle','name','Love Shape Handle','price',550,'customizationFee',70,'stock',p.stock,'oneSize',true,'active',true),
  jsonb_build_object('id','blue-rim','name','Blue Rim','price',550,'customizationFee',70,'stock',p.stock,'oneSize',true,'active',true),
  jsonb_build_object('id','yellow-rim','name','Yellow Rim','price',550,'customizationFee',70,'stock',p.stock,'oneSize',true,'active',true)
)
WHERE lower(coalesce((SELECT c.name FROM categories c WHERE c.id = p.category_id), '')) LIKE '%mug%'
  AND (jsonb_array_length(coalesce(p.variants, '[]'::jsonb)) = 0
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) v
         WHERE v->>'id' = 'love-handle'
       ));

UPDATE products p
SET variants = jsonb_build_array(
  jsonb_build_object('id','regular','name','Regular Fit','price',450,'customizationFee',99,'stock',p.stock,'sizes',coalesce(p.sizes,'[]'::jsonb),'colors',coalesce(p.colors,'[]'::jsonb),'active',true),
  jsonb_build_object('id','drop-shoulder','name','Drop-Shoulder 220 GSM','price',450,'customizationFee',99,'stock',p.stock,'sizes',coalesce(p.sizes,'[]'::jsonb),'colors',jsonb_build_array('Black','White','Off White'),'inStockColors',jsonb_build_array('Black','White','Off White'),'active',true)
)
WHERE lower(coalesce((SELECT c.name FROM categories c WHERE c.id = p.category_id), '')) LIKE '%t-shirt%'
  AND (jsonb_array_length(coalesce(p.variants, '[]'::jsonb)) = 0
       OR NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) v
         WHERE v->>'id' = 'drop-shoulder'
       ));

-- These categories are one-size in the customer UI; do not leak apparel sizes.
UPDATE products p
SET sizes = '[]'::jsonb
WHERE lower(coalesce((SELECT c.name FROM categories c WHERE c.id = p.category_id), '')) LIKE '%mug%'
   OR lower(coalesce((SELECT c.name FROM categories c WHERE c.id = p.category_id), '')) LIKE '%cap%'
   OR lower(coalesce((SELECT c.name FROM categories c WHERE c.id = p.category_id), '')) LIKE '%bottle%';
