-- Fecha desde la cual se cuenta el acumulado de cada cuenta bancaria (reset point)
alter table cuentas_bancarias
  add column if not exists reiniciado_at timestamptz;
