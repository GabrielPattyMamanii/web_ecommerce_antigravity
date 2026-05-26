import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    Calendar, Package, Trash2, RefreshCw, User,
    ChevronDown, ChevronRight, Banknote, Building2, Blend, Tag, TrendingUp
} from 'lucide-react';

function formatARS(n) {
    return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

const METODO_CONFIG = {
    efectivo:      { label: 'Efectivo',      Icon: Banknote,  color: '#16a34a' },
    transferencia: { label: 'Transferencia', Icon: Building2, color: '#2563eb' },
    mixto:         { label: 'Mixto',         Icon: Blend,     color: '#9333ea' },
};

function buildDaySummary(items) {
    const byOwner = {};
    for (const v of items) {
        const owner = v.propietario || 'Sin propietario';
        if (!byOwner[owner]) byOwner[owner] = { items: [], efectivo: 0, transferencia: 0, total: 0 };
        byOwner[owner].items.push(v);
        byOwner[owner].efectivo     += Number(v.monto_efectivo     || (v.metodo_pago === 'efectivo'      ? v.total_ars : 0));
        byOwner[owner].transferencia += Number(v.monto_transferencia || (v.metodo_pago === 'transferencia' ? v.total_ars : 0));
        byOwner[owner].total        += Number(v.total_ars);
    }

    for (const owner of Object.keys(byOwner)) {
        const codMap = {};
        for (const v of byOwner[owner].items) {
            const key = v.codigo || v.producto_titulo || '—';
            if (!codMap[key]) codMap[key] = { codigo: v.codigo, titulo: v.producto_titulo, docenas: 0 };
            codMap[key].docenas += Number(v.cantidad_docenas);
        }
        byOwner[owner].codigos = Object.values(codMap);
    }

    return byOwner;
}

function DailySummary({ items, getUserColor }) {
    const summary = buildDaySummary(items);
    const owners  = Object.keys(summary);

    const totalDia         = items.reduce((s, v) => s + Number(v.total_ars), 0);
    const totalEfectivoDia = items.reduce((s, v) => s + Number(v.monto_efectivo     || (v.metodo_pago === 'efectivo'      ? v.total_ars : 0)), 0);
    const totalTransfDia   = items.reduce((s, v) => s + Number(v.monto_transferencia || (v.metodo_pago === 'transferencia' ? v.total_ars : 0)), 0);

    return (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Resumen del día
            </p>

            <div className="space-y-2">
                {owners.map(owner => {
                    const { codigos, efectivo, transferencia, total } = summary[owner];
                    const color = getUserColor(owner);
                    return (
                        <div
                            key={owner}
                            className="rounded-xl border overflow-hidden"
                            style={{ borderColor: color + '40' }}
                        >
                            {/* Cabecera propietario */}
                            <div
                                className="flex items-center justify-between px-3 py-2"
                                style={{ backgroundColor: color + '12' }}
                            >
                                <span
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
                                >
                                    <User className="w-3 h-3" />
                                    {owner}
                                </span>
                                <span className="font-bold text-sm text-foreground">${formatARS(total)}</span>
                            </div>

                            {/* Codigos + docenas */}
                            <div className="px-3 py-2 space-y-1">
                                {codigos.map(c => (
                                    <div key={c.codigo || c.titulo} className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-foreground flex items-center gap-1.5 min-w-0">
                                            <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                            {c.codigo
                                                ? <><span className="font-mono font-semibold">{c.codigo}</span>{c.titulo && <span className="text-muted-foreground truncate"> ({c.titulo})</span>}</>
                                                : <span className="text-muted-foreground">{c.titulo || '—'}</span>
                                            }
                                        </span>
                                        <span className="text-xs font-semibold text-foreground flex-shrink-0 whitespace-nowrap">
                                            {c.docenas % 1 === 0 ? c.docenas : c.docenas.toFixed(1)} doc
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Subtotales efectivo/transferencia */}
                            <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5">
                                {efectivo > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: '#16a34a18', color: '#16a34a' }}>
                                        <Banknote className="w-3 h-3" />
                                        ${formatARS(efectivo)} ef.
                                    </span>
                                )}
                                {transferencia > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: '#2563eb18', color: '#2563eb' }}>
                                        <Building2 className="w-3 h-3" />
                                        ${formatARS(transferencia)} transf.
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total global */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                    {totalEfectivoDia > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: '#16a34a18', color: '#16a34a' }}>
                            <Banknote className="w-3 h-3" />
                            ${formatARS(totalEfectivoDia)}
                        </span>
                    )}
                    {totalTransfDia > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: '#2563eb18', color: '#2563eb' }}>
                            <Building2 className="w-3 h-3" />
                            ${formatARS(totalTransfDia)}
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-foreground">${formatARS(totalDia)}</span>
                    <span className="text-xs text-muted-foreground ml-1">ARS total</span>
                </div>
            </div>
        </div>
    );
}

