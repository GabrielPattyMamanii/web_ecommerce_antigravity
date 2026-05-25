import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X, ShoppingBag, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SearchBar from '../../components/admin/products/SearchBar';
import FiltersPanel from '../../components/admin/products/FiltersPanel';
import ProductsTable from '../../components/admin/products/ProductsTable';
import Pagination from '../../components/admin/products/Pagination';
import Toast from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

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

    // Paginación
    const productosPorPagina = 20;
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const indiceFin = indiceInicio + productosPorPagina;
    const productosPaginados = productosFiltrados.slice(indiceInicio, indiceFin);

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Productos</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Gestiona el catálogo de productos</p>
                </div>
                <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={() => setShowNewModal(true)}>
                    <span className="text-xl">+</span>
                    Nuevo Producto
                </Button>
            </div>

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
                <SearchBar
                    value={busqueda}
                    onChange={setBusqueda}
                />

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
                ) : (
                    <>
                        <ProductsTable
                            productos={productosPaginados}
                            onToggleVisibilidad={handleToggleVisibilidad}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />

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



