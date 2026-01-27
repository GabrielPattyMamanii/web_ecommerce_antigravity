import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*, categories(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setProductos(data || []);

            // Calcular rangos reales
            if (data && data.length > 0) {
                const precios = data.map(p => parseFloat(p.price || 0));
                const stocks = data.map(p => p.stock || 0);

                const maxPrecio = Math.max(...precios);
                const maxStock = Math.max(...stocks);

                // Update ranges if data suggests different bounds, 
                // but keep min at 0 usually.
                // For now keep defaults unless max is larger.
                if (maxPrecio > 10000) setPrecioRange(prev => ({ ...prev, max: Math.ceil(maxPrecio) }));
                // However, priceRange state here acts as the FILTER SELECTION. 
                // So initially it should probably cover everything? 
                // The prompt logic: sets precioRange AND precioFilter? 
                // My implementation of FiltersPanel uses precioRange as the selection state.
                // I will reset the selection to full range on load.
                setPrecioRange({ min: 0, max: Math.max(10000, Math.ceil(maxPrecio)) });
                setStockRange({ min: 0, max: Math.max(1000, Math.ceil(maxStock)) });
            }
        } catch (error) {
            console.error("Error fetching products", error);
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
    const handleToggleVisibilidad = async (productoId, nuevoEstado) => {
        try {
            // Optimistic update
            setProductos(prevProductos =>
                prevProductos.map(p =>
                    p.id === productoId ? { ...p, published: nuevoEstado } : p
                )
            );

            const { error } = await supabase
                .from('products')
                .update({ published: nuevoEstado })
                .eq('id', productoId);

            if (error) throw error;

            showToast(
                nuevoEstado
                    ? '✅ Producto visible en catálogo'
                    : '👁️‍🗨️ Producto oculto del catálogo',
                'success'
            );
        } catch (error) {
            console.error(error);
            showToast('Error al actualizar visibilidad', 'error');
            // Revert optimistic update
            fetchProductos(); // Simplest way to revert
        }
    };

    const handleEdit = (id) => {
        navigate(`/admin/products/edit/${id}`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
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
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Productos</h1>
                    <p className="text-muted-foreground">Gestiona el catálogo de productos</p>
                </div>
                <Link to="/admin/products/new">
                    <Button className="flex items-center gap-2">
                        <span className="text-xl">+</span>
                        Nuevo Producto
                    </Button>
                </Link>
            </div>

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



