
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Loader2, User } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export function UserLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '', // Treats email as username/identifier
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Custom Auth: Query 'clientes' table
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('email', formData.email) // Assuming 'email' column exists. If not, maybe 'nombre'?
                .single();

            if (error || !data) {
                throw new Error("Usuario no encontrado");
            }

            // Simple password check (plaintext for now as per plan constraints)
            // If we move to hashed passwords, we'd use bcryptjs here or a PG function
            if (data.password_hash !== formData.password) {
                throw new Error("Contraseña incorrecta");
            }

            // Login Success
            localStorage.setItem('mercancia_user_id', data.id);
            localStorage.setItem('mercancia_user_name', data.nombre);

            toast.success(`Bienvenido ${data.nombre}!`);
            setTimeout(() => navigate('/dashboard'), 500);

        } catch (error) {
            toast.error('Error al iniciar sesión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Toaster position="top-center" />
            <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="bg-primary/5 p-8 text-center border-b border-border">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Acceso Usuarios</h2>
                    <p className="text-muted-foreground mt-2 text-sm">Ingresa a tu panel de control</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Email / Usuario</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                placeholder="ejemplo@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none pr-12"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Ingresando...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
