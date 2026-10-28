import { supabase } from '../lib/supabase';
import { calcularCostoDocenaUsdDesdeFilas, calcularCostoParaPrecio } from './costoDocena';

const grupoKey = (p) => `${p.tanda_nombre}__${p.marca}__${p.codigo_boleta}`;

const CAMPOS_COSTO = 'id, tanda_nombre, marca, marca_id, codigo_boleta, cantidad_docenas, precio_docena, gastos, bultos';

// true si el error de la base es "no existe la columna costo_docena_usd" (migración sin ejecutar).
// Permite que registrar una venta siga funcionando aunque la columna todavía no exista.
// Solo cuenta el error de columna inexistente: un "permiso denegado" sobre la columna NO es lo mismo
// y no debe llevar a guardar la venta sin costo en silencio.
export const esErrorColumnaCosto = (error) =>
    typeof error?.message === 'string'
    && error.message.includes('costo_docena_usd')
    && (error.code === '42703' || error.code === 'PGRST204' || /does not exist|could not find/i.test(error.message));

// Calcula el costo de una docena (USD) de varios productos a la vez, para guardarlo en
// ventas.costo_docena_usd al registrar una venta. Devuelve Map(entrada_id -> { costo, motivo }).
// `costo` es null cuando no se puede calcular con certeza (la venta se guarda sin costo):
//   - falla la RPC o el usuario no tiene permiso (get_bultos_personalizados devuelve NULL): no se
//     sabe si la marca tiene bultos personalizados, así que NO se asume que no los tiene;
//   - la boleta no tiene ningún bulto aplicable (el costo saldría sin envío);
//   - faltan datos de compra del producto.
export async function calcularCostosDocenaUsd(entradaIds) {
    const ids = [...new Set((entradaIds || []).filter(Boolean))];
    const resultado = new Map();
    const sinCosto = (motivo) => ids.forEach(id => resultado.set(id, { costo: null, motivo }));
    if (ids.length === 0) return resultado;

    try {
        const { data: filas, error } = await supabase.from('entradas').select(CAMPOS_COSTO).in('id', ids);
        if (error) throw error;
        const porId = new Map((filas || []).map(f => [f.id, f]));

        // Todas las filas de cada boleta (tanda + marca + boleta): una consulta por boleta distinta
        const boletas = new Map();
        (filas || []).forEach(f => {
            const key = grupoKey(f);
            if (!boletas.has(key)) boletas.set(key, f);
        });
        const filasPorBoleta = new Map();
        await Promise.all([...boletas.entries()].map(async ([key, f]) => {
            let q = supabase.from('entradas').select(CAMPOS_COSTO).eq('tanda_nombre', f.tanda_nombre).eq('marca', f.marca);
            q = f.codigo_boleta ? q.eq('codigo_boleta', f.codigo_boleta) : q.or('codigo_boleta.is.null,codigo_boleta.eq.');
            const { data, error: errBoleta } = await q;
            if (errBoleta) throw errBoleta;
            filasPorBoleta.set(key, data || []);
        }));

        // Bultos personalizados: una sola llamada para todas las tandas
        const tandas = [...new Set((filas || []).map(f => f.tanda_nombre).filter(Boolean))];
        const { data: bultosMap, error: errRpc } = await supabase.rpc('get_bultos_personalizados', {
            p_tandas: tandas,
            p_app_user_id: sessionStorage.getItem('app_user_id') || null,
        });
        if (errRpc || bultosMap === null || bultosMap === undefined) {
            console.error('calcularCostosDocenaUsd: no se pudo consultar los bultos personalizados', errRpc);
            sinCosto('No se pudieron consultar los bultos personalizados (falta ejecutar la migración de la RPC o el usuario no tiene permiso)');
            return resultado;
        }

        ids.forEach(id => {
            const entrada = porId.get(id);
            if (!entrada) {
                resultado.set(id, { costo: null, motivo: 'El producto ya no existe en la tanda' });
                return;
            }
            const marcas = bultosMap[entrada.tanda_nombre];
            const bultosPersonalizados = marcas
                ? parseFloat(entrada.marca_id ? marcas[entrada.marca_id] : marcas[entrada.marca]) || 0
                : 0;
            resultado.set(id, calcularCostoDocenaUsdDesdeFilas(entrada, filasPorBoleta.get(grupoKey(entrada)), bultosPersonalizados));
        });
        return resultado;
    } catch (err) {
        console.error('calcularCostosDocenaUsd:', err);
        sinCosto('No se pudo calcular el costo (error al consultar la base)');
        return resultado;
    }
}

