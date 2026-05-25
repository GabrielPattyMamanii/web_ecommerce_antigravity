import React from 'react';
import ProductCard from './ProductCard';

const products = [
    {
        id: 1,
        name: 'Basic Tee',
        href: '#',
        imageSrc: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        imageAlt: "Front of men's Basic Tee in black.",
        price: '$35',
        color: 'Black',
    },
    {
        id: 2,
        name: 'Minimalist Watch',
        href: '#',
        imageSrc: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        imageAlt: "Minimalist white watch.",
        price: '$120',
        color: 'White',
    },
    {
        id: 3,
        name: 'Canvas Backpack',
        href: '#',
        imageSrc: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        imageAlt: "Grey canvas backpack.",
        price: '$85',
        color: 'Grey',
    },
    {
        id: 4,
        name: 'Ceramic Mug',
        href: '#',
        imageSrc: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
        imageAlt: "White ceramic mug.",
        price: '$25',
        color: 'White',
    },
];

const FeaturedProducts = () => {
    return (
        <div className="bg-white dark:bg-[#242424]">
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Trending Now</h2>
                    <a href="/shop" className="text-sm font-medium text-blue-600 hover:text-blue-500">View all &rarr;</a>
                </div>

                <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeaturedProducts;
