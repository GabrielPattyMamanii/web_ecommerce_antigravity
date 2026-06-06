import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    Package, Trash2, RefreshCw, User,
    Banknote, Building2, Blend, Tag, TrendingUp, X, ChevronDown, ChevronUp, DollarSign, ArrowRight,
    AlertTriangle, Lock, Eye, EyeOff
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────── */

function formatARS(n) {
    return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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

const METODO_CONFIG = {
    efectivo:      { label: 'Efectivo',      Icon: Banknote,  color: '#16a34a' },
    transferencia: { label: 'Transferencia', Icon: Building2, color: '#2563eb' },
    mixto:         { label: 'Mixto',         Icon: Blend,     color: '#9333ea' },
};

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
            const key = v.codigo || v.producto_titulo || '—';
            if (!codMap[key]) codMap[key] = { codigo: v.codigo, titulo: v.producto_titulo, docenas: 0 };
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
                                {codigos.map(c => (
                                    <div key={c.codigo || c.titulo} className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-foreground flex items-center gap-1.5 min-w-0">
                                            <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                            {c.codigo
                                                ? <><span className="font-mono font-semibold">{c.codigo}</span>
                                                    {c.titulo && <span className="text-muted-foreground truncate"> ({c.titulo})</span>}</>
                                                : <span className="text-muted-foreground">{c.titulo || '—'}</span>
                                            }
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

/* ─── DayDetail — panel de detalle (inline + bottom-sheet en mobile) ── */

function DayDetail({ fecha, items, getUserColor, onClose, onDelete, deletingId, isMobile, onDeleteDay }) {
    const [showItems,        setShowItems]        = useState(false);
    const [showUSD,          setShowUSD]          = useState(false);
    const [showDeleteDay,    setShowDeleteDay]    = useState(false);
    const dolarDia = items.find(v => Number(v.dolar_blue) > 0)?.dolar_blue ?? null;
    const fmtMonto = (n) => showUSD && dolarDia
        ? `u$s ${formatUSD(n / dolarDia)}`
        : `$${formatARS(n)}`;
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

            {/* Resumen por propietario */}
            <div className={`px-4 py-4 ${isMobile ? 'overflow-y-auto' : ''}`}
                style={isMobile ? { maxHeight: 'calc(80dvh - 200px)' } : {}}>
                <DailySummary items={items} getUserColor={getUserColor} showUSD={showUSD} setShowUSD={setShowUSD} />

                {/* Ventas individuales — colapsable */}
                <div className="border-t border-border mt-4">
                    <button
                        onClick={() => setShowItems(v => !v)}
                        className="w-full flex items-center justify-between py-3 text-sm
                                   font-medium text-muted-foreground transition-colors"
                    >
                        <span>Ver ventas individuales</span>
                        {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showItems && (
                        <div className="divide-y divide-border/60 border-t border-border -mx-4">
                            {[...items].sort((a, b) => (a.propietario || '').localeCompare(b.propietario || '')).map(venta => {
                                const color = getUserColor(venta.propietario);
                                return (
                                    <div key={venta.id} className="flex items-stretch"
                                        style={{ borderLeft: `4px solid ${color}` }}>
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
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
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
                                        <div className="flex flex-col items-end justify-between px-4 py-3.5 flex-shrink-0">
                                            <p className="font-bold text-foreground text-base">
                                                {fmtMonto(venta.total_ars)}
                                            </p>
                                            <button
                                                onClick={() => onDelete(venta.id)}
                                                disabled={deletingId === venta.id}
                                                className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground
                                                           hover:text-destructive transition-colors"
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
            </div>
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
    const [appUsers,      setAppUsers]      = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay,   setSelectedDay]   = useState(null);
    const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);
    const [showAccumulator, setShowAccumulator] = useState(false);
    const [showCuentas,     setShowCuentas]     = useState(false);
    const [showCruce,       setShowCruce]       = useState(false);

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
                supabase.from('app_users').select('username, color'),
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

    /* Agrupar ventas por día */
    const grouped = ventas.reduce((acc, v) => {
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
                        {ventas.length} venta{ventas.length !== 1 ? 's' : ''} registrada{ventas.length !== 1 ? 's' : ''}
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
                            onClose={() => setSelectedDay(null)}
                            onDelete={deleteVenta}
                            deletingId={deletingId}
                            isMobile={isMobile}
                            onDeleteDay={deleteDayVentas}
                        />
                    )}
                </>
            )}
        </div>
    );
}
