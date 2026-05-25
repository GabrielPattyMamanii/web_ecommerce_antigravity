-- Add marca_id column to entradas table
alter table entradas 
add column if not exists marca_id text;
