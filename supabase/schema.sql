-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- Create Categories Table
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create Products Table
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  retail_price numeric not null,
  wholesale_price numeric,
  category_id uuid references categories(id),
  stock integer default 0,
  images text[],
  sizes text[],
  colors text[],
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create Site Config Table
create table site_config (
  id uuid default gen_random_uuid() primary key,
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  address text,
  social_links jsonb default '{}'::jsonb
);

-- RLS Policies
alter table products enable row level security;
alter table categories enable row level security;
alter table site_config enable row level security;

-- Public Read Access
create policy "Public products are viewable by everyone" on products for select using (true);
create policy "Public categories are viewable by everyone" on categories for select using (true);
create policy "Public site_config is viewable by everyone" on site_config for select using (true);

-- Admin Write Access (Authenticated users)
create policy "Authenticated users can insert products" on products for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update products" on products for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete products" on products for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can insert categories" on categories for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update categories" on categories for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete categories" on categories for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can update site_config" on site_config for update using (auth.role() = 'authenticated');

-- Storage Bucket (You need to create the bucket 'products' in Supabase dashboard manually if this script fails, but this inserts into storage.buckets if permissions allow)
-- Note: Creating buckets via SQL requires specific permissions. It's often better to do it in the dashboard.
-- We will add policies assuming the bucket exists.

-- Storage Policies (Run these in the Storage > Policies section or SQL Editor)
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'products' );
-- create policy "Auth Upload" on storage.objects for insert with check ( bucket_id = 'products' and auth.role() = 'authenticated' );
