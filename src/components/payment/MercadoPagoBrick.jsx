import React from 'react';
import { ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
import { useCheckoutPro } from '../../hooks/useCheckoutPro';

/**
 * MercadoPagoBrick
 *
 * Botón de pago "Checkout PRO" de Mercado Pago.
 * Llama a la Edge Function de Supabase para crear una preferencia y
 * redirige al usuario al checkout alojado por Mercado Pago.
 *
 * Props:
 *  - items          (array)  : Ítems del carrito (useCartStore.items)
 *  - deliveryFee    (number) : Costo de envío
 *  - discountAmount (number) : Descuento en valor absoluto (ya calculado)
 *  - payerEmail?    (string) : Email del comprador (opcional)
 *  - className?     (string) : Clases extra para el botón
 */
export function MercadoPagoBrick({
    items,
    deliveryFee = 0,
    discountAmount = 0,
    payerEmail,
    className = '',
}) {
    const { checkout, isLoading, error } = useCheckoutPro();

    const handlePay = () => {
        checkout({ items, deliveryFee, discountAmount, payerEmail });
    };

    return (
        <div className="w-full">
            {/* Error message */}
            {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Pay button — styled with MP blue */}
            <button
                onClick={handlePay}
                disabled={isLoading || !items || items.length === 0}
                className={`
                    w-full flex items-center justify-center gap-2.5
                    bg-[#009EE3] hover:bg-[#007DBF] active:bg-[#006699]
                    text-white font-semibold text-base
                    py-3.5 px-6 rounded-full
                    transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed
                    shadow-md hover:shadow-lg
                    ${className}
                `}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Redirigiendo a Mercado Pago...</span>
                    </>
                ) : (
                    <>
                        {/* Mercado Pago logo-like icon (MP blue button style) */}
                        <ShoppingBag className="w-5 h-5" />
                        <span>Pagar con Mercado Pago</span>
                    </>
                )}
            </button>

            {/* Security note */}
            <p className="text-xs text-center text-gray-400 mt-2">
                🔒 Pago seguro procesado por Mercado Pago
            </p>
        </div>
    );
}
