
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Calendar, Package, ChevronRight, Layers, Edit, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import BuscadorMercancia from './BuscadorMercancia';

export function ListaTandas() {
    const [tandas, setTandas] = useState([]);

    const [loading, setLoading] = useState(true);

    // Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]); // Array of matching products
    const [filteredTandas, setFilteredTandas] = useState([]); // Subset of tandas matching search

    // Delete State

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tandaToDelete, setTandaToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);



    useEffect(() => {
        // Initial load
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('tanda_nombre, tanda_fecha, marca, codigo_boleta, gastos, cantidad_docenas');

            if (error) throw error;

            const grouped = groupTandas(data);
            const sorted = Object.values(grouped).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setTandas(sorted);

            // If not searching, filtered is all
            if (!isSearching) {
                setFilteredTandas(sorted);
            }

        } catch (error) {
            console.error('Error fetching tandas:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupTandas = (data) => {
        const grouped = {};
        data.forEach(row => {
            const key = row.tanda_nombre;
            if (!grouped[key]) {
                grouped[key] = {
                    nombre: row.tanda_nombre,
                    fecha: row.tanda_fecha,
                    codigoBoleta: row.codigo_boleta,
                    gastos: row.gastos,
                    marcas: new Set(),
                    totalDocenas: 0,
                    totalProductos: 0
                };
            }
            grouped[key].marcas.add(row.marca);
            grouped[key].totalDocenas += row.cantidad_docenas;
            grouped[key].totalProductos += 1;
        });
        return grouped;
    };

    const handleSearch = async (term) => {
        if (!term.trim()) {
            handleClearSearch();
            return;
        }

        setIsSearching(true);
        setLoading(true);
        try {
            // Search for code or boleta code
            // Note: .or() syntax is column.operator.value,column.operator.value
            const { data, error } = await supabase
                .from('entradas')
                .select('*')
                .or(`codigo.ilike.%${term}%,codigo_boleta.ilike.%${term}%`);

            if (error) throw error;

            setSearchResults(data);

            // Get unique tanda names from results
            const uniqueTandaNames = [...new Set(data.map(item => item.tanda_nombre))];

            // Filter main list (or re-fetch if pagination existed)
            // Since we have all tandas loaded locally in 'tandas', we can filter those 
            // BUT 'tandas' currently only has summarized info. 
            // We want to show the tandas that contain the matching products.
            // Best approach: Filter 'tandas' where name is in uniqueTandaNames
            const matches = tandas.filter(t => uniqueTandaNames.includes(t.nombre));
            setFilteredTandas(matches);

        } catch (err) {
            console.error(err);
            alert('Error en búsqueda');
        } finally {
            setLoading(false);
        }
    };

    const handleClearSearch = () => {
        setIsSearching(false);
        setSearchResults([]);
        setFilteredTandas(tandas);
        setLoading(false);
    };

    const handleDeleteClick = (tanda) => {
        setTandaToDelete(tanda);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!tandaToDelete) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('entradas')
                .delete()
                .eq('tanda_nombre', tandaToDelete.nombre);

            if (error) throw error;

            // Remove from local state to avoid refetch
            setTandas(tandas.filter(t => t.nombre !== tandaToDelete.nombre));
            setShowDeleteModal(false);
            setTandaToDelete(null);
            // Optional: Show success toast/alert
            // alert('Tanda eliminada correctamente'); 

        } catch (error) {
            console.error('Error deleting tanda:', error);
            alert('Error al eliminar la tanda.');
        } finally {
            setIsDeleting(false);
        }
    };



    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Control de Mercancía</h1>
                    <p className="text-muted-foreground mt-1">Gestiona tandas, marcas y stock de entrada.</p>
                </div>
                <Link to="/admin/mercancia/nueva">
                    <Button className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Tanda
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="mb-6 max-w-lg mx-auto">
                <BuscadorMercancia onSearch={handleSearch} onClear={handleClearSearch} />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando tandas...</div>
            ) : filteredTandas.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron tandas.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTandas.map((tanda) => (
                        <div key={tanda.nombre} className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-200 group relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full text-muted-foreground flex items-center gap-1 border border-border">
                                    <Calendar className="w-3 h-3" /> {new Date(tanda.fecha).toLocaleDateString()}
                                </span>
                                <div className="flex gap-1 z-10">
                                    <Link to={`/admin/mercancia/editar/${encodeURIComponent(tanda.nombre)}`} className="text-muted-foreground hover:text-foreground p-1 transition-colors hover:bg-muted rounded" title="Editar">
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleDeleteClick(tanda); }}
                                        className="text-muted-foreground hover:text-destructive p-1 transition-colors hover:bg-destructive/10 rounded"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-2 text-foreground">{tanda.nombre}</h3>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Marcas</span>
                                    <span className="font-medium text-foreground">{tanda.marcas.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Productos</span>
                                    <span className="font-medium text-foreground">{tanda.totalProductos}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Docenas</span>
                                    <span className="font-bold text-primary">{tanda.totalDocenas}</span>
                                </div>
                            </div>

                            {/* Search Matches Overlay/Badge */}
                            {isSearching && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Coincidencias:</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                        {searchResults
                                            .filter(p => p.tanda_nombre === tanda.nombre)
                                            .map((prod, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm bg-green-500/10 p-1.5 rounded-md border border-green-500/20">
                                                    <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-medium text-green-700 dark:text-green-300 truncate">{prod.producto_titulo}</span>
                                                        <span className="text-xs text-muted-foreground truncate">
                                                            Código: {prod.codigo} {prod.codigo_boleta ? `/ Bol: ${prod.codigo_boleta}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            <Link to={`/admin/mercancia/detalle/${encodeURIComponent(tanda.nombre)}`} className="absolute inset-0" aria-label="Ver detalle" />
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && tandaToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-border">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-2">¿Confirmar eliminación?</h3>
                            <p className="text-muted-foreground mb-6">
                                ¿Estás seguro de que deseas eliminar la tanda <span className="font-semibold text-foreground">"{tandaToDelete.nombre}"</span>?
                                Esta acción eliminará permanentemente todos los registros asociados y no se puede deshacer.
                            </p>

                            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm border border-border">
                                <div className="flex justify-between mb-2">
                                    <span className="text-muted-foreground">Marcas afectadas:</span>
                                    <span className="font-medium text-foreground">{tandaToDelete.marcas.size}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total docenas:</span>
                                    <span className="font-medium text-foreground">{tandaToDelete.totalDocenas}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 border-input hover:bg-muted text-foreground"
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmDelete}
                                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-transparent"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Eliminando...' : 'Eliminar Tanda'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
