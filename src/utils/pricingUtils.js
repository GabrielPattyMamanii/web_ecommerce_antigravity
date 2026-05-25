export function calcPrice(item, settings) {
    const docenas = parseFloat(item.cantidad_docenas || 0);
    const precioDocena = parseFloat(item.precio_docena || 0);
    const numDocenas = docenas || 1;

    // For old_entradas: cost = precioDocena directly; for normal: apply gastos × bultos per product
    const isOld = item._source === 'old_entradas';
    const precioVentaAlCosto = isOld
        ? precioDocena
        : (precioDocena * docenas + (parseFloat(item.gastos || 0) * parseFloat(item.bultos || 0))) / numDocenas;

    const indice = parseFloat(settings?.indice_ganancia_valor || 1.5);
    const precioDeVenta = precioVentaAlCosto * indice;
    const dolar = parseFloat(settings?.cotizacion_dolar || 0);
    const precioVentaArg = dolar > 0 ? precioDeVenta * dolar : null;

    return { precioVentaAlCosto, precioDeVenta, precioVentaArg };
}

export function formatARS(val) {
    if (val === null || val === undefined) return 'Sin cotización';
    return `$ ${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUSD(val) {
    if (val === null || val === undefined) return '-';
    return `$${Number(val).toFixed(2)}`;
}
