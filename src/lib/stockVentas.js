import toast from 'react-hot-toast';
import { supabase } from './supabase';

// --- Stock por producto (compartido por Registrar Ventas y el Historial de ventas) ---
// Lo vendido de un producto se suma por entrada_id: vínculo exacto con su fila de "entradas", no
// depende del propietario ni de que el código se repita dentro de la tanda.
// Respaldo solo para ventas viejas sin entrada_id: se asignan por tanda + código + propietario,
// y únicamente si ese trío identifica a un solo producto (si no, es ambiguo y no se asigna).
// disponible = cantidad_docenas − vendido. cantidad_docenas nunca se modifica por ventas.

export const normalizeOwner = (name) => {
    const n = (name || '').trim();
    return n === 'Sin propietario' ? '' : n;
};
export const ownerKeyOf = (e) => normalizeOwner(e.propietario_producto) || normalizeOwner(e.propietario);

// ventas: filas candidatas; hermanos: entradas de la misma tanda y código (para detectar ambigüedad)
export const calcSold = (entrada, ventas, hermanos) => {
    const key = ownerKeyOf(entrada);
    const rivales = hermanos.filter(s =>
        s.tanda_nombre === entrada.tanda_nombre && s.codigo === entrada.codigo && ownerKeyOf(s) === key
    ).length;
    let sold = 0;
    for (const v of ventas) {
        const cant = Number(v.cantidad_docenas) || 0;
        if (v.entrada_id) {
            if (v.entrada_id === entrada.id) sold += cant;
        } else if (
            rivales <= 1 &&
            v.codigo === entrada.codigo &&
            (v.tanda_nombre || '') === (entrada.tanda_nombre || '') &&
            normalizeOwner(v.propietario) === key
        ) {
            sold += cant;
        }
    }
    return sold;
};

export const VENTAS_STOCK_FIELDS = 'entrada_id, codigo, tanda_nombre, propietario, cantidad_docenas';

// Docenas vendidas de un producto concreto (consulta propia, para el producto ya seleccionado)
export const fetchSoldForEntrada = async (entrada) => {
    const vinculadas = supabase.from('ventas').select(VENTAS_STOCK_FIELDS).eq('entrada_id', entrada.id);
    if (!entrada.codigo) {
        const { data } = await vinculadas;
        return calcSold(entrada, data || [], []);
    }
    let sinVinculo = supabase.from('ventas').select(VENTAS_STOCK_FIELDS).is('entrada_id', null).eq('codigo', entrada.codigo);
    let hermanos = supabase.from('entradas').select('id, tanda_nombre, codigo, propietario, propietario_producto').eq('codigo', entrada.codigo);
    if (entrada.tanda_nombre) {
        sinVinculo = sinVinculo.eq('tanda_nombre', entrada.tanda_nombre);
        hermanos = hermanos.eq('tanda_nombre', entrada.tanda_nombre);
    }
    const [a, b, c] = await Promise.all([vinculadas, sinVinculo, hermanos]);
    return calcSold(entrada, [...(a.data || []), ...(b.data || [])], c.data || []);
};

// Docenas vendidas de varios productos a la vez (ej. el mismo código en varias tandas): { [entrada.id]: vendido }.
// Lanza error si no puede consultar.
export const fetchSoldForEntradas = async (entradas) => {
    const ids = entradas.map(e => e.id);
    if (ids.length === 0) return {};
    const codes = [...new Set(entradas.filter(e => e.codigo).map(e => e.codigo))];
    const [vinculadas, sinVinculo, hermanos] = await Promise.all([
        supabase.from('ventas').select(VENTAS_STOCK_FIELDS).in('entrada_id', ids),
        codes.length > 0
            ? supabase.from('ventas').select(VENTAS_STOCK_FIELDS).is('entrada_id', null).in('codigo', codes)
            : Promise.resolve({ data: [] }),
        codes.length > 0
            ? supabase.from('entradas').select('id, tanda_nombre, codigo, propietario, propietario_producto').in('codigo', codes)
            : Promise.resolve({ data: [] }),
    ]);
    if (vinculadas.error || sinVinculo.error || hermanos.error) throw new Error('No se pudo leer el stock');
    const ventas = [...(vinculadas.data || []), ...(sinVinculo.data || [])];
    return Object.fromEntries(entradas.map(e => [e.id, calcSold(e, ventas, hermanos.data || [])]));
};

// Stock actual de un producto leído de la base por su id: { entrada, total, sold, disponible }.
// Devuelve null si el producto ya no existe; lanza error si no puede consultar.
export const fetchEntradaStock = async (entradaId) => {
    const { data: entrada, error } = await supabase
        .from('entradas')
        .select('id, tanda_nombre, codigo, propietario, propietario_producto, cantidad_docenas')
        .eq('id', entradaId)
        .maybeSingle();
    if (error) throw error;
    if (!entrada) return null;
    const total = Number(entrada.cantidad_docenas) || 0;
    const sold = await fetchSoldForEntrada(entrada);
    return { entrada, total, sold, disponible: total - sold };
};

// ¿El error de la base es por la restricción de stock negativo (chk_stock_no_negativo)?
export const esErrorStockNegativo = (err) =>
    err?.code === '23514' || String(err?.message || '').includes('chk_stock_no_negativo');

// Aviso cuando se intenta vender (o editar a) más de lo disponible
export const avisarStockInsuficiente = ({ available, total, propietario, codigo }) => {
    if (available <= 0) {
        toast.error(
            `⚠️ ${propietario} ya vendió todas sus ${total} docenas del código ${codigo}`,
            { duration: 5000 }
        );
    } else {
        const dispStr = available % 1 === 0 ? available : available.toFixed(1);
        toast.error(
            `⚠️ Solo quedan ${dispStr} docena${available !== 1 ? 's' : ''} disponibles para ${propietario} (código ${codigo})`,
            { duration: 5000 }
        );
    }
};

// Aviso para ventas ya guardadas (historial): máximo que admite esa venta y stock disponible del producto
export const avisarLimiteVenta = ({ codigo, maximo, disponible }) => {
    const fmt = (n) => (n % 1 === 0 ? n : n.toFixed(1));
    toast.error(
        `⚠️ Stock insuficiente en ${codigo}: como máximo podés poner ${fmt(Math.max(0, maximo))} docenas en esta venta (quedan ${fmt(Math.max(0, disponible))} disponibles).`,
        { duration: 7000 }
    );
};
