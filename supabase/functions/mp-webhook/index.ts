// supabase/functions/mp-webhook/index.ts
// Deno runtime — recibe notificaciones de Mercado Pago y actualiza el estado de las señas automáticamente.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// Mapeo de estados de MP a estados de seña
const MP_STATUS_MAP: Record<string, string | null> = {
    approved:      'approved',
    rejected:      'rejected',
    cancelled:     'rejected',
    charged_back:  'rejected',
    refunded:      'rejected',
    // pending / in_process / authorized → no cambiar (dejar en pending)
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return json({ ok: true }, 204);
    }

    // MP valida la URL con GET al registrar el webhook
    if (req.method === 'GET') {
        return json({ ok: true });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!accessToken) {
        return json({ error: 'Configuración de servidor incompleta' }, 500);
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON' }, 400);
    }

    console.log('[mp-webhook] Notificación recibida:', JSON.stringify(body));

    // MP envía notificaciones en dos formatos:
    // Webhooks: { action: 'payment.updated', data: { id: '...' } }
    // IPN:      { topic: 'payment',          id: '...' }         (query params también)
    const action  = body.action as string | undefined;
    const topic   = body.type   as string | undefined;
    const ipnData = body.data   as { id?: string | number } | undefined;

    // Extraer payment ID
    let paymentId: string | null = null;

    if (ipnData?.id) {
        // formato webhook/IPN estándar
        paymentId = String(ipnData.id);
    } else if (body.id && (topic === 'payment' || action?.startsWith('payment'))) {
        paymentId = String(body.id);
    }

    // Determinar si es notificación de pago
    const isPaymentNotification =
        topic === 'payment' ||
        action === 'payment.updated' ||
        action === 'payment.created';

    if (!isPaymentNotification || !paymentId) {
        console.log('[mp-webhook] Notificación ignorada (no es de pago):', topic || action);
        return json({ ok: true, note: 'notification ignored' });
    }

    // Verificar el pago directamente en la API de MP (nunca confiar ciegamente en el webhook)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!mpRes.ok) {
        const errorText = await mpRes.text();
        console.error('[mp-webhook] Error al consultar pago en MP:', mpRes.status, errorText);
        return json({ error: 'Error al consultar pago en MP' }, 502);
    }

    const payment = await mpRes.json();
    const mpStatus          = payment.status        as string;
    const senaId            = payment.external_reference as string | null;
    const mpPreferenceId    = payment.preference_id as string | null;

    console.log(`[mp-webhook] Pago ${paymentId}: status=${mpStatus}, senaId=${senaId}, preferenceId=${mpPreferenceId}`);

    if (!senaId && !mpPreferenceId) {
        return json({ ok: true, note: 'no external_reference ni preference_id' });
    }

    const senaStatus = MP_STATUS_MAP[mpStatus] ?? null;

    const updatePayload: Record<string, unknown> = {
        mp_payment_id: paymentId,
    };
    if (senaStatus) {
        updatePayload.status = senaStatus;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar por external_reference (sena.id) primero, luego por mp_preference_id como fallback
    let updateError = null;

    if (senaId) {
        const { error } = await supabase
            .from('senas')
            .update(updatePayload)
            .eq('id', senaId);
        updateError = error;
    } else if (mpPreferenceId) {
        const { error } = await supabase
            .from('senas')
            .update(updatePayload)
            .eq('mp_preference_id', mpPreferenceId);
        updateError = error;
    }

    if (updateError) {
        console.error('[mp-webhook] Error al actualizar seña:', updateError);
        return json({ error: 'Error al actualizar seña en la base de datos' }, 500);
    }

    console.log(`[mp-webhook] Seña actualizada: id=${senaId}, status=${senaStatus ?? 'sin cambio'}, mp_payment_id=${paymentId}`);
    return json({ ok: true });
});

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}
