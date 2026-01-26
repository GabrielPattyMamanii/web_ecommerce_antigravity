import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function BrandAccordion({ brandName, boletaCode, products, settings, expensePerRow }) {
    const [isOpen, setIsOpen] = useState(false);

    // Helper to format currency
    const formatCurrency = (val, currency = 'USD') => {
        if (currency === 'ARS') {
            return `$ ${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${val.toFixed(2)}`;
    };

    return (
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm mb-4">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all text-left"
            >
                <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground uppercase text-lg">{brandName}</span>
                    {boletaCode && (
                        <span className="text-sm font-mono text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">
                            Boleta: {boletaCode}
                        </span>
                    )}
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
                                <th className="px-6 py-3 text-right">Precio Venta al Costo</th>
                                <th className="px-6 py-3 text-right">Precio de Venta</th>
                                <th className="px-6 py-3 text-right bg-primary/5 text-primary">Precio de Venta (PESOS)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {products.map((item) => {
                                // Calculations
                                const docenas = parseFloat(item.cantidad_docenas || 0);
                                const precioDocena = parseFloat(item.precio_docena || 0);

                                const itemTotalCost = precioDocena * docenas;
                                const numDocenas = docenas || 1;

                                const precioVentaAlCosto = (itemTotalCost + expensePerRow) / numDocenas;

                                const indice = parseFloat(settings.indice_ganancia_valor || 1);
                                const precioDeVenta = precioVentaAlCosto * indice;

                                const dolar = parseFloat(settings.cotizacion_dolar || 0);
                                const precioVentaArg = precioDeVenta * dolar;

                                return (
                                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">{item.producto_titulo}</td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{item.codigo || '-'}</td>
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
