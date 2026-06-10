import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AdminLayout } from '../layout/AdminLayout';
import { AdminPermissionsProvider } from '../../context/AdminPermissionsContext';

export function ProtectedRoute() {
    const { session, loading } = useAuth();
    const appUserId = sessionStorage.getItem('app_user_id');

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
    }

    if (!session && !appUserId) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <AdminPermissionsProvider>
            <AdminLayout />
        </AdminPermissionsProvider>
    );
}
