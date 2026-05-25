import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../context/cartStore';

const ProductCard = ({ product }) => {
    return (
        <div className="group relative bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            {/* Image Container */}
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8 relative">
                <img
                    src={product.image || product.imageSrc}
                    alt={product.imageAlt || product.name}
                    className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity duration-300"
                />
                {/* Quick Add Button (Visible on Hover - Desktop only) */}
                <button className="hidden lg:block absolute bottom-4 right-4 p-3 bg-white dark:bg-[#242424] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-black hover:text-white">
                    <ShoppingBag className="h-5 w-5" />
                </button>
            </div>

            {/* Product Info */}
            <div className="p-3 md:p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 line-clamp-1">
                    <a href={`/product/${product.id}`}>
                        <span aria-hidden="true" className="absolute inset-0" />
                        {product.name}
                    </a>
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
                <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm md:text-base font-bold text-gray-900 dark:text-white">${product.retail_price}</p>
                    {/* Mobile Cart Icon - Optional/Visual only for now since generic link covers card */}
                    {/* <div className="lg:hidden p-1.5 bg-gray-100 rounded-full">
                        <ShoppingBag className="w-3.5 h-3.5 text-black" />
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
