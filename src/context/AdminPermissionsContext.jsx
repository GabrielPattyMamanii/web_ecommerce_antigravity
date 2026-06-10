import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const AdminPermissionsContext = createContext(null);

export function AdminPermissionsProvider({ children }) {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setLoading(false); return; }

        supabase
            .from('profiles')
            .select('role, permissions, display_name, email')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                setProfile(data);
                setLoading(false);
            });
    }, [user?.id, authLoading]);

    let isAdmin, permissions;

    if (user) {
        // Sesión Supabase Auth (admin principal)
        isAdmin = profile?.role === 'admin';
        permissions = profile?.permissions || [];
    } else {
        // Sesión via app_users (sessionStorage)
        isAdmin = false;
        try {
            permissions = JSON.parse(sessionStorage.getItem('app_user_permissions') || '[]');
        } catch {
            permissions = [];
        }
    }

    const can = (section) => isAdmin || permissions.includes(section);

    return (
        <AdminPermissionsContext.Provider value={{ isAdmin, permissions, can, profile, loading }}>
            {children}
        </AdminPermissionsContext.Provider>
    );
}

export function useAdminPermissions() {
    const ctx = useContext(AdminPermissionsContext);
    if (!ctx) throw new Error('useAdminPermissions debe usarse dentro de AdminPermissionsProvider');
    return ctx;
}
