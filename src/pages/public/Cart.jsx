import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, MessageCircle } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export function Cart() {
    const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();

    const handleCheckout = () => {
        const phoneNumber = '1234567890'; // Replace with config number later
        const message = `Hola, me gustaría realizar el siguiente pedido:%0A%0A${items
            .map((item) => `- ${item.quantity}x ${item.name} ($${item.price})`)
            .join('%0A')}%0A%0ATotal: $${totalPrice().toFixed(2)}`;

        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
                <p className="text-muted-foreground mb-8">¡Agrega algunos productos para comenzar!</p>
                <Link to="/catalog">
                    <Button size="lg">Ir al Catálogo</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => (
                        <Card key={item.id}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-medium truncate">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={() => removeItem(item.id)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Summary */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Resumen del Pedido</h3>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>${totalPrice().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Envío</span>
                                    <span>A coordinar</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>${totalPrice().toFixed(2)}</span>
                                </div>
                            </div>
                            <Button className="w-full mb-3" size="lg" onClick={handleCheckout}>
                                <MessageCircle className="mr-2 h-5 w-5" /> Finalizar en WhatsApp
                            </Button>
                            <Button variant="outline" className="w-full" onClick={clearCart}>
                                Vaciar Carrito
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
