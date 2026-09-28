import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus, X, Package } from 'lucide-react';
import { useCartStore } from '../../context/cartStore';
import { Drawer } from '../ui/Drawer';
import { getWhatsAppQuoteCartLink } from '../../utils/whatsapp';

export function CartDrawer({ isOpen, onClose }) {
    const { items, removeItem, updateQuantity, totalPrice } = useCartStore();
    const navigate = useNavigate();

    const isQuoteCart = items.length > 0 && items[0].price_on_request === true;
    const subtotal = totalPrice();

    const goToCatalog = () => {
        onClose();
        navigate('/catalog');
    };

    const goToCheckout = () => {
        onClose();
        navigate('/checkout');
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            widthClassName="max-w-md"
            ariaLabel="Carrito de compras"
            headerContent={
                <div className="bg-gray-50 p-5 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="font-bold text-lg">Tu Carrito</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Revisá tus productos antes de finalizar la compra.</p>
                </div>
            }
            footer={
                items.length > 0 && !isQuoteCart ? (
                    <div className="px-5 py-5 space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
                                Subtotal
                            </p>
                            <p className="text-3xl font-black text-black">${subtotal.toFixed(2)}</p>
                        </div>
                        <p className="text-xs text-center text-gray-400">El envío se calcula en el checkout.</p>
                        <button
                            onClick={goToCheckout}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 text-sm"
                        >
                            Finalizar Compra
                        </button>
                    </div>
                ) : null
            }
        >
            {items.length === 0 ? (
                <div className="px-5 py-14 text-center">
                    <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium mb-4">Tu carrito está vacío.</p>
                    <button
                        onClick={goToCatalog}
                        className="inline-flex items-center justify-center py-3 px-6 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition-colors text-sm"
                    >
                        Ir al Catálogo
                    </button>
                </div>
            ) : (
                <>
                    {isQuoteCart && (
                        <div className="mx-5 mt-4 bg-[#25D366]/10 border border-[#25D366]/25 rounded-xl p-3 text-sm text-[#128C7E]">
                            Estos productos son a cotizar. Enviá tu lista por WhatsApp y te respondemos con los precios.
                        </div>
                    )}

                    <div className="px-5 py-4 space-y-3 border-b border-gray-100 bg-gray-50">
                        {items.map((item) => (
                            <div key={`${item.id}-${item.color}-${item.size}`} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-2.5">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                        Talla: <span className="font-medium">{item.size || 'N/A'}</span>
                                        {' · '}
                                        Color: <span className="font-medium">{item.color || 'N/A'}</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
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

                                <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    {isQuoteCart
                                        ? <span className="text-xs font-bold text-[#25D366]">A consultar</span>
                                        : <p className="text-sm font-bold text-gray-800">${item.price}</p>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>

                    {isQuoteCart && (
                        <div className="p-5">
                            <a
                                href={getWhatsAppQuoteCartLink(items)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Pedir cotización por WhatsApp
                            </a>
                        </div>
                    )}
                </>
            )}
        </Drawer>
    );
}
