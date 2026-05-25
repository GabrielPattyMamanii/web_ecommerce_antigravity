import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Layers, Package, ClipboardList, Search, X } from 'lucide-react';

export function ControlMercancia() {
    const [tandas, setTandas] = useState([]);
    const [filteredTandas, setFilteredTandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('tanda_nombre, tanda_fecha, marca, codigo_boleta, cant_docenas_copy, propietario');

            if (error) throw error;

            const grouped = groupTandas(data || []);
            const sorted = Object.values(grouped).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setTandas(sorted);
            setFilteredTandas(sorted);
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
                    marcas: new Set(),
                    propietarios: new Set(),
                    totalDocenasCopy: 0,
                    totalProductos: 0
                };
            }
            grouped[key].marcas.add(row.marca);
            grouped[key].totalDocenasCopy += (row.cant_docenas_copy || 0);
            grouped[key].totalProductos += 1;
            if (row.propietario) grouped[key].propietarios.add(row.propietario);
        });
        return grouped;
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        if (!term.trim()) {
            setFilteredTandas(tandas);
            return;
        }
        const lower = term.toLowerCase();
        setFilteredTandas(tandas.filter(t =>
            t.nombre.toLowerCase().includes(lower)
        ));
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Control de Mercancía</h1>
                    </div>
                    <p className="text-muted-foreground mt-1 ml-1">Seguimiento de tandas y marcas con cantidades de control independientes.</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 max-w-lg">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        placeholder="Buscar tanda por nombre..."
                        value={searchTerm}
                        onChange={e => handleSearch(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => handleSearch('')}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-16">
                    <div className="inline-flex items-center gap-3 text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Cargando tandas...
                    </div>
                </div>
            ) : filteredTandas.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron tandas.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTandas.map((tanda) => (
                        <Link
                            key={tanda.nombre}
                            to={`/admin/control-mercancia/${encodeURIComponent(tanda.nombre)}`}
                            className="block bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-200 group relative"
                        >
                            {/* Top Row */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full text-muted-foreground flex items-center gap-1 border border-border">
                                    <Calendar className="w-3 h-3" />
                                    {tanda.fecha ? new Date(tanda.fecha).toLocaleDateString('es-AR') : '—'}
                                </span>
                            </div>

                            {/* Name */}
                            <h3 className="font-bold text-lg mb-3 text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {tanda.nombre}
                            </h3>

                            {/* Stats */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Marcas</span>
                                    <span className="font-medium text-foreground">{tanda.marcas.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Productos</span>
                                    <span className="font-medium text-foreground">{tanda.totalProductos}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                                    <span className="text-muted-foreground font-medium">Doc. Control</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {tanda.totalDocenasCopy}
                                    </span>
                                </div>
                            </div>

                            {/* Propietarios badges */}
                            {tanda.propietarios.size > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
                                    {[...tanda.propietarios].slice(0, 4).map(p => (
                                        <span key={p} className="text-xs bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                                            {p}
                                        </span>
                                    ))}
                                    {tanda.propietarios.size > 4 && (
                                        <span className="text-xs text-muted-foreground italic">+{tanda.propietarios.size - 4} más</span>
                                    )}
                                </div>
                            )}

                            {/* hover arrow */}
                            <div className="absolute bottom-4 right-5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                                <Package className="w-4 h-4" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
