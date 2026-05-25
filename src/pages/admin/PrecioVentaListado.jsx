import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pricingService } from '../../services/pricingService';
import { TandaCard } from '../../components/pricing/TandaCard';
import { supabase } from '../../lib/supabase';
import { PackageX, Package, ShoppingBag, Archive, Search, ChevronRight, Tag, DollarSign, TrendingUp, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import BuscadorMercancia from '../../components/mercancia/BuscadorMercancia';
import { useMobile } from '../../hooks/useMobile';
import { formatARS, formatUSD } from '../../utils/pricingUtils';

export function PrecioVentaListado() {
    const [tandas, setTandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filteredTandas, setFilteredTandas] = useState([]);
    const [searchResults, setSearchResults] = useState(null);
    const [priceResults, setPriceResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // ── Global price settings (replaces per-tanda settings for search) ──
    const [useDolarBlue, setUseDolarBlue] = useState(true);
    const [dolarBlueValue, setDolarBlueValue] = useState(null);
    const [manualDolar, setManualDolar] = useState('');
    const [fetchingDolar, setFetchingDolar] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [indiceValor, setIndiceValor] = useState(1.5);
    const [indiceTipo, setIndiceTipo] = useState('1.5');
    const [customIndiceValue, setCustomIndiceValue] = useState('');
    const lastSearchTermRef = useRef('');

    const isMobile = useMobile();
    const navigate = useNavigate();

    // Effective dolar used for price calculations
    const efectiveDolar = useDolarBlue ? (dolarBlueValue ?? 0) : parseFloat(manualDolar || 0);
    const globalSettings = { cotizacion_dolar: efectiveDolar, indice_ganancia_valor: indiceValor };

    const fetchDolarBlue = useCallback(async () => {
        setFetchingDolar(true);
        setFetchError(null);
        try {
            const res = await fetch('https://dolarapi.com/v1/dolares/blue');
            if (!res.ok) throw new Error('Error al conectar con la API');
            const json = await res.json();
            const venta = json?.venta;
            if (!venta) throw new Error('No se encontró el valor');
            setDolarBlueValue(venta);
        } catch (err) {
            setFetchError(err.message || 'Error desconocido');
        } finally {
            setFetchingDolar(false);
        }
    }, []);

    // Auto-fetch on mount
    useEffect(() => { fetchDolarBlue(); }, [fetchDolarBlue]);

    // Re-calculate prices when dolar/indice change — reuse stored _precioVentaAlCosto
    // so the proportional formula (which requires group data) doesn't need to re-run
    useEffect(() => {
        if (priceResults && priceResults.length > 0) {
            setPriceResults(prev => prev.map(item => {
                const baseCosto = item._precioVentaAlCosto ?? item.prices?.precioVentaAlCosto ?? 0;
                const precioDeVenta = baseCosto * indiceValor;
                const precioVentaArg = efectiveDolar > 0 ? precioDeVenta * efectiveDolar : null;
                return {
                    ...item,
                    prices: { precioVentaAlCosto: baseCosto, precioDeVenta, precioVentaArg },
                    hasSettings: efectiveDolar > 0
                };
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [efectiveDolar, indiceValor]);

    const handleIndice = (tipo) => {
        setIndiceTipo(tipo);
        if (tipo === '1.4') setIndiceValor(1.4);
        else if (tipo === '1.5') setIndiceValor(1.5);
        else if (tipo === '1.6') setIndiceValor(1.6);
        // 'custom' — value set separately
    };

    useEffect(() => {
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        try {
            setLoading(true);
            const data = await pricingService.getTandasSummary();
            const sorted = data.sort((a, b) => new Date(b.tanda_fecha) - new Date(a.tanda_fecha));
            setTandas(sorted);
            setFilteredTandas(sorted);
        } catch (err) {
            console.error(err);
            setError('Error al cargar las tandas.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (term) => {
        lastSearchTermRef.current = term;
        if (!term.trim()) {
            handleClear();
            return;
        }

        setSearchLoading(true);
        try {
            const [entradasResult, oldEntradasResult] = await Promise.all([
                supabase
                    .from('entradas')
                    .select('*')
                    .or(`codigo.ilike.%${term}%,codigo_boleta.ilike.%${term}%,producto_titulo.ilike.%${term}%,marca.ilike.%${term}%`),
                supabase
                    .from('old_entradas')
                    .select('*')
                    .or(`codigo.ilike.%${term}%,codigo_boleta.ilike.%${term}%,producto_titulo.ilike.%${term}%,marca.ilike.%${term}%`)
            ]);

            const entradasData = (entradasResult.data || []).map(d => ({ ...d, _source: 'entradas' }));
            const oldEntradasData = (oldEntradasResult.error ? [] : (oldEntradasResult.data || [])).map(d => ({ ...d, _source: 'old_entradas' }));
            const allData = [...entradasData, ...oldEntradasData];

            if (allData.length > 0) {
                const tandasMatching = new Set(allData.map(d => d.tanda_nombre));
                const filtered = tandas.filter(t => tandasMatching.has(t.tanda_nombre));
                setFilteredTandas(filtered);
                setSearchResults(allData);

                // Fetch tandas.parametros for non-old entradas to check bultosPersonalizados
                const entradasOnly = entradasData;
                const uniqueEntradaTandas = [...new Set(entradasOnly.map(d => d.tanda_nombre).filter(Boolean))];

                let tandasParametrosMap = {};
                if (uniqueEntradaTandas.length > 0) {
                    const { data: tandasRows } = await supabase
                        .from('tandas')
                        .select('nombre, parametros')
                        .in('nombre', uniqueEntradaTandas);
                    (tandasRows || []).forEach(t => {
                        tandasParametrosMap[t.nombre] = t.parametros || {};
                    });
                }

                // Determine which brand groups need the proportional formula
                const groupsNeedingFetch = new Set();
                entradasOnly.forEach(item => {
                    const tandaParametros = tandasParametrosMap[item.tanda_nombre] || {};
                    if (tandaParametros?.marcasMetadata) {
                        const meta = item.marca_id
                            ? tandaParametros.marcasMetadata[item.marca_id]
                            : tandaParametros.marcasMetadata[item.marca];
                        if (meta?.bultos_personalizados && parseFloat(meta.bultos_personalizados) > 0) {
                            groupsNeedingFetch.add(`${item.tanda_nombre}__${item.marca}__${item.codigo_boleta}`);
                        }
                    }
                });

                // Fetch ALL products in those groups so we can compute K (total value of brand group)
                let allGroupProducts = {};
                if (groupsNeedingFetch.size > 0) {
                    const tandaNamesForGroups = [...new Set([...groupsNeedingFetch].map(k => k.split('__')[0]))];
                    const { data: groupData } = await supabase
                        .from('entradas')
                        .select('tanda_nombre, marca, codigo_boleta, cantidad_docenas, precio_docena, gastos, marca_id')
                        .in('tanda_nombre', tandaNamesForGroups);
                    (groupData || []).forEach(p => {
                        const key = `${p.tanda_nombre}__${p.marca}__${p.codigo_boleta}`;
                        if (groupsNeedingFetch.has(key)) {
                            if (!allGroupProducts[key]) allGroupProducts[key] = [];
                            allGroupProducts[key].push(p);
                        }
                    });
                }

                // Compute prices using the same formula as BrandAccordion
                const enriched = allData.map(item => {
                    const isOld = item._source === 'old_entradas';
                    const docenas = parseFloat(item.cantidad_docenas || 0);
                    const precioDocena = parseFloat(item.precio_docena || 0);
                    const numDocenas = docenas || 1;

                    let precioVentaAlCosto;

                    if (isOld) {
                        precioVentaAlCosto = precioDocena;
                    } else {
                        const tandaParametros = tandasParametrosMap[item.tanda_nombre] || {};
                        let bultosPersonalizados = 0;
                        if (tandaParametros?.marcasMetadata) {
                            const meta = item.marca_id
                                ? tandaParametros.marcasMetadata[item.marca_id]
                                : tandaParametros.marcasMetadata[item.marca];
                            if (meta?.bultos_personalizados && parseFloat(meta.bultos_personalizados) > 0) {
                                bultosPersonalizados = parseFloat(meta.bultos_personalizados);
                            }
                        }

                        const groupKey = `${item.tanda_nombre}__${item.marca}__${item.codigo_boleta}`;
                        const groupItems = allGroupProducts[groupKey];
                        const useProportional = bultosPersonalizados > 0 && groupItems && groupItems.length > 0;

                        if (useProportional) {
                            const K = groupItems.reduce((s, p) =>
                                s + (parseFloat(p.cantidad_docenas || 0) * parseFloat(p.precio_docena || 0)), 0);
                            const gastoPorBulto = parseFloat(groupItems[0]?.gastos || 0);
                            const L = gastoPorBulto * bultosPersonalizados;

                            if (K > 0) {
                                const D = docenas * precioDocena;
                                const E = (100 * D) / K;
                                const F = (0.01 * E) * L;
                                const G = (precioDocena + F) / numDocenas;
                                precioVentaAlCosto = G + precioDocena;
                            } else {
                                precioVentaAlCosto = (precioDocena * docenas + parseFloat(item.gastos || 0) * parseFloat(item.bultos || 0)) / numDocenas;
                            }
                        } else {
                            precioVentaAlCosto = (precioDocena * docenas + parseFloat(item.gastos || 0) * parseFloat(item.bultos || 0)) / numDocenas;
                        }
                    }

                    const precioDeVenta = precioVentaAlCosto * indiceValor;
                    const precioVentaArg = efectiveDolar > 0 ? precioDeVenta * efectiveDolar : null;

                    return {
                        ...item,
                        _precioVentaAlCosto: precioVentaAlCosto,
                        prices: { precioVentaAlCosto, precioDeVenta, precioVentaArg },
                        hasSettings: efectiveDolar > 0
                    };
                });
                setPriceResults(enriched);
            } else {
                setFilteredTandas([]);
                setSearchResults([]);
                setPriceResults([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleClear = () => {
        setFilteredTandas(tandas);
        setSearchResults(null);
        setPriceResults(null);
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center text-destructive bg-destructive/10 rounded-xl mx-4 mt-8 border border-destructive/20">
            {error}
        </div>
    );

    // ─── Mobile Layout ───────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50 pb-8">
                {/* Mobile Header */}
                <header className="bg-white px-5 pt-8 pb-4 sticky top-0 z-20 border-b border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight leading-tight">Sugerido<br/>de Venta</h1>
                        <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 shadow-inner">
                            <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                    </div>
                </header>

                {/* ── Settings Panel (mobile) ── */}
                <div className="px-5 pt-5 space-y-4">

                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuración de precios</span>
                        <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    {/* Cotización Dólar */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> Cotización Dólar
                            </label>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold flex items-center gap-1 ${useDolarBlue ? 'text-blue-500' : 'text-gray-400'}`}>
                                    {useDolarBlue ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                    {useDolarBlue ? 'Blue API' : 'Manual'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !useDolarBlue;
                                        setUseDolarBlue(next);
                                        if (next) fetchDolarBlue();
                                        else setDolarBlueValue(null);
                                    }}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useDolarBlue ? 'bg-blue-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${useDolarBlue ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                {useDolarBlue && (
                                    <button onClick={fetchDolarBlue} disabled={fetchingDolar} className="text-blue-400 hover:text-blue-600 disabled:opacity-50">
                                        <RefreshCw className={`h-3.5 w-3.5 ${fetchingDolar ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {useDolarBlue ? (
                            <div>
                                <p className="text-[22px] font-black text-orange-500">${dolarBlueValue ? dolarBlueValue.toLocaleString('es-AR') : (fetchingDolar ? '...' : '—')}</p>
                                {dolarBlueValue && <p className="text-[11px] text-blue-500 font-medium">✓ Dólar Blue: ${dolarBlueValue.toLocaleString('es-AR')} (venta)</p>}
                                {fetchError && <p className="text-[11px] text-red-400">{fetchError}</p>}
                            </div>
                        ) : (
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={manualDolar}
                                    onChange={e => setManualDolar(e.target.value)}
                                    placeholder="Ej: 1390"
                                    className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-7 pr-3 text-[15px] font-bold focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Índice de Ganancia */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-3">
                            <TrendingUp className="h-3 w-3" /> Índice de Ganancia
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {['1.4', '1.5', '1.6', 'custom'].map(tipo => (
                                <button
                                    key={tipo}
                                    onClick={() => handleIndice(tipo)}
                                    className={`py-2.5 rounded-xl text-[13px] font-black transition-all ${
                                        indiceTipo === tipo
                                            ? 'bg-[#FF5C39] text-white shadow-lg shadow-orange-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {tipo === 'custom' ? 'Custom' : `${tipo}x`}
                                </button>
                            ))}
                        </div>
                        {indiceTipo === 'custom' && (
                            <input
                                type="number"
                                step="0.01"
                                value={customIndiceValue}
                                onChange={e => {
                                    setCustomIndiceValue(e.target.value);
                                    const n = parseFloat(e.target.value);
                                    if (!isNaN(n) && n > 0) setIndiceValor(n);
                                }}
                                placeholder="Ej: 1.7"
                                className="mt-3 w-full bg-gray-100 border-none rounded-xl py-2.5 px-4 text-[15px] font-bold text-center focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                        {indiceTipo !== 'custom' && (
                            <p className="text-center text-[13px] font-bold text-gray-500 mt-3">{indiceValor.toFixed(1)}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buscar producto</span>
                        <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por código, nombre o marca..."
                            className="w-full bg-gray-100 border-none rounded-2xl py-3.5 pl-12 pr-4 text-[15px] focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                </div>

                <div className="px-5 py-4 space-y-6">

                    {/* ── Price Results Panel (mobile) ── */}
                    {searchLoading && (
                        <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    )}

                    {priceResults && priceResults.length > 0 && !searchLoading && (
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                Precios encontrados — {priceResults.length} producto{priceResults.length !== 1 ? 's' : ''}
                            </p>
                            <div className="space-y-3">
                                {priceResults.map((prod, idx) => (
                                    <div
                                        key={idx}
                                        className="relative bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform active:scale-[0.98] cursor-pointer group"
                                        onClick={() => navigate(`/admin/precio-venta-sugerido/${encodeURIComponent(prod.tanda_nombre)}?q=${encodeURIComponent(prod.codigo || prod.producto_titulo || '')}`)}
                                    >
                                        {/* Subtle top gradient line */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

                                        {/* Header */}
                                        <div className="px-5 pt-5 pb-3 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                                            {prod.tanda_nombre}
                                                        </span>
                                                        {prod.codigo_boleta && (
                                                            <span className="text-[10px] font-bold font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                Bol: {prod.codigo_boleta}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-black text-gray-900 uppercase text-[17px] tracking-tight leading-none mt-2">
                                                        {prod.marca || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="px-5 py-4">
                                            <p className="font-bold text-gray-800 text-[15px] leading-tight group-hover:text-indigo-600 transition-colors">
                                                {prod.producto_titulo || '—'}
                                            </p>
                                            {prod.codigo && (
                                                <p className="text-[12px] font-mono text-gray-400 mt-1 flex items-center gap-1">
                                                    <Tag className="w-3 h-3" /> {prod.codigo}
                                                </p>
                                            )}

                                            {/* Price tiles */}
                                            <div className="grid grid-cols-3 gap-2.5 mt-5">
                                                <div className="flex flex-col justify-center bg-gray-50/80 rounded-2xl p-2.5 border border-gray-100/50">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Costo</p>
                                                    <p className="text-[12px] font-bold text-gray-500 text-center">{formatUSD(prod.prices.precioVentaAlCosto)}</p>
                                                </div>
                                                <div className="flex flex-col justify-center bg-indigo-50/50 rounded-2xl p-2.5 border border-indigo-100/50">
                                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center">Venta USD</p>
                                                    <p className="text-[13px] font-black text-indigo-600 text-center">{formatUSD(prod.prices.precioDeVenta)}</p>
                                                </div>
                                                <div className={`flex flex-col justify-center rounded-2xl p-2.5 shadow-sm border ${prod.prices.precioVentaArg !== null ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100/80' : 'bg-gray-50 border-gray-100'}`}>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 text-center ${prod.prices.precioVentaArg !== null ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                        Venta ARS
                                                    </p>
                                                    <p className={`text-[12px] font-black text-center leading-tight ${prod.prices.precioVentaArg !== null ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                        {prod.prices.precioVentaArg !== null ? formatARS(prod.prices.precioVentaArg) : 'Sin cotiz.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {priceResults && priceResults.length === 0 && !searchLoading && (
                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                            <PackageX className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 font-medium text-sm">No se encontraron productos</p>
                        </div>
                    )}

                    {/* ── Tanda Cards ── */}
                    {!priceResults && (
                        filteredTandas.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                                <PackageX className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">No se encontraron resultados</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {filteredTandas.map((tanda) => (
                                    <div
                                        key={tanda.tanda_nombre}
                                        className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all relative overflow-hidden"
                                        onClick={() => navigate(`/admin/precio-venta-sugerido/${encodeURIComponent(tanda.tanda_nombre)}`)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tanda.isOldEntrada ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                    {tanda.isOldEntrada ? <Archive className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[#1A1A1A] text-lg uppercase leading-tight">{tanda.tanda_nombre}</h3>
                                                    {tanda.isOldEntrada && (
                                                        <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-amber-100 text-amber-600 uppercase tracking-wider">
                                                            Archivo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-[#EEF2FF] rounded-2xl p-3 text-center">
                                                <span className="block text-[10px] font-bold text-[#4B6BFB] uppercase tracking-wider mb-1">Marcas</span>
                                                <span className="text-lg font-black text-[#4B6BFB]">{tanda.marcas_count}</span>
                                            </div>
                                            <div className="bg-[#F5F3FF] rounded-2xl p-3 text-center">
                                                <span className="block text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider mb-1">Prods</span>
                                                <span className="text-lg font-black text-[#7C3AED]">{tanda.productos}</span>
                                            </div>
                                            <div className="bg-[#FEF1EC] rounded-2xl p-3 text-center">
                                                <span className="block text-[10px] font-bold text-[#FF5C39] uppercase tracking-wider mb-1">Docenas</span>
                                                <span className="text-lg font-black text-[#FF5C39]">{tanda.total_docenas}</span>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-0 right-0 p-3 opacity-20 transform translate-y-1 translate-x-1 pointer-events-none">
                                            <ChevronRight className="w-12 h-12 text-gray-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    }

    // ─── Desktop Layout ───────────────────────────────────────────────────────
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-foreground mb-2">Precio de Venta Sugerido</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Gestiona los precios de venta, configura el índice de ganancia y publica productos al catálogo oficial.
                </p>
            </div>

            {/* ── Settings Panel (desktop) ── */}
            <div className="mb-4 flex items-center gap-3 max-w-3xl mx-auto">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Configuración de precios</span>
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">

                {/* Cotización Dólar */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Cotización Dólar
                        </label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold flex items-center gap-1 ${useDolarBlue ? 'text-blue-500' : 'text-muted-foreground'}`}>
                                {useDolarBlue ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                {useDolarBlue ? 'Blue API' : 'Manual'}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !useDolarBlue;
                                    setUseDolarBlue(next);
                                    if (next) fetchDolarBlue();
                                    else setDolarBlueValue(null);
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useDolarBlue ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${useDolarBlue ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                            {useDolarBlue && (
                                <button onClick={fetchDolarBlue} disabled={fetchingDolar} className="text-blue-400 hover:text-blue-600 disabled:opacity-40">
                                    <RefreshCw className={`h-3.5 w-3.5 ${fetchingDolar ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                    </div>
                    {useDolarBlue ? (
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <input readOnly value={dolarBlueValue ?? (fetchingDolar ? '' : '')} placeholder={fetchingDolar ? 'Obteniendo...' : '—'}
                                className="w-full pl-7 py-2 rounded-md border border-input bg-muted/30 text-sm font-bold font-mono text-primary opacity-75 cursor-not-allowed"
                            />
                            {dolarBlueValue && <p className="text-xs text-blue-500 mt-1 font-medium">✓ Dólar Blue: ${dolarBlueValue.toLocaleString('es-AR')} (venta)</p>}
                            {fetchError && <p className="text-xs text-destructive mt-1">{fetchError}</p>}
                        </div>
                    ) : (
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <input type="number" value={manualDolar} onChange={e => setManualDolar(e.target.value)}
                                placeholder="Ej: 1390" className="w-full pl-7 py-2 rounded-md border border-input bg-background text-sm font-bold font-mono"
                            />
                        </div>
                    )}
                </div>

                {/* Índice de Ganancia */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1 mb-3">
                        <TrendingUp className="h-3 w-3" /> Índice de Ganancia
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {['1.4', '1.5', '1.6', 'custom'].map(tipo => (
                            <button key={tipo} onClick={() => handleIndice(tipo)}
                                className={`py-2 rounded-lg text-sm font-black transition-all ${
                                    indiceTipo === tipo ? 'bg-[#FF5C39] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'
                                }`}>
                                {tipo === 'custom' ? 'Custom' : `${tipo}x`}
                            </button>
                        ))}
                    </div>
                    {indiceTipo === 'custom' ? (
                        <input type="number" step="0.01" value={customIndiceValue}
                            onChange={e => { setCustomIndiceValue(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n > 0) setIndiceValor(n); }}
                            placeholder="Ej: 1.7" className="mt-3 w-full bg-muted border-input rounded-md py-2 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-ring"
                        />
                    ) : (
                        <p className="text-center text-sm font-bold text-muted-foreground mt-3">{indiceValor.toFixed(1)}</p>
                    )}
                </div>
            </div>

            {/* ── Search separator (desktop) ── */}
            <div className="mb-4 flex items-center gap-3 max-w-3xl mx-auto">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Buscar producto</span>
                <div className="h-px flex-1 bg-border" />
            </div>

            {/* Search Input */}
            <div className="mb-8 max-w-lg mx-auto">
                <BuscadorMercancia onSearch={handleSearch} onClear={handleClear} />
            </div>

            {/* ── Price Results Panel (desktop) ── */}
            {searchLoading && (
                <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            )}

            {priceResults && priceResults.length > 0 && !searchLoading && (
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Precios encontrados — {priceResults.length} producto{priceResults.length !== 1 ? 's' : ''}
                            </h2>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Dólar: <strong className="text-emerald-600">${efectiveDolar > 0 ? efectiveDolar.toLocaleString('es-AR') : 'No configurado'}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Índice: <strong className="text-indigo-600">{indiceValor}x</strong>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {priceResults.map((prod, idx) => (
                            <div
                                key={idx}
                                className="group relative bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 overflow-hidden cursor-pointer"
                                onClick={() => navigate(`/admin/precio-venta-sugerido/${encodeURIComponent(prod.tanda_nombre)}?q=${encodeURIComponent(prod.codigo || prod.producto_titulo || '')}`)}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Brand + boleta + tanda header */}
                                <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-muted/10 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/20 transition-colors">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span className="text-[10px] font-black tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2.5 py-0.5 rounded-full uppercase">
                                                {prod.tanda_nombre}
                                            </span>
                                            {prod.codigo_boleta && (
                                                <span className="text-[10px] font-bold font-mono text-muted-foreground bg-background px-2.5 py-0.5 rounded-full border border-border/50 shadow-sm">
                                                    Bol: {prod.codigo_boleta}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-extrabold text-foreground uppercase text-[16px] tracking-tight">
                                            {prod.marca || '—'}
                                        </p>
                                    </div>
                                    <div className="bg-background border border-border rounded-full p-2 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all duration-300 text-muted-foreground shadow-sm">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Product name + code + prices */}
                                <div className="px-6 py-5">
                                    <p className="font-bold text-foreground text-[15px] leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {prod.producto_titulo || '—'}
                                    </p>
                                    {prod.codigo && (
                                        <p className="text-[12px] font-mono text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <Tag className="w-3.5 h-3.5 opacity-70" /> {prod.codigo}
                                        </p>
                                    )}

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-3 mt-5">
                                        <div className="bg-muted/30 rounded-xl p-3 flex flex-col items-center justify-center border border-transparent group-hover:border-border/50 transition-colors">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Costo</p>
                                            <p className="text-[14px] font-bold text-muted-foreground">{formatUSD(prod.prices.precioVentaAlCosto)}</p>
                                        </div>
                                        <div className="bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl p-3 flex flex-col items-center justify-center border border-indigo-100/50 dark:border-indigo-500/10">
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">Venta USD</p>
                                            <p className="text-[14px] font-black text-indigo-600 dark:text-indigo-400">{formatUSD(prod.prices.precioDeVenta)}</p>
                                        </div>
                                        <div className={`rounded-xl p-3 flex flex-col items-center justify-center shadow-sm border ${prod.prices.precioVentaArg !== null ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-100 dark:border-emerald-900/50' : 'bg-muted/30 border-transparent'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${prod.prices.precioVentaArg !== null ? 'text-emerald-600 dark:text-emerald-500' : 'text-muted-foreground'}`}>
                                                Venta ARS
                                            </p>
                                            <p className={`text-[14px] font-black leading-tight ${prod.prices.precioVentaArg !== null ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                {prod.prices.precioVentaArg !== null ? formatARS(prod.prices.precioVentaArg) : 'Sin cotiz.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {priceResults && priceResults.length === 0 && !searchLoading && (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border mb-8">
                    <PackageX className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground font-medium">No se encontraron resultados</p>
                    <p className="text-sm text-muted-foreground mt-1">Intentá con otro código de producto o boleta.</p>
                </div>
            )}

            {/* ── Tanda Cards (shown always, filtered when searching) ── */}
            {!priceResults && (
                filteredTandas.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
                        <PackageX className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground font-medium">No se encontraron resultados</p>
                        <p className="text-sm text-muted-foreground mt-1">Intentá con otro código de producto o boleta.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTandas.map((tanda) => (
                            <div key={tanda.tanda_nombre} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                                <TandaCard tanda={tanda} />
                                {searchResults && (
                                    <div className="px-6 pb-6 -mt-2">
                                        <div className="space-y-1 pt-4 border-t border-border">
                                            {searchResults
                                                .filter(p => p.tanda_nombre === tanda.tanda_nombre)
                                                .slice(0, 3)
                                                .map((prod, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded border border-green-500/20">
                                                        <span className="font-bold">✓ {prod.producto_titulo}</span>
                                                        <span className="opacity-75">({prod.codigo})</span>
                                                    </div>
                                                ))
                                            }
                                            {searchResults.filter(p => p.tanda_nombre === tanda.tanda_nombre).length > 3 && (
                                                <p className="text-xs text-center text-muted-foreground mt-1">
                                                    +{searchResults.filter(p => p.tanda_nombre === tanda.tanda_nombre).length - 3} coincidencias más
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
