import React from 'react';

export function SizeSelector({ sizes, selectedSize, onSizeChange, label = "Elegir Talla" }) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-600">{label}</h3>
            <div className="flex flex-wrap gap-3">
                {sizes.map((size) => (
                    <button
                        key={size}
                        onClick={() => onSizeChange(size)}
                        className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${selectedSize === size
                                ? 'bg-black text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {size}
                    </button>
                ))}
            </div>
        </div>
    );
}
