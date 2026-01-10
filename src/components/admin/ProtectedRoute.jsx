import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AdminLayout } from '../layout/AdminLayout';

export function ProtectedRoute() {
    const { session, loading } = useAuth();

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <AdminLayout />
    );
}
