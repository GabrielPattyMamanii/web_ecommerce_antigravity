// supabase/functions/sena-buyer-lookup/index.ts
// Deno runtime – dado un número de WhatsApp, devuelve el lugar de entrega
// que el cliente ya eligió en un pedido de seña anterior (si existe).
// No expone ningún otro dato del comprador (nombre, email, montos, etc).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const { buyer_whatsapp } = await req.json() as { buyer_whatsapp?: string };
        const telefonoNormalizado = normalizePhone(buyer_whatsapp || '');

        if (!telefonoNormalizado) {
            return json({ delivery_location: null });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('sena_carritos')
            .select('buyer_whatsapp, delivery_location, created_at, status')
            .not('delivery_location', 'is', null)
            .in('status', ['pending', 'approved', 'delivered'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[sena-buyer-lookup] Error al consultar:', error);
            return json({ error: 'No se pudo consultar el historial' }, 500);
        }

        const previo = (data || []).find(
            (c) => normalizePhone(c.buyer_whatsapp) === telefonoNormalizado
        );

        return json({ delivery_location: previo?.delivery_location ?? null });

    } catch (err) {
        console.error('[sena-buyer-lookup] Error inesperado:', err);
        return json({ error: 'Error interno del servidor' }, 500);
    }
});

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

function normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
}
