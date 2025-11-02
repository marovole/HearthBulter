-- Add name field to shopping_lists table
ALTER TABLE shopping_lists 
ADD COLUMN name VARCHAR(255);

-- Update existing records with default names
UPDATE shopping_lists 
SET name = CONCAT(
  (SELECT name FROM users WHERE id = (SELECT user_id FROM family_members WHERE id = meal_plans.member_id)),
  ' 的购物清单'
)
WHERE name IS NULL;

-- Make the name field NOT NULL with default
ALTER TABLE shopping_lists 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN name SET DEFAULT '';
