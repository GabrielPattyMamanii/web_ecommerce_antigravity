import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../context/cartStore';
import { usePriceStore } from '../../context/priceStore';
import { getWhatsAppLink } from '../../utils/whatsapp';
import Toast from '../../components/ui/Toast';
import { SenaModal } from '../../components/senas/SenaModal';
import { HandCoins } from 'lucide-react';

export function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [addedToQuote, setAddedToQuote] = useState(false);
    const [toast, setToast] = useState(null);
    const [senaModalOpen, setSenaModalOpen] = useState(false);
    const [senaEnabled, setSenaEnabled]     = useState(false);

    const { isWholesale } = usePriceStore();
    const addToCart = useCartStore((state) => state.addItem);

    useEffect(() => {
        fetchProduct();
        fetchRelatedProducts();
    }, [id]);

    useEffect(() => {
        const imagesList = product?.images?.length > 0 ? product.images : ['https://via.placeholder.com/600x800?text=Sin+imagen'];
        if (imagesList.length <= 1) return;
        
        const intervalId = setInterval(() => {
            setSelectedImage(prev => (prev + 1) % imagesList.length);
        }, 7000);
        
        return () => clearInterval(intervalId);
    }, [product]);

    const fetchProduct = async () => {
        try {
            const { data: config } = await supabase
                .from('site_config')
                .select('sena_enabled')
                .single();
            if (config) setSenaEnabled(config.sena_enabled ?? false);

            const { data: standardProd } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('id', id)
                .maybeSingle();

            if (standardProd) {
                setProduct(standardProd);
                if (standardProd.colors?.length > 0) setSelectedColor(standardProd.colors[0]);
                if (standardProd.sizes?.length > 0) setSelectedSize(standardProd.sizes[0]);
                return;
            }

            const { data: catalogProd } = await supabase
                .from('catalog_products')
                .select('*, categories(name)')
                .eq('id', id)
                .maybeSingle();

            if (catalogProd) {
                setProduct({
                    ...catalogProd,
                    retail_price: catalogProd.price,
                    wholesale_price: catalogProd.price,
                    images: catalogProd.image_url ? [catalogProd.image_url] : [],
                    colors: [],
                });
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedProducts = async () => {
        try {
            const [relProds, relCatalogProds] = await Promise.all([
                supabase.from('products').select('*, categories(name)').eq('published', true).neq('id', id).limit(10),
                supabase.from('catalog_products').select('*, categories(name)').eq('published', true).neq('id', id).limit(10)
            ]);

            let combinedRelated = [];
            if (relProds.data) {
                combinedRelated = [...combinedRelated, ...relProds.data.map(p => ({
                    ...p, image: p.images?.[0] || ''
                }))];
            }
            if (relCatalogProds.data) {
                combinedRelated = [...combinedRelated, ...relCatalogProds.data.map(p => ({
                    ...p, retail_price: p.price || 0, image: p.image_url || ''
                }))];
            }
            
            const shuffled = combinedRelated.sort(() => 0.5 - Math.random());
            setRelatedProducts(shuffled.slice(0, 3));
        } catch (error) {
            console.error('Error fetching related:', error);
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
            quantity
        });
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleAddToQuoteCart = () => {
        if (!product) return;
        const result = addToCart({
            id: product.id,
            name: product.name,
            price: 0,
            image: product.images?.[0],
            color: selectedColor,
            size: selectedSize,
            price_on_request: true,
            quantity
        });
        if (result?.conflict) {
            setToast({ mensaje: 'No podés mezclar productos con precio y productos a consultar', tipo: 'error' });
        } else {
            setAddedToQuote(true);
            setTimeout(() => setAddedToQuote(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-surface-container-high border-t-primary"></div>
                    <p className="text-on-surface-variant text-sm font-medium">Cargando producto...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7fa] gap-6">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant">inventory_2</span>
                <p className="text-xl font-bold text-on-surface">Producto no encontrado</p>
                <Link to="/catalog" className="text-primary font-bold flex items-center gap-2 hover:underline underline-offset-4">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Volver al Catálogo
                </Link>
            </div>
        );
    }

    const currentPrice = isWholesale ? product.wholesale_price : product.retail_price;
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
    const originalPrice = hasDiscount ? currentPrice / (1 - product.discount_percentage / 100) : null;
    const images = product.images?.length > 0 ? product.images : ['https://via.placeholder.com/600x800?text=Sin+imagen'];

    const colorHexMap = {
        'Olive': '#6B7C59', 'Green': '#4F7942', 'Navy': '#2C3E50', 'Black': '#000000',
        'White': '#FFFFFF', 'Gray': '#808080', 'Red': '#DC143C', 'Blue': '#1E90FF',
        'Yellow': '#FFD700', 'Orange': '#FF8C00', 'Purple': '#9370DB', 'Pink': '#FF69B4',
        'Brown': '#8B4513', 'Cream': '#F5F5DC', 'Beige': '#F5C790', 'Teal': '#008080',
    };

    return (
        <>
        <div className="min-h-screen bg-[#f5f7fa] text-on-surface font-body">
            <main className="pt-6 md:pt-10 pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

                {/* Top Navigation Bar: Back Button & Breadcrumbs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 md:mb-10 gap-4">
                    <Link to="/catalog" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface hover:text-primary transition-all group bg-white px-4 py-2 rounded-lg shadow-sm border border-outline-variant/20 w-fit">
                        <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        Volver al Catálogo
                    </Link>

                    {/* Breadcrumb - Desktop */}
                    <nav className="hidden md:flex items-center gap-2 text-sm text-on-surface-variant font-medium">
                        <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <Link to="/catalog" className="hover:text-primary transition-colors">Catálogo</Link>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        {product.categories?.name && (
                            <>
                                <Link to={`/catalog?cat=${product.categories.name}`} className="hover:text-primary transition-colors">{product.categories.name}</Link>
                                <span className="material-symbols-outlined text-xs">chevron_right</span>
                            </>
                        )}
                        <span className="text-on-surface font-semibold truncate max-w-xs">{product.name}</span>
                    </nav>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

                    {/* ── LEFT: Image Gallery ── */}
                    <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">
                        {/* Main Image with Arrows */}
                        <div className="relative aspect-[4/5] md:aspect-[3/4] lg:aspect-[4/5] bg-surface-container rounded-2xl overflow-hidden group">
                            {images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`${product.name} ${idx + 1}`}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                                        selectedImage === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                    }`}
                                />
                            ))}
                            
                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedImage(prev => (prev - 1 + images.length) % images.length); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-zinc-800 p-2 md:p-3 rounded-full md:opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center backdrop-blur-sm z-10"
                                    >
                                        <span className="material-symbols-outlined text-lg md:text-xl">chevron_left</span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedImage(prev => (prev + 1) % images.length); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-zinc-800 p-2 md:p-3 rounded-full md:opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center backdrop-blur-sm z-10"
                                    >
                                        <span className="material-symbols-outlined text-lg md:text-xl">chevron_right</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x pt-2 px-1">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        className={`relative w-20 md:w-24 aspect-[3/4] rounded-xl overflow-hidden flex-shrink-0 snap-start transition-all transform ${
                                            selectedImage === i 
                                                ? 'ring-2 ring-primary ring-offset-1 scale-95 opacity-100' 
                                                : 'ring-1 ring-outline-variant/30 opacity-60 hover:opacity-100 cursor-pointer shadow-sm'
                                        }`}
                                    >
                                        <img src={img} alt={`${product.name} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: Product Info ── */}
                    <div className="lg:col-span-5 lg:sticky lg:top-32 h-fit space-y-8">

                        {/* Header */}
                        <div>
                            {product.categories?.name && (
                                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
                                    {product.categories.name}
                                </span>
                            )}
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-on-surface mb-4 leading-tight">
                                {product.name}
                            </h1>
                            <div className="flex items-baseline gap-3">
                                {product.price_on_request ? (
                                    <a
                                        href={getWhatsAppLink(product.name, product.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-2xl md:text-3xl font-black text-public-primary bg-public-primary/10 hover:bg-public-primary/20 px-5 py-2 rounded-full transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>whatsapp</span>
                                        A consultar
                                    </a>
                                ) : (
                                    <>
                                        <span className="text-2xl md:text-3xl font-bold text-primary">${currentPrice?.toFixed(2)}</span>
                                        {hasDiscount && originalPrice && (
                                            <>
                                                <span className="text-lg text-on-surface-variant line-through">${originalPrice.toFixed(0)}</span>
                                                <span className="text-xs font-black bg-error-container text-on-error-container px-2 py-1 rounded-full">
                                                    -{product.discount_percentage}%
                                                </span>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Color Selector */}
                            {product.colors?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                                        Color: <span className="text-on-surface">{selectedColor}</span>
                                    </p>
                                    <div className="flex gap-3 flex-wrap">
                                        {product.colors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                title={color}
                                                className={`w-11 h-11 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:ring-2 hover:ring-primary/40 ring-offset-2'}`}
                                                style={{ backgroundColor: colorHexMap[color] || '#808080', border: color === 'White' ? '1px solid #e5e7eb' : 'none' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Size Selector */}
                            {product.sizes?.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Talla</p>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {product.sizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                className={`h-11 border-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                                                    selectedSize === size
                                                        ? 'border-primary bg-surface-container-lowest text-primary'
                                                        : 'border-surface-variant hover:border-primary text-on-surface'
                                                }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="flex items-center gap-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cantidad</p>
                                <div className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-2">
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-lg">remove</span>
                                    </button>
                                    <span className="w-8 text-center font-bold text-on-surface">{quantity}</span>
                                    <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-lg">add</span>
                                    </button>
                                </div>
                            </div>

                            {/* CTA Button */}
                            {product.price_on_request ? (
                                <div className="flex flex-col gap-3">
                                    <a
                                        href={getWhatsAppLink(product.name, product.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-5 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 shrink-0">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                        Consultar Precio por WhatsApp
                                    </a>
                                    <button
                                        onClick={handleAddToQuoteCart}
                                        className={`w-full py-5 rounded-xl font-bold text-lg border-2 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] ${
                                            addedToQuote
                                                ? 'border-tertiary text-tertiary'
                                                : 'border-primary text-primary hover:bg-primary/5'
                                        }`}
                                    >
                                        {addedToQuote ? (
                                            <>
                                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                ¡Agregado a cotización!
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">shopping_cart</span>
                                                Agregar a cotización
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleAddToCart}
                                    className={`w-full py-5 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                                        addedToCart
                                            ? 'bg-tertiary text-on-tertiary shadow-tertiary/20'
                                            : 'bg-gradient-to-r from-primary to-primary-dim text-on-primary shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                                >
                                    {addedToCart ? (
                                        <>
                                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            ¡Agregado al carrito!
                                        </>
                                    ) : (
                                        <>
                                            Agregar al Carrito
                                            <span className="material-symbols-outlined">shopping_cart</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Botón Hacer Seña — visible solo si señas están habilitadas */}
                            {senaEnabled && (
                                <button
                                    onClick={() => setSenaModalOpen(true)}
                                    className="w-full py-4 rounded-xl font-bold text-base border-2 border-[#009EE3] text-[#009EE3] hover:bg-[#009EE3]/5 transition-all flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <HandCoins className="w-5 h-5" />
                                    Reservar con una Seña
                                </button>
                            )}

                            {/* Trust signals */}
                            <div className="flex gap-4 text-xs text-on-surface-variant font-medium pt-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-tertiary">local_shipping</span>
                                    Envío gratis +$100
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-tertiary">lock</span>
                                    Pago seguro
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-tertiary">cached</span>
                                    Devolución fácil
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="pt-8 border-t border-surface-variant space-y-4">
                            <h3 className="font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">description</span>
                                Descripción del Producto
                            </h3>
                            <div
                                className="text-on-surface-variant leading-relaxed text-sm"
                                dangerouslySetInnerHTML={{
                                    __html: product.description || 'Prenda de alta calidad diseñada para el estilo moderno. Combinación perfecta de comodidad y elegancia para cualquier ocasión.'
                                }}
                            />
                            {product.details && (
                                <ul className="space-y-2 text-sm font-medium text-on-surface-variant mt-4">
                                    {product.details.map((detail, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary flex-shrink-0"></span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* You May Also Like section */}
                <section className="mt-24 md:mt-32">
                    <div className="flex justify-between items-end mb-10">
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter">También te puede gustar</h2>
                        <Link to="/catalog" className="font-bold text-primary border-b-2 border-primary pb-1 text-sm hidden md:block hover:opacity-70 transition-opacity">
                            Ver Todo
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
                        {relatedProducts.length > 0 ? (
                            relatedProducts.map((relProd, i) => (
                                <Link to={`/catalog/${relProd.id}`} key={relProd.id} className="group">
                                    <div className={`aspect-[3/4] rounded-xl overflow-hidden bg-surface-container-low mb-4 md:mb-6 relative ${i === 2 && relatedProducts.length > 2 ? 'md:translate-y-8 hidden md:block' : ''}`}>
                                        {relProd.image ? (
                                            <img src={relProd.image} alt={relProd.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full bg-surface-container flex items-center justify-center">
                                                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">image</span>
                                            </div>
                                        )}
                                        {/* Hover pill */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 duration-500"></div>
                                        <button className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-surface-container-lowest h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-20">
                                            <span className="material-symbols-outlined text-primary text-sm md:text-base">arrow_forward</span>
                                        </button>
                                    </div>
                                    <div className={i === 2 && relatedProducts.length > 2 ? 'md:mt-8 hidden md:block' : ''}>
                                        <span className="text-[10px] font-black text-public-primary uppercase tracking-[0.25em] block mb-1 opacity-90 truncate">{relProd.categories?.name || 'Catálogo'}</span>
                                        <h3 className="font-bold text-sm md:text-lg mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-1">{relProd.name}</h3>
                                        {relProd.price_on_request ? (
                                            <span className="text-xs font-black text-public-primary">A consultar</span>
                                        ) : (
                                            <p className="text-on-surface-variant text-xs md:text-sm mb-1 font-bold">${relProd.retail_price?.toFixed(2) || '0.00'}</p>
                                        )}
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-sm text-on-surface-variant col-span-full">No hay más productos disponibles de momento.</p>
                        )}
                    </div>
                </section>
            </main>

            {/* Mobile sticky CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high lg:hidden z-40 shadow-[0_-10px_30px_rgba(0,73,230,0.08)]">
                {product.price_on_request ? (
                    /* Producto a consultar: WhatsApp + Seña */
                    <div className="flex gap-2">
                        <a
                            href={getWhatsAppLink(product.name, product.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-lg shadow-green-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Consultar
                        </a>
                        {senaEnabled && (
                            <button
                                onClick={() => setSenaModalOpen(true)}
                                className="flex-1 py-3.5 rounded-xl font-bold text-sm border-2 border-[#009EE3] text-[#009EE3] bg-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <HandCoins className="w-4 h-4" />
                                Hacer Seña
                            </button>
                        )}
                    </div>
                ) : (
                    /* Producto con precio: Carrito + Seña */
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddToCart}
                            className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                addedToCart
                                    ? 'bg-tertiary text-on-tertiary'
                                    : 'bg-gradient-to-r from-primary to-primary-dim text-on-primary shadow-lg shadow-primary/20'
                            }`}
                        >
                            {addedToCart ? (
                                <>
                                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    ¡Agregado!
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-base">shopping_cart</span>
                                    Al Carrito
                                </>
                            )}
                        </button>
                        {senaEnabled && (
                            <button
                                onClick={() => setSenaModalOpen(true)}
                                className="flex-1 py-3.5 rounded-xl font-bold text-sm border-2 border-[#009EE3] text-[#009EE3] bg-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <HandCoins className="w-4 h-4" />
                                Hacer Seña
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
        {toast && (
            <div className="fixed bottom-6 right-6 z-50">
                <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
            </div>
        )}

        {senaModalOpen && (
            <SenaModal
                product={{ ...product, source: product.images ? 'products' : 'catalog_products' }}
                onClose={() => setSenaModalOpen(false)}
            />
        )}
        </>
    );
}
