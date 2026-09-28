import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useSenaLocationLookup
 *
 * Al perder foco el campo de WhatsApp, consulta si ese número ya tiene
 * un lugar de entrega asignado en un pedido de seña anterior, para
 * informar/bloquear el selector antes de que el pago falle.
 */
export function useSenaLocationLookup() {
    const [lockedLocation, setLockedLocation] = useState(null);
    const [checking, setChecking] = useState(false);

    const checkLocation = useCallback(async (buyer_whatsapp) => {
        const digits = (buyer_whatsapp || '').replace(/\D/g, '');
        if (digits.length < 6) {
            setLockedLocation(null);
            return null;
        }

        setChecking(true);
        try {
            const { data, error } = await supabase.functions.invoke('sena-buyer-lookup', {
                body: { buyer_whatsapp },
            });
            if (error || !data?.delivery_location) {
                setLockedLocation(null);
                return null;
            }
            setLockedLocation(data.delivery_location);
            return data.delivery_location;
        } catch {
            setLockedLocation(null);
            return null;
        } finally {
            setChecking(false);
        }
    }, []);

    return { lockedLocation, checking, checkLocation, clearLockedLocation: () => setLockedLocation(null) };
}
