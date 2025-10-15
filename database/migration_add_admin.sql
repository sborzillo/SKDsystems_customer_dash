-- Migration to add is_admin field to existing databases
-- Run this if you already have a database and need to add admin functionality

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set the default admin user to have admin privileges
UPDATE users SET is_admin = TRUE WHERE username = 'admin';

-- Verify the change
SELECT username, is_admin FROM users;
