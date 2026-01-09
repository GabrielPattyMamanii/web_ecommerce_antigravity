import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useCartStore } from '../../context/cartStore';
import { usePriceStore } from '../../context/priceStore';
import { supabase } from '../../lib/supabase';

export function ProductDetail() {
    const { id } = useParams();
    const addItem = useCartStore((state) => state.addItem);
    const { isWholesale } = usePriceStore();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('id', id)
                .single();

            if (data) {
                setProduct({
                    ...data,
                    category: data.categories?.name || 'Uncategorized',
                    image: data.images?.[0] || 'https://via.placeholder.com/300'
                });
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="container mx-auto px-4 py-16 text-center">Cargando producto...</div>;
    }

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
                <Link to="/catalog">
                    <Button variant="outline">Volver al Catálogo</Button>
                </Link>
            </div>
        );
    }

    const displayPrice = isWholesale ? (product.wholesale_price || product.retail_price * 0.8) : product.retail_price;

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <Link to="/catalog" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Catálogo
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100 border">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover w-full h-full"
                    />
                </div>

                {/* Details */}
                <div className="flex flex-col justify-center">
                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
                            {product.category}
                        </span>
                        <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
                        <p className="text-2xl font-bold text-primary mb-6">
                            ${displayPrice?.toFixed(2)}
                            {isWholesale && <span className="text-sm text-muted-foreground ml-2">(Mayorista)</span>}
                        </p>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                            {product.description}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button size="lg" className="flex-1" onClick={() => addItem({ ...product, price: displayPrice })}>
                            <ShoppingCart className="mr-2 h-5 w-5" /> Agregar al Carrito
                        </Button>
                    </div>

                    <div className="mt-8 pt-8 border-t text-sm text-muted-foreground">
                        <p>Stock disponible: {product.stock} unidades</p>
                        {product.sizes && product.sizes.length > 0 && (
                            <p className="mt-2">Talles: {product.sizes.join(', ')}</p>
                        )}
                        {product.colors && product.colors.length > 0 && (
                            <p className="mt-2">Colores: {product.colors.join(', ')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
