import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, User, ChevronRight, ChevronDown } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { supabase } from '../../lib/supabase';
import { ClientSearchBar } from '../public/ClientSearchBar';

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [liveEnabled, setLiveEnabled] = useState(true);
    const cartItemsCount = useCartStore((state) => state.totalItems());
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchCategories();
        fetchLiveFlag();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data } = await supabase.from('categories').select('*');
            if (data) setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchLiveFlag = async () => {
        try {
            const { data } = await supabase.from('site_config').select('live_products_enabled').single();
            setLiveEnabled(data?.live_products_enabled ?? true);
        } catch (error) {
            console.error('Error fetching live flag:', error);
        }
    };

    const handleCategoryClick = (categoryName) => {
        navigate(`/catalog?category=${encodeURIComponent(categoryName)}`);
        setIsMenuOpen(false);
    };

    const navLinkClass = (path) => {
        const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
        return `font-nunito font-bold tracking-tight pb-1 transition-all duration-300 border-b-2 ${isActive
            ? 'text-public-primary border-public-primary'
            : 'text-on-surface-variant hover:text-on-surface hover:opacity-80 border-transparent'
            }`;
    };

    const isLiveActive = location.pathname.startsWith('/live');

    return (
        <>
            <nav className="docked full-width bg-surface/90 backdrop-blur-xl shadow-sm border-b border-outline-variant/20 transition-all">
                <div className="flex justify-between items-center w-full px-4 md:px-8 py-3 md:py-4 max-w-[1440px] mx-auto">
                    
                    {/* 1. MOBILE LEFT: Hamburger & Search */}
                    <div className="flex items-center lg:hidden flex-1 justify-start gap-1">
                        <button
                            className="p-2 -ml-2 text-public-secondary bg-black/5 hover:bg-black/10 rounded-full transition-colors active:scale-95"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <button
                            className="p-2 text-public-primary hover:bg-black/5 rounded-full transition-colors active:scale-95"
                            onClick={() => setIsMenuOpen(true)}
                            aria-label="Search"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 2. CENTER/LEFT: Logo & Desktop Links */}
                    <div className="flex items-center lg:gap-12 flex-1 lg:flex-none justify-center lg:justify-start">
                        {/* Logo Area */}
                        <Link to="/" className="flex flex-col items-center justify-center">
                            <img src="/logo-luriel.png" alt="Luriel Importados Logo" className="h-[45px] md:h-[60px] lg:h-[80px] w-auto object-contain hover:scale-105 transition-transform" />
                        </Link>

                        {/* Desktop Navigation Links */}
                        <div className="hidden lg:flex gap-8 items-center">
                            <Link to="/" className={navLinkClass('/')}>Inicio</Link>
                            <Link to="/catalog" className={navLinkClass('/catalog')}>Catálogo</Link>
                            <Link to="/contact" className={navLinkClass('/contact')}>Contacto</Link>
                            <Link to="/how-to-buy" className={navLinkClass('/how-to-buy')}>
                                Cómo Comprar
                            </Link>
                            {liveEnabled && (
                                <Link
                                    to="/live"
                                    className={`flex items-center gap-2 font-nunito font-bold tracking-tight pb-1 transition-all duration-300 border-b-2 ${isLiveActive
                                        ? 'text-live-red border-live-red'
                                        : 'text-live-red/80 hover:text-live-red border-transparent'
                                        }`}
                                >
                                    <span className="live-nav-dot" aria-hidden="true" />
                                    Productos en Live
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* 3. RIGHT: Search (Desktop), Cart, User */}
                    <div className="flex items-center justify-end flex-1 gap-2 lg:gap-6">
                        {/* Desktop Search Bar */}
                        <div className="hidden lg:block w-64 transition-all duration-300">
                            <ClientSearchBar />
                        </div>

                        {/* User Login */}
                        <Link to="/admin/login" className="p-2 text-public-primary active:scale-95 duration-200 transition-transform hover:bg-black/5 rounded-full">
                            <User className="w-6 h-6" />
                        </Link>

                        {/* Cart */}
                        <Link to="/cart" className="relative p-2 text-public-primary active:scale-95 duration-200 transition-transform hover:bg-black/5 rounded-full">
                            <ShoppingCart className="w-6 h-6" />
                            {cartItemsCount > 0 && (
                                <span className="absolute top-0 right-0 lg:-top-1 lg:-right-1 flex h-5 w-5 items-center justify-center rounded-full bg-public-tertiary text-on-surface shadow-md text-[10px] font-bold ring-2 ring-surface">
                                    {cartItemsCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Mobile Drawer Menu */}
            {isMenuOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-on-surface/50 z-40 lg:hidden backdrop-blur-sm"
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="fixed top-0 left-0 h-full w-80 bg-surface z-[120] shadow-2xl overflow-y-auto lg:hidden animate-slide-in">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-4 border-b border-outline-variant/20">
                            <img src="/logo-luriel.png" alt="Luriel Importados Logo" className="h-[40px] w-auto object-contain" />
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors text-on-surface-variant"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Search in Drawer */}
                        <div className="p-4 border-b border-outline-variant/20">
                            <ClientSearchBar onSearchComplete={() => setIsMenuOpen(false)} />
                        </div>

                        {/* Main Links */}
                        <div className="p-4 border-b border-outline-variant/20 flex flex-col gap-2">
                            <Link to="/" className="flex items-center justify-between py-3 text-base font-bold text-on-surface hover:text-public-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                                Inicio
                                <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                            </Link>
                            <Link to="/catalog" className="flex items-center justify-between py-3 text-base font-bold text-on-surface hover:text-public-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                                Catálogo
                                <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                            </Link>
                            <Link to="/contact" className="flex items-center justify-between py-3 text-base font-bold text-on-surface hover:text-public-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                                Contacto
                                <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                            </Link>
                            <Link to="/how-to-buy" className="flex items-center justify-between py-3 text-base font-bold text-on-surface hover:text-public-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                                Cómo Comprar
                                <ChevronRight className="w-5 h-5 text-on-surface-variant" />
                            </Link>
                            {liveEnabled && (
                                <Link to="/live" className="flex items-center justify-between py-3 text-base font-bold text-live-red transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <span className="flex items-center gap-2">
                                        <span className="live-nav-dot" aria-hidden="true" />
                                        Productos en Live
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-live-red/50" />
                                </Link>
                            )}
                        </div>

                        {/* Categories */}
                        <div className="p-4">
                            <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">
                                Categorías
                            </h3>
                            <div className="space-y-1">
                                {categories.filter(c => !c.parent_id).map((category) => {
                                    const subs = categories.filter(sub => sub.parent_id === category.id);
                                    const hasSubs = subs.length > 0;
                                    const isExpanded = !!expandedCategories[category.id];

                                    return (
                                        <div key={category.id} className="flex flex-col">
                                            <button
                                                onClick={() => {
                                                    if (hasSubs) {
                                                        setExpandedCategories(prev => ({
                                                            ...prev,
                                                            [category.id]: !prev[category.id]
                                                        }));
                                                    } else {
                                                        handleCategoryClick(category.name);
                                                    }
                                                }}
                                                className={`flex items-center justify-between w-full py-3 text-base font-semibold transition-colors rounded-xl px-3 ${isExpanded ? 'text-public-primary bg-public-primary/5' : 'text-on-surface hover:bg-black/5'}`}
                                            >
                                                {category.name}
                                                {hasSubs ? (
                                                    isExpanded ? 
                                                        <ChevronDown className="w-5 h-5 text-public-primary opacity-80" /> : 
                                                        <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-50" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-50" />
                                                )}
                                            </button>
                                            
                                            {/* Subcategories Dropdown */}
                                            {hasSubs && isExpanded && (
                                                <div className="pl-6 pr-2 py-2 space-y-1 bg-black/5 rounded-b-xl -mt-2 pt-3 mb-2 animate-in slide-in-from-top-2 duration-200">
                                                    <button
                                                        onClick={() => handleCategoryClick(category.name)}
                                                        className="w-full text-left py-2 px-3 text-sm font-bold text-public-primary hover:bg-white/50 rounded-lg transition-colors border-b border-black/5"
                                                    >
                                                        Ver todo en {category.name}
                                                    </button>
                                                    {subs.map(sub => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => handleCategoryClick(sub.name)}
                                                            className="flex items-center justify-between w-full py-2 px-3 text-sm font-medium text-on-surface hover:bg-white/50 rounded-lg transition-colors"
                                                        >
                                                            {sub.name}
                                                            <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-30" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                @keyframes slide-in {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .live-nav-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ff2d55;
                    flex-shrink: 0;
                    box-shadow: 0 0 0 0 rgba(255, 45, 85, 0.6);
                    animation: live-nav-pulse 1.8s ease-out infinite;
                }
                @keyframes live-nav-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 45, 85, 0.55); }
                    70% { box-shadow: 0 0 0 6px rgba(255, 45, 85, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 45, 85, 0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .live-nav-dot {
                        animation: none;
                    }
                }
            `}</style>
        </>
    );
}
