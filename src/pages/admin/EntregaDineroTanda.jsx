import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Banknote, DollarSign, Package, RefreshCw, Tag, List,
    ChevronDown, ChevronUp, ArrowLeft, FileDown, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatARS(n) {
    return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function montoEfectivo(v) {
    return Number(v.monto_efectivo || (v.metodo_pago === 'efectivo' ? v.total_ars : 0));
}

function calcUSD(efectivo, dolarBlue) {
    const e = Number(efectivo || 0);
    const d = Number(dolarBlue || 0);
    return d > 0 ? e / d : 0;
}

function formatUSD(n) {
    return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function agruparPorMarca(ventas) {
    const marcaMap = {};
    for (const v of ventas) {
        const marca = v.marca || 'Sin marca';
        const cod = v.codigo || String(v.id);
        if (!marcaMap[marca]) marcaMap[marca] = {};
        if (!marcaMap[marca][cod]) {
            marcaMap[marca][cod] = { codigo: cod, titulo: v.producto_titulo || cod, efectivo: 0, transferencia: 0, cuentas: new Set(), usd: 0, precioDocena: 0, dolar_blue: null, ventas: [], totalDocenas: 0 };
        }
        const entry = marcaMap[marca][cod];
        entry.efectivo += montoEfectivo(v);
        entry.transferencia += Number(v.monto_transferencia || 0);
        if (Number(v.monto_transferencia) > 0 && v.cuenta_nombre) entry.cuentas.add(v.cuenta_nombre);
        entry.usd += calcUSD(montoEfectivo(v), v.dolar_blue);
        if (Number(v.precio_docena_ars) > 0) entry.precioDocena = Number(v.precio_docena_ars);
        if (Number(v.dolar_blue) > 0) entry.dolar_blue = v.dolar_blue;
        entry.totalDocenas += Number(v.cantidad_docenas || 1);
        entry.ventas.push(v);
    }
    return Object.entries(marcaMap)
        .map(([nombre, productos]) => {
            const prods = Object.values(productos).sort((a, b) => a.titulo.localeCompare(b.titulo));
            return {
                nombre,
                productos: prods,
                efectivo: prods.reduce((s, p) => s + p.efectivo, 0),
                usd: prods.reduce((s, p) => s + p.usd, 0),
            };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ─── Exportar PDF ─────────────────────────────────────────────── */
function exportarPDF(propietario, tandaNombre, marcas, totalEfectivo, totalUSD) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Entrega Dinero', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Propietario: ${propietario}`, 14, 26);
    doc.text(`Tanda: ${tandaNombre}`, 14, 31);
    doc.text(`Fecha: ${fecha}`, 14, 36);

    let cursorY = 44;

    for (const marca of marcas) {
        if (cursorY > 265) { doc.addPage(); cursorY = 14; }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text(`Marca: ${marca.nombre}`, 18, cursorY + 5);
        doc.setTextColor(0, 0, 0);
        cursorY += 4;

        autoTable(doc, {
            startY: cursorY,
            head: [['Producto', 'Código', 'Efectivo (ARS)', 'Dólar Blue', 'USD']],
            body: marca.productos.map(p => [
                p.titulo,
                p.codigo,
                `$ ${formatARS(p.efectivo)}`,
                p.dolar_blue ? `$ ${Number(p.dolar_blue).toLocaleString('es-AR')}` : '—',
                p.usd > 0 ? `U$D ${formatUSD(p.usd)}` : '—',
            ]),
            foot: [['', `Total ${marca.nombre}`, `$ ${formatARS(marca.efectivo)}`, '', `U$D ${formatUSD(marca.usd)}`]],
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [209, 49, 128], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 18, right: 14 },
        });

        cursorY = doc.lastAutoTable.finalY + 5;
    }

    if (cursorY > 265) { doc.addPage(); cursorY = 14; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL EFECTIVO: $ ${formatARS(totalEfectivo)}   |   USD: U$D ${formatUSD(totalUSD)}`, 14, cursorY + 4);

    doc.save(`entrega-${propietario}-${tandaNombre}-${fecha.replace(/\//g, '-')}.pdf`);
    toast.success('PDF generado');
}

/* ─── VentaRow ─────────────────────────────────────────────────── */
function VentaRow({ v }) {
    const [expandidoDocenas, setExpandidoDocenas] = useState(false);
    const tieneMultiplesDocenas = Number(v.cantidad_docenas) > 1;
    const cantDoc = Number(v.cantidad_docenas || 1);
    const efectivoUnit = montoEfectivo(v) / cantDoc;
    const transferenciaUnit = Number(v.monto_transferencia || 0) / cantDoc;

    return (
        <React.Fragment>
            <tr className="border-t border-border/20 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-1.5 text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1">
                        {tieneMultiplesDocenas && (
                            <button
                                onClick={() => setExpandidoDocenas(o => !o)}
                                className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                            >
                                {expandidoDocenas
                                    ? <ChevronUp className="w-3 h-3" />
                                    : <ChevronDown className="w-3 h-3" />}
                            </button>
                        )}
                        {formatFecha(v.created_at)}
                        {v.cantidad_docenas > 0 && (
                            <span className="ml-1.5 text-foreground/70 font-medium">{v.cantidad_docenas} doc.</span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-1.5 text-foreground">
                    {Number(v.precio_docena_ars) > 0 ? `$ ${formatARS(v.precio_docena_ars)}` : '—'}
                </td>
                <td className="px-4 py-1.5 text-right text-green-600 dark:text-green-400 font-medium">
                    {montoEfectivo(v) > 0 ? `$ ${formatARS(montoEfectivo(v))}` : '—'}
                </td>
                <td className="px-4 py-1.5 text-right text-purple-600 dark:text-purple-400 font-medium">
                    {Number(v.monto_transferencia) > 0 ? (
                        <span className="relative group cursor-default">
                            $ {formatARS(v.monto_transferencia)}
                            {v.cuenta_nombre && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                                    {v.cuenta_nombre}
                                </span>
                            )}
                        </span>
                    ) : '—'}
                </td>
                <td className="px-4 py-1.5 text-right text-blue-600 dark:text-blue-400 font-medium">
                    {Number(v.dolar_blue) > 0 ? `$ ${Number(v.dolar_blue).toLocaleString('es-AR')}` : '—'}
                </td>
                <td className="px-4 py-1.5 text-right text-amber-600 dark:text-amber-400 font-medium">
                    {calcUSD(montoEfectivo(v), v.dolar_blue) > 0 ? `U$D ${formatUSD(calcUSD(montoEfectivo(v), v.dolar_blue))}` : '—'}
                </td>
            </tr>
            {expandidoDocenas && Array.from({ length: cantDoc }).map((_, i) => (
                <tr key={i} className="border-t border-border/10 bg-muted/10">
                    <td className="pl-8 pr-4 py-1 text-muted-foreground/70 whitespace-nowrap text-[11px]">
                        <span className="mr-1 text-muted-foreground/40">└</span>
                        Doc. {i + 1}/{cantDoc}
                    </td>
                    <td className="px-4 py-1 text-foreground/80 text-[11px]">
                        {Number(v.precio_docena_ars) > 0 ? `$ ${formatARS(v.precio_docena_ars)}` : '—'}
                    </td>
                    <td className="px-4 py-1 text-right text-green-600/80 dark:text-green-400/80 text-[11px]">
                        {efectivoUnit > 0 ? `$ ${formatARS(efectivoUnit)}` : '—'}
                    </td>
                    <td className="px-4 py-1 text-right text-purple-600/80 dark:text-purple-400/80 text-[11px]">
                        {transferenciaUnit > 0 ? `$ ${formatARS(transferenciaUnit)}` : '—'}
                    </td>
                    <td className="px-4 py-1 text-right text-blue-600/80 dark:text-blue-400/80 text-[11px]">
                        {Number(v.dolar_blue) > 0 ? `$ ${Number(v.dolar_blue).toLocaleString('es-AR')}` : '—'}
                    </td>
                    <td className="px-4 py-1 text-right text-amber-600/80 dark:text-amber-400/80 text-[11px]">
                        {calcUSD(efectivoUnit, v.dolar_blue) > 0 ? `U$D ${formatUSD(calcUSD(efectivoUnit, v.dolar_blue))}` : '—'}
                    </td>
                </tr>
            ))}
        </React.Fragment>
    );
}

/* ─── ProductoCard ─────────────────────────────────────────────── */
function ProductoCard({ p }) {
    const [expandido, setExpandido] = useState(false);
    const tieneMultiples = p.ventas.length > 1;
    return (
        <div className="bg-card border border-border/60 rounded-lg overflow-hidden hover:shadow-md transition-all">
            {/* Header del producto */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-pink-500 shrink-0" />
                    <span className="font-semibold text-foreground text-sm truncate">{p.titulo}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({p.codigo})</span>
                    {tieneMultiples && (
                        <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-full px-1.5 py-0.5 font-semibold shrink-0">
                            {p.totalDocenas}×
                        </span>
                    )}
                </div>
                {tieneMultiples && (
                    <button
                        onClick={() => setExpandido(o => !o)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        {expandido ? 'Ocultar' : 'Ver detalle'}
                        {expandido
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            {/* Totales del producto */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border/30">
                            <th className="text-left px-4 py-1.5 text-muted-foreground font-medium uppercase tracking-wide">Precio/Doc</th>
                            <th className="text-right px-4 py-1.5 text-muted-foreground font-medium uppercase tracking-wide">Efectivo</th>
                            <th className="text-right px-4 py-1.5 text-muted-foreground font-medium uppercase tracking-wide">Transferencia</th>
                            <th className="text-right px-4 py-1.5 text-muted-foreground font-medium uppercase tracking-wide">Dólar Blue</th>
                            <th className="text-right px-4 py-1.5 text-muted-foreground font-medium uppercase tracking-wide">USD</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="font-semibold">
                            <td className="px-4 py-2 text-foreground">
                                {p.precioDocena > 0 ? `$ ${formatARS(p.precioDocena)}` : '—'}
                            </td>
                            <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                                {p.efectivo > 0 ? `$ ${formatARS(p.efectivo)}` : '—'}
                            </td>
                            <td className="px-4 py-2 text-right text-purple-600 dark:text-purple-400">
                                {p.transferencia > 0 ? (
                                    <span className="relative group cursor-default">
                                        $ {formatARS(p.transferencia)}
                                        {p.cuentas.size > 0 && (
                                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                                                {[...p.cuentas].join(', ')}
                                            </span>
                                        )}
                                    </span>
                                ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400">
                                {p.dolar_blue ? `$ ${Number(p.dolar_blue).toLocaleString('es-AR')}` : '—'}
                            </td>
                            <td className="px-4 py-2 text-right text-amber-600 dark:text-amber-400">
                                {p.usd > 0 ? `U$D ${formatUSD(p.usd)}` : '—'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Detalle de ventas individuales */}
            {expandido && (
                <div className="border-t border-border/40">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/40">
                                    <th className="text-left px-4 py-1.5 text-muted-foreground font-medium">Fecha</th>
                                    <th className="text-left px-4 py-1.5 text-muted-foreground font-medium">Precio/Doc</th>
                                    <th className="text-right px-4 py-1.5 text-muted-foreground font-medium">Efectivo</th>
                                    <th className="text-right px-4 py-1.5 text-muted-foreground font-medium">Transferencia</th>
                                    <th className="text-right px-4 py-1.5 text-muted-foreground font-medium">Dólar Blue</th>
                                    <th className="text-right px-4 py-1.5 text-muted-foreground font-medium">USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {p.ventas.map((v) => (
                                    <VentaRow key={v.id} v={v} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── MarcaSection ─────────────────────────────────────────────── */
function MarcaSection({ marca }) {
    const [open, setOpen] = useState(true);
    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{marca.nombre}</span>
                    <span className="text-xs text-muted-foreground">({marca.productos.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">$ {formatARS(marca.efectivo)}</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">U$D {formatUSD(marca.usd)}</span>
                    {open
                        ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
            </button>
            {open && (
                <div className="space-y-1.5 mt-1">
                    {marca.productos.map((p) => (
                        <ProductoCard key={p.codigo} p={p} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Página de detalle de tanda ──────────────────────────────── */
export function EntregaDineroTanda() {
    const { tanda } = useParams();
    const [searchParams] = useSearchParams();
    const propietario = searchParams.get('propietario');
    const tandaNombre = decodeURIComponent(tanda);

    const [marcas, setMarcas] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVentas = useCallback(async () => {
        if (!propietario || !tandaNombre) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('id, producto_titulo, codigo, marca, monto_efectivo, monto_transferencia, cuenta_nombre, metodo_pago, total_ars, dolar_blue, created_at, cantidad_docenas, precio_docena_ars')
                .eq('propietario', propietario)
                .eq('tanda_nombre', tandaNombre)
                .order('marca');
            if (error) throw error;
            setMarcas(agruparPorMarca(data || []));
        } catch {
            toast.error('Error al cargar ventas');
        } finally {
            setLoading(false);
        }
    }, [propietario, tandaNombre]);

    useEffect(() => { fetchVentas(); }, [fetchVentas]);

    const totalEfectivo = marcas.reduce((s, m) => s + m.efectivo, 0);
    const totalUSD = marcas.reduce((s, m) => s + m.usd, 0);
    const totalProductos = marcas.reduce((s, m) => s + m.productos.length, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/entrega-dinero"
                        className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{tandaNombre}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Propietario: <span className="font-medium text-foreground">{propietario}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!loading && marcas.length > 0 && (
                        <button
                            onClick={() => exportarPDF(propietario, tandaNombre, marcas, totalEfectivo, totalUSD)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm font-medium hover:from-pink-600 hover:to-pink-700 transition-all shadow-sm"
                        >
                            <FileDown className="w-4 h-4" />
                            Exportar PDF
                        </button>
                    )}
                    <button
                        onClick={fetchVentas}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Resumen */}
            {!loading && marcas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Efectivo</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">$ {formatARS(totalEfectivo)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total USD</p>
                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">U$D {formatUSD(totalUSD)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                            <Tag className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Marcas</p>
                            <p className="text-lg font-bold text-foreground">{marcas.length}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Productos</p>
                            <p className="text-lg font-bold text-foreground">{totalProductos}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Cargando…
                </div>
            )}

            {/* Sin datos */}
            {!loading && marcas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Package className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-medium">Sin ventas en esta tanda</p>
                </div>
            )}

            {/* Listado por marca */}
            {!loading && marcas.length > 0 && (
                <div className="space-y-4">
                    {marcas.map((marca) => (
                        <MarcaSection key={marca.nombre} marca={marca} />
                    ))}
                </div>
            )}
        </div>
    );
}
