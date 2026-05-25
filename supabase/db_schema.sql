-- Create app_users table for light authentication
create table app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null, -- Store simple password as requested (or hash if preferred)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_boletas table to store user selections
create table user_boletas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references app_users(id) on delete cascade not null,
  tanda_id bigint references tandas(id) on delete cascade not null,
  marca text not null,
  codigo_boleta text,
  seleccionada boolean default false,
  bultos_manual numeric,
  comision_selected numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, tanda_id, marca, codigo_boleta) -- Prevent duplicates
);

-- Note: user_boletas.bultos_manual is to store overrides if needed, 
-- but consistent with requirements, we might just sum from original boletas.
-- comision_selected stores the % used for calculation.
