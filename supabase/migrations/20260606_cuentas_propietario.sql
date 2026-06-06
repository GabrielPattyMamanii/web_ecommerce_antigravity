-- Agregar campo propietario a cuentas_bancarias
alter table cuentas_bancarias
  add column if not exists propietario text;
