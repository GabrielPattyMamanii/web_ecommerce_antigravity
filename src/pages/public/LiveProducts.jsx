import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, MessageCircle, PackageCheck, Instagram, Facebook, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const getLiveProductImage = (p) =>
    p._source === 'catalog_products'
        ? (p.image_url || '/placeholder.png')
        : ((p.images && p.images[0]) || '/placeholder.png');

const getLiveProductPrice = (p) =>
    p.price_on_request ? 'A consultar' : `$${parseFloat(p.retail_price || p.price || 0).toLocaleString('es-AR')}`;

const steps = [
    {
        id: 1,
        icon: Video,
        title: 'Mirá la transmisión',
        description: 'Entrá al vivo en Instagram, TikTok o Facebook y mirá los productos que mostramos en tiempo real, con precio y stock al momento.',
    },
    {
        id: 2,
        icon: MessageCircle,
        title: 'Reservá por privado',
        description: 'Vas viendo algo que te gusta y nos escribís por privado o WhatsApp con el número que decimos en el vivo. Así apartamos tu producto.',
    },
    {
        id: 3,
        icon: PackageCheck,
        title: 'Coordinamos la entrega',
        description: 'Confirmamos tu pedido, dejás la seña y coordinamos el retiro o el envío, igual que en una compra normal.',
    },
];

export function LiveProducts() {
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [liveProducts, setLiveProducts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const [{ data: config }, { data: prods }, { data: catalogProds }] = await Promise.all([
                supabase.from('site_config').select('live_products_enabled').single(),
                supabase.from('products').select('*').eq('is_live', true),
                supabase.from('catalog_products').select('*').eq('is_live', true),
            ]);

            setEnabled(config?.live_products_enabled ?? true);
            setLiveProducts([
                ...(prods || []).map((p) => ({ ...p, _source: 'products' })),
                ...(catalogProds || []).map((p) => ({ ...p, _source: 'catalog_products' })),
            ]);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return <section className="live-section py-20 px-4 min-h-[40vh]" />;
    }

    if (!enabled) {
        return (
            <section className="live-section py-24 px-4 text-center min-h-[50vh] flex items-center justify-center">
                <div>
                    <h1 className="live-title">Productos en Live</h1>
                    <p className="live-subtitle mt-4">
                        Esta sección no está disponible en este momento. Volvé a visitarnos pronto.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="live-section py-10 px-4 relative overflow-hidden">
            <div className="live-bg-glow live-bg-glow--1" />
            <div className="live-bg-glow live-bg-glow--2" />

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Hero */}
                <div className="text-center mb-8">
                    <span className="live-badge">
                        <span className="live-badge__signal" aria-hidden="true">
                            <span className="live-badge__ring" />
                            <span className="live-badge__dot" />
                        </span>
                        En vivo cuando salimos al aire
                    </span>

                    <h1 className="live-title">Productos en Live</h1>
                    <p className="live-subtitle">
                        Nuestros lanzamientos y ofertas salen primero en vivo. Mirá, elegí y reservá
                        tu producto mientras lo estamos mostrando.
                    </p>
                </div>

                {/* Productos marcados como Live */}
                {liveProducts.length > 0 && (
                    <div className="live-products mb-10">
                        <h2 className="live-channels__title">Lo que estamos mostrando ahora</h2>
                        <div className="live-products__grid">
                            {liveProducts.map((p) => (
                                <Link key={`${p._source}-${p.id}`} to={`/live/${p.id}`} className="live-product-card">
                                    <div className="live-product-card__image-wrap">
                                        <img src={getLiveProductImage(p)} alt={p.name} className="live-product-card__image" />
                                        <span className="live-product-card__badge">
                                            <span className="live-badge__dot" aria-hidden="true" />
                                            Live
                                        </span>
                                    </div>
                                    <div className="live-product-card__info">
                                        <p className="live-product-card__name">{p.name}</p>
                                        <div className="live-product-card__footer">
                                            <span className="live-product-card__price">{getLiveProductPrice(p)}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Steps */}
                <div className="live-steps">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.id} className="live-step">
                                <div className="live-step__icon-wrap">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h3 className="live-step__title">{step.title}</h3>
                                <p className="live-step__desc">{step.description}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Channels */}
                <div className="live-channels">
                    <h2 className="live-channels__title">Seguinos para no perderte el próximo vivo</h2>
                    <div className="live-channels__grid">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="live-channel-card"
                        >
                            <Instagram className="w-6 h-6" />
                            <span>Instagram</span>
                        </a>
                        <a
                            href="https://tiktok.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="live-channel-card"
                        >
                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                <path d="M16.6 5c.1 1.5 1 2.8 2.4 3.2v2.6c-1.1.1-2.1-.3-3-.9v4.6c0 2.5-2 4.5-4.5 4.5S7 17 7 14.5 9 10 11.5 10c.2 0 .4 0 .6.1v2.6c-.2-.1-.4-.1-.6-.1-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2V5h3.1z" />
                            </svg>
                            <span>TikTok</span>
                        </a>
                        <a
                            href="https://facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="live-channel-card"
                        >
                            <Facebook className="w-6 h-6" />
                            <span>Facebook</span>
                        </a>
                    </div>
                </div>

                {/* CTA */}
                <div className="live-cta">
                    <p className="live-cta__text">¿Querés que te avisemos cuando salgamos en vivo?</p>
                    <a
                        href="https://wa.me/1134656584?text=Hola!%20Quiero%20que%20me%20avisen%20cuando%20est%C3%A9n%20en%20vivo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="live-cta__btn"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Avisenme por WhatsApp
                    </a>
                </div>
            </div>
        </section>
    );
}
