import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ProductCard } from '../../components/products/ProductCard';
import { supabase } from '../../lib/supabase';

export function Home() {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeaturedProducts();
    }, []);

    const fetchFeaturedProducts = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('*, categories(name)')
                .limit(4);

            if (data) {
                const mappedProducts = data.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Uncategorized',
                    image: p.images?.[0] || 'https://via.placeholder.com/300'
                }));
                setFeaturedProducts(mappedProducts);
            }
        } catch (error) {
            console.error('Error fetching featured products:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gray-900 text-white py-24 px-6 md:px-12 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80')] bg-cover bg-center opacity-30"></div>
                <div className="relative z-10 max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">Descubre la Calidad Premium</h1>
                    <p className="text-lg md:text-xl mb-8 text-gray-200">
                        Explora nuestra colección exclusiva de productos seleccionados para ti.
                    </p>
                    <Link to="/catalog">
                        <Button size="lg" className="text-lg px-8">
                            Ver Catálogo
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Featured Products */}
            <section className="py-16 px-4 md:px-8 bg-background">
                <div className="container mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Productos Destacados</h2>

                    {loading ? (
                        <div className="text-center py-12">Cargando destacados...</div>
                    ) : featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {featuredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            No hay productos destacados por el momento.
                        </div>
                    )}

                    <div className="text-center mt-12">
                        <Link to="/catalog">
                            <Button variant="outline" size="lg">
                                Ver Todos los Productos
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
