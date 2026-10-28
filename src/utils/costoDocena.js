// Cálculo del costo de UNA docena (en USD) de un producto de `entradas`, para guardarlo en
// ventas.costo_docena_usd. Es una función pura (sin acceso a la base) para poder probarla.
//
// Hay dos fórmulas, según los bultos de la boleta (grupo tanda + marca + boleta):
//   - Bultos personalizados: prorrateo por valor
//       costo = precio_docena × (1 + gastosTotales / valorTotalCompra)
//       gastosTotales = gastos × bultos_personalizados
//       valorTotalCompra = suma(docenas × precio_docena) de todos los productos de la boleta
//   - Bultos por fila: el envío se reparte por los bultos de cada producto
//       costo = (precio_docena × docenas + gastos × bultos de la fila) / docenas
//
// Regla que decide el caso: se usa el prorrateo SOLO si los bultos personalizados son distintos de
// cero Y la suma de los bultos de las filas de la boleta es cero. En cualquier otro caso se usan
// los bultos de cada fila. (La misma regla usa Precio Venta Sugerido.)
//
// Si no se puede calcular con certeza, devuelve costo = null, el motivo (texto) y un `codigo` estable
// ('faltan_datos' | 'sin_valor_compra' | 'sin_bultos'): la venta se guarda sin costo en vez de guardar
// un costo equivocado.
//
// ESTA ES LA ÚNICA FUENTE de la regla y la fórmula en JavaScript: la usan el costo guardado en cada
// venta, la exportación de tandas y todos los precios sugeridos (vía calcularCostoParaPrecio). Su copia
// en SQL es calc_costo_docena_usd (20261024_backfill_costo_docena_usd.sql): si se cambia una, hay que
// cambiar la otra. La prueba scripts/test-paridad-costo.mjs comprueba que den lo mismo.

export const usarBultosPersonalizados = (bultosPersonalizados, sumaBultosFilas) =>
    (Number(bultosPersonalizados) || 0) > 0 && (Number(sumaBultosFilas) || 0) === 0;

const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const redondear = (n) => Math.round(n * 1e6) / 1e6;

// entrada: fila de `entradas` del producto vendido.
// filasBoleta: todas las filas de `entradas` de su boleta (incluye la propia).
// bultosPersonalizados: número de bultos personalizados de la marca (0 si no tiene).
export function calcularCostoDocenaUsdDesdeFilas(entrada, filasBoleta, bultosPersonalizados) {
    const precio = parseFloat(entrada?.precio_docena);
    const docenas = num(entrada?.cantidad_docenas);
    if (!Number.isFinite(precio) || !(docenas > 0)) {
        return { costo: null, codigo: 'faltan_datos', motivo: 'Faltan datos de compra del producto (precio o cantidad de docenas)' };
    }

    const gastos = num(entrada.gastos);
    const filas = filasBoleta && filasBoleta.length > 0 ? filasBoleta : [entrada];
    const sumaBultosFilas = filas.reduce((s, f) => s + num(f.bultos), 0);
    const valorTotalCompra = filas.reduce((s, f) => s + num(f.cantidad_docenas) * num(f.precio_docena), 0);
    const personalizados = num(bultosPersonalizados);

    if (usarBultosPersonalizados(personalizados, sumaBultosFilas)) {
        if (!(valorTotalCompra > 0)) {
            return { costo: null, codigo: 'sin_valor_compra', motivo: 'La boleta no tiene valor de compra para repartir el envío' };
        }
        const gastosTotales = gastos * personalizados;
        return { costo: redondear(precio * (1 + gastosTotales / valorTotalCompra)), codigo: null, motivo: null };
    }

    // Bultos por fila. Si hay gastos pero ningún bulto aplicable, el costo saldría sin envío.
    if (gastos > 0 && sumaBultosFilas === 0) {
        return { costo: null, codigo: 'sin_bultos', motivo: 'La boleta no tiene bultos cargados: el costo saldría sin envío' };
    }
    return {
        costo: redondear((precio * docenas + gastos * num(entrada.bultos)) / docenas),
        codigo: null,
        motivo: null,
    };
}

// Costo para MOSTRAR precios sugeridos. Usa exactamente la misma regla y fórmula que el costo guardado
// en la venta. Cuando el costo no se puede calcular con certeza (costo = null), el precio igual se
// muestra con la fórmula por fila (sin envío si la boleta no tiene bultos) y se devuelve un `aviso`
// con el código del motivo, para que la pantalla lo señale ('sin_bultos' = la boleta tiene gastos de
// envío pero ningún bulto cargado, así que el costo no incluye el envío).
//
// filasBoleta: todas las filas de la boleta. Si no se conocen (undefined), no se puede saber si la
// boleta tiene bultos en otras filas, así que NO se informa el aviso 'sin_bultos'.
export function calcularCostoParaPrecio(entrada, filasBoleta, bultosPersonalizados) {
    const r = calcularCostoDocenaUsdDesdeFilas(entrada, filasBoleta, bultosPersonalizados);
    if (r.costo != null) return { costo: r.costo, aviso: null };

    const precio = parseFloat(entrada?.precio_docena || 0);
    const docenas = parseFloat(entrada?.cantidad_docenas || 0);
    const costoPorFila = (precio * docenas + parseFloat(entrada?.gastos || 0) * parseFloat(entrada?.bultos || 0)) / (docenas || 1);
    const aviso = r.codigo === 'sin_bultos' && !filasBoleta ? null : r.codigo;
    return { costo: costoPorFila, aviso };
}
