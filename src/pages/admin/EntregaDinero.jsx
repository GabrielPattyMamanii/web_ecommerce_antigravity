import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Banknote, DollarSign, Layers, RefreshCw, Package,
    ChevronDown, ChevronUp, User, FileDown, ChevronsDown, Tag, List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TANDAS_INICIALES = 4;

function formatARS(n) {
    return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function montoEfectivo(v) {
    return Number(v.monto_efectivo || (v.metodo_pago === 'efectivo' ? v.total_ars : 0));
}

function formatFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function agruparPorTanda(ventas) {
    // tanda → marca → codigo → { acumulado + ventas individuales }
    const tandaMap = {};
    for (const v of ventas) {
        const tanda = v.tanda_nombre || 'Sin tanda';
        const marca = v.marca || 'Sin marca';
        const cod = v.codigo || String(v.id);
        if (!tandaMap[tanda]) tandaMap[tanda] = {};
        if (!tandaMap[tanda][marca]) tandaMap[tanda][marca] = {};
        if (!tandaMap[tanda][marca][cod]) {
            tandaMap[tanda][marca][cod] = { codigo: cod, titulo: v.producto_titulo || cod, efectivo: 0, dolar_blue: null, ventas: [] };
        }
        const entry = tandaMap[tanda][marca][cod];
        entry.efectivo += montoEfectivo(v);
        if (Number(v.dolar_blue) > 0) entry.dolar_blue = v.dolar_blue;
        entry.ventas.push(v);
    }
    return Object.entries(tandaMap)
        .map(([nombre, marcaMap]) => {
            const marcas = Object.entries(marcaMap)
                .map(([marcaNombre, productos]) => {
                    const prods = Object.values(productos).sort((a, b) => a.titulo.localeCompare(b.titulo));
                    return {
                        nombre: marcaNombre,
                        productos: prods,
                        efectivo: prods.reduce((s, p) => s + p.efectivo, 0),
                    };
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            return {
                nombre,
                marcas,
                totalEfectivo: marcas.reduce((s, m) => s + m.efectivo, 0),
            };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ─── Exportar PDF ─────────────────────────────────────────────── */
function exportarPDF(propietario, tandas, granTotal) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Encabezado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Entrega Dinero', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Propietario: ${propietario}`, 14, 26);
    doc.text(`Fecha: ${fecha}`, 14, 31);

    let cursorY = 38;

    for (const tanda of tandas) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(tanda.nombre, 14, cursorY);
        cursorY += 2;

        for (const marca of tanda.marcas) {
            // Sub-encabezado de marca
            if (cursorY > 265) { doc.addPage(); cursorY = 14; }
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 120, 120);
            doc.text(`Marca: ${marca.nombre}`, 18, cursorY + 5);
            doc.setTextColor(0, 0, 0);
            cursorY += 4;

            autoTable(doc, {
                startY: cursorY,
                head: [['Producto', 'Código', 'Efectivo (ARS)', 'Dólar Blue']],
                body: marca.productos.map(p => [
                    p.titulo,
                    p.codigo,
                    `$ ${formatARS(p.efectivo)}`,
                    p.dolar_blue ? `$ ${Number(p.dolar_blue).toLocaleString('es-AR')}` : '—',
                ]),
                foot: [['', `Total ${marca.nombre}`, `$ ${formatARS(marca.efectivo)}`, '']],
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [209, 49, 128], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                margin: { left: 18, right: 14 },
            });

            cursorY = doc.lastAutoTable.finalY + 5;
            if (cursorY > 265) { doc.addPage(); cursorY = 14; }
        }

        // Total de la tanda
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total tanda ${tanda.nombre}: $ ${formatARS(tanda.totalEfectivo)}`, 14, cursorY + 3);
        cursorY += 10;

        if (cursorY > 265 && tandas.indexOf(tanda) < tandas.length - 1) {
            doc.addPage();
            cursorY = 14;
        }
    }

    // Total general
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GENERAL EFECTIVO: $ ${formatARS(granTotal)}`, 14, cursorY + 4);

    doc.save(`entrega-dinero-${propietario}-${fecha.replace(/\//g, '-')}.pdf`);
    toast.success('PDF generado');
}

/* ─── ProductoRow ──────────────────────────────────────────────── */
function ProductoRow({ p }) {
    const [expandido, setExpandido] = useState(false);
    const tieneMultiples = p.ventas.length > 1;
    return (
        <>
            {/* Fila resumen del producto */}
            <tr className="hover:bg-muted/20 transition-colors border-t border-border/50">
                <td className="px-5 py-3 pl-10">
                    <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{p.titulo}</span>
                        <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">({p.codigo})</span>
                        {tieneMultiples && (
                            <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-full px-1.5 py-0.5 font-medium">
                                {p.ventas.length}×
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-3 text-right">
                    {p.efectivo > 0
                        ? <span className="font-semibold text-green-600 dark:text-green-400">$ {formatARS(p.efectivo)}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {p.dolar_blue
                            ? <span className="text-blue-600 dark:text-blue-400 font-medium">$ {Number(p.dolar_blue).toLocaleString('es-AR')}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        {tieneMultiples && (
                            <button
                                onClick={() => setExpandido(o => !o)}
                                title={expandido ? 'Ocultar ventas' : `Ver ${p.ventas.length} ventas`}
                                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                                {expandido
                                    ? <ChevronUp className="w-3.5 h-3.5" />
                                    : <List className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {/* Filas de ventas individuales */}
            {expandido && p.ventas.map((v) => (
                <tr key={v.id} className="bg-muted/10 border-t border-dashed border-border/40 text-xs">
                    <td className="px-5 py-2 pl-16 text-muted-foreground">
                        <span>{formatFecha(v.created_at)}</span>
                        {v.cantidad_docenas > 0 && (
                            <span className="ml-2 text-foreground/70">{v.cantidad_docenas} doc.</span>
                        )}
                    </td>
                    <td className="px-4 py-2 text-right">
                        {montoEfectivo(v) > 0
                            ? <span className="text-green-600 dark:text-green-400 font-medium">$ {formatARS(montoEfectivo(v))}</span>
                            : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground capitalize">
                        {v.metodo_pago || '—'}
                    </td>
                </tr>
            ))}
        </>
    );
}

/* ─── MarcaSection ─────────────────────────────────────────────── */
function MarcaSection({ marca }) {
    const [open, setOpen] = useState(true);
    return (
        <>
            <tr
                onClick={() => setOpen(o => !o)}
                className="cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors border-t border-border"
            >
                <td className="px-5 py-2" colSpan={3}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400 shrink-0" />
                            <span className="text-sm font-semibold text-foreground">{marca.nombre}</span>
                            <span className="text-xs text-muted-foreground">({marca.productos.length} prod.)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">$ {formatARS(marca.efectivo)}</span>
                            {open
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                    </div>
                </td>
            </tr>
            {open && marca.productos.map((p) => (
                <ProductoRow key={p.codigo} p={p} />
            ))}
        </>
    );
}

/* ─── TandaCard ────────────────────────────────────────────────── */
function TandaCard({ tanda }) {
    const [open, setOpen] = useState(true);
    const totalProductos = tanda.marcas.reduce((s, m) => s + m.productos.length, 0);
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                        <Layers className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-foreground">{tanda.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                            {tanda.marcas.length} marca{tanda.marcas.length !== 1 ? 's' : ''} · {totalProductos} producto{totalProductos !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total efectivo</p>
                        <p className="font-bold text-green-600 dark:text-green-400 text-sm">$ {formatARS(tanda.totalEfectivo)}</p>
                    </div>
                    {open
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto</th>
                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    <span className="flex items-center justify-end gap-1"><Banknote className="w-3 h-3" />Efectivo</span>
                                </th>
                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    <span className="flex items-center justify-end gap-1"><DollarSign className="w-3 h-3" />Dólar Blue</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tanda.marcas.map((marca) => (
                                <MarcaSection key={marca.nombre} marca={marca} />
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/40 border-t-2 border-border">
                                <td className="px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Total tanda</td>
                                <td className="px-4 py-2.5 text-right font-bold text-green-600 dark:text-green-400">$ {formatARS(tanda.totalEfectivo)}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ─── Página principal ─────────────────────────────────────────── */
export function EntregaDinero() {
    const [propietarios, setPropietarios] = useState([]);
    const [propietarioSel, setPropietarioSel] = useState(null);
    const [tandas, setTandas] = useState([]);
    const [loadingProp, setLoadingProp] = useState(true);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [verTodas, setVerTodas] = useState(false);

    const fetchPropietarios = useCallback(async () => {
        setLoadingProp(true);
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('propietario')
                .not('propietario', 'is', null);
            if (error) throw error;
            const unicos = [...new Set((data || []).map(r => r.propietario).filter(Boolean))].sort();
            setPropietarios(unicos);
            if (unicos.length > 0)
                setPropietarioSel(prev => prev && unicos.includes(prev) ? prev : unicos[0]);
        } catch {
            toast.error('Error al cargar propietarios');
        } finally {
            setLoadingProp(false);
        }
    }, []);

    const fetchVentas = useCallback(async (propietario) => {
        if (!propietario) return;
        setLoadingVentas(true);
        setVerTodas(false);
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('id, producto_titulo, codigo, tanda_nombre, marca, monto_efectivo, metodo_pago, total_ars, dolar_blue, created_at, cantidad_docenas')
                .eq('propietario', propietario)
                .order('tanda_nombre');
            if (error) throw error;
            setTandas(agruparPorTanda(data || []));
        } catch {
            toast.error('Error al cargar las ventas');
        } finally {
            setLoadingVentas(false);
        }
    }, []);

    useEffect(() => { fetchPropietarios(); }, [fetchPropietarios]);
    useEffect(() => { if (propietarioSel) fetchVentas(propietarioSel); }, [propietarioSel, fetchVentas]);

    const loading = loadingProp || loadingVentas;
    const granTotal = tandas.reduce((s, t) => s + t.totalEfectivo, 0);
    const tandasVisibles = verTodas ? tandas : tandas.slice(0, TANDAS_INICIALES);
    const hayMas = !verTodas && tandas.length > TANDAS_INICIALES;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Entrega Dinero</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Ventas agrupadas por tanda</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Exportar PDF */}
                    {!loading && tandas.length > 0 && (
                        <button
                            onClick={() => exportarPDF(propietarioSel, tandas, granTotal)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm font-medium hover:from-pink-600 hover:to-pink-700 transition-all shadow-sm"
                        >
                            <FileDown className="w-4 h-4" />
                            Exportar PDF
                        </button>
                    )}
                    <button
                        onClick={() => { fetchPropietarios(); if (propietarioSel) fetchVentas(propietarioSel); }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Selector de propietario */}
            {!loadingProp && propietarios.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>Propietario:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {propietarios.map(p => (
                            <button
                                key={p}
                                onClick={() => setPropietarioSel(p)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                    propietarioSel === p
                                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-500 shadow-sm'
                                        : 'bg-card border-border text-foreground hover:bg-muted'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Resumen */}
            {!loading && tandas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Efectivo</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">$ {formatARS(granTotal)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                            <Layers className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Tandas</p>
                            <p className="text-lg font-bold text-foreground">{tandas.length}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Productos distintos</p>
                            <p className="text-lg font-bold text-foreground">{tandas.reduce((s, t) => s + t.marcas.reduce((ms, m) => ms + m.productos.length, 0), 0)}</p>
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
            {!loading && propietarios.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Package className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-medium">No hay ventas registradas</p>
                </div>
            )}

            {!loading && propietarios.length > 0 && tandas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Package className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-medium">Sin ventas para <span className="font-semibold">{propietarioSel}</span></p>
                </div>
            )}

            {/* Cards por tanda */}
            {!loading && tandas.length > 0 && (
                <div className="space-y-4">
                    {tandasVisibles.map((tanda) => (
                        <TandaCard key={tanda.nombre} tanda={tanda} />
                    ))}

                    {/* Botón "Ver más tandas" */}
                    {hayMas && (
                        <button
                            onClick={() => setVerTodas(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-pink-400 hover:text-pink-500 transition-colors text-sm font-medium"
                        >
                            <ChevronsDown className="w-4 h-4" />
                            Ver {tandas.length - TANDAS_INICIALES} tanda{tandas.length - TANDAS_INICIALES !== 1 ? 's' : ''} más
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
