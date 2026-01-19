import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../context/cartStore';
import { usePriceStore } from '../../context/priceStore';
import { Button } from '../../components/ui/Button';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { SizeSelector } from '../../components/ui/SizeSelector';
import { QuantityPicker } from '../../components/ui/QuantityPicker';

export function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);

    const { isWholesale } = usePriceStore();
    const addToCart = useCartStore((state) => state.addItem);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                setProduct(data);
                if (data.colors && data.colors.length > 0) {
                    setSelectedColor(data.colors[0]);
                }
                if (data.sizes && data.sizes.length > 0) {
                    setSelectedSize(data.sizes[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = () => {
        if (!product) return;
        addToCart({
            id: product.id,
            name: product.name,
            price: currentPrice,
            image: product.images?.[0],
            color: selectedColor,
            size: selectedSize,
            quantity: quantity
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-xl text-gray-600">Producto no encontrado</p>
            </div>
        );
    }

    const currentPrice = isWholesale ? product.wholesale_price : product.retail_price;
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
    const originalPrice = hasDiscount ? currentPrice / (1 - product.discount_percentage / 100) : null;
    const rating = product.rating || 4.5;

    const colorOptions = product.colors?.map(color => ({
        value: color,
        name: color,
        hex: getColorHex(color)
    })) || [];

    return (
        <div className="min-h-screen bg-white pb-24 lg:pb-0">
            <div className="container mx-auto px-4 md:px-16 py-4 md:py-8">
                {/* Breadcrumb - Hidden on mobile for cleaner look as per design, visible on desktop */}
                <div className="hidden md:block mb-6">
                    <Breadcrumb items={[
                        { label: 'Inicio', href: '/' },
                        { label: 'Tienda', href: '/catalog' },
                        { label: product.categories?.name || 'Productos', href: '/catalog' },
                        { label: product.name }
                    ]} />
                </div>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Section */}
                    {/* Mobile: Swipeable Carousel */}
                    <div className="lg:hidden -mx-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-1 mb-6">
                        {product.images?.map((image, index) => (
                            <div key={index} className="w-[85vw] flex-shrink-0 snap-center px-1 first:pl-4 last:pr-4">
                                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                                    <img
                                        src={image}
                                        alt={`${product.name} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: Grid/Gallery */}
                    <div className="hidden lg:flex gap-4">
                        <div className="flex flex-col gap-4">
                            {product.images?.slice(0, 3).map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(index)}
                                    className={`w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-black' : 'border-transparent'
                                        }`}
                                >
                                    <img
                                        src={image}
                                        alt={`${product.name} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden aspect-[3/4]">
                            <img
                                src={product.images?.[selectedImage] || product.images?.[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Product Info Section */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-2 leading-tight">
                                {product.name}
                            </h1>

                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < Math.floor(rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'fill-none text-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-medium text-gray-600">{rating}/5</span>
                            </div>

                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-bold">${currentPrice}</span>
                                {hasDiscount && originalPrice && (
                                    <>
                                        <span className="text-xl text-gray-400 line-through">
                                            ${originalPrice.toFixed(0)}
                                        </span>
                                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                                            -{product.discount_percentage}%
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-600 text-sm leading-relaxed">
                            {product.description || 'Esta prenda es perfecta para cualquier ocasión. Confeccionada con telas suaves y transpirables, ofrece comodidad y estilo superiores.'}
                        </p>

                        <hr className="border-gray-100" />

                        <div className="space-y-6">
                            {/* Colors */}
                            {colorOptions.length > 0 && (
                                <div>
                                    <span className="text-sm text-gray-500 font-medium block mb-2">Seleccionar Color</span>
                                    <ColorPicker
                                        colors={colorOptions}
                                        selectedColor={selectedColor}
                                        onColorChange={setSelectedColor}
                                    />
                                </div>
                            )}

                            {/* Sizes */}
                            {product.sizes && product.sizes.length > 0 && (
                                <div>
                                    <span className="text-sm text-gray-500 font-medium block mb-2">Seleccionar Talla</span>
                                    <SizeSelector
                                        sizes={product.sizes}
                                        selectedSize={selectedSize}
                                        onSizeChange={setSelectedSize}
                                    />
                                </div>
                            )}
                        </div>

                        <hr className="border-gray-100" />

                        {/* Actions */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Cantidad</span>
                                <QuantityPicker
                                    quantity={quantity}
                                    onQuantityChange={setQuantity}
                                />
                            </div>

                            <Button
                                size="lg"
                                className="w-full h-14 text-lg font-bold rounded-full bg-black text-white hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                                onClick={handleAddToCart}
                            >
                                Add to Cart
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Fixed Bottom Actions (Optional - can be enabled if desired for sticky button) */}
            {/* <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 lg:hidden">
                <Button size="lg" className="w-full rounded-full" onClick={handleAddToCart}>
                    Add to Cart - ${currentPrice}
                </Button>
            </div> */}
        </div>
    );
}

// Helper function to map color names to hex values
function getColorHex(colorName) {
    const colorMap = {
        'Olive': '#6B7C59',
        'Green': '#4F7942',
        'Navy': '#2C3E50',
        'Black': '#000000',
        'White': '#FFFFFF',
        'Gray': '#808080',
        'Red': '#DC143C',
        'Blue': '#1E90FF',
        'Yellow': '#FFD700',
        'Orange': '#FF8C00',
        'Purple': '#9370DB',
        'Pink': '#FF69B4',
        'Brown': '#8B4513',
    };
    return colorMap[colorName] || '#808080';
}
