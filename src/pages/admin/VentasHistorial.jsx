import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { calcPrice } from '../../utils/pricingUtils';
import toast from 'react-hot-toast';
import {
    Package, Trash2, RefreshCw, User,
    Banknote, Building2, Blend, Tag, TrendingUp, X, ChevronDown, ChevronUp, DollarSign, ArrowRight,
    AlertTriangle, Lock, Eye, EyeOff, Pencil, Check, ShoppingBag, Clock, Layers, Search, Plus
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────── */

function formatARS(n) {
    return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const fmtMiles = (str) => {
    const digits = String(str).replace(/[^\d]/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const rawNum = (str) => String(str ?? '').replace(/\./g, '');

const METODOS_EDIT = [
    { id: 'efectivo',      label: 'Efectivo',     Icon: Banknote  },
    { id: 'transferencia', label: 'Transferencia', Icon: Building2 },
    { id: 'mixto',         label: 'Mixto',         Icon: Blend     },
];

function parseDateParts(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return { y: Number(y), m: Number(m), d: Number(d) };
}

function formatDayCard(dateStr) {
    const { y, m, d } = parseDateParts(dateStr);
    const date = new Date(y, m - 1, d);
    const weekday  = date.toLocaleDateString('es-AR', { weekday: 'short' });
    const monthName = date.toLocaleDateString('es-AR', { month: 'short' });
    return { day: d, weekday, monthName };
}

function formatFullDate(dateStr) {
    const { y, m, d } = parseDateParts(dateStr);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMonthTab(ym) {
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

/* abreviación del mes para las pestañas en mobile */
function formatMonthTabShort(ym) {
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    const mon = date.toLocaleDateString('es-AR', { month: 'short' });
    return { short: mon, year: y };
}

function formatHora(isoTimestamp) {
    if (!isoTimestamp) return '—';
    return new Date(isoTimestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function nombrePedidoGenerico(isoTimestamp) {
    return `Pedido de las ${formatHora(isoTimestamp)}`;
}

/* Agrupa las ventas de un día en pedidos (mismo venta_id = mismo carrito confirmado) */
function groupByPedido(items) {
    const map = new Map();
    for (const v of items) {
        const key = v.venta_id || `legacy-${v.id}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(v);
    }
    return [...map.entries()]
        .map(([ventaId, rows]) => ({
            ventaId,
            rows: [...rows].sort((a, b) => a.id - b.id),
            nombre: rows[0]?.nombre_pedido || null,
            hora: rows[0]?.created_at,
            total: rows.reduce((s, v) => s + Number(v.total_ars), 0),
        }))
        .sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));
}

const METODO_CONFIG = {
    efectivo:      { label: 'Efectivo',      Icon: Banknote,  color: '#16a34a' },
    transferencia: { label: 'Transferencia', Icon: Building2, color: '#2563eb' },
    mixto:         { label: 'Mixto',         Icon: Blend,     color: '#9333ea' },
};

/* Paleta cíclica para distinguir visualmente un pedido de otro dentro del mismo día */
const PEDIDO_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];
const pedidoColor = (index) => PEDIDO_COLORS[index % PEDIDO_COLORS.length];

/* ─── buildDaySummary ─────────────────────────────────────────── */

function buildDaySummary(items) {
    const byOwner = {};
    for (const v of items) {
        const owner = v.propietario || 'Sin propietario';
        if (!byOwner[owner]) byOwner[owner] = { items: [], efectivo: 0, transferencia: 0, total: 0 };
        byOwner[owner].items.push(v);
        byOwner[owner].efectivo      += Number(v.monto_efectivo      || (v.metodo_pago === 'efectivo'      ? v.total_ars : 0));
        byOwner[owner].transferencia += Number(v.monto_transferencia || (v.metodo_pago === 'transferencia' ? v.total_ars : 0));
        byOwner[owner].total         += Number(v.total_ars);
    }
    for (const owner of Object.keys(byOwner)) {
        const codMap = {};
        for (const v of byOwner[owner].items) {
            const tanda = v.tanda_nombre || null;
            const key = `${v.codigo || v.producto_titulo || '—'}||${tanda || ''}`;
            if (!codMap[key]) codMap[key] = { codigo: v.codigo, titulo: v.producto_titulo, tanda, docenas: 0 };
            codMap[key].docenas += Number(v.cantidad_docenas);
        }
        byOwner[owner].codigos = Object.values(codMap);
    }
    return byOwner;
}

/* ─── PaymentBadge ────────────────────────────────────────────── */

function PaymentBadge({ venta }) {
    const metodo = venta.metodo_pago || 'efectivo';
    const cfg = METODO_CONFIG[metodo] || METODO_CONFIG.efectivo;
    const { Icon } = cfg;

    if (metodo === 'efectivo') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cfg.color + '18', color: cfg.color }}>
                <Icon className="w-3 h-3" /> Efectivo
            </span>
        );
    }
    if (metodo === 'transferencia') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cfg.color + '18', color: cfg.color }}>
                <Icon className="w-3 h-3" /> Transferencia → {venta.cuenta_nombre || '—'}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#16a34a18', color: '#16a34a' }}>
                <Banknote className="w-3 h-3" /> ${formatARS(venta.monto_efectivo)} ef.
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#2563eb18', color: '#2563eb' }}>
                <Building2 className="w-3 h-3" /> ${formatARS(venta.monto_transferencia)} → {venta.cuenta_nombre || '—'}
            </span>
        </span>
    );
}

/* ─── DailySummary ────────────────────────────────────────────── */

function formatUSD(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DailySummary({ items, getUserColor, showUSD, setShowUSD }) {
    const summary  = buildDaySummary(items);
    const owners   = Object.keys(summary);
    const totalDia = items.reduce((s, v) => s + Number(v.total_ars), 0);
    const totalEf  = items.reduce((s, v) => s + Number(v.monto_efectivo      || (v.metodo_pago === 'efectivo'      ? v.total_ars : 0)), 0);
    const totalTr  = items.reduce((s, v) => s + Number(v.monto_transferencia || (v.metodo_pago === 'transferencia' ? v.total_ars : 0)), 0);
    const dolarDia = items.find(v => Number(v.dolar_blue) > 0)?.dolar_blue ?? null;

    const fmt = (n) => showUSD && dolarDia
        ? `u$s ${formatUSD(n / dolarDia)}`
        : `$${formatARS(n)}`;

    return (
        <div className="space-y-3">
            {/* Cabecera con toggle */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Resumen del día
                </p>
                {dolarDia && (
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                        <button
                            onClick={() => setShowUSD(false)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${!showUSD ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        >
                            ARS
                        </button>
                        <button
                            onClick={() => setShowUSD(true)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${showUSD ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        >
                            <DollarSign className="w-3 h-3" /> USD
                        </button>
                    </div>
                )}
            </div>

            {showUSD && dolarDia && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Cotización del día: <span className="font-semibold text-foreground">${Number(dolarDia).toLocaleString('es-AR')}</span>
                </p>
            )}

            <div className="space-y-2">
                {owners.map(owner => {
                    const { codigos, efectivo, transferencia, total } = summary[owner];
                    const color = getUserColor(owner);
                    return (
                        <div key={owner} className="rounded-xl border overflow-hidden"
                            style={{ borderColor: color + '40' }}>
                            <div className="flex items-center justify-between px-3 py-2"
                                style={{ backgroundColor: color + '12' }}>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
                                    <User className="w-3 h-3" /> {owner}
                                </span>
                                <span className="font-bold text-sm text-foreground">{fmt(total)}</span>
                            </div>
                            <div className="px-3 py-2 space-y-1">
                                {codigos.map((c, i) => (
                                    <div key={`${c.codigo || c.titulo}-${c.tanda}-${i}`} className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-foreground flex items-center gap-1.5 min-w-0 flex-wrap">
                                            <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                            {c.codigo
                                                ? <><span className="font-mono font-semibold">{c.codigo}</span>
                                                    {c.titulo && <span className="text-muted-foreground truncate"> ({c.titulo})</span>}</>
                                                : <span className="text-muted-foreground">{c.titulo || '—'}</span>
                                            }
                                            {c.tanda && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0"
                                                    style={{ backgroundColor: '#f59e0b18', color: '#d97706' }}>
                                                    <Layers className="w-2.5 h-2.5" />{c.tanda}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold text-foreground flex-shrink-0 whitespace-nowrap">
                                            {c.docenas % 1 === 0 ? c.docenas : c.docenas.toFixed(1)} doc
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5">
                                {efectivo > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: '#16a34a18', color: '#16a34a' }}>
                                        <Banknote className="w-3 h-3" /> {fmt(efectivo)} ef.
                                    </span>
                                )}
                                {transferencia > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: '#2563eb18', color: '#2563eb' }}>
                                        <Building2 className="w-3 h-3" /> {fmt(transferencia)} transf.
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total global */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                    {totalEf > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: '#16a34a18', color: '#16a34a' }}>
                            <Banknote className="w-3 h-3" /> {fmt(totalEf)}
                        </span>
                    )}
                    {totalTr > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: '#2563eb18', color: '#2563eb' }}>
                            <Building2 className="w-3 h-3" /> {fmt(totalTr)}
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-foreground">{fmt(totalDia)}</span>
                    <span className="text-xs text-muted-foreground ml-1">{showUSD ? 'USD' : 'ARS'} total</span>
                </div>
            </div>
        </div>
    );
}

/* ─── DayCard (cuadrado de calendario) ───────────────────────── */

function DayCard({ fecha, items, isSelected, onClick }) {
    const { day, weekday, monthName } = formatDayCard(fecha);

    const totalDia = items.reduce((s, v) => s + Number(v.total_ars), 0);
    const totalEf  = items.reduce((s, v) => s + Number(v.monto_efectivo      || (v.metodo_pago === 'efectivo'      ? v.total_ars : 0)), 0);
    const totalTr  = items.reduce((s, v) => s + Number(v.monto_transferencia || (v.metodo_pago === 'transferencia' ? v.total_ars : 0)), 0);
    const dolar    = items[0]?.dolar_blue;
    const accentColor = totalEf >= totalTr ? '#16a34a' : '#2563eb';

    return (
        <button
            onClick={onClick}
            /* min-h para que queden parejos aunque el monto sea corto */
            className={[
                'relative flex flex-col rounded-2xl border text-left w-full',
                'p-2.5 sm:p-3',                         /* menos padding en mobile */
                'transition-all duration-150',
                'cursor-pointer select-none',
                'active:scale-95',                       /* feedback táctil */
                isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md'
                    : 'border-border bg-card',
            ].join(' ')}
            style={{ minHeight: '9rem' }}
        >
            {/* Franja de color arriba */}
            <span
                className="absolute top-0 left-3 right-3 h-0.5 rounded-full"
                style={{ backgroundColor: isSelected ? 'hsl(var(--primary))' : accentColor + '70' }}
            />

            {/* Día + mes */}
            <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-extrabold leading-none ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {day}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {monthName}
                </span>
            </div>

            {/* Día de semana */}
            <span className="text-[10px] text-muted-foreground capitalize mt-0.5 leading-tight">
                {weekday}
            </span>

            {/* Total — fuente adaptada al espacio */}
            <p className={[
                'font-bold mt-2 leading-tight break-all',
                'text-xs sm:text-sm',
                isSelected ? 'text-primary' : 'text-foreground',
            ].join(' ')}>
                ${formatARS(totalDia)}
            </p>

            {/* Badges de pago */}
            <div className="flex flex-wrap gap-1 mt-1.5">
                {totalEf > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}>
                        <Banknote className="w-2.5 h-2.5" /> ef
                    </span>
                )}
                {totalTr > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#2563eb15', color: '#2563eb' }}>
                        <Building2 className="w-2.5 h-2.5" /> tr
                    </span>
                )}
            </div>

            {/* Footer: ítems + dólar */}
            <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground">
                    {items.length}&nbsp;ítem{items.length !== 1 ? 's' : ''}
                </span>
                {dolar && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        ${Number(dolar).toLocaleString('es-AR')}&nbsp;USD
                    </span>
                )}
            </div>
        </button>
    );
}

/* ─── DeleteDayModal ──────────────────────────────────────────── */

function DeleteDayModal({ fecha, itemCount, onConfirm, onClose }) {
    const [password, setPassword] = useState('');
    const [showPwd,  setShowPwd]  = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        setError(null);
        try {
            await onConfirm(password);
        } catch (err) {
            setError(err.message || 'Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4">
            <div className="bg-card border-2 border-red-500 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">

                {/* Cabecera roja */}
                <div className="bg-red-600 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-white text-base tracking-tight uppercase">
                                Eliminar día completo
                            </h2>
                            <p className="text-red-100 text-xs mt-0.5 font-medium">
                                Esta acción es permanente e irreversible
                            </p>
                        </div>
                    </div>
                </div>

                {/* Aviso */}
                <div className="mx-5 mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3">
                    <p className="text-sm font-bold text-red-800 dark:text-red-200 capitalize">
                        {formatFullDate(fecha)}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                        Se eliminarán permanentemente{' '}
                        <span className="font-black text-red-800 dark:text-red-200">
                            {itemCount} venta{itemCount !== 1 ? 's' : ''}
                        </span>{' '}
                        de la base de datos. No podrás recuperarlos.
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            <Lock className="w-3 h-3" /> Contraseña de administrador
                        </label>
                        <div className="relative">
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(null); }}
                                placeholder="••••••••"
                                autoFocus
                                className={[
                                    'w-full px-3 py-2.5 border rounded-xl text-sm bg-background text-foreground',
                                    'focus:outline-none focus:ring-2 pr-10 transition-all',
                                    error
                                        ? 'border-red-400 focus:ring-red-400'
                                        : 'border-input focus:ring-red-500',
                                ].join(' ')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {error && (
                            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {error}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!password || loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Eliminando…</>
                                : <><Trash2 className="w-4 h-4" /> Eliminar todo</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── PedidoCard — tarjeta compacta de un pedido (mismo carrito confirmado) ── */

function PedidoCard({ pedido, color, fmtMonto, onOpen, getUserColor }) {
    const displayName = pedido.nombre || nombrePedidoGenerico(pedido.hora);
    const registradoPor = pedido.rows[0]?.registrado_por || null;
    const registradoColor = registradoPor && getUserColor ? getUserColor(registradoPor) : null;

    return (
        <button
            onClick={onOpen}
            className="group flex flex-col text-left rounded-2xl border overflow-hidden bg-card
                       transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ borderColor: color + '35' }}
        >
            {/* Franja superior de color — identifica al pedido de un vistazo */}
            <span className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: color }} />

            <div className="p-4 flex flex-col gap-2.5 flex-1" style={{ backgroundColor: color + '08' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                        style={{ backgroundColor: color + '1f', color }}>
                        <ShoppingBag className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-sm text-foreground truncate">{displayName}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: color + '1a', color }}>
                        <Clock className="w-3 h-3" />
                        {formatHora(pedido.hora)} hs
                    </span>
                    {registradoPor && (
                        <span
                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                            style={registradoColor && registradoColor !== '#9ca3af'
                                ? { backgroundColor: registradoColor + '22', color: registradoColor, border: `1px solid ${registradoColor}50` }
                                : { backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }
                            }
                        >
                            <User className="w-3 h-3" />
                            {registradoPor}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between mt-1 pt-2.5 border-t" style={{ borderColor: color + '25' }}>
                    <span className="text-xs text-muted-foreground">
                        {pedido.rows.length} producto{pedido.rows.length !== 1 ? 's' : ''}
                    </span>
                    <span className="font-bold text-sm text-foreground">{fmtMonto(pedido.total)}</span>
                </div>
            </div>
        </button>
    );
}

/* ─── EditVentaInline ─────────────────────────────────────────── */

function EditVentaInline({ venta, appUsers, cuentas, onSave, onCancel, saving }) {
    /* ── búsqueda de producto ── */
    const [query,           setQuery]           = useState('');
    const [searching,       setSearching]       = useState(false);
    const [results,         setResults]         = useState([]);
    const [showDrop,        setShowDrop]        = useState(false);
    const [selectedEntrada, setSelectedEntrada] = useState(null);
    const [showSearch,      setShowSearch]      = useState(false);
    const dropRef = useRef(null);

    /* ── datos del producto ── */
    const [prod, setProd] = useState({
        producto_titulo: venta.producto_titulo || '',
        codigo:          venta.codigo           || '',
        tanda_nombre:    venta.tanda_nombre     || '',
        propietario:     venta.propietario      || '',
    });
    const setProdField = (k, v) => setProd(prev => ({ ...prev, [k]: v }));

    /* ── precio y cantidad (strings formateados como en el scanner) ── */
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [price, setPrice] = useState(fmtMiles(venta.precio_docena_ars || ''));
    const [qty,   setQty]   = useState(String(venta.cantidad_docenas || ''));
    const [qtyError, setQtyError] = useState(false);

    /* ── pago ── */
    const [metodo,         setMetodo]         = useState(venta.metodo_pago || 'efectivo');
    const [selectedCuenta, setSelectedCuenta] = useState(null);
    const [efectivo,       setEfectivo]       = useState(
        venta.metodo_pago === 'mixto' ? fmtMiles(venta.monto_efectivo || '') : ''
    );
    const [transferencia,  setTransferencia]  = useState(
        venta.metodo_pago !== 'efectivo' ? fmtMiles(venta.monto_transferencia || '') : ''
    );

    const ownerColor = appUsers.find(u => u.username === prod.propietario)?.color || '#6366f1';
    const total = (parseFloat(rawNum(price)) || 0) * (parseFloat(qty) || 0);

    /* inicializar cuenta cuando cargan las cuentas */
    useEffect(() => {
        if (cuentas.length > 0 && venta.cuenta_nombre) {
            const found = cuentas.find(c => c.nombre === venta.cuenta_nombre);
            if (found) setSelectedCuenta(found);
        }
    }, [cuentas]);

    /* cerrar dropdown al hacer clic fuera */
    useEffect(() => {
        const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    /* búsqueda con debounce */
    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); setShowDrop(false); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await supabase
                    .from('entradas')
                    .select('id, producto_titulo, codigo, propietario, propietario_producto, tanda_nombre, marca, precio_docena, gastos, bultos, cantidad_docenas')
                    .or(`codigo.ilike.%${query}%,producto_titulo.ilike.%${query}%,marca.ilike.%${query}%,tanda_nombre.ilike.%${query}%`)
                    .order('tanda_nombre', { ascending: false })
                    .limit(20);
                setResults(data || []);
                setShowDrop(true);
            } finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const handleSelectEntrada = async (entrada) => {
        setSelectedEntrada(entrada);
        const propietarioEntrada = entrada.propietario_producto?.trim() || entrada.propietario?.trim() || '';
        setProd({
            producto_titulo: entrada.producto_titulo || entrada.codigo || '',
            codigo:          entrada.codigo           || '',
            tanda_nombre:    entrada.tanda_nombre     || '',
            propietario:     propietarioEntrada,
        });
        setQuery(''); setShowDrop(false); setShowSearch(false);

        setLoadingPrice(true);
        try {
            // 1. Precio custom (tabla precios_custom)
            const precioCustom = entrada.codigo
                ? (await supabase.from('precios_custom').select('precio_ars').eq('codigo', entrada.codigo).maybeSingle()).data?.precio_ars
                : null;

            if (precioCustom != null) {
                setPrice(fmtMiles(Number(precioCustom).toFixed(0)));
                return;
            }

            // 2. Calcular precio de lista: dólar blue + índice de tanda
            const [dolarRes, settingsRes] = await Promise.all([
                fetch('https://dolarapi.com/v1/dolares/blue'),
                entrada.tanda_nombre
                    ? supabase.from('tanda_settings').select('indice_ganancia_valor').eq('tanda_nombre', entrada.tanda_nombre).maybeSingle()
                    : Promise.resolve({ data: null }),
            ]);

            if (!dolarRes.ok) throw new Error('no dolar');
            const dolarBlue = parseFloat((await dolarRes.json())?.venta);
            if (!dolarBlue) throw new Error('no dolar value');

            const indice = parseFloat(settingsRes.data?.indice_ganancia_valor || 1.5);
            const prices = calcPrice(
                { ...entrada, _source: 'entradas' },
                { cotizacion_dolar: dolarBlue, indice_ganancia_valor: indice }
            );

            if (prices.precioVentaArg != null) {
                setPrice(fmtMiles(prices.precioVentaArg.toFixed(0)));
            } else if (entrada.precio_docena) {
                setPrice(fmtMiles(entrada.precio_docena));
            }
        } catch {
            if (entrada.precio_docena) setPrice(fmtMiles(entrada.precio_docena));
        } finally {
            setLoadingPrice(false);
        }
    };

    const calcTransf = (ef, tot) => {
        const base = Math.max(0, tot - (parseFloat(rawNum(ef)) || 0));
        return base === 0 ? '' : fmtMiles(base.toFixed(0));
    };
    const handleEfectivoChange = (val) => {
        const fmt = fmtMiles(val);
        setEfectivo(fmt);
        setTransferencia(calcTransf(fmt, total));
    };
    const handleTransferenciaChange = (val) => {
        const fmt = fmtMiles(val);
        setTransferencia(fmt);
        const tr = parseFloat(rawNum(fmt)) || 0;
        const ef = Math.max(0, total - tr);
        setEfectivo(ef > 0 ? fmtMiles(ef.toFixed(0)) : '');
    };

    const handleSave = () => {
        const precio   = parseFloat(rawNum(price)) || 0;
        const cantidad = parseFloat(qty)            || 0;
        if (!cantidad || cantidad <= 0) { setQtyError(true); return; }
        const total_ars = precio * cantidad;
        let monto_efectivo = 0, monto_transferencia = 0, cuenta_nombre = null;
        if (metodo === 'efectivo') {
            monto_efectivo = total_ars;
        } else if (metodo === 'transferencia') {
            monto_transferencia = parseFloat(rawNum(transferencia)) || total_ars;
            cuenta_nombre = selectedCuenta?.nombre || null;
        } else {
            monto_efectivo      = parseFloat(rawNum(efectivo))      || 0;
            monto_transferencia = parseFloat(rawNum(transferencia)) || 0;
            cuenta_nombre = selectedCuenta?.nombre || null;
        }
        onSave({
            producto_titulo:   prod.producto_titulo,
            codigo:            prod.codigo       || null,
            tanda_nombre:      prod.tanda_nombre || null,
            cantidad_docenas:  cantidad,
            precio_docena_ars: precio,
            total_ars,
            propietario:       prod.propietario  || null,
            metodo_pago:       metodo,
            monto_efectivo,
            monto_transferencia,
            cuenta_nombre,
        });
    };

    const inputCls = 'w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium';
    const labelCls = 'text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide';

    return (
        <div className="px-5 py-4 space-y-4">

            {/* ── Buscador de producto ── */}
            <div>
                <label className={labelCls}>Producto</label>

                {prod.producto_titulo && !showSearch && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 mb-3"
                        style={{ borderColor: ownerColor + '50', backgroundColor: ownerColor + '08' }}>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{prod.producto_titulo}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {prod.codigo && (
                                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{prod.codigo}</span>
                                )}
                                {prod.tanda_nombre && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Layers className="w-2.5 h-2.5" />{prod.tanda_nombre}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button type="button"
                            onClick={() => { setSelectedEntrada(null); setQuery(''); setShowSearch(true); }}
                            className="text-xs font-semibold hover:underline flex-shrink-0"
                            style={{ color: ownerColor }}>
                            Cambiar
                        </button>
                    </div>
                )}

                {(showSearch || !prod.producto_titulo) && (
                    <div ref={dropRef} className="relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                autoFocus
                                className={`${inputCls} pl-9 pr-16`}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onFocus={() => query.length >= 2 && setShowDrop(true)}
                                placeholder="Buscar por nombre, código, marca o tanda…"
                            />
                            {searching && <RefreshCw className="absolute right-10 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                            {query && !searching && (
                                <button type="button" onClick={() => { setQuery(''); setShowDrop(false); }}
                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {prod.producto_titulo && (
                                <button type="button"
                                    onClick={() => { setShowSearch(false); setQuery(''); setShowDrop(false); }}
                                    title="Volver al producto actual"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {showDrop && results.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                                {results.map(e => {
                                    const eProp = e.propietario_producto?.trim() || e.propietario?.trim() || '';
                                    const eColor = appUsers.find(u => u.username === eProp)?.color || '#9ca3af';
                                    return (
                                        <button key={e.id} type="button" onMouseDown={() => handleSelectEntrada(e)}
                                            className="w-full text-left px-3 py-2.5 transition-colors border-b border-border/50 last:border-0"
                                            style={{ borderLeft: `4px solid ${eColor}`, backgroundColor: `${eColor}08` }}
                                            onMouseEnter={ev => ev.currentTarget.style.backgroundColor = `${eColor}18`}
                                            onMouseLeave={ev => ev.currentTarget.style.backgroundColor = `${eColor}08`}>
                                            <p className="text-sm font-semibold text-foreground truncate">{e.producto_titulo || e.codigo || '—'}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                {e.codigo && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{e.codigo}</span>}
                                                {e.marca && <span className="text-[10px] text-muted-foreground">{e.marca}</span>}
                                                {e.tanda_nombre && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Layers className="w-2.5 h-2.5" />{e.tanda_nombre}</span>}
                                                {eProp && (
                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                                        style={{ backgroundColor: `${eColor}20`, color: eColor }}>
                                                        <User className="w-2.5 h-2.5" />{eProp}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {showDrop && results.length === 0 && !searching && query.length >= 2 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl px-4 py-3 text-center text-sm text-muted-foreground">
                                Sin resultados para "{query}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Precio y cantidad ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Precio por docena (ARS)</label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={price}
                            onChange={e => setPrice(fmtMiles(e.target.value))}
                            placeholder={loadingPrice ? 'Buscando precio…' : '0'}
                            disabled={loadingPrice}
                            className={`${inputCls} pr-8 disabled:opacity-60`}
                        />
                        {loadingPrice && (
                            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                        )}
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Cantidad (docenas)</label>
                    <input
                        type="number"
                        value={qty}
                        onChange={e => { setQty(e.target.value); setQtyError(false); }}
                        min="0.5"
                        step="0.5"
                        className={`${inputCls} ${qtyError ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                    {qtyError && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Ingresá una cantidad válida
                        </p>
                    )}
                </div>
            </div>

            {/* ── Propietario ── */}
            {appUsers.length > 0 && (
                <div>
                    <label className={labelCls}>Propietario</label>
                    <select className={inputCls} value={prod.propietario} onChange={e => setProdField('propietario', e.target.value)}>
                        <option value="">Sin propietario</option>
                        {appUsers.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                    </select>
                </div>
            )}

            {/* ── Método de pago ── */}
            <div>
                <label className={labelCls}>Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                    {METODOS_EDIT.map(({ id, label, Icon }) => {
                        const active = metodo === id;
                        return (
                            <button key={id} type="button"
                                onClick={() => { setMetodo(id); setSelectedCuenta(null); setEfectivo(''); setTransferencia(''); }}
                                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
                                style={active
                                    ? { borderColor: ownerColor, backgroundColor: ownerColor + '15', color: ownerColor }
                                    : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                                }>
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Cuenta destino ── */}
            {(metodo === 'transferencia' || metodo === 'mixto') && (
                <div>
                    <label className={labelCls}>Cuenta destino</label>
                    {cuentas.length === 0 ? (
                        <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-xl">
                            No hay cuentas activas.
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {cuentas.map(cuenta => {
                                const sel = selectedCuenta?.id === cuenta.id;
                                return (
                                    <button key={cuenta.id} type="button" onClick={() => setSelectedCuenta(cuenta)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all"
                                        style={sel
                                            ? { borderColor: ownerColor, backgroundColor: ownerColor + '15' }
                                            : { borderColor: 'var(--border)' }
                                        }>
                                        <Building2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{cuenta.nombre}</p>
                                            {cuenta.titular && <p className="text-xs text-muted-foreground">{cuenta.titular}</p>}
                                        </div>
                                        {sel && <div className="ml-auto w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: ownerColor }} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Montos mixto ── */}
            {metodo === 'mixto' && total > 0 && (
                <div className="space-y-3">
                    <div>
                        <label className={labelCls}>Monto en efectivo (ARS)</label>
                        <input type="text" inputMode="numeric" value={efectivo}
                            onChange={e => handleEfectivoChange(e.target.value)}
                            placeholder="0" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Monto en transferencia (ARS)</label>
                        <input type="text" inputMode="numeric" value={transferencia}
                            onChange={e => handleTransferenciaChange(e.target.value)}
                            placeholder="0" className={inputCls} />
                    </div>
                    {parseFloat(rawNum(efectivo)) > 0 && parseFloat(rawNum(transferencia)) > 0 && (
                        <div className="rounded-2xl overflow-hidden border border-border">
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <div className="flex flex-col items-center gap-1 px-3 py-3.5 bg-muted/40">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Banknote className="w-3.5 h-3.5" />
                                        <span className="text-xs font-semibold uppercase tracking-wide">Efectivo</span>
                                    </div>
                                    <p className="text-xl font-bold text-foreground leading-tight">
                                        ${parseFloat(rawNum(efectivo)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </p>
                                    <span className="text-xs text-muted-foreground font-medium">ARS</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 px-3 py-3.5 bg-muted/40">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span className="text-xs font-semibold uppercase tracking-wide">Transferencia</span>
                                    </div>
                                    <p className="text-xl font-bold text-foreground leading-tight">
                                        ${parseFloat(rawNum(transferencia)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </p>
                                    <span className="text-xs text-muted-foreground font-medium">ARS</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Total destacado ── */}
            {total > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: ownerColor + '12', border: `1px solid ${ownerColor}30` }}>
                    <span className="text-sm font-medium text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold" style={{ color: ownerColor }}>
                        ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        <span className="text-sm font-semibold ml-1 opacity-70">ARS</span>
                    </span>
                </div>
            )}

            {/* ── Botones ── */}
            <div className="flex gap-2">
                <button type="button" onClick={onCancel} disabled={saving}
                    className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                    Cancelar
                </button>
                <button type="button" onClick={handleSave}
                    disabled={saving || !prod.producto_titulo.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 text-white disabled:opacity-50"
                    style={{ backgroundColor: ownerColor }}>
                    {saving
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando…</>
                        : <><Check className="w-5 h-5" /> Guardar cambios</>
                    }
                </button>
            </div>
        </div>
    );
}

/* ─── PedidoModal — detalle completo de un pedido ───────────────────── */

function PedidoModal({ pedido, color, getUserColor, appUsers, fmtMonto, onDelete, deletingId, onRename, onDeletePedido, deletingPedidoId, onEdit, onAdd, onClose }) {
    const [editing,        setEditing]        = useState(false);
    const registradoPor   = pedido.rows[0]?.registrado_por || null;
    const registradoColor = registradoPor ? getUserColor(registradoPor) : null;
    const [nameDraft,      setNameDraft]      = useState(pedido.nombre || '');
    const [cuentas,        setCuentas]        = useState([]);
    const [editingId,      setEditingId]      = useState(null);
    const [savingId,       setSavingId]       = useState(null);
    const [addingProduct,  setAddingProduct]  = useState(false);
    const [savingAdd,      setSavingAdd]      = useState(false);

    useEffect(() => {
        supabase.from('cuentas_bancarias').select('id, nombre, titular').eq('activa', true).then(({ data }) => {
            if (data) setCuentas(data);
        });
    }, []);

    const handleEditSave = async (ventaId, data) => {
        setSavingId(ventaId);
        try {
            await onEdit(ventaId, data);
            setEditingId(null);
        } finally {
            setSavingId(null);
        }
    };

    const handleAdd = async (data) => {
        setSavingAdd(true);
        try {
            await onAdd(pedido.ventaId, data);
            setAddingProduct(false);
        } finally {
            setSavingAdd(false);
        }
    };

    const displayName = pedido.nombre || nombrePedidoGenerico(pedido.hora);

    const startEditing = () => {
        setNameDraft(pedido.nombre || '');
        setEditing(true);
    };

    const submitRename = (e) => {
        e.preventDefault();
        onRename(pedido.ventaId, nameDraft);
        setEditing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden">

                {/* Franja de color — coincide con la tarjeta para identificar el pedido */}
                <span className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: color }} />

                {/* Cabecera */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0"
                    style={{ backgroundColor: color + '0c' }}>
                    <div className="min-w-0 flex-1">
                        {editing ? (
                            <form onSubmit={submitRename} className="flex items-center gap-1.5">
                                <input
                                    autoFocus
                                    type="text"
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    placeholder={nombrePedidoGenerico(pedido.hora)}
                                    maxLength={80}
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-background text-sm font-semibold
                                               text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <button type="submit"
                                    title="Guardar nombre"
                                    aria-label="Guardar nombre"
                                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25 transition-colors flex-shrink-0">
                                    <Check className="w-5 h-5" />
                                </button>
                                <button type="button"
                                    onClick={() => { setEditing(false); setNameDraft(pedido.nombre || ''); }}
                                    title="Cancelar"
                                    aria-label="Cancelar"
                                    className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-muted active:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </form>
                        ) : (
                            <button onClick={startEditing}
                                title="Editar nombre del pedido"
                                aria-label="Editar nombre del pedido"
                                className="group flex items-center gap-2.5 text-left min-w-0 max-w-full -ml-2 pl-2 pr-2.5 py-2 rounded-xl
                                           hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors">
                                <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                                    style={{ backgroundColor: color + '1f', color }}>
                                    <ShoppingBag className="w-4 h-4" />
                                </span>
                                <span className="font-bold text-base text-foreground truncate">{displayName}</span>
                                <span className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0
                                                 text-muted-foreground group-hover:text-foreground transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </span>
                            </button>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: color + '1a', color }}>
                                <Clock className="w-3 h-3" />
                                {formatHora(pedido.hora)} hs · {pedido.rows.length} producto{pedido.rows.length !== 1 ? 's' : ''}
                            </span>
                            {registradoPor && (
                                <span
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                                    style={registradoColor && registradoColor !== '#9ca3af'
                                        ? { backgroundColor: registradoColor + '22', color: registradoColor, border: `1px solid ${registradoColor}50` }
                                        : { backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }
                                    }
                                >
                                    <User className="w-3.5 h-3.5" />
                                    {registradoPor}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={() => onDeletePedido(pedido)}
                            disabled={deletingPedidoId === pedido.ventaId}
                            title="Eliminar pedido completo"
                            aria-label="Eliminar pedido completo"
                            className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-destructive/10 active:bg-destructive/15
                                       text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                            {deletingPedidoId === pedido.ventaId
                                ? <RefreshCw className="w-5 h-5 animate-spin" />
                                : <Trash2 className="w-5 h-5" />
                            }
                        </button>
                        <button onClick={onClose}
                            title="Cerrar"
                            aria-label="Cerrar"
                            className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-muted active:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Productos del pedido */}
                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                    {pedido.rows.map(venta => {
                        const ownerColor = getUserColor(venta.propietario);
                        const isEditing  = editingId === venta.id;
                        return (
                            <div key={venta.id} style={{ borderLeft: `4px solid ${ownerColor}` }}>
                                {isEditing ? (
                                    <EditVentaInline
                                        venta={venta}
                                        appUsers={appUsers}
                                        cuentas={cuentas}
                                        onSave={(data) => handleEditSave(venta.id, data)}
                                        onCancel={() => setEditingId(null)}
                                        saving={savingId === venta.id}
                                    />
                                ) : (
                                    <div className="flex items-stretch">
                                        <div className="flex-1 px-4 py-3.5 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-foreground text-sm">
                                                    {venta.producto_titulo}
                                                </span>
                                                {venta.codigo && (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                                        <Tag className="w-2.5 h-2.5" /> {venta.codigo}
                                                    </span>
                                                )}
                                                {venta.tanda_nombre && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                        <Layers className="w-2.5 h-2.5" /> {venta.tanda_nombre}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: ownerColor + '20', color: ownerColor, border: `1px solid ${ownerColor}40` }}>
                                                    <User className="w-2.5 h-2.5" />
                                                    {venta.propietario || 'Sin propietario'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {venta.cantidad_docenas} doc × {fmtMonto(venta.precio_docena_ars)}
                                                </span>
                                                {Number(venta.dolar_blue) > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                        <DollarSign className="w-2.5 h-2.5" />
                                                        ${Number(venta.dolar_blue).toLocaleString('es-AR')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1.5">
                                                <PaymentBadge venta={venta} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end justify-between px-3 py-3.5 flex-shrink-0">
                                            <p className="font-bold text-foreground text-base">
                                                {fmtMonto(venta.total_ars)}
                                            </p>
                                            <div className="flex items-center gap-1 mt-auto">
                                                <button
                                                    onClick={() => setEditingId(venta.id)}
                                                    title="Editar producto"
                                                    className="p-1.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(venta.id)}
                                                    disabled={deletingId === venta.id}
                                                    className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    {deletingId === venta.id
                                                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        : <Trash2 className="w-3.5 h-3.5" />
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* ── Agregar producto ── */}
                    {addingProduct ? (
                        <EditVentaInline
                            venta={{}}
                            appUsers={appUsers}
                            cuentas={cuentas}
                            onSave={handleAdd}
                            onCancel={() => setAddingProduct(false)}
                            saving={savingAdd}
                        />
                    ) : (
                        <button
                            onClick={() => setAddingProduct(true)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar producto al pedido
                        </button>
                    )}
                </div>

                {/* Total del pedido */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0"
                    style={{ backgroundColor: color + '0c' }}>
                    <span className="text-sm font-semibold text-muted-foreground">Total del pedido</span>
                    <span className="text-lg font-bold text-foreground">{fmtMonto(pedido.total)}</span>
                </div>
            </div>
        </div>
    );
}

/* ─── DayDetail — panel de detalle (inline + bottom-sheet en mobile) ── */

function DayDetail({ fecha, items, getUserColor, appUsers, onClose, onDelete, deletingId, isMobile, onDeleteDay, onRenamePedido, onDeletePedido, deletingPedidoId, onEdit, onAdd }) {
    const [activeTab,        setActiveTab]        = useState('resumen');
    const [showUSD,          setShowUSD]          = useState(false);
    const [showDeleteDay,    setShowDeleteDay]    = useState(false);
    const [openPedidoId,     setOpenPedidoId]     = useState(null);
    const dolarDia = items.find(v => Number(v.dolar_blue) > 0)?.dolar_blue ?? null;
    const fmtMonto = (n) => showUSD && dolarDia
        ? `u$s ${formatUSD(n / dolarDia)}`
        : `$${formatARS(n)}`;
    const pedidos = groupByPedido(items);
    const openPedidoIndex = pedidos.findIndex(p => p.ventaId === openPedidoId);
    const openPedido = openPedidoIndex >= 0 ? pedidos[openPedidoIndex] : null;
    const panelRef = useRef(null);

    /* Scroll suave hacia el panel solo en desktop */
    useEffect(() => {
        if (!isMobile && panelRef.current) {
            setTimeout(() => panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        }
    }, [fecha, isMobile]);

    /* En mobile: bloquear scroll del body mientras el sheet está abierto */
    useEffect(() => {
        if (isMobile) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isMobile]);

    const inner = (
        <>
            {/* Handle de arrastre (solo mobile) */}
            {isMobile && (
                <div className="flex justify-center pt-2.5 pb-1">
                    <span className="w-10 h-1 rounded-full bg-border/80" />
                </div>
            )}

            {/* Header */}
            <div className={[
                'flex items-center justify-between border-b border-border',
                isMobile ? 'px-4 py-3' : 'px-4 py-3 bg-primary/5',
            ].join(' ')}>
                <div>
                    <p className="font-bold text-foreground text-sm capitalize">{formatFullDate(fecha)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {items.length} venta{items.length !== 1 ? 's' : ''} registrada{items.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDeleteDay(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                        title="Eliminar todas las ventas de este día"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Eliminar día</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Modal eliminar día */}
            {showDeleteDay && (
                <DeleteDayModal
                    fecha={fecha}
                    itemCount={items.length}
                    onConfirm={async (password) => {
                        await onDeleteDay(fecha, password);
                        setShowDeleteDay(false);
                    }}
                    onClose={() => setShowDeleteDay(false)}
                />
            )}

            {/* Pestañas: Resumen / Pedidos */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
                {[
                    { id: 'resumen', label: 'Resumen' },
                    { id: 'pedidos', label: `Pedidos (${pedidos.length})` },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={[
                            'px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors -mb-px border-b-2',
                            activeTab === tab.id
                                ? 'text-primary border-primary'
                                : 'text-muted-foreground border-transparent hover:text-foreground',
                        ].join(' ')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contenido según pestaña activa */}
            <div className={`px-4 py-4 ${isMobile ? 'overflow-y-auto' : ''}`}
                style={isMobile ? { maxHeight: 'calc(80dvh - 240px)' } : {}}>
                {activeTab === 'resumen' && (
                    <DailySummary items={items} getUserColor={getUserColor} showUSD={showUSD} setShowUSD={setShowUSD} />
                )}

                {activeTab === 'pedidos' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pedidos.map((pedido, idx) => (
                            <PedidoCard
                                key={pedido.ventaId}
                                pedido={pedido}
                                color={pedidoColor(idx)}
                                fmtMonto={fmtMonto}
                                onOpen={() => setOpenPedidoId(pedido.ventaId)}
                                getUserColor={getUserColor}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal con el detalle del pedido seleccionado */}
            {openPedido && (
                <PedidoModal
                    key={openPedido.ventaId}
                    pedido={openPedido}
                    color={pedidoColor(openPedidoIndex)}
                    getUserColor={getUserColor}
                    appUsers={appUsers}
                    fmtMonto={fmtMonto}
                    onDelete={onDelete}
                    deletingId={deletingId}
                    onRename={onRenamePedido}
                    onDeletePedido={onDeletePedido}
                    deletingPedidoId={deletingPedidoId}
                    onEdit={onEdit}
                    onAdd={onAdd}
                    onClose={() => setOpenPedidoId(null)}
                />
            )}
        </>
    );

    /* ── MOBILE: bottom sheet fijo ── */
    if (isMobile) {
        return (
            <>
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-black/40 z-40"
                    onClick={onClose}
                />
                {/* Sheet */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl border-t border-border overflow-hidden"
                    style={{ maxHeight: '85dvh' }}>
                    {inner}
                </div>
            </>
        );
    }

    /* ── DESKTOP: panel inline ── */
    return (
        <div ref={panelRef}
            className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-lg">
            {inner}
        </div>
    );
}

/* ─── AccumulatorModal ────────────────────────────────────────── */

function todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function firstOfMonthStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
}

function AccumulatorModal({ ventas, appUsers, onClose }) {
    const [desde,       setDesde]       = useState(firstOfMonthStr);
    const [hasta,       setHasta]       = useState(todayStr);
    const [showUSD,     setShowUSD]     = useState(false);
    const [modo,        setModo]        = useState('conTransf'); // 'conTransf' | 'soloEfectivo' | 'total'
    const [cuentasInfo, setCuentasInfo] = useState([]);

    useEffect(() => {
        supabase.from('cuentas_bancarias').select('nombre, propietario').then(({ data }) => {
            if (data) setCuentasInfo(data);
        });
    }, []);

    const getCuentaProp = (cuentaNombre) =>
        cuentasInfo.find(c => c.nombre === cuentaNombre)?.propietario || null;

    const getUserColor = (name) => appUsers.find(u => u.username === name)?.color || '#9ca3af';

    const filtered       = ventas.filter(v => v.fecha >= desde && v.fecha <= hasta);
    const displayedCount = modo === 'soloEfectivo'
        ? filtered.filter(v => v.metodo_pago === 'efectivo').length
        : modo === 'conTransf'
            ? filtered.filter(v => v.metodo_pago === 'transferencia' || v.metodo_pago === 'mixto').length
            : filtered.length;

    const byOwner = {};
    const addToOwner = (owner, ars, dolarBlue) => {
        if (!byOwner[owner]) byOwner[owner] = { ars: 0, usd: 0, sinDolar: false };
        byOwner[owner].ars += ars;
        if (Number(dolarBlue) > 0) {
            byOwner[owner].usd += ars / Number(dolarBlue);
        } else if (ars > 0) {
            byOwner[owner].sinDolar = true;
        }
    };

    for (const v of filtered) {
        const productOwner = v.propietario || 'Sin propietario';
        const dolar = v.dolar_blue;

        if (modo === 'soloEfectivo') {
            if (v.metodo_pago === 'efectivo') addToOwner(productOwner, Number(v.total_ars), dolar);
        } else if (modo === 'total') {
            addToOwner(productOwner, Number(v.total_ars), dolar);
        } else {
            // conTransf: solo el monto de transferencia, atribuido al dueño del producto
            if (v.metodo_pago === 'transferencia') {
                addToOwner(productOwner, Number(v.monto_transferencia || v.total_ars), dolar);
            } else if (v.metodo_pago === 'mixto') {
                const tr = Number(v.monto_transferencia || 0);
                if (tr > 0) addToOwner(productOwner, tr, dolar);
            }
        }
    }

    const owners   = Object.keys(byOwner).sort((a, b) => a.localeCompare(b));
    const totalARS = owners.reduce((s, o) => s + byOwner[o].ars, 0);
    const totalUSD = owners.reduce((s, o) => s + byOwner[o].usd, 0);
    const hasSinDolar = owners.some(o => byOwner[o].sinDolar);

    const fmt = (ars, usd) => showUSD
        ? `u$s ${formatUSD(usd)}`
        : `$${formatARS(ars)}`;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90dvh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-foreground text-base">Acumulado por propietario</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Suma de ventas en el rango seleccionado</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Selectores de rango */}
                <div className="px-5 py-3 border-b border-border/60 flex flex-wrap items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Desde</label>
                        <input
                            type="date"
                            value={desde}
                            max={hasta}
                            onChange={e => setDesde(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hasta</label>
                        <input
                            type="date"
                            value={hasta}
                            min={desde}
                            onChange={e => setHasta(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none"
                        />
                    </div>
                </div>

                {/* Filtros */}
                <div className="px-5 pt-3 pb-2 space-y-2 flex-shrink-0">
                    {/* Modo toggle */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-full">
                        <button
                            onClick={() => setModo('conTransf')}
                            className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${modo === 'conTransf' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        >
                            <Building2 className="w-3 h-3" /> Con transf.
                        </button>
                        <button
                            onClick={() => setModo('soloEfectivo')}
                            className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${modo === 'soloEfectivo' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        >
                            <Banknote className="w-3 h-3" /> Solo ef.
                        </button>
                        <button
                            onClick={() => setModo('total')}
                            className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${modo === 'total' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        >
                            <TrendingUp className="w-3 h-3" /> Total ventas
                        </button>
                    </div>
                    {/* Conteo + ARS/USD */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            {displayedCount} venta{displayedCount !== 1 ? 's' : ''}
                            {modo !== 'total' && filtered.length !== displayedCount && (
                                <span className="ml-1 text-muted-foreground/60">
                                    ({filtered.length - displayedCount} excluidas)
                                </span>
                            )}
                        </span>
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                            <button
                                onClick={() => setShowUSD(false)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${!showUSD ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                            >
                                ARS
                            </button>
                            <button
                                onClick={() => setShowUSD(true)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${showUSD ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                            >
                                <DollarSign className="w-3 h-3" /> USD
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cuerpo */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
                    {displayedCount === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin ventas en ese rango</p>
                        </div>
                    )}

                    {owners.map(owner => {
                        const { ars, usd } = byOwner[owner];
                        const color = getUserColor(owner);
                        return (
                            <div key={owner}
                                className="flex items-center justify-between px-4 py-3.5 rounded-2xl border"
                                style={{ borderColor: color + '40', backgroundColor: color + '08' }}
                            >
                                <span className="inline-flex items-center gap-2 text-sm font-bold"
                                    style={{ color }}>
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    {owner}
                                </span>
                                <span className="font-bold text-foreground text-base tabular-nums">
                                    {fmt(ars, usd)}
                                </span>
                            </div>
                        );
                    })}

                    {hasSinDolar && showUSD && (
                        <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-xl">
                            Algunas ventas no tienen cotización del dólar registrada y no se incluyen en el total USD.
                        </p>
                    )}

                    {/* Total global */}
                    {owners.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 mt-1">
                            <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Total acumulado
                            </span>
                            <span className="text-xl font-bold text-primary tabular-nums">
                                {fmt(totalARS, totalUSD)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── CuentasModal ────────────────────────────────────────────── */

function CuentasModal({ ventas, onClose }) {
    const [desde, setDesde] = useState(firstOfMonthStr);
    const [hasta, setHasta] = useState(todayStr);
    const [cuentasInfo, setCuentasInfo] = useState([]);

    useEffect(() => {
        supabase.from('cuentas_bancarias').select('nombre, titular, reiniciado_at, propietario').then(({ data }) => {
            if (data) setCuentasInfo(data);
        });
    }, []);

    const getCuentaInfo        = (nombre) => cuentasInfo.find(c => c.nombre === nombre);
    const getTitular           = (nombre) => getCuentaInfo(nombre)?.titular || null;
    const getCuentaPropietario = (nombre) => getCuentaInfo(nombre)?.propietario || null;
    const getReinicioDate      = (nombre) => {
        const r = getCuentaInfo(nombre)?.reiniciado_at;
        return r ? r.substring(0, 10) : null;
    };

    const conTransf = ventas.filter(v => Number(v.monto_transferencia) > 0);

    const filtered = conTransf.filter(v => v.fecha >= desde && v.fecha <= hasta);

    const byRango = {};
    for (const v of filtered) {
        const k = v.cuenta_nombre || 'Sin cuenta';
        const reinicio = getReinicioDate(k);
        if (reinicio && v.fecha < reinicio) continue;
        if (!byRango[k]) byRango[k] = { monto: 0, ops: 0 };
        byRango[k].monto += Number(v.monto_transferencia);
        byRango[k].ops   += 1;
    }

    const byHistorico = {};
    for (const v of conTransf.filter(v => v.fecha <= hasta)) {
        const k = v.cuenta_nombre || 'Sin cuenta';
        const reinicio = getReinicioDate(k);
        if (reinicio && v.fecha < reinicio) continue;
        if (!byHistorico[k]) byHistorico[k] = 0;
        byHistorico[k] += Number(v.monto_transferencia);
    }

    const cuentas = [...new Set([
        ...Object.keys(byRango),
        ...Object.keys(byHistorico),
    ])].sort((a, b) => (byRango[b]?.monto || 0) - (byRango[a]?.monto || 0));

    const totalRango     = Object.values(byRango).reduce((s, v) => s + v.monto, 0);
    const totalHistorico = Object.values(byHistorico).reduce((s, v) => s + v, 0);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90dvh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            Transferencias por cuenta
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Montos enviados a cada cuenta bancaria</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Rango de fechas */}
                <div className="px-5 py-3 border-b border-border/60 flex flex-wrap items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Desde</label>
                        <input
                            type="date"
                            value={desde}
                            max={hasta}
                            onChange={e => setDesde(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hasta</label>
                        <input
                            type="date"
                            value={hasta}
                            min={desde}
                            onChange={e => setHasta(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none"
                        />
                    </div>
                </div>

                {/* Subtítulo */}
                <div className="px-5 pt-3 pb-1 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                        {filtered.length} operación{filtered.length !== 1 ? 'es' : ''} con transferencia en el rango
                    </span>
                </div>

                {/* Cuerpo */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5 pt-2">
                    {cuentas.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin transferencias en ese rango</p>
                        </div>
                    )}

                    {cuentas.map(cuenta => {
                        const rango       = byRango[cuenta];
                        const hist        = byHistorico[cuenta] || 0;
                        const propietario = getCuentaPropietario(cuenta);
                        const color       = getPropColor(propietario).text;
                        return (
                            <div key={cuenta} className="rounded-2xl border overflow-hidden"
                                style={{ borderColor: color + '50', backgroundColor: color + '08' }}>
                                {/* Fila principal */}
                                <div className="px-4 py-3 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate">{cuenta}</p>
                                            {getTitular(cuenta) && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                                    <User className="w-2.5 h-2.5 flex-shrink-0" />
                                                    {getTitular(cuenta)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-base tabular-nums" style={{ color }}>
                                            {rango ? `$${formatARS(rango.monto)}` : '—'}
                                        </p>
                                        {rango && (
                                            <p className="text-xs text-muted-foreground">
                                                {rango.ops} op{rango.ops !== 1 ? 's' : ''}. en rango
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Acumulado histórico */}
                                <div className="px-4 pb-3 pt-2 border-t flex items-center justify-between"
                                    style={{ borderColor: color + '25' }}>
                                    <span className="text-xs text-muted-foreground">
                                        {getReinicioDate(cuenta)
                                            ? <>Desde reinicio hasta {hasta}</>
                                            : <>Acumulado hasta {hasta}</>
                                        }
                                    </span>
                                    <span className="text-xs font-semibold text-foreground tabular-nums">
                                        ${formatARS(hist)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Total rango */}
                    {totalRango > 0 && (
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-blue-600/10 border border-blue-600/20 mt-1">
                            <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                Total transferido en rango
                            </span>
                            <span className="text-xl font-bold text-blue-700 tabular-nums">
                                ${formatARS(totalRango)}
                            </span>
                        </div>
                    )}

                    {/* Total histórico */}
                    {totalHistorico > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-muted border border-border">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Total histórico hasta {hasta}
                            </span>
                            <span className="text-base font-bold text-foreground tabular-nums">
                                ${formatARS(totalHistorico)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── CruceModal ──────────────────────────────────────────────── */

const PROP_COLORS = {
    luis:    { bg: '#dbeafe', text: '#1d4ed8' },
    gabriel: { bg: '#ede9fe', text: '#7c3aed' },
    rosa:    { bg: '#fce7f3', text: '#be185d' },
};
const getPropColor = (name) => PROP_COLORS[name?.toLowerCase()] || { bg: '#f3f4f6', text: '#6b7280' };

function CruceModal({ ventas, onClose }) {
    const [desde,       setDesde]       = useState(firstOfMonthStr);
    const [hasta,       setHasta]       = useState(todayStr);
    const [cuentasInfo, setCuentasInfo] = useState([]);
    const [expandedPar, setExpandedPar] = useState(null);
    const [showUSD,     setShowUSD]     = useState(false);
    const [vistaBalance, setVistaBalance] = useState(true); // true=balance, false=detalle por par

    useEffect(() => {
        supabase.from('cuentas_bancarias').select('nombre, propietario').then(({ data }) => {
            if (data) setCuentasInfo(data);
        });
    }, []);

    const getCuentaProp = (cuentaNombre) =>
        cuentasInfo.find(c => c.nombre === cuentaNombre)?.propietario || null;

    const buildCruces = (items) => {
        const byPar = {};
        for (const v of items) {
            const propCuenta = getCuentaProp(v.cuenta_nombre);
            if (!propCuenta || !v.propietario || propCuenta.toLowerCase() === v.propietario.toLowerCase()) continue;
            const key = `${v.propietario}|${propCuenta}`;
            if (!byPar[key]) byPar[key] = { de: v.propietario, a: propCuenta, monto: 0, montoUsd: 0, sinDolar: false, items: [] };
            byPar[key].monto += Number(v.monto_transferencia);
            const dolar = Number(v.dolar_blue);
            if (dolar > 0) {
                byPar[key].montoUsd += Number(v.monto_transferencia) / dolar;
            } else {
                byPar[key].sinDolar = true;
            }
            byPar[key].items.push(v);
        }
        return byPar;
    };

    const crucesRango    = buildCruces(ventas.filter(v => v.fecha >= desde && v.fecha <= hasta && Number(v.monto_transferencia) > 0));
    const crucesHistoric = buildCruces(ventas.filter(v => v.fecha <= hasta && Number(v.monto_transferencia) > 0));

    const pares = [...new Set([...Object.keys(crucesHistoric), ...Object.keys(crucesRango)])]
        .sort((a, b) => (crucesHistoric[b]?.monto || 0) - (crucesHistoric[a]?.monto || 0));

    // Balance consolidado: agrupar por deudor (a) → lista de acreedores (de)
    const buildBalance = (cruces) => {
        const deudores = {};
        for (const key of Object.keys(cruces)) {
            const { de, a, monto, montoUsd, sinDolar } = cruces[key];
            if (!deudores[a]) deudores[a] = { items: [], totalMonto: 0, totalUsd: 0, sinDolar: false };
            deudores[a].items.push({ acreedor: de, monto, montoUsd, sinDolar });
            deudores[a].totalMonto += monto;
            deudores[a].totalUsd   += montoUsd;
            if (sinDolar) deudores[a].sinDolar = true;
        }
        return deudores;
    };

    const balanceRango    = buildBalance(crucesRango);
    const balanceHistoric = buildBalance(crucesHistoric);

    const deudores = Object.keys(balanceHistoric).sort((a, b) =>
        balanceHistoric[b].totalMonto - balanceHistoric[a].totalMonto
    );

    const fmtMonto = (ars, usd) => showUSD
        ? `u$s ${formatUSD(usd)}`
        : `$${formatARS(ars)}`;

    const totalRangoArs = Object.values(crucesRango).reduce((s, v) => s + v.monto, 0);
    const totalRangoUsd = Object.values(crucesRango).reduce((s, v) => s + v.montoUsd, 0);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90dvh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-amber-600" />
                            Cruce de cuentas
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Mercadería cobrada en cuenta ajena</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Rango + ARS/USD */}
                <div className="px-5 py-3 border-b border-border/60 space-y-2 flex-shrink-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Desde</label>
                            <input type="date" value={desde} max={hasta}
                                onChange={e => setDesde(e.target.value)}
                                className="flex-1 min-w-0 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hasta</label>
                            <input type="date" value={hasta} min={desde}
                                onChange={e => setHasta(e.target.value)}
                                className="flex-1 min-w-0 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none" />
                        </div>
                    </div>
                    {/* Tabs vista + toggle moneda */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                            <button onClick={() => setVistaBalance(true)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${vistaBalance ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                                Balance
                            </button>
                            <button onClick={() => setVistaBalance(false)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${!vistaBalance ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                                Por par
                            </button>
                        </div>
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                            <button onClick={() => setShowUSD(false)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${!showUSD ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                                ARS
                            </button>
                            <button onClick={() => setShowUSD(true)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${showUSD ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                                <DollarSign className="w-3 h-3" /> USD
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3 space-y-3">

                    {pares.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <ArrowRight className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">Sin cruces de cuentas</p>
                            <p className="text-xs mt-1">Asegurate de asignar propietario a cada cuenta bancaria</p>
                        </div>
                    )}

                    {/* ── VISTA BALANCE ── */}
                    {vistaBalance && deudores.length > 0 && (
                        <>
                            {/* Balance en rango */}
                            {Object.keys(balanceRango).length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">En rango seleccionado</p>
                                    {Object.keys(balanceRango)
                                        .sort((a, b) => balanceRango[b].totalMonto - balanceRango[a].totalMonto)
                                        .map(deudor => {
                                            const { items, totalMonto, totalUsd, sinDolar } = balanceRango[deudor];
                                            const colorD = getPropColor(deudor);
                                            return (
                                                <div key={deudor} className="rounded-xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
                                                    <div className="px-3 py-2.5 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/10">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                                                            style={{ backgroundColor: colorD.bg, color: colorD.text }}>
                                                            {deudor} debe
                                                        </span>
                                                        <span className="font-bold text-amber-700 tabular-nums text-sm">
                                                            {fmtMonto(totalMonto, totalUsd)}
                                                            {sinDolar && showUSD && <span className="text-yellow-600 ml-1">*</span>}
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-border/40">
                                                        {items.map(({ acreedor, monto, montoUsd, sinDolar: sd }) => {
                                                            const colorA = getPropColor(acreedor);
                                                            return (
                                                                <div key={acreedor} className="px-3 py-2 flex items-center justify-between">
                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                        <ArrowRight className="w-3 h-3" />
                                                                        a <span className="font-semibold capitalize" style={{ color: colorA.text }}>{acreedor}</span>
                                                                    </span>
                                                                    <span className="text-xs font-semibold tabular-nums text-foreground">
                                                                        {fmtMonto(monto, montoUsd)}
                                                                        {sd && showUSD && <span className="text-yellow-600 ml-0.5">*</span>}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* Balance histórico */}
                            <div className="space-y-1.5 pt-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Acumulado hasta {hasta}
                                </p>
                                {deudores.map(deudor => {
                                    const { items, totalMonto, totalUsd, sinDolar } = balanceHistoric[deudor];
                                    const colorD = getPropColor(deudor);
                                    return (
                                        <div key={deudor} className="rounded-xl border border-border overflow-hidden">
                                            <div className="px-3 py-2.5 flex items-center justify-between bg-muted/40">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                                                    style={{ backgroundColor: colorD.bg, color: colorD.text }}>
                                                    {deudor} debe
                                                </span>
                                                <span className="font-bold text-foreground tabular-nums text-base">
                                                    {fmtMonto(totalMonto, totalUsd)}
                                                    {sinDolar && showUSD && <span className="text-yellow-600 ml-1">*</span>}
                                                </span>
                                            </div>
                                            <div className="divide-y divide-border/40">
                                                {items.map(({ acreedor, monto, montoUsd, sinDolar: sd }) => {
                                                    const colorA = getPropColor(acreedor);
                                                    return (
                                                        <div key={acreedor} className="px-3 py-2 flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <ArrowRight className="w-3 h-3" />
                                                                a <span className="font-semibold capitalize" style={{ color: colorA.text }}>{acreedor}</span>
                                                            </span>
                                                            <span className="text-xs font-semibold tabular-nums text-foreground">
                                                                {fmtMonto(monto, montoUsd)}
                                                                {sd && showUSD && <span className="text-yellow-600 ml-0.5">*</span>}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                                {showUSD && Object.values(balanceHistoric).some(d => d.sinDolar) && (
                                    <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-xl">
                                        * Algunas operaciones no tienen cotización del dólar y no se incluyen en el total USD.
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── VISTA POR PAR ── */}
                    {!vistaBalance && pares.map(key => {
                        const hist = crucesHistoric[key];
                        const rang = crucesRango[key];
                        const { de, a } = hist || rang;
                        const colorDe = getPropColor(de);
                        const colorA  = getPropColor(a);
                        const isOpen  = expandedPar === key;

                        return (
                            <div key={key} className="rounded-2xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
                                {/* Cabecera par */}
                                <div className="px-4 pt-3 pb-2 bg-amber-50/60 dark:bg-amber-950/10">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                                            style={{ backgroundColor: colorDe.bg, color: colorDe.text }}>
                                            <Package className="w-3 h-3" /> {de}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                                            style={{ backgroundColor: colorA.bg, color: colorA.text }}>
                                            <Building2 className="w-3 h-3" /> cuenta de {a}
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 font-semibold">
                                        {a.charAt(0).toUpperCase() + a.slice(1)} debe a {de.charAt(0).toUpperCase() + de.slice(1)}
                                    </p>
                                </div>

                                {/* Montos */}
                                <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b border-amber-100 dark:border-amber-900/30">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">En rango</p>
                                        <p className="font-bold text-foreground text-base tabular-nums">
                                            {rang ? fmtMonto(rang.monto, rang.montoUsd) : '—'}
                                        </p>
                                        {rang && <p className="text-xs text-muted-foreground">{rang.items.length} op{rang.items.length !== 1 ? 's' : ''}.</p>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Acumulado hasta {hasta}</p>
                                        <p className="font-bold text-amber-700 text-base tabular-nums">
                                            {hist ? fmtMonto(hist.monto, hist.montoUsd) : '—'}
                                        </p>
                                        {hist && <p className="text-xs text-muted-foreground">{hist.items.length} op{hist.items.length !== 1 ? 's' : ''}. total</p>}
                                    </div>
                                </div>

                                {/* Detalle colapsable */}
                                {rang?.items.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => setExpandedPar(isOpen ? null : key)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                                        >
                                            <span>Ver operaciones del rango</span>
                                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>
                                        {isOpen && (
                                            <div className="divide-y divide-border/60 border-t border-border/40">
                                                {rang.items.map(v => {
                                                    const dolar = Number(v.dolar_blue);
                                                    const usd   = dolar > 0 ? Number(v.monto_transferencia) / dolar : null;
                                                    return (
                                                        <div key={v.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-foreground truncate">
                                                                    {v.producto_titulo || v.codigo || '—'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {v.fecha} · {v.cuenta_nombre}
                                                                </p>
                                                                {dolar > 0 && (
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                        <DollarSign className="w-2.5 h-2.5" />
                                                                        cotiz. ${Number(dolar).toLocaleString('es-AR')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="text-xs font-bold text-foreground tabular-nums">
                                                                    ${formatARS(v.monto_transferencia)}
                                                                </p>
                                                                {usd != null && (
                                                                    <p className="text-xs text-muted-foreground tabular-nums">
                                                                        u$s {formatUSD(usd)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Total rango */}
                    {totalRangoArs > 0 && (
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 text-amber-600" />
                                Total cruzado en rango
                            </span>
                            <span className="text-xl font-bold text-amber-700 tabular-nums">
                                {fmtMonto(totalRangoArs, totalRangoUsd)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── VentasHistorial (componente principal) ──────────────────── */

export function VentasHistorial() {
    const [ventas,        setVentas]        = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [deletingId,    setDeletingId]    = useState(null);
    const [deletingPedidoId, setDeletingPedidoId] = useState(null);
    const [appUsers,      setAppUsers]      = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay,   setSelectedDay]   = useState(null);
    const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);
    const [showAccumulator, setShowAccumulator] = useState(false);
    const [showCuentas,     setShowCuentas]     = useState(false);
    const [showCruce,       setShowCruce]       = useState(false);
    const [codigoFilter,    setCodigoFilter]    = useState('');

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

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
                supabase.rpc('get_app_user_colors'),
            ]);
            setVentas(data || []);
            setAppUsers(users || []);
        } catch {
            toast.error('Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVentas(); }, [fetchVentas]);

    /* Filtro por código de producto */
    const codigoTrim = codigoFilter.trim().toLowerCase();
    const displayVentas = codigoTrim
        ? ventas.filter(v => (v.codigo || '').toLowerCase().includes(codigoTrim))
        : ventas;

    /* Agrupar ventas por día */
    const grouped = displayVentas.reduce((acc, v) => {
        if (!acc[v.fecha]) acc[v.fecha] = [];
        acc[v.fecha].push(v);
        return acc;
    }, {});

    const days   = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const months = [...new Set(days.map(d => d.substring(0, 7)))].sort((a, b) => b.localeCompare(a));

    const activeMonth    = selectedMonth || months[0] || null;
    const filteredDays   = days.filter(d => d.startsWith(activeMonth || ''));
    const monthTotal     = filteredDays.reduce(
        (s, d) => s + grouped[d].reduce((ss, v) => ss + Number(v.total_ars), 0),
        0
    );

    const editVenta = async (id, data) => {
        const { error } = await supabase.from('ventas').update(data).eq('id', id);
        if (error) throw error;
        setVentas(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
        toast.success('Venta actualizada');
    };

    const addVenta = async (pedidoVentaId, data) => {
        const refRow = ventas.find(v => v.venta_id === pedidoVentaId);
        const { data: inserted, error } = await supabase
            .from('ventas')
            .insert({
                ...data,
                venta_id:      pedidoVentaId,
                fecha:         refRow?.fecha         || null,
                nombre_pedido: refRow?.nombre_pedido || null,
                dolar_blue:    refRow?.dolar_blue    || null,
            })
            .select()
            .single();
        if (error) throw error;
        setVentas(prev => [...prev, inserted]);
        toast.success('Producto agregado');
    };

    const renamePedido = async (ventaId, nombre) => {
        const nombreFinal = nombre.trim() || null;
        try {
            const { error } = await supabase.from('ventas').update({ nombre_pedido: nombreFinal }).eq('venta_id', ventaId);
            if (error) throw error;
            setVentas(prev => prev.map(v => v.venta_id === ventaId ? { ...v, nombre_pedido: nombreFinal } : v));
            toast.success('Pedido renombrado');
        } catch {
            toast.error('Error al renombrar el pedido');
        }
    };

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

    const deletePedido = async (pedido) => {
        const cantidad = pedido.rows.length;
        if (!window.confirm(`¿Eliminar este pedido completo? Se eliminarán ${cantidad} producto${cantidad !== 1 ? 's' : ''} del pedido.`)) return;
        setDeletingPedidoId(pedido.ventaId);
        try {
            const ids = pedido.rows.map(r => r.id);
            const { error } = await supabase.from('ventas').delete().in('id', ids);
            if (error) throw error;
            setVentas(prev => prev.filter(v => !ids.includes(v.id)));
            toast.success('Pedido eliminado');
        } catch {
            toast.error('Error al eliminar el pedido');
        } finally {
            setDeletingPedidoId(null);
        }
    };

    const deleteDayVentas = async (fecha, password) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password,
        });
        if (authError) throw new Error('Contraseña incorrecta');

        const { error } = await supabase.from('ventas').delete().eq('fecha', fecha);
        if (error) throw new Error('Error al eliminar las ventas');

        setVentas(prev => prev.filter(v => v.fecha !== fecha));
        setSelectedDay(null);
        toast.success(`Ventas del ${formatFullDate(fecha)} eliminadas`);
    };

    const handleDayClick = (fecha) => {
        setSelectedDay(prev => prev === fecha ? null : fecha);
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto space-y-4">

            {/* ── Título ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Historial de Ventas</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {codigoTrim
                            ? `${displayVentas.length} de ${ventas.length} venta${ventas.length !== 1 ? 's' : ''}`
                            : `${ventas.length} venta${ventas.length !== 1 ? 's' : ''} registrada${ventas.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCruce(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                        title="Cruce de cuentas"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Cruce
                    </button>
                    <button
                        onClick={() => setShowCuentas(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                        title="Transferencias por cuenta"
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        Cuentas
                    </button>
                    <button
                        onClick={() => setShowAccumulator(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        title="Acumulado por propietario"
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Acumulado
                    </button>
                <button
                    onClick={fetchVentas}
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                    title="Actualizar"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
                </div>
            </div>

            {/* ── Filtro por código de producto ── */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={codigoFilter}
                    onChange={e => { setCodigoFilter(e.target.value); setSelectedDay(null); }}
                    placeholder="Filtrar por código de producto…"
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {codigoFilter && (
                    <button
                        onClick={() => { setCodigoFilter(''); setSelectedDay(null); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showCruce && (
                <CruceModal
                    ventas={ventas}
                    onClose={() => setShowCruce(false)}
                />
            )}

            {showCuentas && (
                <CuentasModal
                    ventas={ventas}
                    onClose={() => setShowCuentas(false)}
                />
            )}

            {showAccumulator && (
                <AccumulatorModal
                    ventas={ventas}
                    appUsers={appUsers}
                    onClose={() => setShowAccumulator(false)}
                />
            )}

            {/* ── Sin ventas ── */}
            {days.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay ventas registradas</p>
                    <p className="text-sm mt-1">Usá el escáner para registrar ventas</p>
                </div>
            )}

            {days.length > 0 && (
                <>
                    {/* ── Pestañas de meses — scroll horizontal en mobile ── */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:-mx-4 sm:px-4"
                        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {months.map(ym => {
                            const isActive = ym === activeMonth;
                            const { short, year } = formatMonthTabShort(ym);
                            const mTotal = days
                                .filter(d => d.startsWith(ym))
                                .reduce((s, d) => s + grouped[d].reduce((ss, v) => ss + Number(v.total_ars), 0), 0);

                            return (
                                <button
                                    key={ym}
                                    onClick={() => { setSelectedMonth(ym); setSelectedDay(null); }}
                                    className={[
                                        'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border',
                                        'text-center transition-all duration-150 min-w-[70px]',
                                        isActive
                                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                            : 'border-border bg-card text-foreground',
                                    ].join(' ')}
                                >
                                    {/* Mes abreviado en mobile / completo en sm+ */}
                                    <span className="text-xs font-bold capitalize leading-tight">{short}</span>
                                    <span className={`text-[10px] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {year}
                                    </span>
                                    <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                                        ${formatARS(mTotal)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Resumen del mes activo ── */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground px-0.5">
                        <span className="capitalize font-medium">{formatMonthTab(activeMonth)}</span>
                        <span className="font-bold text-foreground">${formatARS(monthTotal)}&nbsp;ARS</span>
                    </div>

                    {/* ── Grilla de cuadros ──
                        2 columnas en mobile, 3 en sm, 4 en md
                    ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                        {filteredDays.map(fecha => (
                            <DayCard
                                key={fecha}
                                fecha={fecha}
                                items={grouped[fecha]}
                                isSelected={selectedDay === fecha}
                                onClick={() => handleDayClick(fecha)}
                            />
                        ))}
                    </div>

                    {/* ── Hint ── */}
                    {!selectedDay && (
                        <p className="text-center text-xs text-muted-foreground py-1">
                            Tocá un día para ver el detalle
                        </p>
                    )}

                    {/* ── Panel de detalle ── */}
                    {selectedDay && grouped[selectedDay] && (
                        <DayDetail
                            key={selectedDay}
                            fecha={selectedDay}
                            items={grouped[selectedDay]}
                            getUserColor={getUserColor}
                            appUsers={appUsers}
                            onClose={() => setSelectedDay(null)}
                            onDelete={deleteVenta}
                            deletingId={deletingId}
                            isMobile={isMobile}
                            onDeleteDay={deleteDayVentas}
                            onRenamePedido={renamePedido}
                            onDeletePedido={deletePedido}
                            deletingPedidoId={deletingPedidoId}
                            onEdit={editVenta}
                            onAdd={addVenta}
                        />
                    )}
                </>
            )}
        </div>
    );
}
