import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HandCoins, PackageCheck, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSenaBuyerStore } from '../../context/senaBuyerStore';
import { getSenaPaymentNoticeLink } from '../../utils/whatsapp';

const DEFAULT_WHATSAPP_NUMBER = '5491134656584';

function SenaSuccessToast({ status, onClose }) {
    const config = {
        success: {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
            title: '¡Seña pagada exitosamente!',
            text: 'Tu reserva fue registrada. Te contactaremos pronto.',
            bg: 'bg-green-50 border-green-200',
        },
        pending: {
            icon: <Clock className="w-5 h-5 text-amber-500" />,
            title: 'Pago en proceso',
            text: 'Tu seña está siendo procesada. Te notificaremos cuando se confirme.',
            bg: 'bg-amber-50 border-amber-200',
        },
        failed: {
            icon: <XCircle className="w-5 h-5 text-red-500" />,
            title: 'No se pudo procesar la seña',
            text: 'Hubo un problema con el pago. Por favor intentá de nuevo.',
            bg: 'bg-red-50 border-red-200',
        },
    };

    const c = config[status];
    if (!c) return null;

    return (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-5 py-4 rounded-xl border shadow-xl max-w-sm w-[calc(100%-2rem)] ${c.bg}`}>
            {c.icon}
            <div className="flex-1">
                <p className="font-bold text-sm text-gray-800">{c.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{c.text}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
    );
}

const getLiveProductImage = (p) =>
    p._source === 'catalog_products'
        ? (p.image_url || '/placeholder.png')
        : ((p.images && p.images[0]) || '/placeholder.png');

const getLiveProductPrice = (p) =>
    p.price_on_request ? 'A consultar' : `$${parseFloat(p.retail_price || p.price || 0).toLocaleString('es-AR')}`;

const steps = [
    {
        id: 1,
        icon: HandCoins,
        title: 'Reservá con una seña',
        description: 'Entrá al producto que te gustó y tocá "Hacer una seña". El sistema calcula el monto, completás tus datos y pagás online con Mercado Pago para asegurar tu lugar.',
    },
    {
        id: 2,
        icon: PackageCheck,
        title: 'Elegís dónde retirarlo',
        description: 'Al reservar, seleccionás el lugar de entrega de una lista de opciones disponibles. Con la seña confirmada te contactamos por WhatsApp para coordinar la fecha y el pago restante.',
    },
];

export function LiveProducts() {
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [liveProducts, setLiveProducts] = useState([]);
    const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);
    const [toastStatus, setToastStatus] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const savedBuyer = useSenaBuyerStore();

    useEffect(() => {
        if (searchParams.get('sena_success') === 'true') {
            setToastStatus('success');
            setSearchParams({}, { replace: true });
        } else if (searchParams.get('sena_pending') === 'true') {
            setToastStatus('pending');
            setSearchParams({}, { replace: true });
        } else if (searchParams.get('sena_failed') === 'true') {
            setToastStatus('failed');
            setSearchParams({}, { replace: true });
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const [{ data: config }, { data: prods }, { data: catalogProds }] = await Promise.all([
                supabase.from('site_config').select('live_products_enabled, whatsapp_number').single(),
                supabase.from('products').select('*').eq('is_live', true),
                supabase.from('catalog_products').select('*').eq('is_live', true),
            ]);

            setEnabled(config?.live_products_enabled ?? true);
            if (config?.whatsapp_number) setWhatsappNumber(config.whatsapp_number);
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
            {toastStatus && (
                <SenaSuccessToast status={toastStatus} onClose={() => setToastStatus(null)} />
            )}
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

                {/* Aviso: ya hice una seña y quiero avisar que pagué */}
                <div className="live-cta mb-8">
                    <p className="live-cta__text">¿Ya reservaste un producto y pagaste la seña?</p>
                    <a
                        href={getSenaPaymentNoticeLink(whatsappNumber, savedBuyer)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="live-cta__btn"
                    >
                        <HandCoins className="w-5 h-5" />
                        Avisar al vendedor por WhatsApp
                    </a>
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

            </div>
        </section>
    );
}
