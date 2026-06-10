import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';

// menuItems viene filtrado desde AdminLayout según los permisos del usuario
export function AdminMobileMenu({ isOpen, menuItems = [], onLogout, onCloseMenu }) {
    const location = useLocation();

    const isActive = (path, exact = false) => {
        if (location.pathname === '/admin' && path === '/admin/dashboard') return true;
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <aside
            className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#D13180] rounded-md flex items-center justify-center text-white font-bold text-sm select-none">
                        D
                    </div>
                    <span className="font-bold tracking-tight text-gray-900">DASHBOARD</span>
                </div>
                <button
                    onClick={onCloseMenu}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Cerrar menú"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {menuItems.map((item) => {
                        const active = isActive(item.to, item.exact);
                        return (
                            <li key={item.to}>
                                <Link
                                    to={item.to}
                                    onClick={onCloseMenu}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                                        active
                                            ? 'bg-[#D13180] text-white shadow-md shadow-[#D13180]/20'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <button
                    onClick={() => { onLogout(); onCloseMenu(); }}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