function PaymentBadge({ venta }) {
    const metodo = venta.metodo_pago || 'efectivo';
    const cfg = METODO_CONFIG[metodo] || METODO_CONFIG.efectivo;
    const { Icon } = cfg;

    if (metodo === 'efectivo') {
        return (
            <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
            >
                <Icon className="w-3 h-3" />
                Efectivo
            </span>
        );
    }
    if (metodo === 'transferencia') {
        return (
            <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
            >
                <Icon className="w-3 h-3" />
                Transferencia → {venta.cuenta_nombre || '—'}
            </span>
        );
    }
    // mixto
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium flex-wrap">
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#16a34a18', color: '#16a34a' }}
            >
                <Banknote className="w-3 h-3" />
                ${formatARS(venta.monto_efectivo)} ef.
            </span>
            <span className="text-muted-foreground">+</span>
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#2563eb18', color: '#2563eb' }}
            >
                <Building2 className="w-3 h-3" />
                ${formatARS(venta.monto_transferencia)} → {venta.cuenta_nombre || '—'}
            </span>
        </span>
    );
}

export function VentasHistorial() {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});
    const [appUsers, setAppUsers] = useState([]);

    const getUserColor = useCallback(
        (name) => appUsers.find(u => u.username === name)?.color || '#9ca3af',
        [appUsers]
    );

    const fetchVentas = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data }, { data: users }] = await Promise.all([
                supabase
                    .from('ventas')
                    .select('*')
                    .order('fecha', { ascending: false })
                    .order('created_at', { ascending: false }),
                supabase.from('app_users').select('username, color'),
            ]);

            setVentas(data || []);
            setAppUsers(users || []);

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

    const toggleDay = (fecha) =>
        setExpandedDays(prev => ({ ...prev, [fecha]: !prev[fecha] }));

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

            {/* Título */}
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
                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay ventas registradas</p>
                    <p className="text-sm mt-1">Usá el escáner para registrar ventas</p>
                </div>
            )}

            {days.map(fecha => {
                const items = grouped[fecha];
                const isExpanded = !!expandedDays[fecha];

                const totalDia = items.reduce((s, v) => s + Number(v.total_ars), 0);
                const totalEfectivo = items.reduce((s, v) => s + Number(v.monto_efectivo || (v.metodo_pago === 'efectivo' ? v.total_ars : 0)), 0);
                const totalTransferencia = items.reduce((s, v) => s + Number(v.monto_transferencia || (v.metodo_pago === 'transferencia' ? v.total_ars : 0)), 0);
                const dolarDia = items[0]?.dolar_blue;

                return (
                    <div key={fecha} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

                        {/* Cabecera del día */}
                        <button
                            onClick={() => toggleDay(fecha)}
                            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-primary" />
                                    : <ChevronRight className="w-4 h-4 text-primary" />
                                }
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground capitalize text-base leading-tight">
                                    {formatDate(fecha)}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {items.length} ítem{items.length !== 1 ? 's' : ''}
                                    </span>
                                    {dolarDia && (
                                        <span className="text-xs text-muted-foreground">
                                            Dólar: ${Number(dolarDia).toLocaleString('es-AR')}
                                        </span>
                                    )}
                                    {/* Desglose pago */}
                                    {totalEfectivo > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium"
                                            style={{ color: '#16a34a' }}>
                                            <Banknote className="w-3 h-3" />
                                            ${formatARS(totalEfectivo)}
                                        </span>
                                    )}
                                    {totalTransferencia > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium"
                                            style={{ color: '#2563eb' }}>
                                            <Building2 className="w-3 h-3" />
                                            ${formatARS(totalTransferencia)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <p className="text-xl font-bold text-foreground">${formatARS(totalDia)}</p>
                                <p className="text-xs text-muted-foreground">ARS</p>
                            </div>
                        </button>

                        {/* Resumen diario — siempre visible */}
                        <DailySummary items={items} getUserColor={getUserColor} />

                        {/* Ventas del día */}
                        {isExpanded && (
                            <div className="border-t border-border divide-y divide-border/60">
                                {items.map(venta => {
                                    const color = getUserColor(venta.propietario);
                                    return (
                                        <div
                                            key={venta.id}
                                            className="flex items-stretch gap-0"
                                            style={{ borderLeft: `4px solid ${color}` }}
                                        >
                                            <div className="flex-1 px-4 py-3.5 min-w-0">
                                                {/* Fila 1: nombre + código */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold text-foreground text-sm">
                                                        {venta.producto_titulo}
                                                    </span>
                                                    {venta.codigo && (
                                                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                                            <Tag className="w-2.5 h-2.5" />
                                                            {venta.codigo}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Fila 2: propietario + cantidad × precio */}
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    <span
                                                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        style={{
                                                            backgroundColor: color + '20',
                                                            color,
                                                            border: `1px solid ${color}40`,
                                                        }}
                                                    >
                                                        <User className="w-2.5 h-2.5" />
                                                        {venta.propietario || 'Sin propietario'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {venta.cantidad_docenas} doc
                                                        × ${formatARS(venta.precio_docena_ars)}
                                                    </span>
                                                </div>

                                                {/* Fila 3: pago */}
                                                <div className="mt-1.5">
                                                    <PaymentBadge venta={venta} />
                                                </div>
                                            </div>

                                            {/* Total + borrar */}
                                            <div className="flex flex-col items-end justify-between px-4 py-3.5 flex-shrink-0">
                                                <p className="font-bold text-foreground text-base">
                                                    ${formatARS(venta.total_ars)}
                                                </p>
                                                <button
                                                    onClick={() => deleteVenta(venta.id)}
                                                    disabled={deletingId === venta.id}
                                                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    {deletingId === venta.id
                                                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        : <Trash2 className="w-3.5 h-3.5" />
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
