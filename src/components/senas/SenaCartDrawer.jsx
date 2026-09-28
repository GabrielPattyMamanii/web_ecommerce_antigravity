import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, HandCoins, AlertCircle, Loader2, MapPin, Minus, Plus, Trash2, Package, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSena } from '../../hooks/useSena';
import { useSenaLocationLookup } from '../../hooks/useSenaLocationLookup';
import { useSenaCartStore } from '../../context/senaCartStore';
import { useSenaBuyerStore } from '../../context/senaBuyerStore';
import { Drawer } from '../ui/Drawer';

const MP_LOGO = (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0">
        <circle cx="24" cy="24" r="24" fill="#009EE3" />
        <path d="M24 17.5c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5 6.5-2.91 6.5-6.5-2.91-6.5-6.5-6.5zm0 10.5c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#fff" />
    </svg>
);

export function SenaCartDrawer({ isOpen, onClose }) {
    const items          = useSenaCartStore((s) => s.items);
    const updateQuantity = useSenaCartStore((s) => s.updateQuantity);
    const removeItem     = useSenaCartStore((s) => s.removeItem);

    const [senaConfig, setSenaConfig]   = useState(null);
    const [priceRanges, setPriceRanges] = useState([]);
    const [deliveryLocations, setDeliveryLocations] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [showDataForm, setShowDataForm] = useState(false);
    const { pagarSenaCarrito, isLoading, error } = useSena();
    const formRef = useRef(null);
    const savedBuyer = useSenaBuyerStore.getState();
    const setBuyer = useSenaBuyerStore((s) => s.setBuyer);
    const { lockedLocation, checkLocation } = useSenaLocationLookup();

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

    // Cada vez que se abre el drawer, arranca mostrando el resumen (no el formulario)
    useEffect(() => {
        if (isOpen) setShowDataForm(false);
    }, [isOpen]);

    const onLlenarDatos = () => {
        setShowDataForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

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
        if (savedBuyer.buyer_whatsapp) checkLocation(savedBuyer.buyer_whatsapp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (lockedLocation && deliveryLocations.includes(lockedLocation)) {
            setValue('delivery_location', lockedLocation);
        }
    }, [lockedLocation, deliveryLocations, setValue]);

    const totalQty = items.reduce((acc, it) => acc + it.quantity, 0);

    const calcularMontoTotal = () => {
        if (!senaConfig || items.length === 0) return 0;
        if (senaConfig.sena_type === 'percentage') {
            const subtotal = items.reduce((acc, it) => acc + (it.product_price || 0) * it.quantity, 0);
            return Math.round((subtotal * (senaConfig.sena_percentage || 0)) / 100);
        }
        if (senaConfig.sena_type === 'ranges') {
            const match = priceRanges.find(
                (r) => totalQty >= r.min_qty && (r.max_qty == null || totalQty <= r.max_qty)
            );
            return match ? Number(match.amount) : 0;
        }
        return (Number(senaConfig.sena_amount) || 0) * totalQty;
    };

    const montoTotal = calcularMontoTotal();
    const sinRangoParaCantidad = senaConfig?.sena_type === 'ranges' && items.length > 0 && montoTotal <= 0;

    const onSubmit = (formData) => {
        setBuyer(formData);
        pagarSenaCarrito({
            items: items.map((it) => ({
                product_id:     it.product_id,
                product_source: it.product_source,
                product_name:   it.product_name,
                product_image:  it.product_image,
                product_price:  it.product_price,
                quantity:       it.quantity,
            })),
            buyer_name:        formData.buyer_name,
            buyer_lastname:    formData.buyer_lastname,
            buyer_email:       formData.buyer_email,
            buyer_whatsapp:    formData.buyer_whatsapp,
            delivery_location: formData.delivery_location,
        });
    };

    const inputClass = (hasError) =>
        `w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#009EE3] focus:ring-2 focus:ring-[#009EE3]/20 ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            widthClassName="max-w-md"
            ariaLabel="Carrito de señas"
            headerContent={
                <div className="bg-gradient-to-r from-[#009EE3] to-[#0073BD] p-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <HandCoins className="w-5 h-5" />
                            <span className="font-bold text-lg">Carrito de Señas</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-white/80">Revisá los productos y pagá la seña de todos juntos.</p>
                </div>
            }
        >
            {items.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                            <HandCoins className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 font-medium">Tu carrito de señas está vacío.</p>
                        </div>
                    ) : (
                        <>
                            {/* Ítems */}
                            <div className="px-5 py-4 space-y-3 border-b border-gray-100 bg-gray-50">
                                {items.map((item) => (
                                    <div key={`${item.product_source}-${item.product_id}`} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-2.5">
                                        {item.product_image ? (
                                            <img src={item.product_image} alt={item.product_name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <Package className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item, item.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item, item.quantity + 1)}
                                                    disabled={Number.isFinite(item.stock) && item.quantity >= item.stock}
                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {Number.isFinite(item.stock) && item.quantity >= item.stock && (
                                                <p className="text-[11px] font-semibold text-red-500 mt-0.5">Stock máximo alcanzado</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {loadingConfig ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#009EE3]" />
                                </div>
                            ) : (
                                <div className="px-5 py-5 space-y-4">

                                    {/* Badge monto total */}
                                    <div className="bg-[#009EE3]/10 border border-[#009EE3]/25 rounded-xl p-3.5 text-center">
                                        <p className="text-xs text-[#0073BD] font-semibold uppercase tracking-wide mb-0.5">
                                            Total a señar ({totalQty} unidad{totalQty !== 1 ? 'es' : ''})
                                        </p>
                                        {sinRangoParaCantidad ? (
                                            <p className="text-sm text-amber-600 font-semibold">No hay un rango configurado para esta cantidad. Contactanos.</p>
                                        ) : (
                                            <p className="text-3xl font-black text-[#0073BD]">
                                                ${montoTotal.toLocaleString('es-AR')}
                                            </p>
                                        )}
                                    </div>

                                    {!showDataForm ? (
                                        <button
                                            type="button"
                                            onClick={onLlenarDatos}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#009EE3] hover:bg-[#0073BD] transition-colors shadow-lg shadow-[#009EE3]/25 text-sm"
                                        >
                                            Llenar datos
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">

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
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp *</label>
                                        <input
                                            {...register('buyer_whatsapp', {
                                                required: 'El WhatsApp es requerido',
                                                onBlur: (e) => checkLocation(e.target.value),
                                            })}
                                            type="tel"
                                            placeholder="Ej: 1122334455"
                                            className={inputClass(errors.buyer_whatsapp)}
                                        />
                                        {errors.buyer_whatsapp && <p className="text-[11px] text-red-500 mt-0.5">{errors.buyer_whatsapp.message}</p>}
                                        <p className="text-[11px] text-gray-400 mt-1">Te contactaremos por este número para coordinar el pedido.</p>
                                    </div>

                                    {/* Aviso de lugar de entrega ya asignado */}
                                    {lockedLocation && (
                                        <div className="flex items-start gap-2 bg-[#009EE3]/5 border border-[#009EE3]/20 rounded-xl p-3 text-xs text-gray-600">
                                            <MapPin className="w-4 h-4 text-[#009EE3] flex-shrink-0 mt-0.5" />
                                            <span>Ya tenés un pedido con lugar de entrega <span className="font-semibold text-gray-800">"{lockedLocation}"</span>. Estos productos se sumarán ahí.</span>
                                        </div>
                                    )}

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
                                                disabled={!!lockedLocation && deliveryLocations.includes(lockedLocation)}
                                                className={`${inputClass(errors.delivery_location)} appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-500`}
                                            >
                                                <option value="">Seleccioná una opción...</option>
                                                {deliveryLocations.map((loc) => (
                                                    <option key={loc} value={loc}>{loc}</option>
                                                ))}
                                            </select>
                                            {errors.delivery_location && <p className="text-[11px] text-red-500 mt-0.5">{errors.delivery_location.message}</p>}
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading || montoTotal <= 0}
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
                                                Pagar Seña — ${montoTotal.toLocaleString('es-AR')}
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-center text-gray-400 pb-1">
                                        Serás redirigido al checkout seguro de Mercado Pago.
                                    </p>
                                    </form>
                                    )}
                                </div>
                            )}
                        </>
                    )}
        </Drawer>
    );
}
