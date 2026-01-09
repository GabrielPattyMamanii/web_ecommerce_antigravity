import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, User } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { usePriceStore } from '../../context/priceStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cartItemsCount = useCartStore((state) => state.totalItems());
    const { isWholesale, toggleMode } = usePriceStore();

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold">E-Shop</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
                            Inicio
                        </Link>
                        <Link to="/catalog" className="text-sm font-medium transition-colors hover:text-primary">
                            Catálogo
                        </Link>
                        <Link to="/contact" className="text-sm font-medium transition-colors hover:text-primary">
                            Contacto
                        </Link>
                    </div>

                    {/* Search & Cart & Mobile Menu */}
                    <div className="flex items-center space-x-4">
                        <Toggle
                            checked={isWholesale}
                            onCheckedChange={toggleMode}
                            labelLeft="Minorista"
                            labelRight="Mayorista"
                        />

                        <div className="hidden md:flex relative w-full max-w-sm items-center">
                            <Input type="search" placeholder="Buscar..." className="w-[200px] lg:w-[300px]" />
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>

                        <Link to="/admin/login">
                            <Button variant="ghost" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>

                        <Link to="/cart">
                            <Button variant="ghost" size="icon" className="relative">
                                <ShoppingCart className="h-5 w-5" />
                                {cartItemsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                        {cartItemsCount}
                                    </span>
                                )}
                            </Button>
                        </Link>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t p-4">
                    <div className="flex flex-col space-y-4">
                        <Link to="/" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                            Inicio
                        </Link>
                        <Link to="/catalog" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                            Catálogo
                        </Link>
                        <Link to="/contact" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                            Contacto
                        </Link>
                        <div className="relative">
                            <Input type="search" placeholder="Buscar..." className="w-full" />
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
