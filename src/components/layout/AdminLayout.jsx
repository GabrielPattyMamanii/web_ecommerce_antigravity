import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Heart, Folder, Settings, Bell, Mail, LogOut,
    CircleDollarSign, Layers, Tag, Store, ExternalLink, Moon, Sun,
    Calculator, ShoppingCart, Users, ClipboardList, Ticket, HandCoins,
    ScanLine, History, Building2, UserCog, Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BuscadorProductos } from '../mercancia/BuscadorProductos';
import { useDarkMode } from '../../hooks/useDarkMode';
import { AdminMobileMenu } from './AdminMobileMenu';
import { MercanciaLoginModal } from '../mercancia/MercanciaLoginModal';
import { useAdminPermissions } from '../../context/AdminPermissionsContext';
import { useGlobalScanner } from '../../hooks/useGlobalScanner';

// Mapa de path-prefix → section key para el guard de rutas.
// /admin/dashboard NO está aquí: siempre es accesible para cualquier usuario autenticado.
const PATH_SECTION_MAP = [
    ['/admin/settings',                'settings'],
    ['/admin/cuentas-bancarias',       'cuentas-bancarias'],
    ['/admin/entrega-dinero',          'entrega-dinero'],
    ['/admin/ventas/historial',        'ventas-historial'],
    ['/admin/ventas',                  'ventas'],
    ['/admin/posibles-compras',        'posibles-compras'],
    ['/admin/calculo-precios',         'calculo-precios'],
    ['/admin/usuarios',                'usuarios'],
    ['/admin/precio-venta-sugerido',   'precio-venta-sugerido'],
    ['/admin/control-mercancia',       'control-mercancia'],
    ['/admin/mercancia',               'mercancia'],
    ['/admin/debts',                   'debts'],
    ['/admin/senas',                   'senas'],
    ['/admin/coupons',                 'coupons'],
    ['/admin/categories',              'categories'],
    ['/admin/products',                'products'],
];

export function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDark, toggleDarkMode } = useDarkMode();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isMercanciaLoginOpen, setIsMercanciaLoginOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { isAdmin, can, loading: permLoading } = useAdminPermissions();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

useEffect(() => {
        if (location.pathname === '/admin' || location.pathname === '/admin/') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [location.pathname, navigate]);

    // Guard de rutas: redirige al dashboard si el usuario no tiene permiso para la ruta actual
    useEffect(() => {
        if (permLoading) return;
        const entry = PATH_SECTION_MAP.find(([path]) => location.pathname.startsWith(path));
        if (entry) {
            const [, section] = entry;
            if (!can(section)) navigate('/admin/dashboard', { replace: true });
        }
    }, [location.pathname, permLoading, can]);

    // Scanner global mobile: al escanear desde cualquier sección navega a Registrar Venta
    useGlobalScanner(useCallback((code, codigoFallback) => {
        if (!isMobile) return;
        if (location.pathname.startsWith('/admin/ventas')) return;
        const params = new URLSearchParams({ scan: code });
        if (codigoFallback) params.set('c', codigoFallback);
        navigate(`/admin/ventas?${params.toString()}`);
    }, [isMobile, location.pathname, navigate]));

const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleLogout = async () => {
        if (sessionStorage.getItem('app_user_id')) {
            sessionStorage.removeItem('app_user_id');
            sessionStorage.removeItem('app_username');
            sessionStorage.removeItem('app_user_permissions');
        } else {
            await supabase.auth.signOut();
        }
        navigate('/admin/login');
    };

    const handleMercanciaLogin = (credentials) => {
        console.log('Login credentials:', credentials);
        setIsMercanciaLoginOpen(false);
        navigate('/admin/mi-mercaderia');
    };

    // Todos los ítems del menú con su section key
    const ALL_MENU_ITEMS = [
        { to: '/admin/dashboard',              icon: LayoutDashboard,  label: 'Dashboard',              section: 'dashboard' },
        { to: '/admin/products',               icon: Heart,            label: 'Productos',               section: 'products' },
        { to: '/admin/categories',             icon: Folder,           label: 'Categorías',             section: 'categories' },
        { to: '/admin/coupons',                icon: Ticket,           label: 'Cupones',                section: 'coupons' },
        { to: '/admin/senas',                  icon: HandCoins,        label: 'Señas',                  section: 'senas' },
        { to: '/admin/debts',                  icon: CircleDollarSign, label: 'Deudas',                 section: 'debts' },
        { to: '/admin/mercancia',              icon: Layers,           label: 'Mercancía',              section: 'mercancia' },
        { to: '/admin/control-mercancia',      icon: ClipboardList,    label: 'Control de Mercancía',   section: 'control-mercancia' },
        { to: '/admin/precio-venta-sugerido',  icon: Tag,              label: 'Precio Venta Sugerido',  section: 'precio-venta-sugerido' },
        { to: '/admin/usuarios',               icon: Users,            label: 'Usuarios',               section: 'usuarios' },
        // { to: '/admin/calculo-precios',        icon: Calculator,       label: 'Cálculo de Precios',     section: 'calculo-precios' },
        // { to: '/admin/posibles-compras',       icon: ShoppingCart,     label: 'Posibles Compras',       section: 'posibles-compras' },
        { to: '/admin/ventas',                 icon: ScanLine,         label: 'Registrar Venta',        section: 'ventas', exact: true },
        { to: '/admin/ventas/historial',       icon: History,          label: 'Historial Ventas',       section: 'ventas-historial' },
        { to: '/admin/cuentas-bancarias',      icon: Building2,        label: 'Cuentas Bancarias',      section: 'cuentas-bancarias' },
        { to: '/admin/entrega-dinero',         icon: Wallet,           label: 'Entrega Dinero',         section: 'entrega-dinero' },
        { to: '/admin/settings',               icon: Settings,         label: 'Configuración',               section: 'settings' },
    ];

    const visibleItems = ALL_MENU_ITEMS.filter(item => {
        if (item.adminOnly) return isAdmin;
        if (item.section === 'dashboard') return true; // siempre visible
        return can(item.section);
    });

    // VISTA MÓVIL
    if (isMobile) {
        return (
            <>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsMobileMenuOpen(false)} />
                )}

                <AdminMobileMenu
                    isOpen={isMobileMenuOpen}
                    menuItems={visibleItems}
                    onLogout={handleLogout}
                    onCloseMenu={() => setIsMobileMenuOpen(false)}
                />

                <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
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
                            <span className="font-bold tracking-tight text-gray-900 text-sm uppercase">DASHBOARD</span>
                        </div>
                        <div className="flex items-center gap-2">
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

    // VISTA DESKTOP
    return (
        <div className="flex h-screen bg-background font-sans">
            <aside className="admin-sidebar-nav w-64 bg-sidebar text-sidebar-foreground flex flex-col justify-between border-r border-sidebar-border overflow-y-auto px-4 py-5">
                <div>
                    <div className="flex items-center gap-3 px-2 pb-5 mb-2 border-b border-sidebar-border">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                            <Layers className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <span className="text-lg font-extrabold tracking-tight text-sidebar-foreground">DASHBOARD</span>
                    </div>

                    <nav className="space-y-1 text-sm font-medium">
                        {visibleItems.map((item) => {
                            const active = isActive(item.to, item.exact);
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ${
                                        active
                                            ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                                    }`}
                                >
                                    <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-sidebar-foreground/40'}`} strokeWidth={1.75} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="pt-6 mt-6 border-t border-sidebar-border">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                        <LogOut className="h-5 w-5 text-sidebar-foreground/40" strokeWidth={1.75} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden bg-background">
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
