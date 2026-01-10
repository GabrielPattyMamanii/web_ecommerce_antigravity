import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, User, ChevronDown } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { Button } from '../ui/Button';

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const cartItemsCount = useCartStore((state) => state.totalItems());

    return (
        <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 md:px-16">
                <div className="flex h-20 items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center">
                        <span className="text-2xl md:text-3xl font-bold">SHOP.CO</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-6">
                        <div className="relative group">
                            <button className="flex items-center gap-1 text-base font-normal hover:text-gray-600 transition-colors">
                                Tienda
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                        <Link to="/catalog" className="text-base font-normal hover:text-gray-600 transition-colors">
                            En Oferta
                        </Link>
                        <Link to="/catalog" className="text-base font-normal hover:text-gray-600 transition-colors">
                            Nuevos Ingresos
                        </Link>
                        <Link to="/catalog" className="text-base font-normal hover:text-gray-600 transition-colors">
                            Marcas
                        </Link>
                    </div>

                    {/* Search Bar - Desktop */}
                    <div className="hidden lg:flex relative flex-1 max-w-xl mx-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                        />
                    </div>

                    {/* Icons */}
                    <div className="flex items-center gap-3">
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

                        {/* Mobile Menu Toggle */}
                        <button
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden border-t border-gray-200 bg-white">
                    <div className="container mx-auto px-4 py-4">
                        {/* Mobile Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Buscar productos..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>

                        {/* Mobile Links */}
                        <div className="flex flex-col space-y-4">
                            <Link
                                to="/catalog"
                                className="text-base font-normal hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Tienda
                            </Link>
                            <Link
                                to="/catalog"
                                className="text-base font-normal hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                En Oferta
                            </Link>
                            <Link
                                to="/catalog"
                                className="text-base font-normal hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Nuevos Ingresos
                            </Link>
                            <Link
                                to="/catalog"
                                className="text-base font-normal hover:text-gray-600 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Marcas
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
