import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Tag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { Button } from '../../components/ui/Button';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { QuantityPicker } from '../../components/ui/QuantityPicker';

export function Cart() {
    const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);

    const deliveryFee = 15;
    const subtotal = totalPrice();
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount + deliveryFee;

    const applyPromoCode = () => {
        // Mock promo code logic
        if (promoCode.toLowerCase() === 'descuento20') {
            setDiscount(20);
        } else {
            alert('Código promocional inválido');
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
                                    <p className="text-2xl font-bold">${item.price}</p>
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
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                            </div>

                            {/* Checkout Button */}
                            <Button
                                size="lg"
                                className="w-full mb-3"
                                onClick={() => alert('Ir a checkout')}
                            >
                                Ir al Checkout
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
