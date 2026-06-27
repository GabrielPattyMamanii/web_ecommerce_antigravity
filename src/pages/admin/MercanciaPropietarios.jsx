import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Users, Package, ChevronRight, Layers, Calendar } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

export function MercanciaPropietarios() {
    const isMobile = useMobile();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tandas, setTandas] = useState([]);

    useEffect(() => {
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        setLoading(true);
        try {
            const { data: entradas, error } = await supabase
                .from('entradas')
                .select('tanda_nombre, tanda_fecha, propietario, propietario_producto, codigo_boleta, cantidad_docenas');

            if (error) throw error;

            const grouped = {};
            (entradas || []).forEach(e => {
                const owner = e.propietario_producto?.trim() || e.propietario?.trim() || '';
                if (!owner) return;

                const tanda = e.tanda_nombre || 'Sin tanda';
                if (!grouped[tanda]) {
                    grouped[tanda] = {
                        nombre: tanda,
                        fecha: e.tanda_fecha,
                        propietarios: new Set(),
                        boletas: new Set(),
                        totalProductos: 0,
                        totalDocenas: 0,
                    };
                }
                grouped[tanda].propietarios.add(owner);
                if (e.codigo_boleta) grouped[tanda].boletas.add(e.codigo_boleta);
                grouped[tanda].totalProductos += 1;
                grouped[tanda].totalDocenas += e.cantidad_docenas || 0;
            });

            const sorted = Object.values(grouped).sort((a, b) => {
                if (a.fecha && b.fecha) return new Date(b.fecha) - new Date(a.fecha);
                return a.nombre.localeCompare(b.nombre);
            });
            setTandas(sorted);
        } catch (error) {
            console.error('Error fetching tandas:', error);
        } finally {
            setLoading(false);
        }
    };

    if (isMobile) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50 pb-8">
                <header className="bg-white px-5 pt-6 pb-4 sticky top-0 z-20 border-b border-gray-100">
                    <button
                        onClick={() => navigate('/admin/mercancia')}
                        className="flex items-center gap-1.5 text-sm text-[#1A1A1A] mb-3"
                    >
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#EEF2FF] rounded-2xl flex items-center justify-center text-[#4B6BFB]">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-[22px] font-black text-[#1A1A1A] tracking-tight">Por Propietario</h1>
                            <p className="text-[11px] text-[#8E8E93] font-bold uppercase tracking-widest">Selecciona una tanda</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 px-4 py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Cargando...</span>
                        </div>
                    ) : tandas.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No se encontraron tandas con propietarios</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tandas.map(tanda => (
                                <div
                                    key={tanda.nombre}
                                    className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all relative overflow-hidden"
                                    onClick={() => navigate(`/admin/mercancia/propietarios/${encodeURIComponent(tanda.nombre)}`)}
                                >
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 bg-[#EEF2FF] rounded-2xl flex items-center justify-center text-[#4B6BFB]">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-[#1A1A1A] text-lg uppercase leading-tight">{tanda.nombre}</h3>
                                            {tanda.fecha && (
                                                <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span className="text-[12px] font-medium uppercase tracking-wider">
                                                        {new Date(tanda.fecha).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-[#EEF2FF] rounded-2xl p-3 text-center">
                                            <span className="block text-[10px] font-bold text-[#4B6BFB] uppercase tracking-wider mb-1">Propietarios</span>
                                            <span className="text-lg font-black text-[#4B6BFB]">{tanda.propietarios.size}</span>
                                        </div>
                                        <div className="bg-[#F5F3FF] rounded-2xl p-3 text-center">
                                            <span className="block text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider mb-1">Boletas</span>
                                            <span className="text-lg font-black text-[#7C3AED]">{tanda.boletas.size}</span>
                                        </div>
                                        <div className="bg-[#FEF1EC] rounded-2xl p-3 text-center">
                                            <span className="block text-[10px] font-bold text-[#FF5C39] uppercase tracking-wider mb-1">Productos</span>
                                            <span className="text-lg font-black text-[#FF5C39]">{tanda.totalProductos}</span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-0 right-0 p-3 opacity-20">
                                        <ChevronRight className="w-12 h-12 text-gray-300" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/admin/mercancia')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a Mercancía
                </button>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Productos por Propietario</h1>
                    <p className="text-muted-foreground text-sm mt-1">Selecciona una tanda para ver el desglose por propietario</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando tandas...</div>
            ) : tandas.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron tandas con propietarios asignados.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tandas.map(tanda => (
                        <div
                            key={tanda.nombre}
                            onClick={() => navigate(`/admin/mercancia/propietarios/${encodeURIComponent(tanda.nombre)}`)}
                            className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-200 cursor-pointer group relative"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Layers className="w-6 h-6" />
                                </div>
                                {tanda.fecha && (
                                    <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full text-muted-foreground flex items-center gap-1 border border-border">
                                        <Calendar className="w-3 h-3" /> {new Date(tanda.fecha).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-lg mb-4 text-foreground uppercase">{tanda.nombre}</h3>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Propietarios</span>
                                    <span className="font-medium text-foreground">{tanda.propietarios.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Boletas</span>
                                    <span className="font-medium text-foreground">{tanda.boletas.size}</span>
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

                            <div className="flex flex-wrap gap-1.5">
                                {[...tanda.propietarios].slice(0, 4).map(p => (
                                    <span key={p} className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase">
                                        {p}
                                    </span>
                                ))}
                                {tanda.propietarios.size > 4 && (
                                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        +{tanda.propietarios.size - 4} más
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
