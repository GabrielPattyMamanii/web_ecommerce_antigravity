import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, X, ExternalLink, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function BuscadorProductos() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    // Debounce effects
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            searchProducts(query);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchProducts = async (searchTerm) => {
        setSearching(true);
        setShowDropdown(true);
        try {
            // Normalize search for accent insensitivity (if supported by DB or exact match)
            // supabase ilike is case insensitive but accent sensitive usually.
            // For true accent insensitivity we might need specific DB config or text search column.
            // For now, simple ilike.
            const { data, error, count } = await supabase
                .from('products')
                .select('id, name, retail_price, images, code', { count: 'exact' })
                .ilike('name', `%${searchTerm}%`)
                .limit(10); // Limit to 8-10 as requested (showing 10)

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error('Error searching products:', error);
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e) => {
        if (!showDropdown) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && results[selectedIndex]) {
                handleSelectProduct(results[selectedIndex]);
            } else if (query.length >= 2) {
                // Determine what Enter does if no item selected? Maybe search detail?
                // For now, do nothing or user can click 'See all'
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const handleSelectProduct = (product) => {
        setShowDropdown(false);
        setQuery(''); // Clear search or keep it? usually clear or persist.
        // Navigate to edit page (Admin context)
        navigate(`/admin/products/edit/${product.id}`);
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    // Helper to highlight text
    const HighlightText = ({ text, highlight }) => {
        if (!highlight.trim()) {
            return <span>{text}</span>;
        }
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);

        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <span key={i} className="font-bold text-blue-600 dark:text-blue-400">{part}</span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </span>
        );
    };

    return (
        <div className="relative w-full max-w-lg" ref={searchRef}>
            <div
                className="relative flex items-center"
                role="combobox"
                aria-expanded={showDropdown}
                aria-haspopup="listbox"
                aria-controls="search-results"
            >
                <Search className="absolute left-3 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && setShowDropdown(true)}
                    className="w-full pl-10 pr-10 h-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none text-sm font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400 dark:focus:bg-slate-900 dark:focus:border-blue-500"
                />

                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                        {searching ? (
                            <Loader className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                            <X className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (
                <div
                    id="search-results"
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 transform origin-top animate-fade-in-down"
                    role="listbox"
                >
                    <style>{`
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-down {
                        animation: fadeInDown 0.2s ease-out forwards;
                    }
                `}</style>
                    {searching ? (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400 flex flex-col items-center gap-2">
                            <Loader className="w-5 h-5 animate-spin text-blue-500" />
                            <span>Buscando productos...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <>
                            <div className="max-h-[400px] overflow-y-auto">
                                {results.map((product, index) => (
                                    <div
                                        key={product.id}
                                        role="option"
                                        aria-selected={index === selectedIndex}
                                        onClick={() => handleSelectProduct(product)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`
                                            flex items-center gap-3 p-3 cursor-pointer border-b border-gray-50 dark:border-slate-700/50 last:border-0 transition-colors
                                            ${index === selectedIndex ? 'bg-gray-50 dark:bg-slate-700/50' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                                        `}
                                    >
                                        <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
                                            {product.images?.[0] ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
                                                    <ShoppingBag className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate pr-2">
                                                    <HighlightText text={product.name} highlight={query} />
                                                </h4>
                                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                    ${parseFloat(product.retail_price || 0).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            {product.code && (
                                                <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                                                    {product.code}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer / See All */}
                            <div
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/admin/products', { state: { initialSearch: query } });
                                }}
                                className="p-3 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                                    Ver todos los resultados
                                    <ExternalLink className="w-3 h-3" />
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 dark:text-slate-400 text-sm mb-1">
                                No se encontraron productos con "{query}"
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                                Intenta con otro término
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
