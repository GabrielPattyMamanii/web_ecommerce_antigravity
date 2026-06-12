-- Fix: restrict write access on products, categories, site_config to admin role only
-- Previously any authenticated user could insert/update/delete

-- Products
drop policy if exists "Authenticated users can insert products" on products;
drop policy if exists "Authenticated users can update products" on products;
drop policy if exists "Authenticated users can delete products" on products;

create policy "Admins can insert products" on products
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update products" on products
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete products" on products
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Categories
drop policy if exists "Authenticated users can insert categories" on categories;
drop policy if exists "Authenticated users can update categories" on categories;
drop policy if exists "Authenticated users can delete categories" on categories;

create policy "Admins can insert categories" on categories
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update categories" on categories
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete categories" on categories
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Site Config
drop policy if exists "Authenticated users can update site_config" on site_config;

create policy "Admins can update site_config" on site_config
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
