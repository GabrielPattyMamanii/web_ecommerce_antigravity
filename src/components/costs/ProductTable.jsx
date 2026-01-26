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
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-bold border-b border-border">
                    <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3 text-center">Docenas</th>
                        <th className="px-4 py-3 text-right">Precio/doc</th>
                        <th className="px-4 py-3 text-right text-foreground">Total</th>
                        <th className="px-4 py-3 text-right text-primary bg-primary/5">Total + gastos</th>
                        <th className="px-4 py-3">Observaciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                    {products.map((product, idx) => {
                        const rate = parseFloat(dollarRate) || 1;
                        const basePriceTotal = (product.cantidad_docenas || 0) * (product.precio_docena || 0);
                        const convertedTotal = basePriceTotal * rate;
                        const totalWithExpense = convertedTotal + expensePerItem;

                        return (
                            <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{product.producto_titulo}</td>
                                <td className="px-4 py-3 font-mono text-muted-foreground">{product.codigo}</td>
                                <td className="px-4 py-3 text-center text-foreground">{product.cantidad_docenas}</td>
                                <td className="px-4 py-3 text-right font-mono text-foreground">
                                    ${parseFloat(product.precio_docena || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-foreground font-mono">
                                    {formatMoney(basePriceTotal)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-primary bg-primary/5 font-mono">
                                    {formatMoney(totalWithExpense)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground italic max-w-xs truncate">
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