// Lee TODAS las filas de una consulta (Supabase corta en 1000 por pedido). `armar` devuelve una consulta nueva
// cada vez porque un builder de Supabase no se puede reutilizar.
async function leerTodasLasFilas(armar) {
    const filas = [];
    for (let desde = 0; ; desde += 1000) {
        const { data, error } = await armar().range(desde, desde + 999);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < 1000) break;
    }
    return filas;
}

// Completa cada item con los datos que necesita calcPrice para aplicar la MISMA regla y fórmula que el
// costo guardado en la venta (src/utils/costoDocena.js):
//   _filasBoleta: todas las filas de su boleta (tanda + marca + boleta);
//   _bultosPersonalizados: bultos personalizados de su marca (0 si no tiene).
// Los items necesitan tanda_nombre, marca, codigo_boleta (y marca_id si existe). Si algo falla (p. ej. la RPC
// de bultos personalizados), devuelve los items sin cambios: calcPrice usa entonces la fórmula por fila
// y NO muestra el aviso "sin bultos" (no se puede saber si la boleta tiene bultos personalizados).
export async function attachProrrateo(items) {
    try {
        const candidatos = items.filter(
            i => i._source !== 'old_entradas' && i.tanda_nombre && i.codigo_boleta
        );
        if (candidatos.length === 0) return items;

        const tandasNombres = [...new Set(candidatos.map(i => i.tanda_nombre))];
        // RPC (no lectura directa de `tandas`): valida el permiso del usuario, sea admin de
        // Supabase Auth o app_user, y devuelve { tanda: { marca_id_o_marca: bultos } }.
        const { data: bultosMap, error } = await supabase.rpc('get_bultos_personalizados', {
            p_tandas: tandasNombres,
            p_app_user_id: sessionStorage.getItem('app_user_id') || null,
        });
        if (error) throw error;
        // NULL = sin permiso o no consultable: no se sabe si hay bultos personalizados
        if (bultosMap === null || bultosMap === undefined) return items;

        const boletas = [...new Set(candidatos.map(i => i.codigo_boleta))];
        const filas = await leerTodasLasFilas(() => supabase
            .from('entradas')
            .select('id, tanda_nombre, marca, codigo_boleta, cantidad_docenas, precio_docena, gastos, bultos')
            .in('tanda_nombre', tandasNombres)
            .in('codigo_boleta', boletas)
            .order('id'));

        const filasPorGrupo = {};
        filas.forEach(f => { (filasPorGrupo[grupoKey(f)] ||= []).push(f); });

        return items.map(i => {
            if (i._source === 'old_entradas' || !i.tanda_nombre || !i.codigo_boleta) return i;
            const marcas = bultosMap[i.tanda_nombre];
            const bultosPersonalizados = marcas
                ? parseFloat(i.marca_id ? marcas[i.marca_id] : marcas[i.marca]) || 0
                : 0;
            const filasBoleta = filasPorGrupo[grupoKey(i)];
            return { ...i, _filasBoleta: filasBoleta && filasBoleta.length > 0 ? filasBoleta : undefined, _bultosPersonalizados: bultosPersonalizados };
        });
    } catch (err) {
        console.error('attachProrrateo:', err);
        return items;
    }
}

// Costo sugerido de un item (lo usan calcPrice y el listado de precios). Sale de calcularCostoParaPrecio (la misma regla y fórmula que el costo
// guardado en la venta); tandas viejas (old_entradas): costo = precio_docena directamente.
// `aviso` = 'sin_bultos' cuando la boleta tiene gastos de envío pero ningún bulto cargado: el costo (y el
// precio) no incluyen el envío. Es null si todo está bien o si no se conocen los datos de la boleta.
export function calcCostoSugerido(item) {
    if (item._source === 'old_entradas') return { costo: parseFloat(item.precio_docena || 0), aviso: null };
    return calcularCostoParaPrecio(item, item._filasBoleta, item._bultosPersonalizados);
}

export function calcPrice(item, settings) {
    const { costo: precioVentaAlCosto, aviso } = calcCostoSugerido(item);

    const indice = parseFloat(settings?.indice_ganancia_valor || 1.5);
    const precioDeVenta = precioVentaAlCosto * indice;
    const dolar = parseFloat(settings?.cotizacion_dolar || 0);
    const precioVentaArg = dolar > 0 ? precioDeVenta * dolar : null;

    return { precioVentaAlCosto, precioDeVenta, precioVentaArg, aviso };
}

// Texto del aviso de costo para mostrar en pantalla (null si no hay nada que avisar)
export const AVISO_SIN_BULTOS = 'La boleta tiene gastos de envío pero no tiene bultos cargados: este costo y este precio no incluyen el envío.';

export function formatARS(val) {
    if (val === null || val === undefined) return 'Sin cotización';
    return `$ ${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUSD(val) {
    if (val === null || val === undefined) return '-';
    return `$${Number(val).toFixed(2)}`;
}
