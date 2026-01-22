import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Heart, Folder, Settings, Search, Bell, Mail, User, LogOut, CircleDollarSign, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BuscadorProductos } from '../mercancia/BuscadorProductos';

export function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/admin/products?search=${encodeURIComponent(searchTerm)}`);
        }
    };

    return (
        <div className="flex h-screen bg-background font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-sidebar-primary-foreground tracking-wider">DASHBOARD</h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-8">
                    <Link
                        to="/admin/dashboard"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/dashboard')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link
                        to="/admin/products"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/products')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <Heart className="w-5 h-5" />
                        <span className="font-medium">Products</span>
                    </Link>
                    <Link
                        to="/admin/categories"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/categories')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <Folder className="w-5 h-5" />
                        <span className="font-medium">Categories</span>
                    </Link>
                    <Link
                        to="/admin/debts"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/debts')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <CircleDollarSign className="w-5 h-5" />
                        <span className="font-medium">Deudas</span>
                    </Link>
                    <Link
                        to="/admin/mercancia"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/mercancia')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <Layers className="w-5 h-5" />
                        <span className="font-medium">Mercancía</span>
                    </Link>
                    <Link
                        to="/admin/calculo-costos"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/calculo-costos')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <CircleDollarSign className="w-5 h-5" />
                        <span className="font-medium">Cálculo de Costos</span>
                    </Link>
                    <Link
                        to="/admin/settings"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/settings')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-sidebar-border">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F0F4F8]">
                {/* Header */}
                <header className="h-20 bg-white border-b flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full bg-sidebar text-white">
                            <User className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-500 hover:text-primary">
                            <Bell className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-500 hover:text-primary">
                            <Mail className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="w-96">
                        <BuscadorProductos />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
