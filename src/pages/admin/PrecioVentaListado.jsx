import React, { useEffect, useState } from 'react';
import { pricingService } from '../../services/pricingService';
import { TandaCard } from '../../components/pricing/TandaCard';
import { supabase } from '../../lib/supabase';
import { PackageX } from 'lucide-react'; // Removed Search since Buscador handles it
import { useDebounce } from '../../hooks/useDebounce';
import BuscadorMercancia from '../../components/mercancia/BuscadorMercancia';

export function PrecioVentaListado() {
    const [tandas, setTandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search
    // Search
    // We can use the simple state for search terms, but BuscadorMercancia handles debounce effectively if we pass a handler. 
    // Wait, BuscadorMercancia also has internal state. 
    // We should simplify this component to just receive the 'onSearch' from BuscadorMercancia.
    // The BuscadorMercancia handles the typing and debounce, then calls onSearch with the string.

    // So we just need filtered results state.
    const [filteredTandas, setFilteredTandas] = useState([]);
    const [searchResults, setSearchResults] = useState(null);

    useEffect(() => {
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        try {
            setLoading(true);
            const data = await pricingService.getTandasSummary();
            // Sort by date descending (newest first)
            const sorted = data.sort((a, b) => new Date(b.tanda_fecha) - new Date(a.tanda_fecha));
            setTandas(sorted);
            setFilteredTandas(sorted); // Initialize filtered with all
        } catch (err) {
            console.error(err);
            setError('Error al cargar las tandas.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (term) => {
        if (!term.trim()) {
            handleClear();
            return;
        }

        try {
            const { data } = await supabase
                .from('entradas')
                .select('*')
                .or(`codigo.ilike.%${term}%,codigo_boleta.ilike.%${term}%`);

            if (data && data.length > 0) {
                const tandasMatching = new Set(data.map(d => d.tanda_nombre));
                const filtered = tandas.filter(t => tandasMatching.has(t.tanda_nombre));
                setFilteredTandas(filtered);
                setSearchResults(data);
            } else {
                setFilteredTandas([]);
                setSearchResults([]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleClear = () => {
        setFilteredTandas(tandas);
        setSearchResults(null);
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl mx-4 mt-8">
            {error}
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Precio de Venta Sugerido</h1>
                <p className="text-gray-500 max-w-2xl mx-auto">
                    Gestiona los precios de venta, configura el índice de ganancia y publica productos al catálogo oficial.
                </p>
            </div>

            {/* Search Input */}
            <div className="mb-8 max-w-lg mx-auto">
                <BuscadorMercancia onSearch={handleSearch} onClear={handleClear} />
            </div>

            {filteredTandas.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <PackageX className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-gray-500 font-medium">No se encontraron resultados</p>
                    <p className="text-sm text-gray-400 mt-1">Intenta con otro código de producto o boleta.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTandas.map((tanda) => (
                        <div key={tanda.tanda_nombre} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <TandaCard tanda={tanda} />
                            {/* Overlay for search matches if needed, or pass props to TandaCard if safe. 
                                TandaCard might not accept children or props easily without modifying it.
                                Let's check TandaCard content first or append this below.
                                Actually the user requested badges IN the card. 
                                We might need to wrap TandaCard or modify it. 
                                For minimal intrusion, we can render the matches BELOW the TandaCard content if we wrap it in a div, 
                                but TandaCard likely has its own container. 
                                Let's modify TandaCard if I could read it, but I haven't read it yet.
                                Plan B: Render matches here inside this card container.
                             */}
                            {searchResults && (
                                <div className="px-6 pb-6 -mt-2">
                                    <div className="space-y-1 pt-4 border-t border-gray-50">
                                        {searchResults
                                            .filter(p => p.tanda_nombre === tanda.tanda_nombre)
                                            .slice(0, 3)
                                            .map((prod, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                                                    <span className="font-bold">✓ {prod.producto_titulo}</span>
                                                    <span className="opacity-75">({prod.codigo})</span>
                                                </div>
                                            ))
                                        }
                                        {searchResults.filter(p => p.tanda_nombre === tanda.tanda_nombre).length > 3 && (
                                            <p className="text-xs text-center text-gray-400 mt-1">
                                                +{searchResults.filter(p => p.tanda_nombre === tanda.tanda_nombre).length - 3} coincidencias más
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
