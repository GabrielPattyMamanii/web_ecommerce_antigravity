import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ChevronLeft, Eye, EyeOff, X, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function Login() {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const onSubmit = async (data) => {
        setLoading(true);
        setAuthError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                setAuthError(error.message === 'Invalid login credentials'
                    ? 'Email o contraseña incorrectos'
                    : error.message);
                setLoading(false);
            } else {
                // Check user role for redirection
                const { data: { user } } = await supabase.auth.getUser();
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/user/dashboard');
                }
            }
        } catch (err) {
            setAuthError('Ocurrió un error inesperado. Intente nuevamente.');
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#eef1f4] font-body">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[20%] left-[-5%] text-[150px] md:text-[250px] font-black text-public-primary/5 select-none pointer-events-none uppercase tracking-tighter hidden md:block">
                    KINETIC
                </div>
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[480px] px-6 animate-slide-up">
                <div className="bg-white overflow-hidden rounded-[32px] shadow-2xl border border-gray-100">
                    <div className="p-8 md:p-12">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="group flex items-center gap-2 text-gray-400 hover:text-public-primary transition-colors mb-8"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-bold uppercase tracking-wider">Volver</span>
                        </button>

                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-4xl font-black text-[#2c2f32] mb-2 tracking-tighter font-headline">Iniciar Sesión</h1>
                            <p className="text-gray-500 text-[15px]">
                                Por favor ingrese sus credenciales para acceder al sistema
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {authError && (
                                <div className="p-4 rounded-2xl bg-red-100 border border-red-200 text-red-600 text-sm animate-pulse">
                                    {authError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">
                                    Correo Electrónico
                                </label>
                                <div className="relative group">
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="ejemplo@correo.com"
                                        {...register('email', {
                                            required: 'El correo es obligatorio',
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Email inválido"
                                            }
                                        })}
                                        className="w-full bg-[#f5f7fa] border-none rounded-xl py-4 px-5 text-[#2c2f32] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-public-primary transition-all duration-300"
                                    />
                                    {errors.email && (
                                        <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">
                                        Contraseña
                                    </label>
                                    <button
                                        type="button"
                                        className="text-[13px] font-bold text-public-primary hover:opacity-80 transition-opacity"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        {...register('password', {
                                            required: 'La contraseña es obligatoria',
                                            minLength: { value: 6, message: "Mínimo 6 caracteres" }
                                        })}
                                        className="w-full bg-[#f5f7fa] border-none rounded-xl py-4 px-5 text-[#2c2f32] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-public-primary transition-all duration-300 pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2c2f32] transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                    {errors.password && (
                                        <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <button
                                    type="button"
                                    onClick={() => setRememberMe(!rememberMe)}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${rememberMe
                                        ? 'bg-[#002278] border-[#002278]'
                                        : 'bg-transparent border-gray-300'
                                        }`}
                                >
                                    {rememberMe && (
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                </button>
                                <span className="text-sm font-medium text-gray-500 select-none cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                                    Recordarme en este equipo
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-public-primary to-gray-800 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Ingresando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ingresar</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-gray-500 text-sm mt-8">
                                ¿No tienes una cuenta?{' '}
                                <button type="button" className="text-public-primary font-bold hover:underline">
                                    Click aquí para registrarse
                                </button>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* Close button X in corner */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-8 right-8 text-gray-400 hover:text-[#2c2f32] transition-colors p-3 bg-white shadow-md rounded-full active:scale-95"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
