// Definición canónica de las secciones del panel admin.
// Cada `key` coincide con el identificador usado en el campo `permissions` de profiles.
// Se importa en Usuarios (checkboxes) y AdminLayout (filtro de menú).

// Dashboard no está aquí: siempre es accesible para cualquier usuario del panel.
export const ADMIN_SECTIONS = [
    { key: 'products',               label: 'Productos' },
    { key: 'categories',             label: 'Categorías' },
    { key: 'coupons',                label: 'Cupones' },
    { key: 'senas',                  label: 'Señas' },
    { key: 'debts',                  label: 'Deudas' },
    { key: 'mercancia',              label: 'Mercancía' },
    { key: 'control-mercancia',      label: 'Control de Mercancía' },
    { key: 'precio-venta-sugerido',  label: 'Precio Venta Sugerido' },
    { key: 'usuarios',               label: 'Usuarios (Mercadería)' },
    { key: 'calculo-precios',        label: 'Cálculo de Precios' },
    { key: 'posibles-compras',       label: 'Posibles Compras' },
    { key: 'ventas',                 label: 'Registrar Venta' },
    { key: 'ventas-historial',       label: 'Historial de Ventas' },
    { key: 'cuentas-bancarias',      label: 'Cuentas Bancarias' },
    { key: 'entrega-dinero',         label: 'Entrega Dinero' },
    { key: 'settings',               label: 'Configuración' },
];
