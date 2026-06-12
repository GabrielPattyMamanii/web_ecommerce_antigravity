import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const AdminPermissionsContext = createContext(null);

export function AdminPermissionsProvider({ children }) {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [appUserPermissions, setAppUserPermissions] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (user) {
            supabase
                .from('profiles')
                .select('role, permissions, display_name, email')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    setProfile(data);
                    setLoading(false);
                });
        } else {
            const appUserId = sessionStorage.getItem('app_user_id');
            if (appUserId) {
                supabase
                    .rpc('get_app_user_permissions', { p_user_id: appUserId })
                    .then(({ data }) => {
                        setAppUserPermissions(Array.isArray(data) ? data : []);
                        setLoading(false);
                    });
            } else {
                setAppUserPermissions([]);
                setLoading(false);
            }
        }
    }, [user?.id, authLoading]);

    const isAdmin = !!user && profile?.role === 'admin';
    const permissions = user ? (profile?.permissions || []) : (appUserPermissions ?? []);

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
