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
                // Set default selections
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

    // Parse colors for ColorPicker
    const colorOptions = product.colors?.map(color => ({
        value: color,
        name: color,
        hex: getColorHex(color)
    })) || [];

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 md:px-16 py-8">
                {/* Breadcrumb */}
                <Breadcrumb items={[
                    { label: 'Inicio', href: '/' },
                    { label: 'Tienda', href: '/catalog' },
                    { label: product.categories?.name || 'Productos', href: '/catalog' },
                    { label: product.name }
                ]} />

                {/* Main Content */}
                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Left: Image Gallery */}
                    <div className="flex gap-4">
                        {/* Thumbnails */}
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

                        {/* Main Image */}
                        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden">
                            <img
                                src={product.images?.[selectedImage] || product.images?.[0] || 'https://via.placeholder.com/600'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Right: Product Details */}
                    <div className="space-y-6">
                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-extrabold uppercase">{product.name}</h1>

                        {/* Rating */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-5 h-5 ${i < Math.floor(rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'fill-none text-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-gray-600">{rating}/5</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold">${currentPrice}</span>
                            {hasDiscount && originalPrice && (
                                <>
                                    <span className="text-3xl font-bold text-gray-400 line-through">
                                        ${originalPrice.toFixed(2)}
                                    </span>
                                    <span className="bg-red-50 text-red-500 text-sm font-medium px-3 py-1 rounded-full">
                                        -{product.discount_percentage}%
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 leading-relaxed">
                            {product.description || 'Esta prenda es perfecta para cualquier ocasión. Confeccionada con telas suaves y transpirables, ofrece comodidad y estilo superiores.'}
                        </p>

                        <hr className="border-gray-200" />

                        {/* Color Selector */}
                        {colorOptions.length > 0 && (
                            <ColorPicker
                                colors={colorOptions}
                                selectedColor={selectedColor}
                                onColorChange={setSelectedColor}
                            />
                        )}

                        {/* Size Selector */}
                        {product.sizes && product.sizes.length > 0 && (
                            <SizeSelector
                                sizes={product.sizes}
                                selectedSize={selectedSize}
                                onSizeChange={setSelectedSize}
                            />
                        )}

                        <hr className="border-gray-200" />

                        {/* Quantity and Add to Cart */}
                        <div className="flex items-center gap-4">
                            <QuantityPicker
                                quantity={quantity}
                                onQuantityChange={setQuantity}
                            />
                            <Button
                                size="lg"
                                className="flex-1"
                                onClick={handleAddToCart}
                            >
                                Agregar al Carrito
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
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
