import React, { useState, useEffect } from 'react';
import { Search, Loader, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

export function BuscadorProductos() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.length > 2) {
                searchProducts();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const searchProducts = async () => {
        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('*')
                // Search in title OR code
                .or(`producto_titulo.ilike.%${query}%,codigo.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="relative w-full max-w-lg">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar producto globalmente..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 h-10 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
                {searching && (
                    <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                )}
            </div>

            {/* Results Dropdown */}
            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto">
                    {results.map((item) => (
                        <div
                            key={item.id}
                            className="p-3 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center group cursor-pointer"
                        // Note: We don't have a specific detail page for product yet, so we could link to Tanda detail
                        // onClick={() => navigate(...)}
                        >
                            <div>
                                <h4 className="font-medium text-sm text-gray-900">{item.producto_titulo}</h4>
                                <p className="text-xs text-gray-500 ">
                                    {item.tanda_nombre} • <span className="text-blue-600">{item.marca}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-xs bg-gray-100 px-2 py-1 rounded-md mb-1">{item.cantidad_docenas} doc.</span>
                                <span className="text-[10px] text-gray-400 font-mono">{item.codigo}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {query.length > 2 && results.length === 0 && !searching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white p-4 text-center text-sm text-gray-500 rounded-lg shadow-lg border z-50">
                    No se encontraron productos.
                </div>
            )}
        </div>
    );
}
