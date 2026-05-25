import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useSena
 *
 * Llama a la Edge Function create-sena-preference y redirige al checkout de MP.
 */
export function useSena() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState(null);

    async function pagarSena({
        product_id,
        product_source,
        product_name,
        product_image,
        product_price,
        buyer_name,
        buyer_lastname,
        buyer_email,
        buyer_whatsapp,
        delivery_location,
        amount,
    }) {
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke(
                'create-sena-preference',
                {
                    body: {
                        product_id,
                        product_source,
                        product_name,
                        product_image,
                        product_price,
                        buyer_name,
                        buyer_lastname,
                        buyer_email,
                        buyer_whatsapp,
                        delivery_location,
                        amount,
                    },
                }
            );

            if (fnError) {
                let detail = fnError.message || 'Error desconocido';
                try {
                    const ctx = fnError.context;
                    if (ctx && typeof ctx.json === 'function') {
                        const body = await ctx.json();
                        // Mostrar el detalle de MP si está disponible
                        detail = body?.detail || body?.error || body?.message || detail;
                        console.error('[useSena] Respuesta del servidor:', body);
                    }
                } catch (_) {}
                throw new Error(detail);
            }

            // La función devolvió 200 pero con error interno
            if (data?.error) {
                console.error('[useSena] Error de la función:', data);
                throw new Error(data.detail || data.error);
            }

            if (!data?.init_point) throw new Error('No se recibió el link de pago del servidor');

            window.location.href = data.init_point;
        } catch (err) {
            console.error('[useSena]', err);
            setError(err.message || 'Error inesperado al procesar la seña.');
            setIsLoading(false);
        }
    }

    return { pagarSena, isLoading, error };
}
