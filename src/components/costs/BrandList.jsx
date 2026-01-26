import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProductTable } from './ProductTable';

export function BrandList({ brands, dollarRate, expensePerItem }) {
    const [expandedBrands, setExpandedBrands] = useState({});

    const toggleBrand = (brandName) => {
        setExpandedBrands(prev => ({
            ...prev,
            [brandName]: !prev[brandName]
        }));
    };

    return (
        <div className="space-y-4">
            {brands.map((brand, index) => (
                <div key={index} className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                    {/* Header */}
                    <button
                        onClick={() => toggleBrand(brand.name)}
                        className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${expandedBrands[brand.name]
                            ? 'bg-primary/10 hover:bg-primary/20'
                            : 'bg-muted/30 hover:bg-muted/50'
                            }`}
                    >
                        <h3 className="font-bold text-lg text-foreground uppercase tracking-wide">
                            {brand.name}
                        </h3>
                        <div className={`p-1 rounded-full bg-card transition-transform duration-200 ${expandedBrands[brand.name] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        </div>
                    </button>

                    {/* Content */}
                    {expandedBrands[brand.name] && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <ProductTable
                                products={brand.products}
                                dollarRate={dollarRate}
                                expensePerItem={expensePerItem}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
