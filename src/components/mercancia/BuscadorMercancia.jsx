import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export default function BuscadorMercancia({ onSearch, onClear, className = '' }) {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        if (debouncedSearch.trim()) {
            onSearch(debouncedSearch);
        } else {
            // Only call onClear if we had a value previously, or just robustly call it
            // For now, if empty, we clear.
            onClear();
        }
    }, [debouncedSearch]);

    const handleClear = () => {
        setSearchTerm('');
        onClear();
    };

    return (
        <div className={`relative w-full ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código de producto o boleta..."
                className="w-full pl-10 pr-10 h-10 text-sm rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            {searchTerm && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    title="Limpiar búsqueda"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
