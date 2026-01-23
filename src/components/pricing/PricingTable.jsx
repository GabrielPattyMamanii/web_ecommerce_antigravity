import React, { useMemo } from 'react';
import { BrandAccordion } from './BrandAccordion';

export function PricingTable({ products, settings }) {

    // 1. Calculate Global Expenses for Prorating
    // We assume 'gastos' is available on the product rows (denormalized) or we default to 0.
    // We grab the first non-zero 'gastos' we find, assuming it's the Total Tanda Expense.
    const totalTandaExpense = parseFloat(products.find(p => p.gastos)?.gastos || 0);
    const totalRows = products.length;
    // Expense Per Row (Prorated)
    const expensePerRow = totalRows > 0 ? (totalTandaExpense / totalRows) : 0;

    // 2. Group by Brand
    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
            const brand = product.marca || 'Sin Marca';
            // Boleta code should be per brand? prompt says "al lado de cada nombre de la marca debes colocar el numero de boleta".
            // But in the DB schema `entradas`, `codigo_boleta` is per ROW (or per Tanda?).
            // In sql-05, we added `codigo_boleta` to `entradas`.
            // So detailed rows have it. If we group by Brand, we assume all pros in brand share boleta? 
            // Or we just take the first one found for that brand.

            if (!acc[brand]) {
                acc[brand] = {
                    name: brand,
                    boletaCode: product.codigo_boleta || '-',
                    items: []
                };
            }
            acc[brand].items.push(product);
            return acc;
        }, {});
    }, [products]);

    return (
        <div className="pb-12">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center px-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">Listado de Marcas y Precios</h3>
                <div className="text-sm text-gray-700 bg-white shadow-sm border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    Gastos Totales Tanda: <span className="font-bold">${totalTandaExpense.toLocaleString('es-AR')}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-500">Prorrateo: ${expensePerRow.toFixed(2)} / ítem</span>
                </div>
            </div>

            <div className="space-y-6">
                {Object.values(groupedProducts).sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
                    <BrandAccordion
                        key={group.name}
                        brandName={group.name}
                        boletaCode={group.boletaCode}
                        products={group.items}
                        settings={settings}
                        expensePerRow={expensePerRow}
                    />
                ))}
            </div>
        </div>
    );
}
