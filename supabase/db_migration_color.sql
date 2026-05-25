-- Add color column to app_users
alter table app_users 
add column if not exists color text default '#6b7280'; -- Default gray
