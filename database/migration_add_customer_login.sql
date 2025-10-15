-- Migration to add user_id link to customers table
-- Run this on existing databases to enable customer login accounts

-- Add user_id column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add foreign key constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS fk_customer_user;
ALTER TABLE customers ADD CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);

-- Verify the changes
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers';
