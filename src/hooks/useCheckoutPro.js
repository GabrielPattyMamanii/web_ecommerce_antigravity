import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useCheckoutPro
 *
 * Fetches a Mercado Pago Preference from the Supabase Edge Function and
 * redirects the user to the MP hosted checkout page (init_point).
 *
 * Usage:
 *   const { checkout, isLoading, error } = useCheckoutPro();
 *   <button onClick={() => checkout({ items, deliveryFee, discountAmount })}>Pagar</button>
 */
export function useCheckoutPro() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * @param {Object} params
     * @param {Array}  params.items          - Array from useCartStore
     * @param {number} params.deliveryFee    - Flat shipping fee (e.g. 15)
     * @param {number} params.discountAmount - Absolute discount in currency (e.g. 10.50)
     * @param {string} [params.payerEmail]   - Optional: pre-fill buyer email in MP
     */
    async function checkout({ items, deliveryFee = 0, discountAmount = 0, payerEmail } = {}) {
        if (!items || items.length === 0) {
            setError('El carrito está vacío.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke(
                'create-mp-preference',
                {
                    body: { items, deliveryFee, discountAmount, payerEmail },
                }
            );

            if (fnError) {
                // Intentar leer el cuerpo del error para saber exactamente qué falló
                let detail = fnError.message || 'Error desconocido';
                try {
                    // fnError.context contiene la Response cuando el status es non-2xx
                    const ctx = fnError.context;
                    if (ctx && typeof ctx.json === 'function') {
                        const body = await ctx.json();
                        detail = body?.error || body?.message || detail;
                        console.error('[useCheckoutPro] Edge Function error body:', body);
                    }
                } catch (_) { /* ignorar si no se puede parsear */ }
                throw new Error(detail);
            }

            if (!data?.init_point) throw new Error('No se recibió el link de pago del servidor');

            // Redirect to Mercado Pago hosted checkout
            window.location.href = data.init_point;


            // Note: we intentionally do NOT setIsLoading(false) here because the
            // page will navigate away. If the navigation is blocked for any reason,
            // the finally block will reset the state.
        } catch (err) {
            console.error('[useCheckoutPro]', err);
            setError(err.message || 'Error inesperado al iniciar el pago.');
            setIsLoading(false);
        }
    }

    return { checkout, isLoading, error };
}
