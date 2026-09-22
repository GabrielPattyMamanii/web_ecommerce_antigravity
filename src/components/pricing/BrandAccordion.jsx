import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function BrandAccordion({ brandName, boletaCode, propietario, ownerColor, products, allProductsForK, settings, isOldEntrada = false, bultosPersonalizados = 0, isMobile = false, users = [] }) {
    // Desktop: abierto por defecto (diseño Acordeones Modulares). Mobile: colapsado, como antes.
    const [isOpen, setIsOpen] = useState(!isMobile);

    // Usa allProductsForK si se provee, de lo contrario cae en products (para compatibilidad)
    const baseProducts = allProductsForK || products;

    const getColor = (name) => users.find(u => u.username === name)?.color || '#9ca3af';

    // Compute per-product owner totals (mirrors ControlMercanciaTanda logic)
    const ownerTotals = {};
    let hasExplicitOwner = false;
    products.forEach(prod => {
        const ownerName = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
        const docenas = parseFloat(prod.cantidad_docenas || 0);
        const amount = docenas * (Number(prod.precio_docena) || 0);
        const bucket = ownerName || '—';
        if (ownerName) hasExplicitOwner = true;
        if (!ownerTotals[bucket]) ownerTotals[bucket] = 0;
        ownerTotals[bucket] += amount;
    });
    if (!hasExplicitOwner) Object.keys(ownerTotals).forEach(k => delete ownerTotals[k]);
    const isMultiOwner = Object.keys(ownerTotals).length > 1;

    // When single owner, derive name/color from ownerTotals if group-level propietario is empty
    const singleOwnerKey = !isMultiOwner && Object.keys(ownerTotals).length === 1
        ? Object.keys(ownerTotals)[0]
        : null;
    const effectivePropietario = propietario || singleOwnerKey || '';
    const effectiveOwnerColor = ownerColor || (singleOwnerKey ? getColor(singleOwnerKey) : null);

    const borderStyle = (() => {
        if (!isMultiOwner) {
            return effectiveOwnerColor ? { borderLeft: `4px solid ${effectiveOwnerColor}` } : {};
        }
        const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
        let pct = 0;
        const stops = Object.entries(ownerTotals).flatMap(([name, amt]) => {
            const color = getColor(name);
            const start = pct;
            pct += (amt / total) * 100;
            return [`${color} ${start.toFixed(1)}%`, `${color} ${pct.toFixed(1)}%`];
        });
        return { borderLeft: '4px solid transparent', borderImage: `linear-gradient(to bottom, ${stops.join(', ')}) 1` };
    })();

    // --- Pre-compute group-level values for proportional formula ---
    const useProportionalFormula = bultosPersonalizados > 0 && !isOldEntrada;
    const K = useProportionalFormula
        ? baseProducts.reduce((s, p) => s + (parseFloat(p.cantidad_docenas || 0) * parseFloat(p.precio_docena || 0)), 0)
        : 0;
    const gastoPorBulto = useProportionalFormula && baseProducts.length > 0
        ? parseFloat(baseProducts[0].gastos || 0)
        : 0;
    const L = gastoPorBulto * bultosPersonalizados;

    // Helper to format currency
    const formatCurrency = (val, currency = 'USD') => {
        if (currency === 'ARS') {
            return `$ ${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${val.toFixed(2)}`;
    };

    // Shared price calculation logic
    const calcProductPrices = (item) => {
        const docenas = parseFloat(item.cantidad_docenas || 0);
        const precioDocena = parseFloat(item.precio_docena || 0);
        const numDocenas = docenas || 1;

        let precioVentaAlCosto;
        if (useProportionalFormula && K > 0) {
            const D = docenas * precioDocena;
            const E = (100 * D) / K;
            const F = (0.01 * E) * L;
            const G = (precioDocena + F) / numDocenas;
            const H = G + precioDocena;
            precioVentaAlCosto = H;
        } else {
            precioVentaAlCosto = isOldEntrada
                ? precioDocena
                : (precioDocena * docenas + (parseFloat(item.gastos || 0) * parseFloat(item.bultos || 0))) / numDocenas;
        }

        const indice = parseFloat(settings.indice_ganancia_valor || 1);
        const precioDeVenta = precioVentaAlCosto * indice;
        const dolar = parseFloat(settings.cotizacion_dolar || 0);
        const precioVentaArg = precioDeVenta * dolar;

        return { precioVentaAlCosto, precioDeVenta, precioVentaArg };
    };

    // Subtotal ARS del grupo (suma de precio de venta en pesos de todos los productos)
    const subtotalArs = products.reduce((sum, item) => sum + calcProductPrices(item).precioVentaArg, 0);

    if (isMobile) {
        return (
            <div
                className="bg-white rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100"
                style={borderStyle}
            >
                {/* Mobile Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-gray-50 transition-colors"
                >
                    <div className="flex flex-col gap-1">
                        <span className="font-black text-[#1A1A1A] uppercase text-[15px] tracking-tight">{brandName}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            {isMultiOwner ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                    {Object.entries(ownerTotals).map(([name, amt]) => {
                                        const color = getColor(name);
                                        const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                                        const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                                        return (
                                            <div key={name} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold" style={{ borderColor: color }}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                <span className="text-gray-700">{name}</span>
                                                <span className="text-gray-400">({pct}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : effectivePropietario ? (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: effectiveOwnerColor || '#9ca3af' }} />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{effectivePropietario}</span>
                                </div>
                            ) : null}
                            {boletaCode && boletaCode !== '-' && (
                                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Bol: {boletaCode}</span>
                            )}
                            <span className="text-[10px] font-bold text-gray-400">{products.length} productos</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                        {isOpen
                            ? <ChevronUp className="h-5 w-5 text-gray-400" />
                            : <ChevronDown className="h-5 w-5 text-gray-400" />
                        }
                    </div>
                </button>

                {/* Mobile Product Cards */}
                {isOpen && (
                    <div className="divide-y divide-gray-50">
                        {products.map((item) => {
                            const { precioVentaAlCosto, precioDeVenta, precioVentaArg } = calcProductPrices(item);
                            return (
                                <div key={item.id} className="px-4 py-3.5">
                                    <div className="mb-2.5">
                                        <p className="font-bold text-[#1A1A1A] text-[13px] leading-tight">{item.producto_titulo}</p>
                                        {item.codigo && (
                                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{item.codigo}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <div className="bg-gray-100 rounded-xl px-3 py-1.5 text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">PV Costo</p>
                                            <p className="text-[12px] font-black text-gray-500">{formatCurrency(precioVentaAlCosto, 'USD')}</p>
                                        </div>
                                        <div className="bg-indigo-50 rounded-xl px-3 py-1.5 text-center">
                                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">PV USD</p>
                                            <p className="text-[12px] font-black text-indigo-600">{formatCurrency(precioDeVenta, 'USD')}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl px-3 py-1.5 text-center flex-1 min-w-[100px]">
                                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">PV PESOS</p>
                                            <p className="text-[12px] font-black text-emerald-600">{formatCurrency(precioVentaArg, 'ARS')}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <article
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200"
            style={borderStyle}
        >
            {/* Header (trigger) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-muted/40 hover:bg-muted/60 border-b border-border transition-colors text-left"
            >
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-extrabold tracking-wide text-foreground uppercase">{brandName}</span>
                    {boletaCode && boletaCode !== '-' && (
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-card border border-border px-2.5 py-0.5 rounded-md shadow-sm">
                            Boleta: {boletaCode}
                        </span>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground">
                        {products.length} {products.length === 1 ? 'artículo' : 'artículos'}
                    </span>
                    {isMultiOwner ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(ownerTotals).map(([name, amt]) => {
                                const color = getColor(name);
                                const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                                const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                                return (
                                    <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold bg-pink-50 dark:bg-pink-950/30" style={{ borderColor: color }}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-foreground">{name}</span>
                                        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : effectivePropietario ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: effectiveOwnerColor || '#9ca3af' }}
                            />
                            <span className="text-xs font-bold text-pink-700 dark:text-pink-300 uppercase">
                                {effectivePropietario}
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-foreground bg-card px-3 py-1 rounded-lg border border-border shadow-sm">
                        <span className="text-muted-foreground font-normal">Subtotal ARS:</span>
                        {formatCurrency(subtotalArs, 'ARS')}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </button>

            {/* Content */}
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/20">
                                <th className="py-3 px-6">Producto</th>
                                <th className="py-3 px-4 text-center">Código</th>
                                {isMultiOwner && <th className="py-3 px-4">Propietario</th>}
                                <th className="py-3 px-4 text-right">Precio Venta al Costo</th>
                                <th className="py-3 px-4 text-right">Precio de Venta (USD)</th>
                                <th className="py-3 px-6 text-right text-primary font-extrabold">Precio de Venta (PESOS)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs font-medium text-foreground">
                            {products.map((item) => {
                                const { precioVentaAlCosto, precioDeVenta, precioVentaArg } = calcProductPrices(item);
                                const prodOwner = item.propietario_producto?.trim() || item.propietario?.trim() || '';
                                const prodOwnerColor = prodOwner ? getColor(prodOwner) : null;
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-primary/5 transition-colors"
                                        style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                    >
                                        <td className="py-3 px-6 font-bold text-foreground">{item.producto_titulo}</td>
                                        <td className="py-3 px-4 text-center font-mono">
                                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[11px]">{item.codigo || '-'}</span>
                                        </td>
                                        {isMultiOwner && (
                                            <td className="py-3 px-4">
                                                {prodOwner ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prodOwnerColor || '#9ca3af' }} />
                                                        {prodOwner}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">—</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                                            {formatCurrency(precioVentaAlCosto, 'USD')}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                                            {formatCurrency(precioDeVenta, 'USD')}
                                        </td>
                                        <td className="py-3 px-6 text-right font-extrabold text-primary font-mono text-sm tracking-tight">
                                            {formatCurrency(precioVentaArg, 'ARS')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}

