import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, HandCoins, AlertCircle, Loader2, MapPin, Minus, Plus, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSena } from '../../hooks/useSena';
import { useSenaCartStore } from '../../context/senaCartStore';
import { useSenaBuyerStore } from '../../context/senaBuyerStore';
import toast from 'react-hot-toast';

const MP_LOGO = (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0">
        <circle cx="24" cy="24" r="24" fill="#009EE3" />
        <path d="M24 17.5c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5 6.5-2.91 6.5-6.5-2.91-6.5-6.5-6.5zm0 10.5c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#fff" />
    </svg>
);

/**
 * SenaModal
 *
 * Props:
 *  - product: { id, name, retail_price, price, images, image_url, source }
 *  - initialQuantity?: number
 *  - onClose: () => void
 */
export function SenaModal({ product, initialQuantity = 1, onClose }) {
    const [senaConfig, setSenaConfig]         = useState(null);
    const [priceRanges, setPriceRanges]       = useState([]);
    const [deliveryLocations, setDeliveryLocations] = useState([]);
    const [loadingConfig, setLoadingConfig]   = useState(true);
    const [quantity, setQuantity]             = useState(() => {
        const base = Math.max(1, initialQuantity);
        if (product?.price_on_request || !Number.isFinite(product?.stock)) return base;
        return Math.min(base, Math.max(0, Number(product.stock)) || base);
    });
    const { pagarSenaCarrito, isLoading, error } = useSena();
    const addItem = useSenaCartStore((s) => s.addItem);
    const savedBuyer = useSenaBuyerStore.getState();
    const setBuyer = useSenaBuyerStore((s) => s.setBuyer);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            buyer_name:        savedBuyer.buyer_name,
            buyer_lastname:    savedBuyer.buyer_lastname,
            buyer_email:       savedBuyer.buyer_email,
            buyer_whatsapp:    savedBuyer.buyer_whatsapp,
            delivery_location: savedBuyer.delivery_location,
        },
    });

    useEffect(() => {
        Promise.all([
            supabase
                .from('site_config')
                .select('sena_enabled, sena_type, sena_amount, sena_percentage, sena_delivery_locations')
                .single(),
            supabase
                .from('sena_price_ranges')
                .select('min_qty, max_qty, amount')
                .order('min_qty', { ascending: true }),
        ]).then(([{ data }, { data: ranges }]) => {
            if (data) {
                setSenaConfig(data);
                const locations = data.sena_delivery_locations || [];
                setDeliveryLocations(locations);
                if (savedBuyer.delivery_location && locations.includes(savedBuyer.delivery_location)) {
                    setValue('delivery_location', savedBuyer.delivery_location);
                }
            }
            setPriceRanges(ranges || []);
            setLoadingConfig(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const productPrice  = product?.retail_price || product?.price || 0;
    const productImage  = product?.images?.[0] || product?.image_url || null;
    const productSource = product?.source || 'products';
    const hasStockLimit = !product?.price_on_request && Number.isFinite(product?.stock);
    const stockDisponible = hasStockLimit ? Math.max(0, Number(product.stock)) : Infinity;
    const sinStock = hasStockLimit && stockDisponible <= 0;

    const calcularMontoSena = () => {
        if (!senaConfig) return 0;
        if (senaConfig.sena_type === 'percentage') {
            return Math.round((productPrice * senaConfig.sena_percentage / 100) * quantity);
        }
        if (senaConfig.sena_type === 'ranges') {
            const match = priceRanges.find(
                (r) => quantity >= r.min_qty && (r.max_qty == null || quantity <= r.max_qty)
            );
            return match ? Number(match.amount) : 0;
        }
        return (Number(senaConfig.sena_amount) || 0) * quantity;
    };

    const montoSena = calcularMontoSena();
    const sinRangoParaCantidad = senaConfig?.sena_type === 'ranges' && montoSena <= 0;
    // Si el tipo es porcentaje y el producto no tiene precio, no se puede calcular la seña
    const sinPrecioParaPorcentaje = senaConfig?.sena_type === 'percentage' && productPrice <= 0;

    const buildItem = () => ({
        product_id:     product.id,
        product_source: productSource,
        product_name:   product.name,
        product_image:  productImage,
        product_price:  productPrice,
        stock:          product.stock,
        quantity,
    });

    const onPagarAhora = (formData) => {
        setBuyer(formData);
        pagarSenaCarrito({
            items:             [buildItem()],
            buyer_name:        formData.buyer_name,
            buyer_lastname:    formData.buyer_lastname,
            buyer_email:       formData.buyer_email,
            buyer_whatsapp:    formData.buyer_whatsapp,
            delivery_location: formData.delivery_location,
        });
    };

    const onAgregarAlCarrito = () => {
        addItem(buildItem(), quantity);
        toast.success(`Agregado al carrito de señas (${quantity} unidad${quantity > 1 ? 'es' : ''})`);
        onClose();
    };

    const inputClass = (hasError) =>
        `w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#009EE3] focus:ring-2 focus:ring-[#009EE3]/20 ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#009EE3] to-[#0073BD] p-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <HandCoins className="w-5 h-5" />
                            <span className="font-bold text-lg">Hacer una Seña</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-white/80">Reservá este producto pagando una seña. Completarás el resto después.</p>
                </div>

                {/* Producto */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    {productImage ? (
                        <img
                            src={productImage}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-gray-400 text-xl">image</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">{product.name}</p>
                        {productPrice > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                Precio total: <span className="font-bold text-gray-700">${productPrice.toLocaleString('es-AR')}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Contenido scrolleable */}
                <div className="overflow-y-auto flex-1">
                    {loadingConfig ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#009EE3]" />
                        </div>
                    ) : !senaConfig?.sena_enabled ? (
                        <div className="px-5 py-10 text-center">
                            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                            <p className="text-gray-600 font-medium">Las señas no están disponibles en este momento.</p>
                        </div>
                    ) : sinPrecioParaPorcentaje ? (
                        <div className="px-5 py-10 text-center">
                            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                            <p className="text-gray-700 font-semibold">Precio a consultar</p>
                            <p className="text-gray-500 text-sm mt-1">Este producto no tiene precio fijo, por lo que no se puede calcular la seña por porcentaje.<br/>Contactanos por WhatsApp para coordinar la reserva.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onPagarAhora)} className="px-5 py-5 space-y-4">

                            {/* Cantidad */}
                            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">Cantidad a señar</p>
                                    {hasStockLimit && (
                                        <p className={`text-xs font-semibold ${sinStock ? 'text-red-500' : 'text-gray-400'}`}>
                                            {sinStock ? 'Sin stock disponible' : `${stockDisponible} disponibles`}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-[#009EE3] hover:text-[#009EE3] transition-colors"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-6 text-center font-bold text-gray-900">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity((q) => Math.min(stockDisponible, q + 1))}
                                        disabled={quantity >= stockDisponible}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-[#009EE3] hover:text-[#009EE3] transition-colors disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Badge monto seña */}
                            <div className="bg-[#009EE3]/10 border border-[#009EE3]/25 rounded-xl p-3.5 text-center">
                                <p className="text-xs text-[#0073BD] font-semibold uppercase tracking-wide mb-0.5">
                                    {senaConfig.sena_type === 'percentage'
                                        ? `Seña (${senaConfig.sena_percentage}% del precio)`
                                        : senaConfig.sena_type === 'ranges'
                                            ? 'Monto de la seña por cantidad'
                                            : 'Monto de la Seña'}
                                </p>
                                {sinRangoParaCantidad ? (
                                    <p className="text-sm text-amber-600 font-semibold">No hay un rango configurado para esta cantidad. Contactanos.</p>
                                ) : (
                                    <p className="text-3xl font-black text-[#0073BD]">
                                        ${montoSena.toLocaleString('es-AR')}
                                    </p>
                                )}
                            </div>

                            {/* Nombre y Apellido en fila */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                                    <input
                                        {...register('buyer_name', { required: 'Requerido' })}
                                        placeholder="Juan"
                                        className={inputClass(errors.buyer_name)}
                                    />
                                    {errors.buyer_name && <p className="text-[11px] text-red-500 mt-0.5">{errors.buyer_name.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido *</label>
                                    <input
                                        {...register('buyer_lastname', { required: 'Requerido' })}
                                        placeholder="Pérez"
                                        className={inputClass(errors.buyer_lastname)}
                                    />
                                    {errors.buyer_lastname && <p className="text-[11px] text-red-500 mt-0.5">{errors.buyer_lastname.message}</p>}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                                <input
                                    {...register('buyer_email', {
                                        required: 'El email es requerido',
                                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                                    })}
                                    type="email"
                                    placeholder="juan@email.com"
                                    className={inputClass(errors.buyer_email)}
                                />
                                {errors.buyer_email && <p className="text-[11px] text-red-500 mt-0.5">{errors.buyer_email.message}</p>}
                            </div>

                            {/* WhatsApp */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    WhatsApp *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#25D366]">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                    </span>
                                    <input
                                        {...register('buyer_whatsapp', { required: 'El WhatsApp es requerido' })}
                                        type="tel"
                                        placeholder="Ej: 1122334455"
                                        className={`${inputClass(errors.buyer_whatsapp)} pl-9`}
                                    />
                                </div>
                                {errors.buyer_whatsapp && <p className="text-[11px] text-red-500 mt-0.5">{errors.buyer_whatsapp.message}</p>}
                                <p className="text-[11px] text-gray-400 mt-1">Te contactaremos por este número para coordinar el pedido.</p>
                            </div>

                            {/* Lugar de entrega */}
                            {deliveryLocations.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-[#009EE3]" />
                                            Lugar de entrega *
                                        </span>
                                    </label>
                                    <select
                                        {...register('delivery_location', { required: 'Seleccioná un lugar de entrega' })}
                                        className={`${inputClass(errors.delivery_location)} appearance-none bg-white`}
                                    >
                                        <option value="">Seleccioná una opción...</option>
                                        {deliveryLocations.map((loc) => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                    {errors.delivery_location && <p className="text-[11px] text-red-500 mt-0.5">{errors.delivery_location.message}</p>}
                                </div>
                            )}

                            {/* Error general */}
                            {error && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Botones */}
                            <div className="space-y-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || montoSena <= 0 || sinStock}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#009EE3] hover:bg-[#0073BD] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#009EE3]/25 text-sm"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Preparando pago...
                                        </>
                                    ) : (
                                        <>
                                            {MP_LOGO}
                                            Pagar ahora — ${montoSena.toLocaleString('es-AR')}
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={onAgregarAlCarrito}
                                    disabled={isLoading || sinStock}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[#009EE3] bg-white border-2 border-[#009EE3] hover:bg-[#009EE3]/5 disabled:opacity-60 transition-colors text-sm"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    Agregar al carrito de señas
                                </button>
                            </div>

                            <p className="text-xs text-center text-gray-400 pb-1">
                                "Pagar ahora" te redirige al checkout seguro de Mercado Pago solo por este producto. "Agregar al carrito" te permite juntar varios productos y pagar todo junto.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
