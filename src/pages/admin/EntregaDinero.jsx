import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Banknote, DollarSign, Layers, RefreshCw, Package,
    User, ChevronRight, Tag, Search, X, Loader2,
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
            className="bg-card border border-border rounded-lg sm:rounded-xl shadow-sm hover:shadow-lg hover:border-pink-400/50 transition-all p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5 group"
        >
            <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 sm:p-3 rounded-lg bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-900/50 transition-colors shrink-0">
                    <Layers className="w-5 sm:w-6 h-5 sm:h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-sm sm:text-base break-words leading-tight">{tanda.nombre}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {tanda.cantMarcas} marca{tanda.cantMarcas !== 1 ? 's' : ''} · {tanda.cantProductos} producto{tanda.cantProductos !== 1 ? 's' : ''}
                    </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-pink-500 transition-colors shrink-0 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                    <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /><span>Efectivo</span></p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base mt-0.5 font-mono">$ {formatARS(tanda.efectivo)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                    <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" /><span>USD</span></p>
                    <p className="font-bold text-amber-600 dark:text-amber-400 text-sm sm:text-base mt-0.5 font-mono">U$D {formatUSD(tanda.usd)}</p>
                </div>
            </div>
        </Link>
    );
}

/* ─── BuscadorCodigo (buscar producto por código → ir a su tanda) ─ */
function BuscadorCodigo() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapRef = useRef(null);

    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setResultados([]);
            setMostrarDropdown(false);
            return;
        }
        const t = setTimeout(async () => {
            setBuscando(true);
            setMostrarDropdown(true);
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('tanda_nombre, propietario, marca, codigo, producto_titulo')
                    .ilike('codigo', `%${term}%`)
                    .not('tanda_nombre', 'is', null)
                    .limit(30);
                if (error) throw error;
                const vistos = new Set();
                const unicos = [];
                for (const r of data || []) {
                    if (!r.tanda_nombre || !r.propietario) continue;
                    const key = `${r.tanda_nombre}::${r.propietario}::${r.codigo}`;
                    if (vistos.has(key)) continue;
                    vistos.add(key);
                    unicos.push(r);
                }
                setResultados(unicos);
                setSelectedIndex(-1);
            } catch {
                toast.error('Error al buscar el código');
                setResultados([]);
            } finally {
                setBuscando(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setMostrarDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const irAResultado = (r) => {
        setMostrarDropdown(false);
        setQuery('');
        setResultados([]);
        navigate(`/admin/entrega-dinero/${encodeURIComponent(r.tanda_nombre)}?propietario=${encodeURIComponent(r.propietario)}`);
    };

    const limpiar = () => {
        setQuery('');
        setResultados([]);
        setMostrarDropdown(false);
    };

    const handleKeyDown = (e) => {
        if (!mostrarDropdown || resultados.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i < resultados.length - 1 ? i + 1 : i));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i > 0 ? i - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = selectedIndex >= 0 ? resultados[selectedIndex] : resultados[0];
            if (target) irAResultado(target);
        } else if (e.key === 'Escape') {
            setMostrarDropdown(false);
        }
    };

    return (
        <div className="relative" ref={wrapRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    inputMode="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.trim().length >= 2 && setMostrarDropdown(true)}
                    placeholder="Buscar producto por código…"
                    className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-colors"
                />
                {query && (
                    <button
                        onClick={limpiar}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    >
                        {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {mostrarDropdown && (
                <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-30 overflow-hidden max-h-80 overflow-y-auto">
                    {buscando ? (
                        <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Buscando…
                        </div>
                    ) : resultados.length > 0 ? (
                        resultados.map((r, i) => (
                            <button
                                key={`${r.tanda_nombre}-${r.propietario}-${r.codigo}-${i}`}
                                onClick={() => irAResultado(r)}
                                onMouseEnter={() => setSelectedIndex(i)}
                                className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/40 last:border-0 flex items-center justify-between gap-3 ${
                                    i === selectedIndex ? 'bg-muted' : 'hover:bg-muted'
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{r.producto_titulo || r.codigo}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        <span className="font-mono">{r.codigo}</span> · {r.marca || 'Sin marca'} · {r.propietario}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-semibold text-pink-600 dark:text-pink-400 shrink-0">
                                    <span className="max-w-[8rem] truncate">{r.tanda_nombre}</span>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Sin resultados para "{query}"
                        </div>
                    )}
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
        <div className="p-3 sm:p-4 md:p-0 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Entrega Dinero</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Seleccioná una tanda para ver el detalle</p>
                </div>
                <button
                    onClick={() => { fetchPropietarios(); if (propietarioSel) fetchVentas(propietarioSel); }}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 shrink-0"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Actualizar</span>
                </button>
            </div>

            {/* Buscador por código de producto */}
            <BuscadorCodigo />

            {/* Selector de propietario */}
            {!loadingProp && propietarios.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground shrink-0">
                        <User className="w-4 h-4" />
                        <span>Propietario:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {propietarios.map(p => (
                            <button
                                key={p}
                                onClick={() => setPropietarioSel(p)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                            <Banknote className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs text-muted-foreground">Total Efectivo</p>
                            <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 font-mono">$ {formatARS(granTotal)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                            <DollarSign className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs text-muted-foreground">Total USD</p>
                            <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">U$D {formatUSD(granTotalUSD)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 shrink-0">
                            <Layers className="w-4 sm:w-5 h-4 sm:h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs text-muted-foreground">Tandas</p>
                            <p className="text-base sm:text-lg font-bold text-foreground">{tandas.length}</p>
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
                    <p className="font-medium text-center">Sin ventas para <span className="font-semibold">{propietarioSel}</span></p>
                </div>
            )}

            {/* Grid de tandas */}
            {!loading && tandas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {tandas.map((tanda) => (
                        <TandaCard key={tanda.nombre} tanda={tanda} propietario={propietarioSel} />
                    ))}
                </div>
            )}
        </div>
    );
}
