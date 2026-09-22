import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Layers, ClipboardList, Search, X, ArrowUpDown, Box } from 'lucide-react';

export function ControlMercancia() {
    const [tandas, setTandas] = useState([]);
    const [filteredTandas, setFilteredTandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortAsc, setSortAsc] = useState(false);

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
            setFilteredTandas(sortList(tandas, sortAsc));
            return;
        }
        const lower = term.toLowerCase();
        setFilteredTandas(sortList(tandas.filter(t => t.nombre.toLowerCase().includes(lower)), sortAsc));
    };

    const sortList = (list, asc) =>
        [...list].sort((a, b) => asc ? new Date(a.fecha) - new Date(b.fecha) : new Date(b.fecha) - new Date(a.fecha));

    const toggleSort = () => {
        const next = !sortAsc;
        setSortAsc(next);
        setFilteredTandas(list => sortList(list, next));
    };

    // Tanda más reciente (para destacarla, igual que en Mercancía)
    const mostRecentNombre = tandas.length
        ? tandas.reduce((latest, t) => new Date(t.fecha) > new Date(latest.fecha) ? t : latest, tandas[0]).nombre
        : null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm dark:bg-indigo-950/30">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Control de Mercancía</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Seguimiento de tandas y marcas con cantidades de control independientes.</p>
                    </div>
                </div>
            </div>

            {/* Search + orden */}
            <div className="bg-card p-3.5 rounded-2xl border border-border shadow-sm flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-0 focus:ring-0 text-foreground placeholder:text-muted-foreground"
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
                <button
                    onClick={toggleSort}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border-l border-border pl-4 transition-colors"
                >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortAsc ? 'Antiguas primero' : 'Recientes primero'}
                </button>
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
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
                    No se encontraron tandas.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTandas.map((tanda) => {
                        const isRecent = tanda.nombre === mostRecentNombre;
                        return (
                            <Link
                                key={tanda.nombre}
                                to={`/admin/control-mercancia/${encodeURIComponent(tanda.nombre)}`}
                                className={`bg-card rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                                    isRecent
                                        ? 'border-2 border-indigo-500/80 shadow-md'
                                        : 'border border-border hover:shadow-md hover:border-muted-foreground/30'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            isRecent ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30'
                                        }`}>
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
                                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                            {tanda.fecha ? new Date(tanda.fecha).toLocaleDateString('es-AR') : '—'}
                                        </span>
                                    </div>

                                    <h2 className={`text-base font-bold tracking-tight mb-4 ${isRecent ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}>
                                        {tanda.nombre}
                                    </h2>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center text-muted-foreground">
                                            <span>Marcas</span>
                                            <span className="font-semibold text-foreground">{tanda.marcas.size}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-muted-foreground">
                                            <span>Productos</span>
                                            <span className="font-semibold text-foreground">{tanda.totalProductos}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-border">
                                            <span className="font-medium text-muted-foreground">Doc. Control</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{tanda.totalDocenasCopy}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Propietarios badges */}
                                {tanda.propietarios.size > 0 && (
                                    <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${isRecent ? 'border-indigo-100 dark:border-indigo-900/40' : 'border-border'}`}>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[...tanda.propietarios].slice(0, 4).map(p => (
                                                <span key={p} className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                                                    {p}
                                                </span>
                                            ))}
                                            {tanda.propietarios.size > 4 && (
                                                <span className="text-[11px] text-muted-foreground italic self-center">+{tanda.propietarios.size - 4} más</span>
                                            )}
                                        </div>
                                        {isRecent && <Box className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
