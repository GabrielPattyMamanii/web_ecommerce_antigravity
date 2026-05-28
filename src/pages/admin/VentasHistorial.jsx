import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    Package, Trash2, RefreshCw, User,
    Banknote, Building2, Blend, Tag, TrendingUp, X, ChevronDown, ChevronUp, DollarSign
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

/* ─── DayDetail — panel de detalle (inline + bottom-sheet en mobile) ── */

function DayDetail({ fecha, items, getUserColor, onClose, onDelete, deletingId, isMobile }) {
    const [showItems, setShowItems] = useState(false);
    const [showUSD, setShowUSD] = useState(false);
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
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

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
    const [desde,   setDesde]   = useState(firstOfMonthStr);
    const [hasta,   setHasta]   = useState(todayStr);
    const [showUSD, setShowUSD] = useState(false);

    const getUserColor = (name) => appUsers.find(u => u.username === name)?.color || '#9ca3af';

    const filtered = ventas.filter(v => v.fecha >= desde && v.fecha <= hasta);

    const byOwner = {};
    for (const v of filtered) {
        const owner = v.propietario || 'Sin propietario';
        if (!byOwner[owner]) byOwner[owner] = { ars: 0, usd: 0, sinDolar: false };
        byOwner[owner].ars += Number(v.total_ars);
        if (Number(v.dolar_blue) > 0) {
            byOwner[owner].usd += Number(v.total_ars) / Number(v.dolar_blue);
        } else {
            byOwner[owner].sinDolar = true;
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

                {/* Toggle ARS / USD */}
                <div className="px-5 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                        {filtered.length} venta{filtered.length !== 1 ? 's' : ''} en el rango
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

                {/* Cuerpo */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
                    {filtered.length === 0 && (
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
                        />
                    )}
                </>
            )}
        </div>
    );
}
