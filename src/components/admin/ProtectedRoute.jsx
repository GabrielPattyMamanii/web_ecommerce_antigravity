import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AdminLayout } from '../layout/AdminLayout';
import { AdminPermissionsProvider } from '../../context/AdminPermissionsContext';
import { supabase } from '../../lib/supabase';

export function ProtectedRoute() {
    const { session, loading } = useAuth();
    const [appUserValid, setAppUserValid] = useState(null);

    useEffect(() => {
        if (session) {
            setAppUserValid(null);
            return;
        }
        const appUserId = sessionStorage.getItem('app_user_id');
        if (!appUserId) {
            setAppUserValid(false);
            return;
        }
        supabase
            .rpc('get_app_user_permissions', { p_user_id: appUserId })
            .then(({ data, error }) => {
                const valid = !error && Array.isArray(data);
                if (!valid) {
                    sessionStorage.removeItem('app_user_id');
                    sessionStorage.removeItem('app_username');
                }
                setAppUserValid(valid);
            });
    }, [session]);

    if (loading || (!session && appUserValid === null)) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
    }

    if (!session && !appUserValid) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <AdminPermissionsProvider>
            <AdminLayout />
        </AdminPermissionsProvider>
    );
}
