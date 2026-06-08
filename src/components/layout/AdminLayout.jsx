import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useGlobalScanner } from '../../hooks/useGlobalScanner';
import { LayoutDashboard, Heart, Folder, Settings, Bell, Mail, LogOut, CircleDollarSign, Layers, Tag, Store, ExternalLink, Moon, Sun, Calculator, Archive, ShoppingCart, Users, ClipboardList, Ticket, HandCoins, ScanLine, History, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BuscadorProductos } from '../mercancia/BuscadorProductos';
import { useDarkMode } from '../../hooks/useDarkMode';
import { AdminMobileMenu } from './AdminMobileMenu';
import { MercanciaLoginModal } from '../mercancia/MercanciaLoginModal';

export function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDark, toggleDarkMode } = useDarkMode();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isMercanciaLoginOpen, setIsMercanciaLoginOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const mobileScanInputRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cierra el menú móvil cuando cambia la ruta
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // En mobile, auto-enfoca el input del scanner al entrar a la página de ventas
    useEffect(() => {
        if (isMobile && location.pathname === '/admin/ventas') {
            const t = setTimeout(() => mobileScanInputRef.current?.focus(), 150);
            return () => clearTimeout(t);
        }
    }, [isMobile, location.pathname]);

    // Redirigir a dashboard tanto en mobile como en desktop si está en la raíz de admin
    useEffect(() => {
        if (location.pathname === '/admin' || location.pathname === '/admin/') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [location.pathname, navigate]);

    const handleGlobalScan = useCallback((code, codigoFallback) => {
        if (location.pathname === '/admin/ventas') {
            window.dispatchEvent(new CustomEvent('scanner:code', { detail: { code, codigoFallback } }));
        } else {
            const params = new URLSearchParams({ scan: code });
            if (codigoFallback) params.set('c', codigoFallback);
            navigate(`/admin/ventas?${params.toString()}`);
        }
        // Re-enfoca el input en mobile para que el siguiente scan también funcione
        if (isMobile) {
            setTimeout(() => mobileScanInputRef.current?.focus(), 300);
        }
    }, [location.pathname, navigate, isMobile]);

    useGlobalScanner(handleGlobalScan);

    const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const handleMercanciaLogin = (credentials) => {
        console.log('Login credentials:', credentials);
        // Aquí iría la lógica de autenticación real
        setIsMercanciaLoginOpen(false);
        navigate('/admin/mi-mercaderia');
    };

    const getPageTitle = (pathname) => {
        if (pathname.includes('/dashboard')) return 'Dashboard';
        if (pathname.includes('/products')) return 'Products';
        if (pathname.includes('/categories')) return 'Categories';
        if (pathname.includes('/coupons')) return 'Cupones';
        if (pathname.includes('/senas')) return 'Señas';
        if (pathname.includes('/debts')) return 'Deudas';
        if (pathname.includes('/control-mercancia')) return 'Control de Mercancía';
        if (pathname.includes('/mercancia')) return 'Mercancía';
        if (pathname.includes('/mi-mercaderia')) return 'Mi Mercadería';
        if (pathname.includes('/calculo-costos')) return 'Cálculo de Costos';
        if (pathname.includes('/calculo-precios')) return 'Cálculo de Precios';
        if (pathname.includes('/precio-venta-sugerido')) return 'Precio Venta Sugerido';
        if (pathname.includes('/posibles-compras')) return 'Posibles Compras';
        if (pathname.includes('/settings')) return 'Settings';
        if (pathname.includes('/ventas/historial')) return 'Historial de Ventas';
        if (pathname.includes('/ventas')) return 'Registrar Venta';
        return 'Admin';
    };

    // VISTA MÓVIL
    if (isMobile) {
        return (
            <>
                {/* Overlay oscuro al abrir el menú */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar deslizante — admin-hamburguesa, el transform está en el aside directamente */}
                <AdminMobileMenu
                    isOpen={isMobileMenuOpen}
                    onLogout={handleLogout}
                    onCloseMenu={() => setIsMobileMenuOpen(false)}
                />

                {/* Layout principal */}
                <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
                    {/* Mobile Top Header — menu-admin-mobile de Stitch */}
                    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                aria-label="Abrir Menú"
                                className="p-2 rounded-md hover:bg-gray-100 focus:outline-none"
                            >
                                <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <span className="font-bold tracking-tight text-gray-900 text-sm uppercase">
                                DASHBOARD
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Botón scanner mobile — tápalo para activar el lector físico */}
                            <button
                                onClick={() => mobileScanInputRef.current?.focus()}
                                aria-label="Activar scanner"
                                className={`p-2 rounded-md transition-colors ${scannerActive ? 'text-green-500 bg-green-50' : 'text-gray-500 hover:text-[#D13180]'}`}
                            >
                                <ScanLine className="h-5 w-5" />
                            </button>
                            {/* Input oculto que recibe los eventos del scanner Bluetooth en mobile */}
                            <input
                                ref={mobileScanInputRef}
                                type="text"
                                inputMode="none"
                                readOnly
                                data-scanner
                                tabIndex={-1}
                                onFocus={() => setScannerActive(true)}
                                onBlur={() => setScannerActive(false)}
                                className="sr-only"
                                aria-hidden="true"
                            />
                            <button
                                onClick={toggleDarkMode}
                                aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                className="p-2 text-gray-500 hover:text-[#D13180] transition-colors"
                            >
                                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={() => window.open('/', '_blank')}
                                className="bg-[#D13180] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-[#b52a6e] transition-colors"
                            >
                                <span>Ver Tienda</span>
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </button>
                        </div>
                    </header>

                    <MercanciaLoginModal
                        isOpen={isMercanciaLoginOpen}
                        onClose={() => setIsMercanciaLoginOpen(false)}
                        onLogin={handleMercanciaLogin}
                    />

                    <main className="flex-1 overflow-y-auto w-full">
                        <Outlet />
                    </main>
                </div>
            </>
        );
    }


    // VISTA DESKTOP (SideBar permanente)
    return (
        <div className="flex h-screen bg-background font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-lg">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-sidebar-primary-foreground tracking-wider">DASHBOARD</h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto">
                    {[
                        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { to: '/admin/products', icon: Heart, label: 'Products' },
                        { to: '/admin/categories', icon: Folder, label: 'Categories' },
                        { to: '/admin/coupons', icon: Ticket, label: 'Cupones' },
                        { to: '/admin/senas', icon: HandCoins, label: 'Señas' },
                        { to: '/admin/debts', icon: CircleDollarSign, label: 'Deudas' },
                        { to: '/admin/mercancia', icon: Layers, label: 'Mercancía' },
                        { to: '/admin/control-mercancia', icon: ClipboardList, label: 'Control de Mercancía' },
                        { to: '/admin/precio-venta-sugerido', icon: Tag, label: 'Precio Venta Sugerido' },
                        { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
                        /*{ to: '/admin/calculo-costos', icon: CircleDollarSign, label: 'Cálculo de Costos' }*/,
                        { to: '/admin/calculo-precios', icon: Calculator, label: 'Cálculo de Precios' },
                        { to: '/admin/posibles-compras', icon: ShoppingCart, label: 'Posibles Compras' },
                        { to: '/admin/ventas', icon: ScanLine, label: 'Registrar Venta', exact: true },
                        { to: '/admin/ventas/historial', icon: History, label: 'Historial Ventas' },
                        { to: '/admin/cuentas-bancarias', icon: Building2, label: 'Cuentas Bancarias' },
                        { to: '/admin/settings', icon: Settings, label: 'Settings' },
                    ].map((item, index) => {
                        if (item.action) {
                            return (
                                <button
                                    key={index}
                                    onClick={item.action}
                                    className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 ${item.isActive
                                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 font-semibold'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        }
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.to, item.exact)
                                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 font-semibold'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
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
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Header Desktop */}
                <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-lg bg-muted hover:bg-accent text-foreground transition-colors"
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Mail className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => window.open('/', '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md mx-4 font-medium"
                    >
                        <Store className="h-5 w-5" />
                        <span>Ver Tienda</span>
                        <ExternalLink className="h-4 w-4" />
                    </button>

                    <div className="w-96">
                        <BuscadorProductos />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                    <MercanciaLoginModal
                        isOpen={isMercanciaLoginOpen}
                        onClose={() => setIsMercanciaLoginOpen(false)}
                        onLogin={handleMercanciaLogin}
                    />
                </main>
            </div>
        </div>
    );
}
