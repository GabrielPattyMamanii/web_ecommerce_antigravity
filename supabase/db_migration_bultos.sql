-- Add bultos column to entradas table
alter table entradas 
add column if not exists bultos numeric default 0;
