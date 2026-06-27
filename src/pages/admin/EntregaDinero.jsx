import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Banknote, DollarSign, Layers, RefreshCw, Package,
    User, ChevronRight, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

function agruparTandas(ventas) {
    const tandaMap = {};
    for (const v of ventas) {
        const tanda = v.tanda_nombre || 'Sin tanda';
        if (!tandaMap[tanda]) tandaMap[tanda] = { efectivo: 0, usd: 0, marcas: new Set(), productos: new Set() };
        const entry = tandaMap[tanda];
        entry.efectivo += montoEfectivo(v);
        entry.usd += calcUSD(montoEfectivo(v), v.dolar_blue);
        entry.marcas.add(v.marca || 'Sin marca');
        entry.productos.add(v.codigo || String(v.id));
    }
    return Object.entries(tandaMap)
        .map(([nombre, d]) => ({
            nombre,
            efectivo: d.efectivo,
            usd: d.usd,
            cantMarcas: d.marcas.size,
            cantProductos: d.productos.size,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ─── TandaCard (grid item clickable) ─────────────────────────── */
function TandaCard({ tanda, propietario }) {
    return (
        <Link
            to={`/admin/entrega-dinero/${encodeURIComponent(tanda.nombre)}?propietario=${encodeURIComponent(propietario)}`}
            className="bg-card border border-border rounded-xl shadow-sm hover:shadow-lg hover:border-pink-400/50 transition-all p-6 flex flex-col justify-between gap-5 group"
        >
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-900/50 transition-colors">
                    <Layers className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-base break-words leading-tight">{tanda.nombre}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {tanda.cantMarcas} marca{tanda.cantMarcas !== 1 ? 's' : ''} · {tanda.cantProductos} producto{tanda.cantProductos !== 1 ? 's' : ''}
                    </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-pink-500 transition-colors shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3.5 h-3.5" />Efectivo</p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-base mt-0.5">$ {formatARS(tanda.efectivo)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />USD</p>
                    <p className="font-bold text-amber-600 dark:text-amber-400 text-base mt-0.5">U$D {formatUSD(tanda.usd)}</p>
                </div>
            </div>
        </Link>
    );
}

/* ─── Página principal ─────────────────────────────────────────── */
export function EntregaDinero() {
    const [propietarios, setPropietarios] = useState([]);
    const [propietarioSel, setPropietarioSel] = useState(null);
    const [tandas, setTandas] = useState([]);
    const [loadingProp, setLoadingProp] = useState(true);
    const [loadingVentas, setLoadingVentas] = useState(false);

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
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('id, codigo, tanda_nombre, marca, monto_efectivo, metodo_pago, total_ars, dolar_blue')
                .eq('propietario', propietario)
                .order('tanda_nombre');
            if (error) throw error;
            setTandas(agruparTandas(data || []));
        } catch {
            toast.error('Error al cargar las ventas');
        } finally {
            setLoadingVentas(false);
        }
    }, []);

    useEffect(() => { fetchPropietarios(); }, [fetchPropietarios]);
    useEffect(() => { if (propietarioSel) fetchVentas(propietarioSel); }, [propietarioSel, fetchVentas]);

    const loading = loadingProp || loadingVentas;
    const granTotal = tandas.reduce((s, t) => s + t.efectivo, 0);
    const granTotalUSD = tandas.reduce((s, t) => s + t.usd, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Entrega Dinero</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Seleccioná una tanda para ver el detalle</p>
                </div>
                <button
                    onClick={() => { fetchPropietarios(); if (propietarioSel) fetchVentas(propietarioSel); }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
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
                        <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total USD</p>
                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">U$D {formatUSD(granTotalUSD)}</p>
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

            {/* Grid de tandas */}
            {!loading && tandas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tandas.map((tanda) => (
                        <TandaCard key={tanda.nombre} tanda={tanda} propietario={propietarioSel} />
                    ))}
                </div>
            )}
        </div>
    );
}
