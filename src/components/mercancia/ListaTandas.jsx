import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Calendar, Package, ChevronRight, Layers, Edit, Trash2, X, AlertTriangle, CheckCircle, Settings, ShoppingCart, BarChart, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import BuscadorMercancia from './BuscadorMercancia';

import { useMobile } from '../../hooks/useMobile';
export function ListaTandas() {
    const isMobile = useMobile();
    const navigate = useNavigate();
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

            // Remove from both tandas and filteredTandas states for reactive update
            const updatedTandas = tandas.filter(t => t.nombre !== tandaToDelete.nombre);
            setTandas(updatedTandas);
            setFilteredTandas(filteredTandas.filter(t => t.nombre !== tandaToDelete.nombre));

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



    if (isMobile) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50 pb-8">
                {/* Mobile Header - Stitch Design */}
                <header className="bg-white px-5 pt-8 pb-5 sticky top-0 z-20 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-[28px] font-bold text-[#1A1A1A] tracking-tight">Mercancía</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate('/admin/mercancia/propietarios')}
                                className="bg-[#4B6BFB] p-2.5 rounded-full text-white shadow-lg shadow-blue-200 active:scale-95 transition-all"
                            >
                                <Users className="w-6 h-6" strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => navigate('/admin/mercancia/nueva')}
                                className="bg-[#FF5C39] p-2.5 rounded-full text-white shadow-lg shadow-orange-200 active:scale-95 transition-all"
                            >
                                <Plus className="w-6 h-6" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por código..."
                            className="w-full bg-gray-100 border-none rounded-2xl py-3.5 pl-12 pr-4 text-[15px] focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-gray-400"
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                </header>

                <div className="flex-1 px-5 py-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                             <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                             <span className="text-sm font-medium">Cargando tandas...</span>
                        </div>
                    ) : filteredTandas.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No se encontraron tandas</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredTandas.map((tanda) => (
                                <div 
                                    key={tanda.nombre} 
                                    className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all relative overflow-hidden"
                                    onClick={() => navigate(`/admin/mercancia/detalle/${encodeURIComponent(tanda.nombre)}`)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                                                <Layers className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[#1A1A1A] text-lg uppercase leading-tight">{tanda.nombre}</h3>
                                                <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span className="text-[12px] font-medium uppercase tracking-wider">
                                                        {new Date(tanda.fecha).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => navigate(`/admin/mercancia/editar/${encodeURIComponent(tanda.nombre)}`)}
                                                className="p-2 text-gray-400 hover:text-gray-600"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(tanda)}
                                                className="p-2 text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tiles stats - Stitch design style */}
                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        <div className="bg-[#EEF2FF] rounded-2xl p-3 text-center transition-colors">
                                            <span className="block text-[10px] font-bold text-[#4B6BFB] uppercase tracking-wider mb-1">Marcas</span>
                                            <span className="text-lg font-black text-[#4B6BFB]">{tanda.marcas.size}</span>
                                        </div>
                                        <div className="bg-[#F5F3FF] rounded-2xl p-3 text-center transition-colors">
                                            <span className="block text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider mb-1">Productos</span>
                                            <span className="text-lg font-black text-[#7C3AED]">{tanda.totalProductos}</span>
                                        </div>
                                        <div className="bg-[#FEF1EC] rounded-2xl p-3 text-center transition-colors">
                                            <span className="block text-[10px] font-bold text-[#FF5C39] uppercase tracking-wider mb-1">Total Doc.</span>
                                            <span className="text-lg font-black text-[#FF5C39]">{tanda.totalDocenas}</span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-0 right-0 p-3 opacity-20 transform translate-y-1 translate-x-1">
                                         <ChevronRight className="w-12 h-12 text-gray-300" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) }
                </div>



                {/* Use the same delete modal for mobile */}
                {showDeleteModal && tandaToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in slide-in-from-bottom-5">
                       <div className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl overflow-hidden relative border border-gray-100 mb-20">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                                    <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-black text-[#1A1A1A] uppercase tracking-tight">¿Eliminar Tanda?</h3>
                                <p className="text-gray-500 text-sm leading-relaxed px-2">
                                    ¿Estás seguro de eliminar <span className="text-black font-bold">"{tandaToDelete.nombre}"</span>? Esta acción es permanente.
                                </p>
                                
                                <div className="w-full flex flex-col gap-3 mt-4">
                                    <button 
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                        className="w-full py-4 bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest text-sm shadow-lg shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                                    </button>
                                    <button 
                                        onClick={() => setShowDeleteModal(false)}
                                        className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl uppercase tracking-widest text-sm active:scale-[0.98] transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                       </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Control de Mercancía</h1>
                    <p className="text-muted-foreground mt-1">Gestiona tandas, marcas y stock de entrada.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/admin/mercancia/propietarios">
                        <Button variant="outline" className="w-full md:w-auto">
                            <Users className="w-4 h-4 mr-2" /> Por Propietario
                        </Button>
                    </Link>
                    <Link to="/admin/mercancia/nueva">
                        <Button className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="w-4 h-4 mr-2" /> Nueva Tanda
                        </Button>
                    </Link>
                </div>
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
