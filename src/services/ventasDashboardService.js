import { supabase } from '../lib/supabase';

// Datos del dashboard de ventas y ganancia. Toda la agregación se hace en SQL (RPC
// get_dashboard_ventas, solo admin): Supabase corta las consultas en 1000 filas, así que sumar
// ventas en el navegador daría totales incompletos.
//
// agrupacion: 'dia' | 'semana' | 'mes'. desde / hasta: 'AAAA-MM-DD' (ambas inclusive).
// dias: días de la semana a incluir (1 = lunes ... 7 = domingo); null = todos.
// Devuelve { periodo, grafico, por_dia, ventas, total, alertas, advertencias } (ver la migración).
export async function fetchDashboardVentas({ desde, hasta, agrupacion = 'dia', dias = null }) {
    const { data, error } = await supabase.rpc('get_dashboard_ventas', {
        p_desde: desde,
        p_hasta: hasta,
        p_agrupacion: agrupacion,
        p_dias: dias,
    });
    if (error) throw error;
    return data;
}

// Botón "Recalcular costos" (RPC recalcular_costos_ventas, solo admin). Completa el costo de las
// ventas con producto vinculado y costo NULL; nunca sobrescribe un costo existente.
// aplicar = false: vista previa (no escribe). aplicar = true: guarda.
// Devuelve { aplicado, recalculables, sin_resultado, actualizadas, muestra }.
export async function recalcularCostosVentas({ aplicar = false } = {}) {
    const { data, error } = await supabase.rpc('recalcular_costos_ventas', { p_aplicar: aplicar });
    if (error) throw error;
    return data;
}

// Detalle de lo vendido en un período corto (un día, una semana o un mes: máximo 35 días), para el
// desplegable de la tabla (RPC get_ventas_periodo, solo admin). Se pide al abrir la fila.
// dias: mismo filtro de días de la semana que fetchDashboardVentas (1 = lunes ... 7 = domingo).
// Devuelve { ventas, total, truncado }.
export async function fetchVentasPeriodo({ desde, hasta, dias = null }) {
    const { data, error } = await supabase.rpc('get_ventas_periodo', {
        p_desde: desde,
        p_hasta: hasta,
        p_dias: dias,
    });
    if (error) throw error;
    return data;
}
