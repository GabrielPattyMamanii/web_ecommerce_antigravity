-- Add propietario column to entradas table
alter table entradas 
add column if not exists propietario text;
