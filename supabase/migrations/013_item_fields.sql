-- Add item_fields config to companies (controls which fields show in item modal)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS item_fields jsonb NOT NULL DEFAULT '{
  "company_name": true,
  "email": true,
  "phone": true,
  "priority": true,
  "column_id": true,
  "tags": true,
  "notes": true,
  "products": true
}'::jsonb;
