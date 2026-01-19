import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { usePriceStore } from '../../context/priceStore';

export function ProductCard({ product }) {
    const { isWholesale } = usePriceStore();

    // Get the appropriate price
    const currentPrice = isWholesale ? product.wholesale_price : product.retail_price;
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
    const originalPrice = hasDiscount ? currentPrice / (1 - product.discount_percentage / 100) : null;
    const rating = product.rating || 4.5;

    return (
        <Link to={`/product/${product.id}`} className="group block">
            <div className="space-y-3">
                {/* Image Container */}
                <div className="relative aspect-[1/1.1] bg-gray-100 rounded-[20px] overflow-hidden">
                    <img
                        src={product.image || product.images?.[0] || 'https://via.placeholder.com/300'}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {hasDiscount && (
                        <div className="absolute top-3 left-3 bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded-full">
                            -{product.discount_percentage}%
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div>
                    <h3 className="font-bold text-sm md:text-lg text-black truncate uppercase">
                        {product.name}
                    </h3>

                    <div className="flex items-center gap-1 mt-1">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${i < Math.floor(rating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-none text-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-600">{rating}/5</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg md:text-xl font-bold">
                            ${currentPrice}
                        </span>
                        {hasDiscount && originalPrice && (
                            <>
                                <span className="text-lg md:text-xl font-bold text-gray-300 line-through">
                                    ${originalPrice.toFixed(0)}
                                </span>
                                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-full">
                                    -{product.discount_percentage}%
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
