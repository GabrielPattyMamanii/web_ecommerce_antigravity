import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Minus, Plus, Truck, RotateCcw } from 'lucide-react';
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
    const [selectedColor, setSelectedColor] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(null);

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
                const processedProduct = {
                    ...data,
                    category: data.categories?.name || 'Uncategorized',
                    image: data.images?.[0] || 'https://via.placeholder.com/300',
                    images: data.images || [],
                    colors: data.colors || [],
                    sizes: data.sizes || []
                };
                setProduct(processedProduct);
                setSelectedImage(processedProduct.image);
                if (processedProduct.colors.length > 0) {
                    setSelectedColor(processedProduct.colors[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (delta) => {
        setQuantity(prev => Math.max(1, Math.min(prev + delta, product.stock)));
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
    const monthlyPayment = (displayPrice / 6).toFixed(2);

    return (
        <div className="container mx-auto px-4 py-8 md:px-6 font-sans">
            {/* Breadcrumb / Back Link */}
            <div className="mb-8 text-sm text-muted-foreground">
                <Link to="/catalog" className="hover:text-primary">Catálogo</Link> / {product.category} / <span className="text-foreground font-medium">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column: Images */}
                <div className="space-y-4">
                    <div className="aspect-square relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
                        <img
                            src={selectedImage}
                            alt={product.name}
                            className="object-contain w-full h-full p-4"
                        />
                    </div>
                    {/* Thumbnails (Placeholder logic since we only have 1 image usually) */}
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {[product.image, ...product.images.slice(1)].map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedImage(img)}
                                className={`w-20 h-20 rounded-lg border-2 overflow-hidden flex-shrink-0 ${selectedImage === img ? 'border-primary' : 'border-transparent'}`}
                            >
                                <img src={img} alt={`View ${idx}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
                    <p className="text-muted-foreground text-sm mb-4">
                        {product.description}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center mb-6">
                        <div className="flex text-green-500 mr-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="w-4 h-4 fill-current" />
                            ))}
                        </div>
                        <span className="text-sm text-muted-foreground">(121 Reviews)</span>
                    </div>

                    <div className="border-b border-gray-200 pb-6 mb-6">
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                            ${displayPrice?.toFixed(2)} <span className="text-lg font-normal text-muted-foreground">o {monthlyPayment}/mes</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Pagos sugeridos con 6 meses de financiación especial</p>
                    </div>

                    {/* Color Selector */}
                    {product.colors && product.colors.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold mb-3">Elige un Color</h3>
                            <div className="flex gap-3">
                                {product.colors.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 ring-2 ring-offset-2 ${selectedColor === color ? 'ring-primary border-white' : 'ring-transparent border-gray-200'}`}
                                        style={{ backgroundColor: color.toLowerCase() }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity & Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        {/* Quantity Picker */}
                        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-fit">
                            <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} className="text-gray-500 hover:text-gray-900 disabled:opacity-50">
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="mx-4 font-semibold w-4 text-center">{quantity}</span>
                            <button onClick={() => handleQuantityChange(1)} disabled={quantity >= product.stock} className="text-gray-500 hover:text-gray-900 disabled:opacity-50">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-xs text-orange-500 font-medium self-center">
                            ¡Solo quedan {product.stock} items!
                        </div>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <Button
                            className="flex-1 bg-green-800 hover:bg-green-900 text-white rounded-full py-6 text-lg"
                            onClick={() => alert('Checkout no implementado aún')}
                        >
                            Comprar Ahora
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 rounded-full py-6 text-lg border-green-800 text-green-800 hover:bg-green-50"
                            onClick={() => addItem({ ...product, price: displayPrice, quantity, color: selectedColor })}
                        >
                            Agregar al Carrito
                        </Button>
                    </div>

                    {/* Extras */}
                    <div className="border rounded-lg divide-y">
                        <div className="p-4 flex items-start gap-4">
                            <Truck className="w-6 h-6 text-orange-500 mt-1" />
                            <div>
                                <h4 className="font-semibold text-sm">Envío Gratis</h4>
                                <p className="text-xs text-muted-foreground underline cursor-pointer">Ingresa tu código postal para ver disponibilidad</p>
                            </div>
                        </div>
                        <div className="p-4 flex items-start gap-4">
                            <RotateCcw className="w-6 h-6 text-orange-500 mt-1" />
                            <div>
                                <h4 className="font-semibold text-sm">Devoluciones</h4>
                                <p className="text-xs text-muted-foreground">Devoluciones gratis por 30 días. <span className="underline cursor-pointer">Detalles</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
