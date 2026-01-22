import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProductTable } from './ProductTable';

export function BrandList({ brands, dollarRate, expensePerItem }) {
    // State to track expanded brands
    // Initialize with all expanded or none? Recommendation was "All collapsed" or "Click to expand".
    // "Estado inicial: Colapsado"
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
                <div key={index} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* Header */}
                    <button
                        onClick={() => toggleBrand(brand.name)}
                        className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${expandedBrands[brand.name]
                                ? 'bg-blue-50/80 hover:bg-blue-100/80'
                                : 'bg-blue-50 hover:bg-blue-100'
                            }`}
                    >
                        <h3 className="font-bold text-lg text-gray-800 uppercase tracking-wide">
                            {brand.name}
                        </h3>
                        <div className={`p-1 rounded-full bg-white/50 transition-transform duration-200 ${expandedBrands[brand.name] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5 text-gray-600" />
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
