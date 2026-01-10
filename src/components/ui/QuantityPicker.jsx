import React from 'react';
import { Minus, Plus } from 'lucide-react';

export function QuantityPicker({ quantity, onQuantityChange, min = 1, max = 99 }) {
    const decrease = () => {
        if (quantity > min) {
            onQuantityChange(quantity - 1);
        }
    };

    const increase = () => {
        if (quantity < max) {
            onQuantityChange(quantity + 1);
        }
    };

    return (
        <div className="flex items-center gap-4 bg-gray-100 rounded-full px-5 py-3 w-fit">
            <button
                onClick={decrease}
                disabled={quantity <= min}
                className="text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <Minus className="w-5 h-5" />
            </button>
            <span className="text-base font-medium w-8 text-center">{quantity}</span>
            <button
                onClick={increase}
                disabled={quantity >= max}
                className="text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
    );
}
