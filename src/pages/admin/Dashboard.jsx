import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Layers, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function Dashboard() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Admin Header */}
            <header className="bg-white shadow">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Admin Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{user?.email}</span>
                        <Button variant="outline" size="sm" onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" /> Salir
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate('/admin/products')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Productos</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Gestionar</div>
                        </CardContent>
                    </Card>
                    <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate('/admin/categories')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Gestionar</div>
                        </CardContent>
                    </Card>
                    <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate('/admin/settings')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Configuración</CardTitle>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Editar</div>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-lg font-semibold mb-4">Resumen</h2>
                <p className="text-muted-foreground">Bienvenido al panel de administración. Selecciona una opción arriba para comenzar.</p>
            </main>
        </div>
    );
}
