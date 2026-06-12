// supabase/functions/manage-admin-users/index.ts
// Gestión de usuarios staff del panel admin. Requiere service_role para operar sobre auth.users.
// Acciones: list | create | update_password | update_permissions | delete

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
    // Verificar que el caller sea admin
    const authHeader = req.headers.get('Authorization');
    console.log('[manage-admin-users] Authorization header present:', !!authHeader);
    if (!authHeader) return json({ error: 'No autorizado: falta Authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    console.log('[manage-admin-users] getUser result - userId:', user?.id, '| error:', authErr?.message);
    if (authErr || !user) return json({ error: 'No autorizado: token inválido' }, 401);

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    console.log('[manage-admin-users] caller profile role:', callerProfile?.role, '| profileErr:', profileErr?.message);
    if (callerProfile?.role !== 'admin') return json({ error: `Acceso denegado: rol actual es "${callerProfile?.role ?? 'null'}", se requiere "admin"` }, 403);

    const body = await req.json();
    const { action } = body;
    console.log('[manage-admin-users] action:', action);

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (action === 'list') {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name, permissions')
            .eq('role', 'staff');

        if (error) return json({ error: error.message }, 500);
        return json({ users: data });
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
        const { email, password, display_name, permissions = [] } = body;
        if (!email || !password) return json({ error: 'Email y contraseña son requeridos' }, 400);

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Omite verificación de email
        });

        if (createErr) return json({ error: createErr.message }, 400);

        // Upsert en profiles (puede haber trigger on_auth_user_created)
        const { error: profileErr } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id:           created.user.id,
                role:         'staff',
                email,
                display_name: display_name || null,
                permissions:  permissions,
            }, { onConflict: 'id' });

        if (profileErr) {
            // Rollback: eliminar usuario auth recién creado
            await supabaseAdmin.auth.admin.deleteUser(created.user.id);
            return json({ error: profileErr.message }, 500);
        }

        return json({ user: { id: created.user.id, email, display_name, permissions } });
    }

    // ── UPDATE PASSWORD ───────────────────────────────────────────────────────
    if (action === 'update_password') {
        const { user_id, password } = body;
        if (!user_id || !password) return json({ error: 'user_id y password son requeridos' }, 400);
        if (password.length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);

        const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
    }

    // ── UPDATE PERMISSIONS ────────────────────────────────────────────────────
    if (action === 'update_permissions') {
        const { user_id, permissions, display_name } = body;
        if (!user_id) return json({ error: 'user_id es requerido' }, 400);

        const updates: Record<string, unknown> = { permissions: permissions ?? [] };
        if (display_name !== undefined) updates.display_name = display_name;

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', user_id)
            .eq('role', 'staff'); // Seguridad: solo actualiza staff, nunca admin

        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (action === 'delete') {
        const { user_id } = body;
        if (!user_id) return json({ error: 'user_id es requerido' }, 400);

        // Verificar que el usuario a eliminar sea staff (nunca eliminar un admin)
        const { data: target } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user_id)
            .single();

        if (target?.role === 'admin') return json({ error: 'No se puede eliminar un usuario admin' }, 403);

        // Eliminar de auth (el perfil se borra en cascada si hay FK, sino lo borramos explícitamente)
        const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (authDeleteErr) return json({ error: authDeleteErr.message }, 400);

        // Por si no hay cascada, eliminar el perfil también
        await supabaseAdmin.from('profiles').delete().eq('id', user_id);

        return json({ success: true });
    }

    // ── ADOPT (vincular usuario existente sin cambiar su contraseña) ─────────────
    if (action === 'adopt') {
        const { email, permissions = [], display_name } = body;
        if (!email) return json({ error: 'Email es requerido' }, 400);

        // Buscar el usuario en auth por email
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) return json({ error: 'No se pudo buscar el usuario: ' + listErr.message }, 500);

        const existingUser = listData.users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase().trim());
        if (!existingUser) return json({ error: `No existe ninguna cuenta con el email "${email}"` }, 404);

        // Verificar que no sea admin (no se puede degradar accidentalmente)
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', existingUser.id)
            .single();

        if (existingProfile?.role === 'admin') {
            return json({ error: 'Ese usuario ya es admin, no se puede vincular como staff' }, 409);
        }

        // Actualizar/crear el perfil con role=staff y permisos
        const { error: upsertErr } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id:           existingUser.id,
                role:         'staff',
                email:        existingUser.email,
                display_name: display_name?.trim() || existingProfile?.display_name || null,
                permissions:  permissions,
            }, { onConflict: 'id' });

        if (upsertErr) return json({ error: upsertErr.message }, 500);

        console.log('[manage-admin-users] adopted user:', existingUser.id, existingUser.email);
        return json({ user: { id: existingUser.id, email: existingUser.email, display_name, permissions } });
    }

    return json({ error: `Acción desconocida: ${action}` }, 400);

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[manage-admin-users] Unhandled exception:', message);
        return json({ error: `Error interno: ${message}` }, 500);
    }
});

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}
