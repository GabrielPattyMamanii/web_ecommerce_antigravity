import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Calendar, DollarSign, Package, Trash2, RefreshCw, User, ChevronDown, ChevronRight } from 'lucide-react';

function formatARS(n) {
    return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function VentasHistorial() {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});

    const fetchVentas = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('*')
                .order('fecha', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVentas(data || []);

            // Expandir el día más reciente por defecto
            if (data && data.length > 0) {
                setExpandedDays({ [data[0].fecha]: true });
            }
        } catch {
            toast.error('Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVentas(); }, [fetchVentas]);

    const deleteVenta = async (id) => {
        if (!window.confirm('¿Eliminar esta venta?')) return;
        setDeletingId(id);
        try {
            const { error } = await supabase.from('ventas').delete().eq('id', id);
            if (error) throw error;
            setVentas(prev => prev.filter(v => v.id !== id));
            toast.success('Venta eliminada');
        } catch {
            toast.error('Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleDay = (fecha) => {
        setExpandedDays(prev => ({ ...prev, [fecha]: !prev[fecha] }));
    };

    // Agrupar ventas por fecha
    const grouped = ventas.reduce((acc, v) => {
        if (!acc[v.fecha]) acc[v.fecha] = [];
        acc[v.fecha].push(v);
        return acc;
    }, {});

    const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Historial de Ventas</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {ventas.length} venta{ventas.length !== 1 ? 's' : ''} registrada{ventas.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={fetchVentas}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                    title="Actualizar"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {days.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay ventas registradas</p>
                    <p className="text-sm mt-1">Usá el escáner para registrar ventas</p>
                </div>
            )}

            {days.map(fecha => {
                const items = grouped[fecha];
                const totalDia = items.reduce((s, v) => s + Number(v.total_ars), 0);
                const dolarDia = items[0]?.dolar_blue;
                const isExpanded = !!expandedDays[fecha];

                return (
                    <div key={fecha} className="bg-card border border-border rounded-xl overflow-hidden">
                        {/* Cabecera del día */}
                        <button
                            onClick={() => toggleDay(fecha)}
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                }
                                <div className="text-left">
                                    <p className="font-semibold text-foreground capitalize">
                                        {formatDate(fecha)}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            Dólar: ${dolarDia?.toLocaleString('es-AR')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {items.length} ítem{items.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="font-bold text-foreground">
                                    ${formatARS(totalDia)}
                                </p>
                                <p className="text-xs text-muted-foreground">total del día</p>
                            </div>
                        </button>

                        {/* Lista de ventas del día */}
                        {isExpanded && (
                            <ul className="divide-y divide-border border-t border-border">
                                {items.map(venta => (
                                    <li key={venta.id} className="px-5 py-3 flex items-center gap-3">
                                        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {/* Formato: [nombre] - [precio] - [cantidad] - [propietario] */}
                                            <p className="text-sm text-foreground">
                                                <span className="font-medium">{venta.producto_titulo}</span>
                                                {' — '}
                                                <span>${formatARS(venta.precio_docena_ars)}/doc</span>
                                                {' — '}
                                                <span>{venta.cantidad_docenas} doc</span>
                                                {' — '}
                                                <span className="flex-inline items-center gap-1">
                                                    <User className="w-3 h-3 inline" />{' '}
                                                    {venta.propietario || 'Sin propietario'}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Código: {venta.codigo} · Total: <strong>${formatARS(venta.total_ars)}</strong>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteVenta(venta.id)}
                                            disabled={deletingId === venta.id}
                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                                            title="Eliminar venta"
                                        >
                                            {deletingId === venta.id
                                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    </li>
                                ))}

                                {/* Subtotal del día */}
                                <li className="px-5 py-3 bg-muted/30 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Subtotal del día</span>
                                    <span className="font-bold text-foreground">${formatARS(totalDia)} ARS</span>
                                </li>
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
