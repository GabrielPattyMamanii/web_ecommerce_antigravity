import { supabase } from '../lib/supabase';
import { calcularCostoDocenaUsdDesdeFilas } from '../utils/costoDocena';

const PAGE = 1000;

// Lee todas las filas de una tabla (PostgREST corta en 1000 por consulta).
async function fetchAll(tabla) {
    const filas = [];
    for (let desde = 0; ; desde += PAGE) {
        const { data, error } = await supabase
            .from(tabla)
            .select('*')
            .order('id', { ascending: true })
            .range(desde, desde + PAGE - 1);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < PAGE) break;
    }
    return filas;
}

const numOrNull = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
};

const boletaKey = (f) => `${f.tanda_nombre}__${f.marca}__${f.codigo_boleta || ''}`;

// Arma un objeto con TODAS las tandas, cada una con sus productos:
//   precio_compra_usd = precio de la boleta (USD por docena)
//   costo_usd         = costo de una docena (misma fórmula que ventas.costo_docena_usd)
// Los productos cuyo costo no se puede calcular con certeza llevan costo_usd = null y el motivo.
export async function buildTandasExport() {
    const [entradas, viejas] = await Promise.all([
        fetchAll('entradas'),
        fetchAll('old_entradas').catch(() => []), // puede no existir o estar vacía
    ]);

    const nombres = [...new Set(entradas.map(f => f.tanda_nombre).filter(Boolean))];
    let bultosMap = null;
    if (nombres.length > 0) {
        const { data, error } = await supabase.rpc('get_bultos_personalizados', {
            p_tandas: nombres,
            p_app_user_id: sessionStorage.getItem('app_user_id') || null,
        });
        if (error) console.error('buildTandasExport: bultos personalizados', error);
        bultosMap = error ? null : data;
    }

    const filasPorBoleta = new Map();
    entradas.forEach(f => {
        const k = boletaKey(f);
        if (!filasPorBoleta.has(k)) filasPorBoleta.set(k, []);
        filasPorBoleta.get(k).push(f);
    });

    const tandas = new Map();
    const tandaDe = (nombre, fecha) => {
        if (!tandas.has(nombre)) tandas.set(nombre, { tanda: nombre, fecha: fecha || null, productos: [] });
        const t = tandas.get(nombre);
        if (!t.fecha && fecha) t.fecha = fecha;
        return t;
    };

    entradas.forEach(f => {
        let costo = null;
        let motivo = null;
        if (bultosMap === null || bultosMap === undefined) {
            motivo = 'No se pudieron consultar los bultos personalizados (migración de la RPC pendiente o sin permiso)';
        } else {
            const marcas = bultosMap[f.tanda_nombre];
            const bultosPers = marcas ? parseFloat(f.marca_id ? marcas[f.marca_id] : marcas[f.marca]) || 0 : 0;
            const r = calcularCostoDocenaUsdDesdeFilas(f, filasPorBoleta.get(boletaKey(f)), bultosPers);
            costo = r.costo;
            motivo = r.motivo;
        }
        tandaDe(f.tanda_nombre, f.tanda_fecha).productos.push({
            codigo: f.codigo ?? null,
            producto: f.producto_titulo ?? null,
            marca: f.marca ?? null,
            boleta: f.codigo_boleta || null,
            docenas: numOrNull(f.cantidad_docenas),
            precio_compra_usd: numOrNull(f.precio_docena),
            costo_usd: costo,
            motivo_sin_costo: motivo,
        });
    });

    // Tandas viejas: el costo es directamente precio_docena (igual que calcPrice)
    viejas.forEach(f => {
        const precio = numOrNull(f.precio_docena);
        tandaDe(f.tanda_nombre, f.tanda_fecha).productos.push({
            codigo: f.codigo ?? null,
            producto: f.producto_titulo ?? null,
            marca: f.marca ?? null,
            boleta: f.codigo_boleta || null,
            docenas: numOrNull(f.cantidad_docenas),
            precio_compra_usd: precio,
            costo_usd: precio,
            motivo_sin_costo: precio === null ? 'Sin precio de compra' : null,
        });
    });

    const lista = [...tandas.values()].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    return {
        generado: new Date().toISOString(),
        moneda: 'USD por docena',
        total_tandas: lista.length,
        total_productos: lista.reduce((s, t) => s + t.productos.length, 0),
        tandas: lista,
    };
}

export async function descargarTandasJson() {
    const data = await buildTandasExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tandas-costos-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return data;
}
