import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcPrice, formatARS } from '../../utils/pricingUtils';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Database, Search } from 'lucide-react';

export function GlobalPriceSearchResults({ searchTerm, currentTanda }) {
    const [globalResults, setGlobalResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const term = (searchTerm || '').trim();
        if (term.length < 2) {
            setGlobalResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const [entradasRes, oldEntradasRes] = await Promise.all([
                    supabase
                        .from('entradas')
                        .select('codigo, producto_titulo, marca, codigo_boleta, precio_venta_arg, precio_venta_usd, precio_docena, cantidad_docenas, gastos, tanda_nombre, _source')
                        .or(`codigo.ilike.%${term}%,producto_titulo.ilike.%${term}%,marca.ilike.%${term}%,codigo_boleta.ilike.%${term}%`)
                        .limit(100),
                    supabase
                        .from('old_entradas')
                        .select('codigo, producto_titulo, marca, codigo_boleta, precio_venta_arg, precio_venta_usd, precio_docena, cantidad_docenas, gastos, tanda_nombre, _source')
                        .or(`codigo.ilike.%${term}%,producto_titulo.ilike.%${term}%,marca.ilike.%${term}%,codigo_boleta.ilike.%${term}%`)
                        .limit(100)
                ]);

                const entradasData = (entradasRes.data || []).map(d => ({ ...d, _source: 'entradas' }));
                const oldEntradasData = (oldEntradasRes.error ? [] : (oldEntradasRes.data || [])).map(d => ({ ...d, _source: 'old_entradas' }));
                // ALL tandas — including current one
                const allData = [...entradasData, ...oldEntradasData];

                if (allData.length === 0) {
                    setGlobalResults([]);
                    return;
                }

                const tandasMatching = [...new Set(allData.map(d => d.tanda_nombre))];
                const { data: settingsData } = await supabase
                    .from('tanda_settings')
                    .select('*')
                    .in('tanda_nombre', tandasMatching);

                const settingsMap = {};
                (settingsData || []).forEach(s => {
                    settingsMap[s.tanda_nombre] = s;
                });

                const enriched = allData.map(item => {
                    const settings = settingsMap[item.tanda_nombre] || null;
                    const prices = calcPrice(item, settings);
                    const isCurrentTanda = item.tanda_nombre === currentTanda;
                    return { ...item, prices, hasSettings: !!settings, isCurrentTanda };
                });

                setGlobalResults(enriched);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [searchTerm, currentTanda]);

    if (!searchTerm || searchTerm.trim().length < 2) return null;

    if (isSearching) {
        return (
            <div className="mt-8 border-t border-dashed border-gray-200 pt-6 flex items-center justify-center gap-2 text-muted-foreground px-4">
                <Search className="w-4 h-4 animate-spin" /> Buscando en todas las tandas...
            </div>
        );
    }

    if (globalResults.length === 0) return (
        <div className="mt-6 text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200 px-4">
            <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-medium text-sm">No se encontraron productos en ninguna tanda</p>
        </div>
    );

    return (
        <div className="mt-8 border-t-[3px] border-dashed border-indigo-100 pt-8 mb-8 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 px-4 md:px-0">
            <h4 className="text-[14px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Database className="w-4 h-4" /> 
                Resultados — {globalResults.length} producto{globalResults.length !== 1 ? 's' : ''} en todas las tandas
            </h4>
            <p className="text-sm text-gray-500 mb-6 font-medium">
                Mostrando coincidencias de <span className="text-gray-800 font-bold">todas las tandas</span>. 
                <span className="inline-flex items-center gap-1 ml-2 bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 font-bold text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Tanda actual resaltada
                </span>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {globalResults.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => navigate(`/admin/precio-venta-sugerido/${encodeURIComponent(item.tanda_nombre)}?q=${item.codigo || item.producto_titulo}`)}
                        className={`rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left flex flex-col group w-full border-l-[4px] ${
                            item.isCurrentTanda
                                ? 'bg-emerald-50/60 border border-emerald-200 border-l-emerald-500 hover:border-emerald-300'
                                : 'bg-white border border-gray-100 border-l-transparent hover:border-indigo-200 hover:border-l-indigo-400'
                        }`}
                    >
                        <div className="flex justify-between items-start w-full mb-3">
                            <div className="pr-4">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="font-bold text-[15px] text-gray-900 leading-tight">{item.producto_titulo || 'Sin nombre'}</span>
                                    {item.isCurrentTanda && (
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded">Esta tanda</span>
                                    )}
                                </div>
                                {item.codigo && <span className="text-[12px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">{item.codigo}</span>}
                            </div>
                            <div className="text-right shrink-0">
                                <span className="block text-[16px] font-black text-emerald-600">
                                    {item.hasSettings ? formatARS(item.prices.precioVentaArg) : 'Sin cotización'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[12px] mt-auto font-bold pt-2 border-t border-gray-100">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${
                                item.isCurrentTanda ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.isCurrentTanda ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                                <span className="uppercase">{item.tanda_nombre}</span>
                            </span>
                            <span className="flex items-center gap-1 text-gray-400 group-hover:text-indigo-500 transition-colors group-hover:underline">
                                {item.isCurrentTanda ? 'Ver aquí' : 'Ir a la tanda'} <ExternalLink className="w-3.5 h-3.5" />
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
