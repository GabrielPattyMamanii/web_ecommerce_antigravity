import React from 'react';

export function ProductTable({ products, dollarRate, expensePerItem }) {

    // Formatting helper
    const formatMoney = (amount) => {
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        });
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Producto</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3 text-center">Docenas</th>
                        <th className="px-4 py-3 text-right">Precio/doc</th>
                        <th className="px-4 py-3 text-right text-black">Total</th>
                        <th className="px-4 py-3 text-right text-blue-700 bg-blue-50/50">Total + gastos</th>
                        <th className="px-4 py-3 rounded-tr-lg">Observaciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {products.map((product, idx) => {
                        const rate = parseFloat(dollarRate) || 1;
                        // Requirement: Total column must NOT be multiplied by dollar rate
                        const basePriceTotal = (product.cantidad_docenas || 0) * (product.precio_docena || 0);

                        // Requirement: Total + Gastos must use the rate (assumed logic: convert base to local + expense)
                        // If rate is empty (defaults to 1), it acts as base currency
                        const convertedTotal = basePriceTotal * rate;
                        const totalWithExpense = convertedTotal + expensePerItem;

                        return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{product.producto_titulo}</td>
                                <td className="px-4 py-3 font-mono text-gray-500">{product.codigo}</td>
                                <td className="px-4 py-3 text-center">{product.cantidad_docenas}</td>
                                <td className="px-4 py-3 text-right font-mono">
                                    ${parseFloat(product.precio_docena || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                                    {/* Total = Docenas * Precio (No Rate) */}
                                    {formatMoney(basePriceTotal)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50/30 font-mono">
                                    {/* Total + Gastos (With Rate) */}
                                    {formatMoney(totalWithExpense)}
                                </td>
                                <td className="px-4 py-3 text-gray-500 italic max-w-xs truncate">
                                    {product.observaciones || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
