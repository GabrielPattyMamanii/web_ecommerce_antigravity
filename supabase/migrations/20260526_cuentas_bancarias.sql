-- Tabla para almacenar las cuentas bancarias destino de transferencias
create table if not exists cuentas_bancarias (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  titular text not null,
  activa boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table cuentas_bancarias enable row level security;
create policy "cuentas_bancarias_all" on cuentas_bancarias for all using (true);

-- Agregar columnas de método de pago a la tabla ventas
alter table ventas
  add column if not exists metodo_pago text not null default 'efectivo',
  add column if not exists monto_efectivo numeric,
  add column if not exists monto_transferencia numeric,
  add column if not exists cuenta_id uuid references cuentas_bancarias(id),
  add column if not exists cuenta_nombre text;
