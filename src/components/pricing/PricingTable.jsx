import React, { useMemo } from 'react';
import { BrandAccordion } from './BrandAccordion';

export function PricingTable({ products, settings }) {

    // 1. Calculate Global Expenses for Prorating
    const totalTandaExpense = parseFloat(products.find(p => p.gastos)?.gastos || 0);
    const totalRows = products.length;
    // Expense Per Row (Prorated)
    const expensePerRow = totalRows > 0 ? (totalTandaExpense / totalRows) : 0;

    // 2. Group by Brand
    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
            const brand = product.marca || 'Sin Marca';

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
                <h3 className="text-xl font-bold text-foreground mb-2 sm:mb-0">Listado de Marcas y Precios</h3>
                <div className="text-sm text-foreground bg-card shadow-sm border border-border px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    Gastos Totales Tanda: <span className="font-bold">${totalTandaExpense.toLocaleString('es-AR')}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="text-muted-foreground">Prorrateo: ${expensePerRow.toFixed(2)} / ítem</span>
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
