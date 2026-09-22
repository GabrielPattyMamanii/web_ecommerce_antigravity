import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X, ShoppingBag, Plus, LayoutGrid, List, Package, Eye, AlertTriangle, PackageX, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SearchBar from '../../components/admin/products/SearchBar';
import FiltersPanel from '../../components/admin/products/FiltersPanel';
import ProductsTable from '../../components/admin/products/ProductsTable';
import ProductsGrid from '../../components/admin/products/ProductsGrid';
import Pagination from '../../components/admin/products/Pagination';
import Toast from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

const SORT_OPTIONS = [
    { value: 'recent', label: 'Más recientes' },
    { value: 'price_desc', label: 'Mayor precio' },
    { value: 'price_asc', label: 'Menor precio' },
    { value: 'stock_desc', label: 'Mayor stock' },
];

// Utility for skeleton loading
const TableSkeleton = () => (
    <div className="products-table-container">
        <table className="products-table">
            <thead>
                <tr>
                    {['Imagen', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Visible', 'Acciones'].map((h, i) => (
                        <th key={i}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                            <td key={j}>
                                <div className="skeleton-loader" style={{ height: '24px', width: '100%' }}></div>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ... (imports remain)
// ... (TableSkeleton remains)

export const ProductList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showNewModal, setShowNewModal] = useState(false);

    // Estados
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [categoria, setCategoria] = useState('all');
    const [precioRange, setPrecioRange] = useState({ min: 0, max: 10000 });
    const [stockRange, setStockRange] = useState({ min: 0, max: 1000 });
    const [soloVisibles, setSoloVisibles] = useState(false);
    const [soloOcultos, setSoloOcultos] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [toast, setToast] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState('recent');

    // Cargar productos
    useEffect(() => {
        fetchProductos();
    }, []);

    // Handle initial search from navigation state
    useEffect(() => {
        if (location.state?.initialSearch) {
            setBusqueda(location.state.initialSearch);
            // Clear state so it doesn't persist inappropriately if we navigate away and back without intent
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const [prodsRes, catalogRes] = await Promise.all([
                supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
                supabase.from('catalog_products').select('*, categories(name), entradas(codigo)').order('created_at', { ascending: false })
            ]);

            if (prodsRes.error) throw prodsRes.error;

            const standardProds = (prodsRes.data || []).map(p => ({ ...p, _source: 'products' }));
            const catalogProds = (catalogRes.data || []).map(p => ({
                ...p,
                _source: 'catalog_products',
                // Unify fields so the table renders correctly
                price: p.price || 0,
                retail_price: p.price || 0,
            }));

            const all = [...standardProds, ...catalogProds].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            setProductos(all);

            if (all.length > 0) {
                const precios = all.map(p => parseFloat(p.price || 0));
                const stocks = all.map(p => p.stock || 0);
                setPrecioRange({ min: 0, max: Math.max(10000, Math.ceil(Math.max(...precios))) });
                setStockRange({ min: 0, max: Math.max(1000, Math.ceil(Math.max(...stocks))) });
            }
        } catch (error) {
            console.error('Error fetching products', error);
            showToast('Error al cargar productos', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Helper to get categories with counts
    const getCategorias = (prods) => {
        const catMap = new Map();
        catMap.set('all', { value: 'all', label: 'Todas las Categorías', count: prods.length });

        prods.forEach(p => {
            const catName = p.categories?.name || 'Sin Categoría';
            // normalize key?
            const key = catName;
            if (!catMap.has(key)) {
                catMap.set(key, { value: key, label: catName, count: 0 });
            }
            catMap.get(key).count += 1;
        });

        // Return as array, 'all' first
        const all = catMap.get('all');
        catMap.delete('all');
        return [all, ...Array.from(catMap.values())];
    };

    // Filtrado de productos
    const productosFiltrados = useMemo(() => {
        return productos.filter(p => {
            // Búsqueda por texto
            const nombre = p.name ? p.name.toLowerCase() : '';
            const codigo = p.code ? p.code.toLowerCase() : ''; // Assuming 'code' column exists per my earlier check
            const term = busqueda.toLowerCase();
            const matchBusqueda = nombre.includes(term) || codigo.includes(term);

            // Filtro por categoría
            const catName = p.categories?.name || 'Sin Categoría';
            const matchCategoria = categoria === 'all' || catName === categoria;

            // Filtro por precio
            const precio = parseFloat(p.price || 0);
            const matchPrecio = precio >= precioRange.min && precio <= precioRange.max;

            // Filtro por stock
            const stock = p.stock || 0;
            const matchStock = stock >= stockRange.min && stock <= stockRange.max;

            // Filtro por visibilidad
            // Assuming 'published' is the boolean column for visibility
            let matchVisibilidad = true;
            if (soloVisibles && !soloOcultos) {
                matchVisibilidad = p.published === true;
            } else if (soloOcultos && !soloVisibles) {
                matchVisibilidad = p.published === false;
            }

            return matchBusqueda && matchCategoria && matchPrecio && matchStock && matchVisibilidad;
        });
    }, [productos, busqueda, categoria, precioRange, stockRange, soloVisibles, soloOcultos]);

    // Orden (sobre campos reales ya presentes en el producto)
    const productosOrdenados = useMemo(() => {
        const list = [...productosFiltrados];
        switch (sortBy) {
            case 'price_desc':
                return list.sort((a, b) => parseFloat(b.retail_price || b.price || 0) - parseFloat(a.retail_price || a.price || 0));
            case 'price_asc':
                return list.sort((a, b) => parseFloat(a.retail_price || a.price || 0) - parseFloat(b.retail_price || b.price || 0));
            case 'stock_desc':
                return list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
            default:
                return list; // ya viene ordenado por created_at desc desde fetchProductos
        }
    }, [productosFiltrados, sortBy]);

    // KPIs del inventario completo (no solo lo filtrado) — todos derivados de datos reales
    const kpis = useMemo(() => ({
        total: productos.length,
        visibles: productos.filter(p => p.published).length,
        stockBajo: productos.filter(p => p.stock > 0 && p.stock < 10).length,
        agotados: productos.filter(p => p.stock === 0).length,
    }), [productos]);

    // Paginación
    const productosPorPagina = 20;
    const totalPaginas = Math.ceil(productosOrdenados.length / productosPorPagina);
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const indiceFin = indiceInicio + productosPorPagina;
    const productosPaginados = productosOrdenados.slice(indiceInicio, indiceFin);

    // Toggle de visibilidad
    const handleToggleVisibilidad = async (productoId, nuevoEstado, source) => {
        try {
            // Optimistic update
            setProductos(prev => prev.map(p => p.id === productoId ? { ...p, published: nuevoEstado } : p));

            const tableName = source || 'products';
            const { error } = await supabase
                .from(tableName)
                .update({ published: nuevoEstado })
                .eq('id', productoId);

            if (error) throw error;

            showToast(
                nuevoEstado ? '✅ Producto visible en catálogo' : '👁️\u200d🗨️ Producto oculto del catálogo',
                'success'
            );
        } catch (error) {
            console.error(error);
            showToast('Error al actualizar visibilidad', 'error');
            fetchProductos();
        }
    };

    const handleEdit = (id, source) => {
        window.scrollTo(0, 0);
        if (source === 'catalog_products') {
            navigate(`/admin/products/new/${id}`);
        } else {
            navigate(`/admin/products/edit/${id}`);
        }
    };

    const handleDelete = async (id, source) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            const tableName = source || 'products';
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;

            setProductos(prev => prev.filter(p => p.id !== id));
            showToast('Producto eliminado', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar producto', 'error');
        }
    };

    // Limpiar filtros
    const limpiarFiltros = () => {
        setBusqueda('');
        setCategoria('all');
        // Reset ranges to reasonable defaults or calculated maxes if stored
        setPrecioRange({ min: 0, max: 10000 }); // Should ideally track max from data
        setStockRange({ min: 0, max: 1000 });
        setSoloVisibles(false);
        setSoloOcultos(false);
        setPaginaActual(1);
    };

    const showToast = (mensaje, tipo = 'info') => {
        setToast({ mensaje, tipo });
        // Toast component handles auto-close, but we need to clear state to allow showing again if needed or to clean up
        // The Toast component calls onClose after its timer.
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Productos</h1>
                        {!loading && (
                            <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                {kpis.total} total
                            </span>
                        )}
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">Gestiona el catálogo de productos</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Toggle de vista: cuadrícula / lista */}
                    <div className="flex items-center bg-muted p-1 rounded-lg shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            title="Vista cuadrícula"
                            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            title="Vista lista"
                            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <Button className="flex items-center gap-2 flex-1 sm:flex-initial sm:w-auto" onClick={() => setShowNewModal(true)}>
                        <span className="text-xl">+</span>
                        Nuevo Producto
                    </Button>
                </div>
            </div>

            {/* KPIs del inventario — derivados en tiempo real de los productos cargados */}
            {!loading && kpis.total > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Productos Totales</span>
                            <span className="text-xl font-black text-foreground leading-none">{kpis.total}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Visibles en Tienda</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-black text-foreground leading-none">{kpis.visibles}</span>
                                <span className="text-[11px] text-muted-foreground">{kpis.total ? Math.round((kpis.visibles / kpis.total) * 100) : 0}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock Bajo</span>
                            <span className="text-xl font-black text-orange-600 dark:text-orange-400 leading-none">{kpis.stockBajo}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                            <PackageX className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agotados</span>
                            <span className="text-xl font-black text-destructive leading-none">{kpis.agotados}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal selector de tipo de producto */}
            {showNewModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowNewModal(false)}
                >
                    <div
                        className="bg-card rounded-2xl shadow-2xl border border-border p-8 max-w-lg w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">¿Cómo querés agregar un producto?</h2>
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Boletas cargadas */}
                            <button
                                onClick={() => { setShowNewModal(false); navigate('/admin/products/boletas'); }}
                                className="group flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left"
                            >
                                <div className="p-4 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-center">Boletas cargadas</p>
                                    <p className="text-sm text-muted-foreground text-center mt-1">
                                        Publicar desde mercancía importada
                                    </p>
                                </div>
                            </button>
                            {/* Cargar producto nuevo */}
                            <button
                                onClick={() => { setShowNewModal(false); navigate('/admin/products/new'); }}
                                className="group flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                            >
                                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-center">Cargar producto nuevo</p>
                                    <p className="text-sm text-muted-foreground text-center mt-1">
                                        Crear manualmente desde cero
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:max-w-2xl">
                        <SearchBar
                            value={busqueda}
                            onChange={setBusqueda}
                        />
                    </div>
                    <div className="relative shrink-0 sm:ml-auto">
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full sm:w-auto pl-9 pr-8 py-3 bg-muted/50 border-2 border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Chips rápidos de categoría — mismos datos que el filtro avanzado, acceso de un click */}
                {!loading && productos.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">Filtros rápidos:</span>
                        {getCategorias(productos).map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setCategoria(cat.value)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    categoria === cat.value
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                }`}
                            >
                                {cat.label} ({cat.count})
                            </button>
                        ))}
                    </div>
                )}

                <FiltersPanel
                    categoria={categoria}
                    onCategoriaChange={setCategoria}
                    categorias={getCategorias(productos)}
                    precioRange={precioRange}
                    onPrecioChange={setPrecioRange}
                    stockRange={stockRange}
                    onStockChange={setStockRange}
                    soloVisibles={soloVisibles}
                    onSoloVisiblesChange={setSoloVisibles}
                    soloOcultos={soloOcultos}
                    onSoloOcultosChange={setSoloOcultos}
                    onLimpiar={limpiarFiltros}
                />

                {loading ? (
                    <TableSkeleton />
                ) : productosPaginados.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
                        <PackageX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="font-medium text-foreground">No se encontraron productos</p>
                        <p className="text-sm text-muted-foreground mt-1">Probá con otro término de búsqueda o limpiá los filtros.</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <ProductsGrid
                                productos={productosPaginados}
                                onToggleVisibilidad={handleToggleVisibilidad}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <ProductsTable
                                productos={productosPaginados}
                                onToggleVisibilidad={handleToggleVisibilidad}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        )}

                        <Pagination
                            paginaActual={paginaActual}
                            totalPaginas={totalPaginas}
                            onChange={setPaginaActual}
                        />
                    </>
                )}
            </div>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};



