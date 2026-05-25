import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    ClipboardList,
    Truck,
    Settings,
    LogOut,
    Bell,
    Sun,
    Moon
} from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

export function MiMercaderiaMobileMenu({ onLogout }) {
    const location = useLocation();
    const { isDark, toggleDarkMode } = useDarkMode();

    const menuItems = [
        { path: '/admin/mi-mercaderia', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/mi-mercaderia/boletas', icon: FileText, label: 'Boletas' },
        { path: '/admin/mi-mercaderia/resumen-boletas', icon: ClipboardList, label: 'Resumen de Boletas' },
        { path: '/admin/mi-mercaderia/calculo-transporte', icon: Truck, label: 'Cálculo Transporte' },
        { path: '/admin/mi-mercaderia/parametros-costos', icon: Settings, label: 'Parámetros Costos' },
    ];

    const isActive = (path) => {
        if (path === '/admin/mi-mercaderia' && location.pathname === '/admin/mi-mercaderia') return true;
        if (path !== '/admin/mi-mercaderia' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className={`flex flex-col h-full ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-background text-foreground'}`}>
            <header className="flex items-center justify-between p-6">
                <h1 className="text-2xl font-bold tracking-wider text-[#49EBBD]">MI MERCADERÍA</h1>
                <div className="flex items-center gap-4">
                    <button className="p-2 opacity-90 hover:text-[#49EBBD] transition-colors">
                        <Bell className="w-6 h-6" />
                    </button>
                    <button onClick={toggleDarkMode} className="p-2 opacity-90 hover:text-[#49EBBD] transition-colors">
                        {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-4 px-6 py-4 rounded-lg transition-all duration-200 min-h-[56px] ${active
                                ? 'bg-[#49EBBD] text-black shadow-lg shadow-[#49EBBD]/20 scale-[1.02] font-bold'
                                : 'bg-transparent border border-white/10 hover:bg-white/5 text-gray-400'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 ${active ? 'opacity-100' : 'opacity-90'}`} />
                            <span className="text-lg">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <Link
                    to="/admin/dashboard"
                    className="flex items-center gap-4 px-6 py-4 rounded-lg hover:bg-white/5 transition-colors mb-2"
                >
                    <LogOut className="w-6 h-6 opacity-90" />
                    <span className="text-lg font-medium text-gray-400">Volver al Admin</span>
                </Link>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-4 px-6 py-4 w-full rounded-lg hover:bg-white/5 transition-colors text-red-400 hover:text-red-300"
                >
                    <LogOut className="w-6 h-6 opacity-90" />
                    <span className="text-lg font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}
