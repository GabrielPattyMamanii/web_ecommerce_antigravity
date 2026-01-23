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
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mb-4">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 transition-all text-left"
            >
                <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-800 uppercase text-lg">{brandName}</span>
                    {boletaCode && (
                        <span className="text-sm font-mono text-gray-600 bg-white/50 px-2 py-0.5 rounded border border-gray-300">
                            Boleta: {boletaCode}
                        </span>
                    )}
                </div>
                <div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
                </div>
            </button>

            {/* Content */}
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3 text-right">Precio Venta al Costo</th>
                                <th className="px-6 py-3 text-right">Precio de Venta</th>
                                <th className="px-6 py-3 text-right bg-blue-50/50 text-blue-800">Precio de Venta (PESOS)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.map((item) => {
                                // Calculations

                                // 1. Data extraction
                                const docenas = parseFloat(item.cantidad_docenas || 0);
                                const precioDocena = parseFloat(item.precio_docena || 0);

                                // 2. Formula: (TOTAL + GASTOS) / DOCENAS
                                // Total (Item) = precioDocena * docenas
                                // Gastos (Row) = expensePerRow

                                const itemTotalCost = precioDocena * docenas;
                                // Avoid division by zero
                                const numDocenas = docenas || 1;

                                const precioVentaAlCosto = (itemTotalCost + expensePerRow) / numDocenas;

                                // 3. Formula: Precio Venta = PrecioVentaAlCosto * Indice
                                const indice = parseFloat(settings.indice_ganancia_valor || 1);
                                const precioDeVenta = precioVentaAlCosto * indice;

                                // 4. Formula: Precio Venta (ARG) = PrecioDeVenta * Cotizacion
                                const dolar = parseFloat(settings.cotizacion_dolar || 0);
                                const precioVentaArg = precioDeVenta * dolar;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.producto_titulo}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{item.codigo || '-'}</td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCurrency(precioVentaAlCosto, 'USD')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-800">
                                            {formatCurrency(precioDeVenta, 'USD')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-600 bg-blue-50/30">
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
