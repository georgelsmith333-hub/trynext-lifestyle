ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE products
SET variants = '[]'::jsonb
WHERE variants IS NULL;

ALTER TABLE products
  ALTER COLUMN variants SET DEFAULT '[]'::jsonb,
  ALTER COLUMN variants SET NOT NULL;


UPDATE products
SET variants = CASE
  WHEN lower(name) LIKE '%love%handle%' THEN jsonb_build_array(jsonb_build_object('id','love-handle','name','Love Shape Handle','price',550,'customizationFee',70,'stock',stock,'oneSize',true,'active',true))
  WHEN lower(name) LIKE '%blue%rim%' THEN jsonb_build_array(jsonb_build_object('id','blue-rim','name','Blue Rim','price',550,'customizationFee',70,'stock',stock,'oneSize',true,'active',true))
  WHEN lower(name) LIKE '%yellow%rim%' THEN jsonb_build_array(jsonb_build_object('id','yellow-rim','name','Yellow Rim','price',550,'customizationFee',70,'stock',stock,'oneSize',true,'active',true))
  WHEN lower(name) LIKE '%mug%' OR lower(slug) LIKE '%mug%' THEN jsonb_build_array(jsonb_build_object('id','general-mug','name','General Mug','price',449,'customizationFee',99,'stock',stock,'oneSize',true,'active',true))
  ELSE variants
END
WHERE jsonb_array_length(COALESCE(variants, '[]'::jsonb)) = 0;

UPDATE products
SET variants = jsonb_build_array(
  jsonb_build_object('id','regular','name','Regular Fit','price',450,'customizationFee',99,'stock',stock,'sizes',COALESCE(sizes,'[]'::jsonb),'colors',COALESCE(colors,'[]'::jsonb),'active',true),
  jsonb_build_object('id','drop-shoulder','name','Drop-Shoulder 220 GSM','price',450,'customizationFee',99,'stock',stock,'sizes',COALESCE(sizes,'[]'::jsonb),'colors',COALESCE(colors,'[]'::jsonb),'inStockColors',jsonb_build_array('Black','White','Off White'),'active',true)
)
WHERE (lower(name) LIKE '%t-shirt%' OR lower(name) LIKE '%tshirt%' OR lower(slug) LIKE '%tshirt%')
  AND jsonb_array_length(COALESCE(variants, '[]'::jsonb)) = 0;
