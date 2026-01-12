import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProductCard } from '../../components/products/ProductCard';
import { Sparkle } from '../../components/ui/Sparkle';
import { supabase } from '../../lib/supabase';

export function Home() {
    const [newArrivals, setNewArrivals] = useState([]);
    const [topSelling, setTopSelling] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('*, categories(name)')
                .limit(8);

            if (data) {
                const mappedProducts = data.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Uncategorized',
                    image: p.images?.[0] || 'https://via.placeholder.com/300'
                }));

                // Split products for different sections
                setNewArrivals(mappedProducts.slice(0, 4));
                setTopSelling(mappedProducts.slice(4, 8));
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative bg-gray-100 overflow-hidden">
                <div className="container mx-auto px-4 md:px-16">
                    <div className="grid lg:grid-cols-2 gap-8 items-center py-12 lg:py-20">
                        {/* Left Content */}
                        <div className="relative z-10 text-center lg:text-left">
                            <h1 className="text-3xl md:text-4xl lg:text-6xl font-extrabold mb-4 lg:mb-6 leading-tight">
                                ENCUENTRA ROPA<br />
                                QUE COMBINE<br />
                                CON TU ESTILO
                            </h1>
                            <p className="text-gray-600 text-sm md:text-base mb-6 lg:mb-8 max-w-lg mx-auto lg:mx-0">
                                Explora nuestra diversa gama de prendas meticulosamente elaboradas, diseñadas
                                para resaltar tu individualidad y satisfacer tu sentido del estilo.
                            </p>
                            <Link to="/catalog" className="block lg:inline-block">
                                <Button size="lg" className="w-full lg:w-auto lg:px-16">
                                    Comprar Ahora
                                </Button>
                            </Link>

                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8 lg:mt-12">
                                <div className="text-center lg:text-left">
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold">200+</p>
                                    <p className="text-xs md:text-sm text-gray-600">Marcas Internacionales</p>
                                </div>
                                <div className="border-l border-gray-300 pl-4 text-center lg:text-left">
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold">2,000+</p>
                                    <p className="text-xs md:text-sm text-gray-600">Productos de Alta Calidad</p>
                                </div>
                                <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-300 pt-4 lg:pt-0 lg:pl-4 text-center lg:text-left">
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold">30,000+</p>
                                    <p className="text-xs md:text-sm text-gray-600">Clientes Felices</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Image */}
                        <div className="relative mt-8 lg:mt-0">
                            <img
                                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80"
                                alt="Fashion models"
                                className="w-full h-auto object-cover rounded-lg"
                            />
                            {/* Decorative Sparkles */}
                            <Sparkle className="absolute top-12 right-8 text-black" size="lg" />
                            <Sparkle className="absolute top-32 left-4 text-black" size="sm" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Brand Logos Section */}
            <section className="bg-black py-10">
                <div className="container mx-auto px-4 md:px-16">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                        <span className="text-white text-3xl md:text-4xl font-bold">VERSACE</span>
                        <span className="text-white text-3xl md:text-4xl font-bold">ZARA</span>
                        <span className="text-white text-3xl md:text-4xl font-bold">GUCCI</span>
                        <span className="text-white text-3xl md:text-4xl font-bold">PRADA</span>
                        <span className="text-white text-3xl md:text-4xl font-bold">Calvin Klein</span>
                    </div>
                    <div className="text-center mt-12">
                        <Link to="/catalog">
                            <Button variant="outline" size="lg" className="px-16">
                                View All
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
