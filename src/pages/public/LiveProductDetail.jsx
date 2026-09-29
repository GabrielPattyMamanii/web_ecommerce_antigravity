import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { HandCoins, ArrowLeft, ArrowRight, Minus, Plus, AlertCircle } from 'lucide-react';
import { useSenaCartStore } from '../../context/senaCartStore';
import { useSenaCartUIStore } from '../../context/senaCartUIStore';
import { useSenaBuyerStore } from '../../context/senaBuyerStore';
import { getSenaPaymentNoticeLink } from '../../utils/whatsapp';

const DEFAULT_WHATSAPP_NUMBER = '5491134656584';
const TICKER_TEXT = '● EN VIVO AHORA — RESERVÁ ANTES DE QUE SE ACABE — ● STOCK LIMITADO MIENTRAS DURA LA TRANSMISIÓN — ';

function getLiveThumb(p) {
    return p._source === 'catalog_products'
        ? (p.image_url || null)
        : (p.images?.[0] || null);
}

export function LiveProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [otherLive, setOtherLive] = useState([]);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [senaEnabled, setSenaEnabled] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

    const addItem      = useSenaCartStore((s) => s.addItem);
    const openSenaCart = useSenaCartUIStore((s) => s.open);
    const savedBuyer   = useSenaBuyerStore();

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchProduct();
        fetchOtherLive();
    }, [id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const { data: config } = await supabase
                .from('site_config')
                .select('sena_enabled, whatsapp_number')
                .single();
            if (config) {
                setSenaEnabled(config.sena_enabled ?? false);
                if (config.whatsapp_number) setWhatsappNumber(config.whatsapp_number);
            }

            const { data: standardProd } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('id', id)
                .maybeSingle();

            if (standardProd) {
                setProduct({ ...standardProd, _source: 'products' });
                setLoading(false);
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
                    _source: 'catalog_products',
                    retail_price: catalogProd.price,
                    images: catalogProd.image_url ? [catalogProd.image_url] : [],
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchOtherLive = async () => {
        const [{ data: prods }, { data: catalogProds }] = await Promise.all([
            supabase.from('products').select('*').eq('is_live', true).neq('id', id).limit(8),
            supabase.from('catalog_products').select('*').eq('is_live', true).neq('id', id).limit(8),
        ]);
        setOtherLive([
            ...(prods || []).map((p) => ({ ...p, _source: 'products' })),
            ...(catalogProds || []).map((p) => ({ ...p, _source: 'catalog_products' })),
        ].slice(0, 4));
    };

    const onReservarConSena = () => {
        if (!product) return;
        addItem(
            {
                product_id:     product.id,
                product_source: product._source,
                product_name:   product.name,
                product_image:  product.images?.[0] || null,
                product_price:  product.retail_price || product.price || 0,
                stock:          product.stock,
            },
            quantity
        );
        toast.success(`Agregado al carrito de señas (${quantity} unidad${quantity > 1 ? 'es' : ''})`);
        openSenaCart();
    };

    if (loading) {
        return (
            <div className="live-pdp-loading">
                <span className="live-pdp-loading__dot" />
                <p>Cargando producto del vivo...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="live-pdp-loading">
                <p className="font-bold text-lg" style={{ color: 'var(--live-ink)' }}>Este producto ya no está disponible.</p>
                <Link to="/live" className="live-pdp-back mt-2">
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Productos en Live
                </Link>
            </div>
        );
    }

    const images = product.images?.length > 0 ? product.images : ['https://via.placeholder.com/700x700?text=Sin+imagen'];
    const price = product.retail_price || product.price || 0;

    const hasStockLimit = !product.price_on_request && Number.isFinite(product.stock);
    const stockDisponible = hasStockLimit ? Math.max(0, Number(product.stock)) : Infinity;
    const sinStock = hasStockLimit && stockDisponible <= 0;

    return (
        <div className="live-pdp">
            {/* Ticker — señal de identidad de toda la sección Live */}
            <div className="live-pdp-ticker" aria-hidden="true">
                <div className="live-pdp-ticker__track">
                    <span>{TICKER_TEXT}{TICKER_TEXT}</span>
                    <span>{TICKER_TEXT}{TICKER_TEXT}</span>
                </div>
            </div>

            <main className="live-pdp__main">
                <Link to="/live" className="live-pdp-back">
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Productos en Live
                </Link>

                <div className="live-pdp__grid">
                    {/* ── Frame de transmisión (imagen) ── */}
                    <div className="live-pdp__frame-col">
                        <div className="live-pdp__frame">
                            <span className="live-pdp__frame-tag">
                                <span className="live-badge__dot" aria-hidden="true" />
                                Visto en el vivo
                            </span>
                            <img src={images[selectedImage]} alt={product.name} className="live-pdp__frame-img" />
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImage((p) => (p - 1 + images.length) % images.length)}
                                        className="live-pdp__frame-arrow live-pdp__frame-arrow--left"
                                        aria-label="Imagen anterior"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedImage((p) => (p + 1) % images.length)}
                                        className="live-pdp__frame-arrow live-pdp__frame-arrow--right"
                                        aria-label="Imagen siguiente"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                        {images.length > 1 && (
                            <div className="live-pdp__thumbs">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        className={`live-pdp__thumb ${selectedImage === i ? 'live-pdp__thumb--active' : ''}`}
                                    >
                                        <img src={img} alt={`${product.name} ${i + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Info del producto ── */}
                    <div className="live-pdp__info">
                        <span className="live-badge live-pdp__eyebrow">
                            <span className="live-badge__signal" aria-hidden="true">
                                <span className="live-badge__ring" />
                                <span className="live-badge__dot" />
                            </span>
                            {product.is_live ? 'En vivo ahora' : 'Reservá igual, aunque el vivo ya terminó'}
                        </span>

                        {product.categories?.name && (
                            <span className="live-pdp__category">{product.categories.name}</span>
                        )}

                        <h1 className="live-pdp__name">{product.name}</h1>

                        <div className="live-pdp__price-tag">
                            {product.price_on_request ? 'A consultar' : `$${price.toLocaleString('es-AR')}`}
                        </div>

                        {product.description && (
                            <div
                                className="live-pdp__desc"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
                            />
                        )}

                        <div className="live-pdp__qty">
                            <span>Cantidad</span>
                            <div className="live-pdp__qty-control">
                                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus className="w-3.5 h-3.5" /></button>
                                <span>{quantity}</span>
                                <button
                                    onClick={() => setQuantity((q) => Math.min(stockDisponible, q + 1))}
                                    disabled={quantity >= stockDisponible}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {hasStockLimit && (
                                <span className={sinStock ? 'live-pdp__qty-warning' : 'live-pdp__qty-hint'}>
                                    {sinStock ? 'Sin stock' : `${stockDisponible} disponibles`}
                                </span>
                            )}
                        </div>

                        {/* Único CTA: reservar el producto dejando una seña */}
                        {senaEnabled && sinStock ? (
                            <div className="live-pdp__cta-disabled">
                                <AlertCircle className="w-4 h-4" />
                                Sin stock disponible por el momento.
                            </div>
                        ) : senaEnabled ? (
                            <>
                                <button onClick={onReservarConSena} className="live-pdp__cta-primary">
                                    <HandCoins className="w-5 h-5" />
                                    Reservar con una Seña
                                </button>
                                <p className="live-pdp__cta-hint">Dejás la seña ahora y coordinamos la entrega del resto.</p>
                            </>
                        ) : (
                            <div className="live-pdp__cta-disabled">
                                <AlertCircle className="w-4 h-4" />
                                Las señas no están disponibles en este momento.
                            </div>
                        )}

                        <a
                            href={getSenaPaymentNoticeLink(whatsappNumber, savedBuyer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="live-pdp__whatsapp-notice"
                        >
                            ¿Ya pagaste tu seña? Avisale al vendedor por WhatsApp
                        </a>
                    </div>
                </div>

                {/* ── También en vivo ahora ── */}
                {otherLive.length > 0 && (
                    <section className="live-pdp__more">
                        <h2 className="live-channels__title">También en vivo ahora</h2>
                        <div className="live-products__grid">
                            {otherLive.map((p) => (
                                <Link key={`${p._source}-${p.id}`} to={`/live/${p.id}`} className="live-product-card">
                                    <div className="live-product-card__image-wrap">
                                        {getLiveThumb(p) ? (
                                            <img src={getLiveThumb(p)} alt={p.name} className="live-product-card__image" />
                                        ) : null}
                                        <span className="live-product-card__badge">
                                            <span className="live-badge__dot" aria-hidden="true" />
                                            Live
                                        </span>
                                    </div>
                                    <div className="live-product-card__info">
                                        <p className="live-product-card__name">{p.name}</p>
                                        <div className="live-product-card__footer">
                                            <span className="live-product-card__price">
                                                {p.price_on_request ? 'A consultar' : `$${parseFloat(p.retail_price || p.price || 0).toLocaleString('es-AR')}`}
                                            </span>
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Mobile sticky CTA */}
            {senaEnabled && !sinStock && (
                <div className="live-pdp__mobile-cta">
                    <button onClick={onReservarConSena} className="live-pdp__cta-primary live-pdp__cta-primary--mobile">
                        <HandCoins className="w-4 h-4" />
                        Reservar con una Seña
                    </button>
                </div>
            )}
        </div>
    );
}
