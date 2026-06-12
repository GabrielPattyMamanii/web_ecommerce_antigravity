// supabase/functions/create-sena-preference/index.ts
// Deno runtime – crea una preferencia de Mercado Pago para una seña y guarda el registro en DB.

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
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        const siteUrl     = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        if (!accessToken) {
            return json({ error: 'Configuración de servidor incompleta' }, 500);
        }

        const body = await req.json();
        const {
            product_id,
            product_source = 'products',
            product_name,
            product_image,
            product_price,
            buyer_name,
            buyer_lastname,
            buyer_email,
            buyer_whatsapp,
            delivery_location,
            amount,
        } = body;

        if (!product_id || !product_name || !buyer_name || !buyer_lastname || !buyer_email || !amount) {
            return json({ error: 'Faltan datos requeridos' }, 400);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Guardar seña en DB con status pending
        const { data: sena, error: senaError } = await supabase
            .from('senas')
            .insert({
                product_id:        String(product_id),
                product_source,
                product_name,
                product_image:     product_image     || null,
                product_price:     product_price     || null,
                buyer_name,
                buyer_lastname:    buyer_lastname     || null,
                buyer_email,
                buyer_whatsapp:    buyer_whatsapp     || null,
                delivery_location: delivery_location  || null,
                amount_paid:       round2(Number(amount)),
                status:            'pending',
            })
            .select()
            .single();

        if (senaError || !sena) {
            console.error('Error al guardar seña:', senaError);
            return json({ error: 'Error al registrar la seña en el sistema' }, 500);
        }

        const fullName = `${buyer_name} ${buyer_lastname}`.trim();

        // Construir preferencia de Mercado Pago
        const preference = {
            items: [{
                id:          `sena-${String(product_id)}`,
                title:       `Seña – ${product_name}`,
                description: `Reserva del producto ${product_name} – ${fullName}`,
                picture_url: product_image || undefined,
                quantity:    1,
                unit_price:  round2(Number(amount)),
                currency_id: 'ARS',
            }],
            back_urls: {
                success: `${siteUrl}/senas?sena_success=true&sena_id=${sena.id}`,
                failure: `${siteUrl}/senas?sena_failed=true&sena_id=${sena.id}`,
                pending: `${siteUrl}/senas?sena_pending=true&sena_id=${sena.id}`,
            },
            // auto_return solo funciona con dominios públicos, no localhost
            ...(!siteUrl.includes('localhost') && { auto_return: 'approved' }),
            external_reference:   sena.id,
            statement_descriptor: 'SEÑA TIENDA',
            payer: {
                name:  buyer_name,
                surname: buyer_lastname,
                email: buyer_email,
                ...(buyer_whatsapp && { phone: { area_code: '', number: buyer_whatsapp } }),
            },
        };

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${accessToken}`,
            },
            body: JSON.stringify(preference),
        });

        if (!mpRes.ok) {
            const errorBody = await mpRes.text();
            console.error('Error MP:', mpRes.status, errorBody);
            await supabase.from('senas').delete().eq('id', sena.id);
            return json({ error: 'No se pudo crear la preferencia de pago', detail: errorBody }, 502);
        }

        const mpData = await mpRes.json();

        await supabase
            .from('senas')
            .update({ mp_preference_id: mpData.id })
            .eq('id', sena.id);

        return json({
            preferenceId:       mpData.id,
            init_point:         mpData.init_point,
            sandbox_init_point: mpData.sandbox_init_point,
            sena_id:            sena.id,
        });

    } catch (err) {
        console.error('Error inesperado en create-sena-preference:', err);
        return json({ error: 'Error interno del servidor' }, 500);
    }
});

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
