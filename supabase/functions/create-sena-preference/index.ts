// supabase/functions/create-sena-preference/index.ts
// Deno runtime – crea una preferencia de Mercado Pago para un carrito de señas
// (uno o varios productos) y guarda el carrito + sus ítems en DB.
// El monto SIEMPRE se recalcula en el servidor a partir de site_config /
// sena_price_ranges — nunca se confía en un monto enviado por el cliente.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

interface SenaItemInput {
    product_id: string | number;
    product_source?: string;
    product_name: string;
    product_image?: string | null;
    product_price?: number | null;
    quantity?: number;
}

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
            items,
            buyer_name,
            buyer_lastname,
            buyer_email,
            buyer_whatsapp,
            delivery_location,
        } = body as {
            items: SenaItemInput[];
            buyer_name: string;
            buyer_lastname?: string;
            buyer_email: string;
            buyer_whatsapp?: string;
            delivery_location?: string;
        };

        if (!Array.isArray(items) || items.length === 0) {
            return json({ error: 'El carrito de señas está vacío' }, 400);
        }
        if (!buyer_name || !buyer_email) {
            return json({ error: 'Faltan datos requeridos' }, 400);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        if (delivery_location && buyer_whatsapp) {
            const telefonoNormalizado = normalizePhone(buyer_whatsapp);

            const { data: previosDelCliente, error: previosError } = await supabase
                .from('sena_carritos')
                .select('buyer_whatsapp, delivery_location, status')
                .not('delivery_location', 'is', null)
                .in('status', ['pending', 'approved', 'delivered']);

            if (previosError) {
                console.error('Error al verificar lugar de entrega previo:', previosError);
                return json({ error: 'No se pudo verificar el historial de entregas' }, 500);
            }

            const previoConOtroLugar = (previosDelCliente || []).find(
                (c) =>
                    normalizePhone(c.buyer_whatsapp) === telefonoNormalizado &&
                    c.delivery_location !== delivery_location
            );

            if (previoConOtroLugar) {
                return json({
                    error: 'No podés cambiar el lugar de entrega',
                    detail: `Ya tenés un pedido registrado con lugar de entrega "${previoConOtroLugar.delivery_location}". Para modificarlo, contactate con nosotros por WhatsApp.`,
                }, 409);
            }
        }

        const normalizedItems = items.map((item) => ({
            product_id:     String(item.product_id),
            product_source: item.product_source || 'products',
            product_name:   item.product_name,
            product_image:  item.product_image || null,
            product_price:  item.product_price != null ? Number(item.product_price) : null,
            quantity:       Math.max(1, Math.floor(Number(item.quantity) || 1)),
        }));

        if (normalizedItems.some((it) => !it.product_id || !it.product_name)) {
            return json({ error: 'Ítem de carrito inválido' }, 400);
        }

        const { data: config, error: configError } = await supabase
            .from('site_config')
            .select('sena_enabled, sena_type, sena_amount, sena_percentage')
            .single();

        if (configError || !config) {
            return json({ error: 'No se pudo leer la configuración de señas' }, 500);
        }
        if (!config.sena_enabled) {
            return json({ error: 'Las señas no están disponibles en este momento' }, 400);
        }

        const totalQty = normalizedItems.reduce((acc, it) => acc + it.quantity, 0);

        let amount = 0;

        if (config.sena_type === 'ranges') {
            const { data: ranges, error: rangesError } = await supabase
                .from('sena_price_ranges')
                .select('min_qty, max_qty, amount')
                .order('min_qty', { ascending: true });

            if (rangesError) {
                return json({ error: 'No se pudieron leer los rangos de precio' }, 500);
            }

            const match = (ranges || []).find(
                (r) => totalQty >= r.min_qty && (r.max_qty == null || totalQty <= r.max_qty)
            );

            if (!match) {
                return json({ error: 'No hay un rango de precio configurado para esa cantidad' }, 400);
            }

            amount = Number(match.amount);
        } else if (config.sena_type === 'percentage') {
            const subtotal = normalizedItems.reduce(
                (acc, it) => acc + (it.product_price || 0) * it.quantity,
                0
            );
            amount = (subtotal * Number(config.sena_percentage || 0)) / 100;
        } else {
            amount = Number(config.sena_amount || 0) * totalQty;
        }

        amount = round2(amount);

        if (!(amount > 0)) {
            return json({ error: 'El monto de la seña calculado no es válido' }, 400);
        }

        // Guardar el carrito de señas (cabecera) con status pending
        const { data: carrito, error: carritoError } = await supabase
            .from('sena_carritos')
            .insert({
                buyer_name,
                buyer_lastname:    buyer_lastname    || null,
                buyer_email,
                buyer_whatsapp:    buyer_whatsapp    || null,
                delivery_location: delivery_location || null,
                amount_paid:       amount,
                status:            'pending',
            })
            .select()
            .single();

        if (carritoError || !carrito) {
            console.error('Error al guardar carrito de señas:', carritoError);
            return json({ error: 'Error al registrar el carrito de señas' }, 500);
        }

        const { error: itemsError } = await supabase
            .from('sena_items')
            .insert(
                normalizedItems.map((it) => ({
                    sena_carrito_id: carrito.id,
                    ...it,
                }))
            );

        if (itemsError) {
            console.error('Error al guardar ítems del carrito:', itemsError);
            await supabase.from('sena_carritos').delete().eq('id', carrito.id);
            return json({ error: 'Error al registrar los productos del carrito' }, 500);
        }

        const fullName = `${buyer_name} ${buyer_lastname || ''}`.trim();
        const itemsSummary = normalizedItems.map((it) => `${it.quantity}x ${it.product_name}`).join(', ');

        // Construir preferencia de Mercado Pago: un único ítem con el monto total de la seña
        const preference = {
            items: [{
                id:          `sena-carrito-${carrito.id}`,
                title:       normalizedItems.length === 1
                    ? `Seña – ${normalizedItems[0].product_name}`
                    : `Seña – ${normalizedItems.length} productos`,
                description: `${itemsSummary} – ${fullName}`,
                picture_url: normalizedItems[0].product_image || undefined,
                quantity:    1,
                unit_price:  amount,
                currency_id: 'ARS',
            }],
            back_urls: {
                success: `${siteUrl}/senas?sena_success=true&sena_id=${carrito.id}`,
                failure: `${siteUrl}/senas?sena_failed=true&sena_id=${carrito.id}`,
                pending: `${siteUrl}/senas?sena_pending=true&sena_id=${carrito.id}`,
            },
            // auto_return solo funciona con dominios públicos, no localhost
            ...(!siteUrl.includes('localhost') && { auto_return: 'approved' }),
            external_reference:   carrito.id,
            statement_descriptor: 'SEÑA TIENDA',
            payer: {
                name:  buyer_name,
                surname: buyer_lastname || undefined,
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
            await supabase.from('sena_carritos').delete().eq('id', carrito.id);
            return json({ error: 'No se pudo crear la preferencia de pago', detail: errorBody }, 502);
        }

        const mpData = await mpRes.json();

        await supabase
            .from('sena_carritos')
            .update({ mp_preference_id: mpData.id })
            .eq('id', carrito.id);

        return json({
            preferenceId:       mpData.id,
            init_point:         mpData.init_point,
            sandbox_init_point: mpData.sandbox_init_point,
            sena_id:            carrito.id,
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

function normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
}
