import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, ExternalLink, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calcPrice, formatARS } from '../../utils/pricingUtils';
import { useNavigate } from 'react-router-dom';

export default function GlobalPriceSearchBar({ 
    localSearchValue, 
    onLocalSearchChange, 
    placeholder = "Buscar código (Tanda actual o Global)..." 
}) {
    const [globalResults, setGlobalResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    // Debounced global search
    useEffect(() => {
        const term = localSearchValue.trim();
        if (term.length < 2) {
            setGlobalResults([]);
            setShowDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setShowDropdown(true);

            try {
                // 1. Search both tables for term
                const [entradasRes, oldEntradasRes] = await Promise.all([
                    supabase
                        .from('entradas')
                        .select('codigo, producto_titulo, marca, precio_venta_arg, precio_venta_usd, precio_docena, cantidad_docenas, gastos, tanda_nombre, _source')
                        .or(`codigo.ilike.%${term}%,producto_titulo.ilike.%${term}%`)
                        .limit(10),
                    supabase
                        .from('old_entradas')
                        .select('codigo, producto_titulo, marca, precio_venta_arg, precio_venta_usd, precio_docena, cantidad_docenas, gastos, tanda_nombre, _source')
                        .or(`codigo.ilike.%${term}%,producto_titulo.ilike.%${term}%`)
                        .limit(10)
                ]);

                const entradasData = (entradasRes.data || []).map(d => ({ ...d, _source: 'entradas' }));
                const oldEntradasData = (oldEntradasRes.error ? [] : (oldEntradasRes.data || [])).map(d => ({ ...d, _source: 'old_entradas' }));
                const allData = [...entradasData, ...oldEntradasData];

                if (allData.length === 0) {
                    setGlobalResults([]);
                    return;
                }

                // 2. Fetch tanda settings to calc prices real-time
                const tandasMatching = [...new Set(allData.map(d => d.tanda_nombre))];
                const { data: settingsData } = await supabase
                    .from('tanda_settings')
                    .select('*')
                    .in('tanda_nombre', tandasMatching);

                const settingsMap = {};
                (settingsData || []).forEach(s => {
                    settingsMap[s.tanda_nombre] = s;
                });

                // 3. Calc prices
                const enriched = allData.map(item => {
                    const settings = settingsMap[item.tanda_nombre] || null;
                    const prices = calcPrice(item, settings);
                    return { ...item, prices, hasSettings: !!settings };
                });

                setGlobalResults(enriched);
            } catch (err) {
                console.error("Global search error:", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [localSearchValue]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={localSearchValue}
                    onChange={e => {
                        onLocalSearchChange(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => {
                        if (localSearchValue.trim().length >= 2) setShowDropdown(true);
                    }}
                    placeholder={placeholder}
                    className="w-full bg-gray-100 hover:bg-gray-200 focus:bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-10 text-[14px] font-medium transition-all text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 shadow-sm"
                />
                
                {/* Loader or Clear Button inside input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isSearching && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                    )}
                    {!isSearching && localSearchValue && (
                        <button
                            onClick={() => {
                                onLocalSearchChange('');
                                setGlobalResults([]);
                                setShowDropdown(false);
                            }}
                            className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-full p-1 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown Overlay */}
            {showDropdown && localSearchValue.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-[360px] overflow-y-auto">
                    <div className="bg-indigo-50/50 px-4 py-2 border-b border-indigo-100/50">
                        <span className="text-[10px] uppercase font-black text-indigo-500 tracking-widest flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Resultados Globales
                        </span>
                    </div>

                    {isSearching && globalResults.length === 0 ? (
                        <div className="p-4 text-center text-[13px] text-gray-400 font-medium animate-pulse">
                            Buscando en toda la base de datos...
                        </div>
                    ) : globalResults.length === 0 ? (
                        <div className="p-6 text-center">
                            <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-[13px] text-gray-500 font-medium">No se encontraron productos en ninguna tanda con "{localSearchValue}"</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {globalResults.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setShowDropdown(false);
                                        // Navigate to the matching tanda with the query
                                        navigate(`/admin/precio-venta-sugerido/${encodeURIComponent(item.tanda_nombre)}?q=${encodeURIComponent(item.codigo || item.producto_titulo)}`);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-50/50 last:border-0 group"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-[14px] text-gray-900 truncate">
                                                {item.producto_titulo || 'Sin nombre'}
                                            </span>
                                            {item.codigo && (
                                                <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                                                    {item.codigo}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[12px] font-medium text-gray-500 flex items-center gap-1 truncate">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                            {item.tanda_nombre}
                                        </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[14px] font-black text-emerald-600">
                                            {item.hasSettings ? formatARS(item.prices.precioVentaArg) : 'Sin cotización'}
                                        </div>
                                        <div className="text-[11px] font-bold text-gray-400 flex items-center justify-end gap-1 group-hover:text-indigo-500 transition-colors">
                                            Ver tanda <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
