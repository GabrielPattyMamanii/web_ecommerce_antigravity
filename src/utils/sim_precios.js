
const KEY = 'sb_publishable_-d-Qway4FjdBXE3Q9SBfvQ_Id9yEyha';
const BASE = 'https://qfvdawqnfxoxzmpgqhaa.supabase.co/rest/v1';

async function query(table, params) {
    const res = await fetch(`${BASE}/${table}?${params}`, {
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
    });
    return res.json();
}

async function simulate(label, boleta, bultosPersonalizados, gastosField) {
    const products = await query('entradas', `codigo_boleta=eq.${boleta}&select=codigo,producto_titulo,cantidad_docenas,precio_docena,gastos,bultos`);

    const gastosPorBulto = products[0]?.gastos || 0;
    const bultos = bultosPersonalizados > 0
        ? bultosPersonalizados
        : products.reduce((s, p) => s + (parseFloat(p.bultos) || 0), 0);

    // K: valor total de todas las docenas
    const K = products.reduce((s, p) => s + (p.cantidad_docenas * p.precio_docena), 0);
    // L: gastos totales = gastos_por_bulto * bultos
    const L = gastosPorBulto * bultos;

    console.log(`\n==== ${label} ====`);
    console.log(`Boleta: ${boleta} | Bultos: ${bultos} | gastos_por_bulto: $${gastosPorBulto} | L (gastos total): $${L} | K (total docenas $): $${K}`);
    console.log('');

    const INDICE = 1.5;

    const rows = products.map(p => {
        const docenas = p.cantidad_docenas;
        const precio = parseFloat(p.precio_docena);
        const D = docenas * precio;                          // total docenas
        const E = (100 * D) / K;                            // porcentaje
        const F = (0.01 * E) * L;                           // gastos asignados
        const G = (precio + F) / docenas;                   // costo USD/unidad
        const H = G + precio;                               // valor costo
        const precioVenta = H * INDICE;                     // sin dólar, relativo

        return { codigo: p.codigo, titulo: p.producto_titulo, docenas, precio, D, E: E.toFixed(2), F: F.toFixed(2), G: G.toFixed(2), H: H.toFixed(2), precioVenta: precioVenta.toFixed(2) };
    });

    console.log('Código        | Docenas | P/Doc | Total$  | %      | Gastos | CostoUSD | ValCosto | PrecioVenta(×1.5)');
    console.log('--------------|---------|-------|---------|--------|--------|----------|----------|------------------');
    rows.forEach(r => {
        console.log(`${r.codigo.padEnd(14)}| ${String(r.docenas).padEnd(8)}| ${String(r.precio).padEnd(6)}| ${String(r.D).padEnd(8)}| ${r.E.padEnd(7)}| ${r.F.padEnd(7)}| ${r.G.padEnd(9)}| ${r.H.padEnd(9)}| ${r.precioVenta}`);
    });
}

(async () => {
    // YOOMITO: bultos_personalizados = 5
    await simulate('YOOMITO - Boleta 018779', '018779', 5, null);
    // SSJ: boleta 0027041, bultos = 1 per product
    await simulate('SSJ - Boleta 0027041', '0027041', 0, null);
})();
