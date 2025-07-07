-- Add categoryType field to custom_financial_categories table
ALTER TABLE custom_financial_categories 
ADD COLUMN IF NOT EXISTS category_type VARCHAR(20) DEFAULT 'account';

-- Update existing records to have the default category type
UPDATE custom_financial_categories 
SET category_type = 'account' 
WHERE category_type IS NULL;