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

    // Rating (mock for now - you can add this to your database later)
    const rating = product.rating || 4.5;
    const maxRating = 5;

    return (
        <Link to={`/product/${product.id}`} className="group">
            <div className="space-y-3">
                {/* Image Container */}
                <div className="relative aspect-square bg-gray-100 rounded-[20px] overflow-hidden">
                    <img
                        src={product.image || product.images?.[0] || 'https://via.placeholder.com/300'}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {hasDiscount && (
                        <div className="absolute top-3 left-3 bg-red-50 text-red-500 text-xs font-medium px-3 py-1 rounded-full">
                            -{product.discount_percentage}%
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                    <h3 className="font-bold text-base line-clamp-1">{product.name}</h3>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center">
                            {[...Array(maxRating)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < Math.floor(rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : i < rating
                                                ? 'fill-yellow-400 text-yellow-400 opacity-50'
                                                : 'fill-none text-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-gray-600">{rating}/5</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">${currentPrice}</span>
                        {hasDiscount && originalPrice && (
                            <span className="text-2xl font-bold text-gray-400 line-through">
                                ${originalPrice.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
