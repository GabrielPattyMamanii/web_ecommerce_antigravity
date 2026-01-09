import React from 'react';
import { ShoppingBag } from 'lucide-react';

const ProductCard = ({ product }) => {
    return (
        <div className="group relative bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            {/* Image Container */}
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8 relative">
                <img
                    src={product.imageSrc}
                    alt={product.imageAlt}
                    className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity duration-300"
                />
                {/* Quick Add Button (Visible on Hover) */}
                <button className="absolute bottom-4 right-4 p-3 bg-white dark:bg-[#242424] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-blue-600 hover:text-white">
                    <ShoppingBag className="h-5 w-5" />
                </button>
            </div>

            {/* Product Info */}
            <div className="p-4">
                <h3 className="text-sm text-gray-700 dark:text-gray-200">
                    <a href={product.href}>
                        <span aria-hidden="true" className="absolute inset-0" />
                        {product.name}
                    </a>
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{product.color}</p>
                <p className="mt-2 text-lg font-medium text-gray-900 dark:text-white">{product.price}</p>
            </div>
        </div>
    );
};

export default ProductCard;
