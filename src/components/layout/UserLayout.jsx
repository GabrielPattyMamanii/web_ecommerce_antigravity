import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    ClipboardList,
    Truck,
    Sun,
    Moon,
} from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';
import { supabase } from '../../lib/supabase';

const ALL_NAV_ITEMS = [
    { path: '/dashboard',                 icon: LayoutDashboard, label: 'Dashboard',          section: null },
    { path: '/dashboard/carga-boletas',   icon: FileText,        label: 'Cargar Boletas',     section: null },
    { path: '/dashboard/resumen',         icon: ClipboardList,   label: 'Resumen',            section: null },
    { path: '/dashboard/calculo',         icon: Truck,           label: 'Cálculo Transporte', section: null },
];

export function UserLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDark, toggleDarkMode } = useDarkMode();
    const { mercanciaUser } = useMercanciaUser();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [appUser, setAppUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState(null); // null = cargando

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const username = sessionStorage.getItem('app_username');
        const rawPerms = sessionStorage.getItem('app_user_permissions');
        setAppUser(username);
        try {
            setUserPermissions(rawPerms ? JSON.parse(rawPerms) : []);
        } catch {
            setUserPermissions([]);
        }
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        sessionStorage.clear();
        navigate('/admin/usuarios');
    };

    const isActive = (path) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    };

    // section === null → siempre visible (Dashboard); sino verifica permisos
    const navItems = ALL_NAV_ITEMS.filter(item =>
        item.section === null || (userPermissions ?? []).includes(item.section)
    );

    // Mobile View
    if (isMobile) {
        return (
            <div className={`flex flex-col min-h-screen ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-background text-foreground'}`}>
                <header className={`h-16 flex items-center px-4 gap-4 sticky top-0 z-50 ${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900 border-b'}`}>
                    <h1 className="text-lg font-bold uppercase tracking-wide truncate">
                        Panel Usuario
                    </h1>
                </header>
                <main className="flex-1 p-4 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        );
    }

    // Desktop View
    return (
        <div className={`flex h-screen font-sans ${isDark ? 'dark' : ''}`}>
            {/* Sidebar */}
            <aside className={`w-64 flex flex-col border-r shadow-lg transition-colors duration-300
                ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-sidebar text-sidebar-foreground border-sidebar-border'}`}
            >
                <div className="p-6">
                    <h1 className="text-2xl font-bold tracking-wider text-[#49EBBD]">
                        PANEL USUARIO
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 
                                ${isActive(item.path)
                                    ? 'bg-[#49EBBD] text-black font-bold shadow-lg shadow-[#49EBBD]/20'
                                    : isDark
                                        ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Logout button removed as per user request */}
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#0f0f0f]' : 'bg-background'}`}>
                {/* Header */}
                <header className={`h-20 border-b flex items-center justify-between px-8 shadow-sm
                    ${isDark ? 'bg-[#1a1a1a] border-gray-800 text-white' : 'bg-card border-border'}`}
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-muted hover:bg-accent'}`}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                            {appUser || mercanciaUser?.email || 'Usuario'}
                        </span>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                            ${isDark ? 'bg-[#49EBBD] text-black' : 'bg-primary text-primary-foreground'}`}
                        >
                            {(appUser?.[0] || mercanciaUser?.email?.[0] || 'U').toUpperCase()}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
