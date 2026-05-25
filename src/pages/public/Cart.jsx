import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Tag } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { Button } from '../../components/ui/Button';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { QuantityPicker } from '../../components/ui/QuantityPicker';
import { MercadoPagoBrick } from '../../components/payment/MercadoPagoBrick';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import { getWhatsAppQuoteCartLink } from '../../utils/whatsapp';

export function Cart() {
    const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
    const isQuoteCart = items.length > 0 && items[0].price_on_request === true;
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
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
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 md:px-16 py-16 text-center">
                    <h2 className="text-3xl font-bold mb-4">Tu carrito está vacío</h2>
                    <p className="text-gray-600 mb-8">¡Agrega algunos productos para comenzar!</p>
                    <Link to="/catalog">
                        <Button size="lg">Ir al Catálogo</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 md:px-16 py-8">
                {/* Breadcrumb */}
                <Breadcrumb items={[
                    { label: 'Inicio', href: '/' },
                    { label: 'Carrito' }
                ]} />

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-extrabold uppercase mb-8">TU CARRITO</h1>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items - Left Side */}
                    <div className="lg:col-span-2 space-y-6">
                        {items.map((item) => (
                            <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4 p-6 border border-gray-200 rounded-2xl">
                                {/* Product Image */}
                                <div className="w-28 h-28 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                                    <img
                                        src={item.image || 'https://via.placeholder.com/150'}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Product Details */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                                        <p className="text-sm text-gray-600">Talla: <span className="font-medium">{item.size || 'N/A'}</span></p>
                                        <p className="text-sm text-gray-600">Color: <span className="font-medium">{item.color || 'N/A'}</span></p>
                                    </div>
                                    {isQuoteCart
                                        ? <span className="text-sm font-bold text-[#25D366]">A consultar</span>
                                        : <p className="text-2xl font-bold">${item.price}</p>
                                    }
                                </div>

                                {/* Quantity and Delete */}
                                <div className="flex flex-col items-end justify-between">
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <QuantityPicker
                                        quantity={item.quantity}
                                        onQuantityChange={(newQty) => updateQuantity(item.id, newQty)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary - Right Side */}
                    <div className="lg:col-span-1">
                        <div className="border border-gray-200 rounded-2xl p-6 sticky top-24">
                            {isQuoteCart ? (
                                <>
                                    <h2 className="text-xl font-bold mb-2">Tu cotización</h2>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Enviá tu lista por WhatsApp y te respondemos con los precios a la brevedad.
                                    </p>
                                    <div className="space-y-2 mb-6">
                                        {items.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm text-gray-600">
                                                <span className="truncate mr-2">{item.name}</span>
                                                <span className="font-bold text-black shrink-0">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <a
                                        href={getWhatsAppQuoteCartLink(items)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-6 rounded-full transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                        Pedir cotización por WhatsApp
                                    </a>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold mb-6">Resumen del Pedido</h2>

                                    {/* Summary Details */}
                                    <div className="space-y-4 mb-6">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
                                        </div>
                                        {discount > 0 && (
                                            <div className="flex justify-between text-red-500">
                                                <span>Descuento (-{discount}%)</span>
                                                <span className="font-bold">-${discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-gray-600">
                                            <span>Costo de Envío</span>
                                            <span className="font-bold text-black">${deliveryFee}</span>
                                        </div>
                                        <hr className="border-gray-200" />
                                        <div className="flex justify-between text-xl">
                                            <span className="font-bold">Total</span>
                                            <span className="font-bold">${total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Promo Code */}
                                    <div className="mb-6">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Agregar código promocional"
                                                    value={promoCode}
                                                    onChange={(e) => setPromoCode(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                                                />
                                            </div>
                                            <Button
                                                variant="primary"
                                                className="px-8"
                                                onClick={applyPromoCode}
                                                disabled={validating}
                                            >
                                                {validating ? '...' : 'Aplicar'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Checkout Button — Mercado Pago */}
                                    <MercadoPagoBrick
                                        items={items}
                                        deliveryFee={deliveryFee}
                                        discountAmount={discountAmount}
                                    />
                                </>
                            )}
                        </div>
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
}
