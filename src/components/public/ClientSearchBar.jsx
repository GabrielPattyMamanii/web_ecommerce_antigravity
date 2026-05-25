import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, X, ShoppingBag, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function ClientSearchBar({
    placeholder = "Buscar productos...",
    className = "",
    onSearchComplete
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    // Debounce effect
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
            console.log('Searching for:', searchTerm);
            // Selecting * to avoid errors if specific columns (like code) don't exist
            // Searching in name OR description to improve results
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('published', true)
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .limit(8);

            if (error) {
                console.error('Supabase search error:', error);
                throw error;
            }

            console.log('Search results:', data);
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
                handleSubmit();
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const handleSelectProduct = (product) => {
        setShowDropdown(false);
        setQuery('');
        if (onSearchComplete) onSearchComplete();
        // Public Detail Page (assuming /product/:id or /catalog/:id)
        // Checking previous files, it seems /catalog/:id might be used or just Catalog with param
        // Let's check routes later. For now assuming /product/:id or similar.
        // Actually, looking at Navbar 'catalog?search=' pattern, maybe we stay in catalog?
        // But live search usually goes to details. 
        // Let's assume /catalog/:id based on standard ecommerce or just use the catalog logic.
        // Wait, I saw detailed cards earlier.
        // Let's assume navigate to `/product/${product.id}` if it exists, or just Catalog with specific ID?
        // Let's use the explicit product detail route if I can find one.
        // Navbar had `navigate(\`/catalog?search=${encodeURIComponent(searchQuery.trim())}\`)`
        // I'll stick to catalog search if clicked "See All", but for item click, maybe detail?
        // Let's stick to safe catalog navigation for now:
        // Actually best UX is direct product detail. I'll guess `/catalog/${product.id}` based on recent file list having `ProductDetail.jsx`
        navigate(`/catalog/${product.id}`);
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (query.trim()) {
            setShowDropdown(false);
            if (onSearchComplete) onSearchComplete();
            navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    };

    const HighlightText = ({ text, highlight }) => {
        if (!highlight.trim()) return <span>{text}</span>;
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? <span key={i} className="font-bold text-public-primary">{part}</span> : <span key={i}>{part}</span>
                )}
            </span>
        );
    };

    return (
        <div className={`relative ${className}`} ref={searchRef}>
            <form onSubmit={handleSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                    type="search"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && setShowDropdown(true)}
                    className="w-full pl-12 pr-10 py-3 bg-white/95 rounded-full text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-public-tertiary transition-all shadow-sm border border-transparent focus:border-public-tertiary"
                />
                {(query || searching) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        {searching ? (
                            <Loader className="w-4 h-4 animate-spin text-public-primary" />
                        ) : query && (
                            <button
                                type="button"
                                onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
                                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </form>

            {/* Dropdown Results */}
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                    <style>{`
                        @keyframes fadeInDown {
                            from { opacity: 0; transform: translateY(-10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-in-down {
                            animation: fadeInDown 0.2s ease-out forwards;
                        }
                    `}</style>

                    {results.length > 0 ? (
                        <>
                            <div className="max-h-[350px] overflow-y-auto py-2">
                                {results.map((product, index) => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`flex items-center gap-4 p-3 cursor-pointer transition-colors ${index === selectedIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            {product.images?.[0] ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <ShoppingBag className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    <HighlightText text={product.name} highlight={query} />
                                                </h4>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm font-bold text-public-accent">
                                                    ${parseFloat(product.retail_price || 0).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div
                                onClick={() => handleSubmit()}
                                className="p-3 bg-gray-50 border-t border-gray-100 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                                <span className="text-sm font-medium text-public-primary flex items-center justify-center gap-2">
                                    Ver todos los resultados ({results.length}+)
                                    <ExternalLink className="w-3 h-3" />
                                </span>
                            </div>
                        </>
                    ) : !searching && (
                        <div className="p-6 text-center text-gray-500">
                            <p className="text-sm">No encontramos productos para "{query}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
