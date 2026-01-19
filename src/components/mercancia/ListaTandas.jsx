import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Calendar, Package, ChevronRight, Layers } from 'lucide-react';
import { Button } from '../ui/Button';

export function ListaTandas() {
    const [tandas, setTandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        setLoading(true);
        try {
            // We need to group by tanda_nombre. 
            // Since Supabase doesn't support easy GROUP BY in JS client for returning structured objects without RPC, 
            // we will fetch all distinct tanda info or use a slightly different approach.
            // A common pattern is to fetch all unique (tanda_name, tanda_date) pairs.
            // Or fetch everything and group client side if dataset is small.
            // For scalability, let's use .select('tanda_nombre, tanda_fecha, created_at') and remove duplicates client side.
            // *Optimization tip: Ideally use a View or RPC. For now, client-side grouping.*

            const { data, error } = await supabase
                .from('entradas')
                .select('tanda_nombre, tanda_fecha, marca, producto_titulo, cantidad_docenas');

            if (error) throw error;

            // Grouping logic
            const grouped = {};
            data.forEach(row => {
                const key = row.tanda_nombre;
                if (!grouped[key]) {
                    grouped[key] = {
                        nombre: row.tanda_nombre,
                        fecha: row.tanda_fecha,
                        marcas: new Set(),
                        totalDocenas: 0,
                        totalProductos: 0
                    };
                }
                grouped[key].marcas.add(row.marca);
                grouped[key].totalDocenas += row.cantidad_docenas;
                grouped[key].totalProductos += 1;
            });

            setTandas(Object.values(grouped).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));

        } catch (error) {
            console.error('Error fetching tandas:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTandas = tandas.filter(t =>
        t.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Mercancía</h1>
                    <p className="text-gray-500 mt-1">Gestiona tandas, marcas y stock de entrada.</p>
                </div>
                <Link to="/admin/mercancia/nueva">
                    <Button className="w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Tanda
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar tanda..."
                    className="w-full pl-10 h-12 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando tandas...</div>
            ) : filteredTandas.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed text-gray-400">
                    No se encontraron tandas.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTandas.map((tanda) => (
                        <div key={tanda.nombre} className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow group relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-600 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {new Date(tanda.fecha).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-2">{tanda.nombre}</h3>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Marcas</span>
                                    <span className="font-medium">{tanda.marcas.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Productos</span>
                                    <span className="font-medium">{tanda.totalProductos}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Docenas</span>
                                    <span className="font-bold text-green-600">{tanda.totalDocenas}</span>
                                </div>
                            </div>

                            <Link to={`/admin/mercancia/detalle/${encodeURIComponent(tanda.nombre)}`} className="absolute inset-0" aria-label="Ver detalle" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
