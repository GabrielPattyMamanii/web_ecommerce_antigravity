import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, User, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { supabase } from '../../lib/supabase';

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState([]);
    const cartItemsCount = useCartStore((state) => state.totalItems());
    const navigate = useNavigate();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data } = await supabase.from('categories').select('*');
            if (data) {
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
            setIsMenuOpen(false);
        }
    };

    const handleCategoryClick = (categoryName) => {
        navigate(`/catalog?category=${encodeURIComponent(categoryName)}`);
        setIsMenuOpen(false);
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 md:px-16">
                <div className="flex h-16 lg:h-20 items-center justify-between">
                    {/* Mobile: Hamburger (left) */}
                    <button
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Logo - Centered on mobile, left on desktop */}
                    <Link to="/" className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0">
                        <span className="text-2xl md:text-3xl font-bold">SHOP.CO</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-6">
                        <Link to="/" className="text-base font-normal hover:text-gray-600 transition-colors">
                            Inicio
                        </Link>
                        <Link to="/catalog" className="text-base font-normal hover:text-gray-600 transition-colors">
                            Catálogo
                        </Link>
                        <Link to="/contact" className="text-base font-normal hover:text-gray-600 transition-colors">
                            Contacto
                        </Link>
                    </div>

                    {/* Search Bar - Desktop Only */}
                    <form onSubmit={handleSearch} className="hidden lg:flex relative flex-1 max-w-xl mx-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                        />
                    </form>

                    {/* Icons - Right side */}
                    <div className="flex items-center gap-2 lg:gap-3">
                        {/* Search Icon - Mobile */}
                        <button className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Search className="w-5 h-5" />
                        </button>

                        {/* Cart */}
                        <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ShoppingCart className="w-5 h-5" />
                            {cartItemsCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-xs font-medium">
                                    {cartItemsCount}
                                </span>
                            )}
                        </Link>

                        {/* User */}
                        <Link to="/admin/login" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <User className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer Menu */}
            {isMenuOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="fixed top-0 left-0 h-full w-80 bg-white z-50 shadow-2xl overflow-y-auto lg:hidden animate-slide-in">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <span className="text-xl font-bold">Menú</span>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Search in Drawer */}
                        <div className="p-4 border-b border-gray-200">
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="search"
                                    placeholder="Buscar productos..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                                />
                            </form>
                        </div>

                        {/* Main Links */}
                        <div className="p-4 border-b border-gray-200">
                            <Link
                                to="/"
                                className="flex items-center justify-between py-3 text-base font-medium hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Inicio
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/catalog"
                                className="flex items-center justify-between py-3 text-base font-medium hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Catálogo
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/contact"
                                className="flex items-center justify-between py-3 text-base font-medium hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Contacto
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>

                        {/* Categories */}
                        <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Categorías
                            </h3>
                            <div className="space-y-1">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryClick(category.name)}
                                        className="flex items-center justify-between w-full py-3 text-base hover:bg-gray-50 rounded-lg px-2 transition-colors"
                                    >
                                        {category.name}
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add animation styles */}
            <style jsx>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </nav>
    );
}
