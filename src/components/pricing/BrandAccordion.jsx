import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function BrandAccordion({ brandName, boletaCode, propietario, ownerColor, products, allProductsForK, settings, isOldEntrada = false, bultosPersonalizados = 0, isMobile = false, users = [] }) {
    const [isOpen, setIsOpen] = useState(false);

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
        <div
            className="border border-border rounded-lg bg-card overflow-hidden shadow-sm mb-4"
            style={borderStyle}
        >
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all text-left"
            >
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-bold text-foreground uppercase text-lg">{brandName}</span>
                    {boletaCode && (
                        <span className="text-sm font-mono text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">
                            Boleta: {boletaCode}
                        </span>
                    )}
                    {isMultiOwner ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(ownerTotals).map(([name, amt]) => {
                                const color = getColor(name);
                                const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                                const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                                return (
                                    <div key={name} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border text-xs font-bold" style={{ borderColor: color }}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-foreground">{name}</span>
                                        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : effectivePropietario ? (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border shadow-sm">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: effectiveOwnerColor || '#9ca3af' }}
                            />
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                {effectivePropietario}
                            </span>
                        </div>
                    ) : null}
                </div>
                <div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </div>
            </button>

            {/* Content */}
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-foreground font-semibold border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Código</th>
                                {isMultiOwner && <th className="px-6 py-3">Propietario</th>}
                                <th className="px-6 py-3 text-right">Precio Venta al Costo</th>
                                <th className="px-6 py-3 text-right">Precio de Venta</th>
                                <th className="px-6 py-3 text-right bg-primary/5 text-primary">Precio de Venta (PESOS)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {products.map((item) => {
                                const { precioVentaAlCosto, precioDeVenta, precioVentaArg } = calcProductPrices(item);
                                const prodOwner = item.propietario_producto?.trim() || item.propietario?.trim() || '';
                                const prodOwnerColor = prodOwner ? getColor(prodOwner) : null;
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-muted/10 transition-colors"
                                        style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                    >
                                        <td className="px-6 py-4 font-medium text-foreground">{item.producto_titulo}</td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{item.codigo || '-'}</td>
                                        {isMultiOwner && (
                                            <td className="px-6 py-4">
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
                                        <td className="px-6 py-4 text-right text-muted-foreground">
                                            {formatCurrency(precioVentaAlCosto, 'USD')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-foreground">
                                            {formatCurrency(precioDeVenta, 'USD')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary bg-primary/5">
                                            {formatCurrency(precioVentaArg, 'ARS')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

