import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { AlertTriangle, ChevronRight, Info, RefreshCw } from 'lucide-react';
import { fetchDashboardVentas, fetchVentasPeriodo, recalcularCostosVentas } from '../../services/ventasDashboardService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// Colores de las dos series (orden fijo del sistema de colores: azul = vendido, naranja = ganancia),
// con su paso para modo claro y oscuro. Nunca se usa solo el color: hay leyenda y tabla.
const COLORES = {
    claro:  { vendido: '#2a78d6', ganancia: '#eb6834', texto: '#52514e', grilla: 'rgba(11,11,11,0.08)', superficie: '#fcfcfb' },
    oscuro: { vendido: '#3987e5', ganancia: '#d95926', texto: '#c3c2b7', grilla: 'rgba(240,239,236,0.12)', superficie: '#1a1a19' },
};

const pad = (n) => String(n).padStart(2, '0');
const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const rangoMes = (offset = 0) => {
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + offset + 1, 0);
    return { desde: aISO(desde), hasta: aISO(offset === 0 ? hoy : finMes) };
};

// Días de la semana (1 = lunes ... 7 = domingo, igual que la consulta SQL)
const DIAS_SEMANA = [
    { n: 1, corto: 'Lun', largo: 'lunes' }, { n: 2, corto: 'Mar', largo: 'martes' },
    { n: 3, corto: 'Mié', largo: 'miércoles' }, { n: 4, corto: 'Jue', largo: 'jueves' },
    { n: 5, corto: 'Vie', largo: 'viernes' }, { n: 6, corto: 'Sáb', largo: 'sábado' },
    { n: 7, corto: 'Dom', largo: 'domingo' },
];
const TODOS_LOS_DIAS = [1, 2, 3, 4, 5, 6, 7];
const CLAVE_DIAS = 'ventas_dashboard_dias';

// Los días elegidos se recuerdan en este navegador (solo una comodidad; si falla, arranca con todos)
const leerDiasGuardados = () => {
    try {
        const v = JSON.parse(localStorage.getItem(CLAVE_DIAS));
        if (Array.isArray(v) && v.length > 0 && v.every(d => TODOS_LOS_DIAS.includes(d))) return v;
    } catch { /* sin almacenamiento: se usan todos */ }
    return TODOS_LOS_DIAS;
};

