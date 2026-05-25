import React, { useState } from 'react';
import { useCartStore } from '../context/cartStore';
import { MercadoPagoBrick } from '../components/payment/MercadoPagoBrick';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/ui/Toast';

const Checkout = () => {
    const { items, totalPrice } = useCartStore();
    const [discount, setDiscount] = useState(0);           // percentage
    const [promoCode, setPromoCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [validating, setValidating] = useState(false);
    const [toast, setToast] = useState(null);

    const deliveryFee = 15;
    const subtotal = totalPrice();
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount + deliveryFee;

    const applyPromoCode = async () => {
        if (!promoCode.trim()) return;
        setValidating(true);
        const { data } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', promoCode.trim().toUpperCase())
            .eq('status', 'publicado')
            .maybeSingle();
        setValidating(false);

        if (data) {
            setDiscount(data.discount_percentage);
            setAppliedCoupon(data);
            setToast({ mensaje: `Cupón "${data.name}" aplicado: -${data.discount_percentage}%`, tipo: 'success' });
        } else {
            setToast({ mensaje: 'Código inválido o no disponible', tipo: 'error' });
        }
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center p-6">
                <div className="text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Tu carrito está vacío</h2>
                    <p className="text-gray-500 mb-6">Agrega productos antes de ir al checkout.</p>
                    <Link
                        to="/catalog"
                        className="inline-block bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
                    >
                        Ver catálogo
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-[#1a1a1a] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Breadcrumb */}
                <Breadcrumb items={[
                    { label: 'Inicio', href: '/' },
                    { label: 'Carrito', href: '/cart' },
                    { label: 'Checkout' },
                ]} />

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 mt-4">Checkout</h1>

                <div className="grid md:grid-cols-5 gap-8">
                    {/* Left — Order Summary */}
                    <div className="md:col-span-3 bg-white dark:bg-[#242424] shadow rounded-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Resumen del Pedido ({items.length} {items.length === 1 ? 'producto' : 'productos'})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {items.map((item) => (
                                <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4 px-6 py-4">
                                    <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                        <img
                                            src={item.image || 'https://via.placeholder.com/64'}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                                        {item.size && <p className="text-xs text-gray-500">Talla: {item.size}</p>}
                                        {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                                        <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                                    </div>
                                    <p className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — Totals & Payment */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Totals card */}
                        <div className="bg-white dark:bg-[#242424] shadow rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Total</h2>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-red-500">
                                        <span>Descuento (-{discount}%)</span>
                                        <span className="font-medium">-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Envío</span>
                                    <span className="font-medium text-gray-900 dark:text-white">${deliveryFee}</span>
                                </div>
                                <hr className="border-gray-200 dark:border-gray-700" />
                                <div className="flex justify-between text-base">
                                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                                    <span className="font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Promo code */}
                            <div className="flex gap-2 mb-5">
                                <input
                                    type="text"
                                    placeholder="Código promocional"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300"
                                />
                                <button
                                    onClick={applyPromoCode}
                                    disabled={validating}
                                    className="px-4 py-2 text-sm font-semibold bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60"
                                >
                                    {validating ? '...' : 'Aplicar'}
                                </button>
                            </div>

                            {/* Mercado Pago payment button */}
                            <MercadoPagoBrick
                                items={items}
                                deliveryFee={deliveryFee}
                                discountAmount={discountAmount}
                            />
                        </div>

                        <p className="text-xs text-center text-gray-400 dark:text-gray-600">
                            Al pagar aceptás los términos y condiciones de la tienda.
                        </p>
                    </div>
                </div>
            </div>
            {toast && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
                </div>
            )}
        </div>
    );
};

export default Checkout;
