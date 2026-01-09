import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function Login() {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);

    const onSubmit = async (data) => {
        setLoading(true);
        setAuthError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });

        if (error) {
            setAuthError(error.message);
            setLoading(false);
        } else {
            navigate('/admin/dashboard');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Admin Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {authError && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">
                                {authError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                type="email"
                                {...register('email', { required: 'Email es requerido' })}
                                placeholder="admin@example.com"
                            />
                            {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Password</label>
                            <Input
                                type="password"
                                {...register('password', { required: 'Password es requerido' })}
                                placeholder="••••••••"
                            />
                            {errors.password && <span className="text-red-500 text-xs">{errors.password.message}</span>}
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Iniciando sesión...' : 'Ingresar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