const ars = (n) => (n == null ? '—' : `$ ${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
const usd = (n) => (n == null ? '—' : `US$ ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const num = (n, dec) => (n == null ? '—' : Number(n).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
const pct = (n) => (n == null ? '—' : `${num(n, 1)} %`);

// 'AAAA-MM-DD' -> texto corto, sin pasar por Date (evita corrimientos de zona horaria)
const etiqueta = (iso, agrupacion) => {
    const [y, m, d] = iso.split('-');
    if (agrupacion === 'mes') return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
    if (agrupacion === 'semana') return `sem ${d}/${m}`;
    return `${d}/${m}`;
};

// Por qué una venta con producto vinculado quedó sin costo, y qué hacer. Las claves son los códigos que devuelve
// calc_costo_docena_usd_detalle (SQL); `recalculable` = no tiene problema ahora, solo falta calcularlo.
const MOTIVOS_SIN_COSTO = {
    sin_bultos: {
        titulo: 'La boleta no tiene bultos cargados',
        ayuda: 'Tiene gastos de envío pero ningún bulto (ni en cada producto ni como bultos personalizados de la marca). Cargá los bultos en Tandas y apretá "Recalcular costos".',
    },
    sin_valor_compra: {
        titulo: 'La boleta tiene valor de compra 0',
        ayuda: 'Hay bultos personalizados pero los productos no tienen precio o docenas, así que no se puede repartir el envío. Revisá el precio y las docenas en Tandas.',
    },
    faltan_datos: {
        titulo: 'Al producto le faltan datos de compra',
        ayuda: 'No tiene precio de compra o cantidad de docenas en la tanda. Completalos en Tandas y apretá "Recalcular costos".',
    },
    entrada_inexistente: {
        titulo: 'El producto ya no existe en la tanda',
        ayuda: 'Se borró de la tanda, así que no se puede calcular su costo.',
    },
    recalculable: {
        titulo: 'Se puede calcular ahora',
        ayuda: 'El costo no se guardó al vender (por ejemplo, falló la consulta de bultos personalizados), pero ahora los datos están completos: apretá "Recalcular costos".',
    },
};

// Suma días a una fecha 'AAAA-MM-DD' sin pasar por la zona horaria local
const sumarDias = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const finDeMes = (iso) => {
    const [y, m] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

// Junta las líneas de venta en pedidos (mismo venta_id), conservando el orden
const agruparPedidos = (ventas) => {
    const mapa = new Map();
    ventas.forEach(v => {
        const clave = v.venta_id || `linea-${v.id}`;
        if (!mapa.has(clave)) mapa.set(clave, { clave, fecha: v.fecha, nombre: v.pedido, lineas: [] });
        mapa.get(clave).lineas.push(v);
    });
    return [...mapa.values()];
};

function useModoOscuro() {
    const leer = () => document.documentElement.classList.contains('dark');
    const [oscuro, setOscuro] = useState(leer);
    useEffect(() => {
        const obs = new MutationObserver(() => setOscuro(leer()));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return oscuro;
}

function Tarjeta({ titulo, valor, detalle }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{titulo}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{valor}</p>
            {detalle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detalle}</p>}
        </div>
    );
}

// Contenido del desplegable de un período: pedidos con sus productos y el subtotal.
// En dólares, cada venta se convierte con SU propio dolar_blue (el del momento en que se registró),
// nunca con el dólar de Precio Venta Sugerido. El índice, el markup y el margen son iguales en ambas monedas.
function DetallePeriodo({ ab, fila, agrupacion, moneda, onMoneda }) {
    if (ab.cargando) return <p className="py-2 text-sm text-gray-500 dark:text-gray-400">Cargando lo vendido…</p>;
    if (ab.error) return <p role="alert" className="py-2 text-sm text-red-700 dark:text-red-300">{ab.error}</p>;
    const { ventas, total, truncado } = ab.datos;
    if (ventas.length === 0) return <p className="py-2 text-sm text-gray-500 dark:text-gray-400">No hay ventas en este período.</p>;
    const pedidos = agruparPedidos(ventas);
    const coincide = Math.round(total.vendido) === Math.round(fila.vendido);
    const enUsd = moneda === 'usd';
    const m = enUsd ? usd : ars;
    const v = (pesos, dolares) => (enUsd ? dolares : pesos);
    const sumaPedido = (ped) => ped.lineas.reduce((acc, l) => acc + Number(v(l.vendido, l.vendido_usd) || 0), 0);
    return (
        <div className="space-y-3 text-sm text-gray-900 dark:text-gray-100">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Mostrar en:</span>
                <div role="group" aria-label="Moneda del detalle" className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
                    {[['ars', 'Pesos ($)'], ['usd', 'Dólares (US$)']].map(([clave, texto]) => (
                        <button key={clave} type="button" onClick={() => onMoneda(clave)} aria-pressed={moneda === clave}
                            className={`px-3 py-1 text-xs font-medium ${moneda === clave
                                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            {texto}
                        </button>
                    ))}
                </div>
                {enUsd && <span className="text-xs text-gray-500 dark:text-gray-400">Cada venta se convierte con su propio dólar (el del día en que se registró).</span>}
            </div>

            {/* Una sola tabla para todos los pedidos: las columnas quedan alineadas entre pedidos */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <table className="w-full table-fixed tabular-nums">
                    <colgroup>
                        <col />
                        <col className="w-16" />
                        {enUsd && <col className="w-20" />}
                        <col className="w-28" />
                        <col className="w-28" />
                        <col className="w-28" />
                        <col className="w-28" />
                        <col className="w-28" />
                        <col className="w-16" />
                        <col className="w-20" />
                        <col className="w-20" />
                    </colgroup>
                    <thead className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th scope="col" className="px-3 py-1.5 text-left font-medium">Producto</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium">Docenas</th>
                            {enUsd && <th scope="col" className="px-3 py-1.5 text-right font-medium" title="Dólar de la venta (dolar_blue)">Dólar</th>}
                            <th scope="col" className="px-3 py-1.5 text-right font-medium">Precio doc.</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium">Costo doc.</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium">Vendido</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium">Costo</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium">Ganancia</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium" title="Vendido ÷ costo">Índice</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium" title="Ganancia ÷ costo">Markup</th>
                            <th scope="col" className="px-3 py-1.5 text-right font-medium" title="Ganancia ÷ vendido">Margen</th>
                        </tr>
                    </thead>
                    {pedidos.map(ped => (
                        <tbody key={ped.clave} className="border-t border-gray-200 dark:border-gray-700 first:border-t-0">
                            <tr className="bg-gray-100/70 dark:bg-gray-900/40">
                                <th colSpan={enUsd ? 11 : 10} scope="colgroup" className="px-3 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {agrupacion !== 'dia' && <span className="mr-2 tabular-nums">{etiqueta(ped.fecha, 'dia')}</span>}
                                    {ped.nombre || 'Pedido'} · {ped.lineas.length} {ped.lineas.length === 1 ? 'producto' : 'productos'} · {m(sumaPedido(ped))}
                                </th>
                            </tr>
                            {ped.lineas.map(l => (
                                <tr key={l.id} className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="px-3 py-1 text-left truncate" title={l.producto || l.codigo}>{l.producto || l.codigo}</td>
                                    <td className="px-3 py-1 text-right">{num(l.cantidad, 0)}</td>
                                    {enUsd && <td className="px-3 py-1 text-right">{l.dolar == null ? '—' : ars(l.dolar)}</td>}
                                    <td className="px-3 py-1 text-right">{m(v(l.precio_unitario, l.precio_unitario_usd))}</td>
                                    <td className="px-3 py-1 text-right">{l.sin_costo ? <span className="text-amber-700 dark:text-amber-300">⚠ sin costo</span> : m(v(l.costo_unitario, l.costo_unitario_usd))}</td>
                                    <td className="px-3 py-1 text-right">{m(v(l.vendido, l.vendido_usd))}</td>
                                    <td className="px-3 py-1 text-right">{m(v(l.costo, l.costo_usd))}</td>
                                    <td className="px-3 py-1 text-right">{m(v(l.ganancia, l.ganancia_usd))}</td>
                                    <td className="px-3 py-1 text-right">{num(l.indice, 3)}</td>
                                    <td className="px-3 py-1 text-right">{pct(l.markup)}</td>
                                    <td className="px-3 py-1 text-right">{pct(l.margen)}</td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">
                Subtotal: vendido {m(v(total.vendido, total.vendido_usd))} · costo {m(v(total.costo, total.costo_usd))} · ganancia {m(v(total.ganancia, total.ganancia_usd))} · índice {num(total.indice, 3)} · markup {pct(total.markup)} · {total.cantidad_ventas} {total.cantidad_ventas === 1 ? 'pedido' : 'pedidos'}
            </p>
            {enUsd && total.ventas_sin_dolar > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{total.ventas_sin_dolar} {total.ventas_sin_dolar === 1 ? 'línea no tiene' : 'líneas no tienen'} un dólar válido: no se pueden pasar a dólares y no suman en el subtotal.</p>
            )}
            {truncado && <p className="text-xs text-amber-700 dark:text-amber-300">Se muestran las primeras 1000 líneas; el subtotal incluye todas.</p>}
            {!coincide && <p role="alert" className="text-xs text-red-700 dark:text-red-300">El subtotal del detalle ({ars(total.vendido)}) no coincide con la fila ({ars(fila.vendido)}). Actualizá el resumen.</p>}
        </div>
    );
}

export function VentasDashboard() {
    const oscuro = useModoOscuro();
    const colores = oscuro ? COLORES.oscuro : COLORES.claro;

    const [rango, setRango] = useState(rangoMes(0));
    const [agrupacion, setAgrupacion] = useState('dia');
    const [dias, setDias] = useState(leerDiasGuardados);
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [verLista, setVerLista] = useState(false);
    const pedido = useRef(0);
    // Filas desplegadas de la tabla: { 'AAAA-MM-DD': { cargando, datos, error } }
    const [abiertos, setAbiertos] = useState({});
    const generacion = useRef(0);
    // Moneda de TODO el resumen (tarjetas, gráfico, tablas y desplegables): 'ars' | 'usd'. En dólares, cada venta
    // se convierte con SU propio dolar_blue (el del día en que se registró), nunca con el dólar de Precio Venta Sugerido.
    const [moneda, setMoneda] = useState('ars');
    const enUsd = moneda === 'usd';
    // Recalcular costos: vista previa -> confirmación -> guardado
    const [recalc, setRecalc] = useState({ fase: 'inactivo', previa: null, resultado: null, error: null });

    const cargar = async () => {
        const id = ++pedido.current;
        generacion.current += 1;
        setAbiertos({});
        setCargando(true);
        setError(null);
        try {
            const res = await fetchDashboardVentas({
                desde: rango.desde, hasta: rango.hasta, agrupacion,
                dias: dias.length === 7 ? null : dias,
            });
            if (id === pedido.current) setDatos(res);
        } catch (err) {
            console.error('VentasDashboard:', err);
            if (id === pedido.current) {
                setDatos(null);
                setError(err?.code === '42501'
                    ? 'Solo un administrador puede ver este resumen.'
                    : (err?.message || 'No se pudo cargar el resumen de ventas.'));
            }
        } finally {
            if (id === pedido.current) setCargando(false);
        }
    };

    const cerrarRecalculo = () => setRecalc({ fase: 'inactivo', previa: null, resultado: null, error: null });

    // Rango real de un período, recortado al rango elegido (la primera semana o mes puede empezar antes)
    const rangoDePeriodo = (fecha) => {
        const fin = agrupacion === 'dia' ? fecha : agrupacion === 'semana' ? sumarDias(fecha, 6) : finDeMes(fecha);
        return { desde: fecha < rango.desde ? rango.desde : fecha, hasta: fin > rango.hasta ? rango.hasta : fin };
    };

    // Abre o cierra el detalle de un período; los datos se piden recién al abrir
    const alternarPeriodo = async (fecha) => {
        if (abiertos[fecha]) {
            setAbiertos(a => { const { [fecha]: _cerrado, ...resto } = a; return resto; });
            return;
        }
        const gen = generacion.current;
        setAbiertos(a => ({ ...a, [fecha]: { cargando: true, datos: null, error: null } }));
        try {
            const r = rangoDePeriodo(fecha);
            const datos = await fetchVentasPeriodo({ desde: r.desde, hasta: r.hasta, dias: dias.length === 7 ? null : dias });
            if (gen === generacion.current) setAbiertos(a => (a[fecha] ? { ...a, [fecha]: { cargando: false, datos, error: null } } : a));
        } catch (err) {
            console.error('fetchVentasPeriodo:', err);
            if (gen === generacion.current) {
                setAbiertos(a => (a[fecha] ? { ...a, [fecha]: { cargando: false, datos: null, error: err?.message || 'No se pudo cargar el detalle.' } } : a));
            }
        }
    };

    // Clic en un punto del gráfico: abre ese período en la tabla y baja hasta él
    const clicEnGrafico = (_evento, elementos) => {
        if (!elementos.length || !datos) return;
        const fecha = datos.por_dia[elementos[0].index]?.fecha;
        if (!fecha) return;
        if (!abiertos[fecha]) alternarPeriodo(fecha);
        setTimeout(() => document.getElementById(`periodo-${fecha}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };

    const previaRecalculo = async () => {
        setRecalc({ fase: 'cargando', previa: null, resultado: null, error: null });
        try {
            const previa = await recalcularCostosVentas({ aplicar: false });
            setRecalc({ fase: 'previa', previa, resultado: null, error: null });
        } catch (err) {
            console.error('recalcularCostosVentas (vista previa):', err);
            setRecalc({ fase: 'error', previa: null, resultado: null, error: err?.message || 'No se pudo calcular la vista previa.' });
        }
    };

    const aplicarRecalculo = async () => {
        setRecalc(r => ({ ...r, fase: 'guardando', error: null }));
        try {
            const resultado = await recalcularCostosVentas({ aplicar: true });
            setRecalc({ fase: 'listo', previa: null, resultado, error: null });
            cargar();
        } catch (err) {
            console.error('recalcularCostosVentas (guardar):', err);
            setRecalc(r => ({ ...r, fase: 'error', error: err?.message || 'No se pudieron guardar los costos.' }));
        }
    };

    useEffect(() => {
        if (rango.desde && rango.hasta && rango.desde <= rango.hasta) cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rango.desde, rango.hasta, agrupacion, dias]);

    // Siempre queda al menos un día elegido
    const alternarDia = (n) => {
        const nuevos = dias.includes(n) ? dias.filter(d => d !== n) : [...dias, n].sort((a, b) => a - b);
        if (nuevos.length === 0) return;
        setDias(nuevos);
        try { localStorage.setItem(CLAVE_DIAS, JSON.stringify(nuevos)); } catch { /* opcional */ }
    };
    const elegirDias = (lista) => {
        setDias(lista);
        try { localStorage.setItem(CLAVE_DIAS, JSON.stringify(lista)); } catch { /* opcional */ }
    };
    const textoDias = dias.length === 7 ? null : DIAS_SEMANA.filter(d => dias.includes(d.n)).map(d => d.largo).join(', ');

    const datosGrafico = useMemo(() => {
        if (!datos) return null;
        const g = datos.grafico;
        return {
            labels: g.labels.map(l => etiqueta(l, agrupacion)),
            datasets: [
                {
                    label: 'Vendido',
                    data: enUsd ? g.vendido_usd : g.vendido,
                    borderColor: colores.vendido,
                    backgroundColor: colores.vendido,
                    borderWidth: 2,
                    tension: 0,
                    pointRadius: g.labels.length > 31 ? 0 : 3,
                    pointHoverRadius: 5,
                    pointBorderColor: colores.superficie,
                    pointBorderWidth: 2,
                },
                {
                    label: 'Ganancia',
                    data: enUsd ? g.ganancia_usd : g.ganancia,
                    borderColor: colores.ganancia,
                    backgroundColor: colores.ganancia,
                    borderWidth: 2,
                    tension: 0,
                    pointRadius: g.labels.length > 31 ? 0 : 3,
                    pointHoverRadius: 5,
                    pointBorderColor: colores.superficie,
                    pointBorderWidth: 2,
                },
            ],
        };
    }, [datos, agrupacion, colores, enUsd]);

    const opcionesGrafico = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        onClick: clicEnGrafico,
        plugins: {
            legend: { position: 'top', align: 'start', labels: { color: colores.texto, usePointStyle: true, boxWidth: 8 } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${enUsd ? usd(ctx.parsed.y) : ars(ctx.parsed.y)}` } },
        },
        scales: {
            x: { ticks: { color: colores.texto, maxRotation: 0, autoSkip: true }, grid: { display: false } },
            y: {
                beginAtZero: true,
                ticks: { color: colores.texto, callback: (v) => `${enUsd ? 'US$' : '$'} ${Number(v).toLocaleString('es-AR', { notation: 'compact' })}` },
                grid: { color: colores.grilla },
            },
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [colores, datos, abiertos, dias, agrupacion, rango.desde, rango.hasta, enUsd]);

    const total = datos?.total;
    const alertas = datos?.alertas;
    const dinero = (pesos, dolares) => (enUsd ? usd(dolares) : ars(pesos));

    return (
        <div className="relative space-y-5">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Resumen de ventas y ganancia</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ganancia bruta: vendido menos el costo de la mercadería. No descuenta comisiones ni gastos fijos.
                </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs text-gray-600 dark:text-gray-300">
                    Desde
                    <input type="date" value={rango.desde} max={rango.hasta}
                        onChange={e => setRango(r => ({ ...r, desde: e.target.value }))}
                        className="mt-1 block rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                    Hasta
                    <input type="date" value={rango.hasta} min={rango.desde}
                        onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))}
                        className="mt-1 block rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100" />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                    Agrupar por
                    <select value={agrupacion} onChange={e => setAgrupacion(e.target.value)}
                        className="mt-1 block rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                        <option value="dia">Día</option>
                        <option value="semana">Semana</option>
                        <option value="mes">Mes</option>
                    </select>
                </label>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setRango(rangoMes(0))}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Este mes
                    </button>
                    <button type="button" onClick={() => setRango(rangoMes(-1))}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Mes anterior
                    </button>
                    <button type="button" onClick={cargar} disabled={cargando} aria-label="Actualizar"
                        className="rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Moneda de todo el resumen */}
            <div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Mostrar montos en</p>
                <div role="group" aria-label="Moneda del resumen" className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
                    {[['ars', 'Pesos ($)'], ['usd', 'Dólares (US$)']].map(([clave, texto]) => (
                        <button key={clave} type="button" onClick={() => setMoneda(clave)} aria-pressed={moneda === clave}
                            className={`px-3 py-1.5 text-sm font-medium ${moneda === clave
                                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            {texto}
                        </button>
                    ))}
                </div>
            </div>

            {/* Días de la semana a mostrar */}
            <div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Días de venta a mostrar</p>
                <div className="flex flex-wrap items-center gap-2">
                    {DIAS_SEMANA.map(d => {
                        const activo = dias.includes(d.n);
                        return (
                            <button key={d.n} type="button" onClick={() => alternarDia(d.n)} aria-pressed={activo} title={d.largo}
                                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${activo
                                    ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 line-through hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                {d.corto}
                            </button>
                        );
                    })}
                    <button type="button" onClick={() => elegirDias(TODOS_LOS_DIAS)} disabled={dias.length === 7}
                        className="text-sm underline text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:no-underline">
                        Todos
                    </button>
                    <button type="button" onClick={() => elegirDias([1, 3, 6])}
                        className="text-sm underline text-gray-700 dark:text-gray-200">
                        Solo lun, mié y sáb
                    </button>
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
                    {error}
                </div>
            )}

            {/* ALERTA que parpadea: ventas con producto vinculado pero sin costo (algo falló al registrarlas) */}
            {alertas?.sin_costo_con_vinculo > 0 && (
                <div role="alert" className="rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-4 motion-safe:animate-pulse">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <div className="flex-1 text-sm text-amber-900 dark:text-amber-100">
                            <p className="font-semibold">
                                {alertas.sin_costo_con_vinculo} {alertas.sin_costo_con_vinculo === 1 ? 'venta con producto vinculado no tiene' : 'ventas con producto vinculado no tienen'} costo guardado.
                            </p>
                            <p>La ganancia no las incluye. Abrí el detalle para ver de qué boleta viene cada una, qué producto es y qué falta cargar.</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <button type="button" onClick={() => setVerLista(v => !v)} className="underline">
                                    {verLista ? 'Ocultar detalle' : 'Ver detalle: qué producto y de dónde viene'}
                                </button>
                                <button type="button" onClick={previaRecalculo}
                                    disabled={['cargando', 'guardando'].includes(recalc.fase)}
                                    className="rounded-lg border border-amber-600 bg-white dark:bg-amber-950 px-3 py-1 font-medium hover:bg-amber-100 dark:hover:bg-amber-900 disabled:opacity-50">
                                    Recalcular costos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detalle de las ventas sin costo, por boleta (fuera del banner para que no parpadee) */}
            {alertas?.sin_costo_con_vinculo > 0 && verLista && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-900 dark:text-gray-100 space-y-3">
                    <p className="font-semibold">De dónde viene cada venta sin costo</p>
                    {(alertas.grupos_sin_costo || []).map((g) => {
                        const motivo = MOTIVOS_SIN_COSTO[g.motivo ?? 'recalculable'] || MOTIVOS_SIN_COSTO.recalculable;
                        return (
                            <div key={`${g.tanda}|${g.marca}|${g.boleta}|${g.motivo}`} className="rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="px-3 py-2 font-medium bg-gray-50 dark:bg-gray-900/40 rounded-t-lg">
                                    {g.tanda || 'Tanda desconocida'} · {g.marca || 'Sin marca'} · Boleta {g.boleta || '—'}
                                    <span className="ml-2 font-normal text-gray-500 dark:text-gray-400 tabular-nums">
                                        {g.ventas} {g.ventas === 1 ? 'venta' : 'ventas'} · {ars(g.vendido)}
                                    </span>
                                </p>
                                <p className="px-3 pt-2 flex items-start gap-2 text-amber-800 dark:text-amber-300">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                    <span><span className="font-semibold">{motivo.titulo}.</span> {motivo.ayuda}</span>
                                </p>
                                <ul className="px-3 py-2 divide-y divide-gray-100 dark:divide-gray-700">
                                    {g.productos.map(pr => (
                                        <li key={pr.id} className="py-1 flex flex-wrap gap-x-4 tabular-nums">
                                            <span>{etiqueta(pr.fecha, 'dia')}</span>
                                            <span className="font-medium">{pr.producto || pr.codigo}</span>
                                            {pr.codigo && pr.producto && <span className="text-gray-500 dark:text-gray-400">{pr.codigo}</span>}
                                            <span>{num(pr.cantidad, 0)} doc.</span>
                                            {pr.registrado_por && <span className="text-gray-500 dark:text-gray-400">registró {pr.registrado_por}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                    {(() => {
                        const mostradas = (alertas.grupos_sin_costo || []).reduce((acc, g) => acc + Number(g.ventas || 0), 0);
                        return alertas.sin_costo_con_vinculo > mostradas
                            ? <p className="italic text-gray-600 dark:text-gray-300">…y {alertas.sin_costo_con_vinculo - mostradas} más (se muestran las 200 más recientes).</p>
                            : null;
                    })()}
                </div>
            )}

            {/* Recalcular costos: vista previa, confirmación y resultado (fuera del banner para que no parpadee) */}
            {recalc.fase !== 'inactivo' && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-800 dark:text-gray-100 space-y-3">
                    {recalc.fase === 'cargando' && <p>Calculando vista previa…</p>}
                    {recalc.fase === 'guardando' && <p>Guardando costos…</p>}
                    {recalc.fase === 'error' && (
                        <>
                            <p role="alert" className="text-red-700 dark:text-red-300">{recalc.error}</p>
                            <button type="button" onClick={cerrarRecalculo} className="underline">Cerrar</button>
                        </>
                    )}
                    {recalc.fase === 'previa' && (
                        <>
                            <p className="font-semibold">Vista previa (todavía no se guardó nada)</p>
                            <p>
                                Se completaría el costo de {recalc.previa.recalculables} {recalc.previa.recalculables === 1 ? 'venta' : 'ventas'}.
                                {recalc.previa.sin_resultado > 0 && ` Otras ${recalc.previa.sin_resultado} no se pueden calcular (faltan datos de la compra o de los bultos) y seguirán sin costo.`}
                                {' '}Solo se completan ventas sin costo: nunca se cambia un costo ya guardado.
                                El cálculo usa los datos actuales de la tanda.
                            </p>
                            {recalc.previa.muestra.length > 0 && (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {recalc.previa.muestra.map(v => (
                                        <li key={v.id} className="py-1 flex flex-wrap gap-x-4 tabular-nums">
                                            <span>{etiqueta(v.fecha, 'dia')}</span>
                                            <span className="font-medium">{v.producto || v.codigo}</span>
                                            <span>{num(v.cantidad, 0)} doc.</span>
                                            <span>costo USD {num(v.costo_docena_usd, 2)} por docena</span>
                                        </li>
                                    ))}
                                    {recalc.previa.recalculables > recalc.previa.muestra.length && (
                                        <li className="py-1 italic">…y {recalc.previa.recalculables - recalc.previa.muestra.length} más (se muestran las 20 más recientes)</li>
                                    )}
                                </ul>
                            )}
                            <div className="flex gap-2">
                                {recalc.previa.recalculables > 0 && (
                                    <button type="button" onClick={aplicarRecalculo}
                                        className="rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-1.5 font-medium text-white dark:text-gray-900">
                                        Confirmar y guardar
                                    </button>
                                )}
                                <button type="button" onClick={cerrarRecalculo}
                                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5">
                                    Cancelar
                                </button>
                            </div>
                        </>
                    )}
                    {recalc.fase === 'listo' && (
                        <>
                            <p role="status">
                                Listo: se guardó el costo de {recalc.resultado.actualizadas} {recalc.resultado.actualizadas === 1 ? 'venta' : 'ventas'}.
                                {recalc.resultado.sin_resultado > 0 && ` ${recalc.resultado.sin_resultado} siguen sin costo por falta de datos.`}
                            </p>
                            <button type="button" onClick={cerrarRecalculo} className="underline">Cerrar</button>
                        </>
                    )}
                </div>
            )}

            {/* Avisos informativos (no parpadean) */}
            {(alertas?.sin_costo_sin_vinculo > 0 || alertas?.sin_dolar > 0) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {alertas.sin_costo_sin_vinculo > 0 && (
                        <p className="flex items-start gap-2"><Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            {alertas.sin_costo_sin_vinculo} ventas históricas no están vinculadas a un producto: no se puede calcular su costo y quedan fuera de la ganancia.</p>
                    )}
                    {alertas.sin_dolar > 0 && (
                        <p className="flex items-start gap-2"><Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            {alertas.sin_dolar} ventas tienen costo pero no un dólar válido: quedan fuera de la ganancia.</p>
                    )}
                </div>
            )}

            {cargando && !datos && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}

            {datos && (
                <>
                    {enUsd && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Montos en dólares: cada venta se convierte con su propio dólar (el del día en que se registró).
                            {total.ventas_sin_dolar > 0 && ` ${total.ventas_sin_dolar} ${total.ventas_sin_dolar === 1 ? 'línea no tiene' : 'líneas no tienen'} un dólar válido y no suman en los montos en dólares.`}
                        </p>
                    )}
                    {textoDias && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Mostrando solo: {textoDias}. Los totales, el gráfico y las tablas suman únicamente esos días.
                        </p>
                    )}
                    {total.ventas_sin_costo > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            En este período, {total.ventas_sin_costo} {total.ventas_sin_costo === 1 ? 'línea de venta no tiene' : 'líneas de venta no tienen'} costo ({ars(total.vendido_sin_costo)} vendidos):
                            cuentan como vendido, pero no entran en costo, ganancia, índice, markup ni margen.
                        </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Tarjeta titulo="Vendido" valor={dinero(total.vendido, total.vendido_usd)} />
                        <Tarjeta titulo="Costo" valor={dinero(total.costo, total.costo_usd)} />
                        <Tarjeta titulo="Ganancia" valor={dinero(total.ganancia, total.ganancia_usd)} />
                        <Tarjeta titulo="Cantidad de ventas" valor={num(total.cantidad_ventas, 0)} detalle="pedidos" />
                        <Tarjeta titulo="Índice" valor={num(total.indice, 3)} detalle="vendido ÷ costo" />
                        <Tarjeta titulo="Markup" valor={pct(total.markup)} detalle="ganancia ÷ costo" />
                        <Tarjeta titulo="Margen" valor={pct(total.margen)} detalle="ganancia ÷ vendido" />
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Vendido y ganancia por {agrupacion === 'dia' ? 'día' : agrupacion}{enUsd ? ' (en dólares)' : ''}</h2>
                        <div className="h-72 sm:h-96">
                            <Line data={datosGrafico} options={opcionesGrafico} />
                        </div>
                    </div>

                    {/* Tabla por período (equivalente en texto del gráfico) */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto xl:overflow-visible">
                        <table className="min-w-full text-sm">
                            <caption className="sr-only">Resumen por período. Cada fila se despliega para ver lo vendido.</caption>
                            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th scope="col" className="px-3 py-2 text-left font-medium">{agrupacion === 'dia' ? 'Día' : agrupacion === 'semana' ? 'Semana desde' : 'Mes'}</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Vendido</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Costo</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Ganancia</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Índice</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Markup</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Margen</th>
                                    <th scope="col" className="px-3 py-2 text-right font-medium">Ventas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-900 dark:text-gray-100 tabular-nums">
                                {datos.por_dia.map(p => {
                                    const ab = abiertos[p.fecha];
                                    const vacio = p.cantidad_ventas === 0 && p.vendido === 0;
                                    return (
                                        <React.Fragment key={p.fecha}>
                                            <tr id={`periodo-${p.fecha}`} className={ab ? 'bg-gray-50 dark:bg-gray-900/30' : ''}>
                                                <td className="px-3 py-1.5">
                                                    <button type="button" onClick={() => alternarPeriodo(p.fecha)} disabled={vacio}
                                                        aria-expanded={!!ab}
                                                        aria-label={`${ab ? 'Ocultar' : 'Ver'} lo vendido: ${etiqueta(p.fecha, agrupacion)}`}
                                                        className="inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-default">
                                                        <ChevronRight className={`h-4 w-4 transition-transform ${ab ? 'rotate-90' : ''}`} aria-hidden="true" />
                                                        {etiqueta(p.fecha, agrupacion)}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-1.5 text-right">{dinero(p.vendido, p.vendido_usd)}</td>
                                                <td className="px-3 py-1.5 text-right">{dinero(p.costo, p.costo_usd)}</td>
                                                <td className="px-3 py-1.5 text-right">{dinero(p.ganancia, p.ganancia_usd)}</td>
                                                <td className="px-3 py-1.5 text-right">{num(p.indice, 3)}</td>
                                                <td className="px-3 py-1.5 text-right">{pct(p.markup)}</td>
                                                <td className="px-3 py-1.5 text-right">{pct(p.margen)}</td>
                                                <td className="px-3 py-1.5 text-right">
                                                    {num(p.cantidad_ventas, 0)}
                                                    {p.ventas_sin_costo > 0 && <span className="ml-1 text-amber-700 dark:text-amber-300" title="Líneas sin costo">⚠ {p.ventas_sin_costo}</span>}
                                                </td>
                                            </tr>
                                            {ab && (
                                                <tr>
                                                    <td colSpan={8} className="bg-gray-50 dark:bg-gray-900/30 px-3 pb-3 pt-1 font-normal">
                                                        <DetallePeriodo ab={ab} fila={p} agrupacion={agrupacion} moneda={moneda} onMoneda={setMoneda} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-900/40 font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                                <tr>
                                    <td className="px-3 py-2">Total</td>
                                    <td className="px-3 py-2 text-right">{dinero(total.vendido, total.vendido_usd)}</td>
                                    <td className="px-3 py-2 text-right">{dinero(total.costo, total.costo_usd)}</td>
                                    <td className="px-3 py-2 text-right">{dinero(total.ganancia, total.ganancia_usd)}</td>
                                    <td className="px-3 py-2 text-right">{num(total.indice, 3)}</td>
                                    <td className="px-3 py-2 text-right">{pct(total.markup)}</td>
                                    <td className="px-3 py-2 text-right">{pct(total.margen)}</td>
                                    <td className="px-3 py-2 text-right">{num(total.cantidad_ventas, 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {datos.advertencias.length > 0 && (
                        <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc pl-5 space-y-0.5">
                            {datos.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
