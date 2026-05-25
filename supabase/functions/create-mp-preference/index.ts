// supabase/functions/create-mp-preference/index.ts
// Deno runtime – called from the React frontend to create a Mercado Pago Preference.
// The MP_ACCESS_TOKEN never leaves the server.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ── CORS headers (allow your frontend origin) ─────────────────────────────────
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',          // Tighten this in production
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
    // Handle pre-flight CORS request
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        // ── 1. Read environment secrets ──────────────────────────────────────────
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

        if (!accessToken) {
            console.error('MP_ACCESS_TOKEN no configurado en los secrets de Supabase');
            return json({ error: 'Configuración de servidor incompleta' }, 500);
        }

        // ── 2. Parse body from frontend ──────────────────────────────────────────
        // Expected shape:
        // {
        //   items: Array<{ id, name, price, quantity, image? }>
        //   deliveryFee: number        (e.g. 15)
        //   discountAmount: number     (e.g. 10.50 — ya calculado en el frontend)
        //   payerEmail?: string
        // }
        const body = await req.json();
        const { items = [], deliveryFee = 0, discountAmount = 0, payerEmail } = body;

        if (!items || items.length === 0) {
            return json({ error: 'El carrito está vacío' }, 400);
        }

        // ── 3. Build MP items array ───────────────────────────────────────────────
        // MP requires unit_price to be a positive number, two decimals max.
        const mpItems: MPItem[] = items.map((item: CartItem) => ({
            id: String(item.id),
            title: item.name || 'Producto',
            description: [item.color, item.size].filter(Boolean).join(' – ') || undefined,
            picture_url: item.image || undefined,
            category_id: 'fashion',
            quantity: Number(item.quantity),
            unit_price: round2(Number(item.price)),
            currency_id: 'ARS',
        }));

        // Shipping cost as a separate positive item
        if (deliveryFee > 0) {
            mpItems.push({
                id: 'shipping',
                title: 'Costo de Envío',
                quantity: 1,
                unit_price: round2(Number(deliveryFee)),
                currency_id: 'ARS',
            });
        }

        // Discount as a negative item so MP total matches what the user sees
        if (discountAmount > 0) {
            mpItems.push({
                id: 'discount',
                title: 'Descuento aplicado',
                quantity: 1,
                unit_price: -round2(Number(discountAmount)),   // negative ✓
                currency_id: 'ARS',
            });
        }

        // ── 4. Build the Preference payload ──────────────────────────────────────
        const preference: MPPreference = {
            items: mpItems,
            back_urls: {
                success: `${siteUrl}/`,
                failure: `${siteUrl}/`,
                pending: `${siteUrl}/`,
            },
            // auto_return: 'approved' — solo funciona con dominios públicos, no localhost

            statement_descriptor: 'MI TIENDA',   // Cambia por el nombre de tu negocio
            ...(payerEmail && {
                payer: { email: payerEmail },
            }),
        };

        // ── 5. Call Mercado Pago REST API ─────────────────────────────────────────
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(preference),
        });

        if (!mpRes.ok) {
            const errorBody = await mpRes.text();
            console.error('Error de Mercado Pago:', mpRes.status, errorBody);
            return json({ error: 'No se pudo crear la preferencia de pago', detail: errorBody }, 502);
        }

        const mpData = await mpRes.json();

        // ── 6. Return to frontend ─────────────────────────────────────────────────
        // init_point   → URL de producción (redirect real)
        // sandbox_init_point → URL de sandbox (tests)
        return json({
            preferenceId: mpData.id,
            init_point: mpData.init_point,
            sandbox_init_point: mpData.sandbox_init_point,
        });

    } catch (err) {
        console.error('Error inesperado en Edge Function:', err);
        return json({ error: 'Error interno del servidor' }, 500);
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

/** Round to 2 decimal places (MP requirement). */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ── Type helpers (no external deps needed in Deno) ────────────────────────────

interface CartItem {
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    image?: string;
}

interface MPItem {
    id: string;
    title: string;
    description?: string;
    picture_url?: string;
    category_id?: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
}

interface MPPreference {
    items: MPItem[];
    back_urls: { success: string; failure: string; pending: string };
    auto_return?: string;
    statement_descriptor?: string;
    payer?: { email: string };
}
