import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, Truck, LogOut, ShoppingBag, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function UserDashboard() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [userColor, setUserColor] = useState('#6b7280'); // Default gray
    const [userId, setUserId] = useState(null);
    const [savingColor, setSavingColor] = useState(false);
    const [tandas, setTandas] = useState([]);
    const [loadingTandas, setLoadingTandas] = useState(true);

    useEffect(() => {
        const user = sessionStorage.getItem('app_username');
        const uid = sessionStorage.getItem('app_user_id');
        if (!user || !uid) {
            navigate('/admin/usuarios');
        } else {
            setUsername(user);
            setUserId(uid);
            fetchUserColor(uid);
            fetchTandas();
        }
    }, [navigate]);

    const fetchUserColor = async (uid) => {
        const { data } = await supabase.from('app_users').select('color').eq('id', uid).single();
        if (data && data.color) setUserColor(data.color);
    };

    const fetchTandas = async () => {
        setLoadingTandas(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('tanda_nombre')
                .order('tanda_nombre', { ascending: true });

            if (error) throw error;

            // Get unique tanda names
            const unique = [...new Set((data || []).map(r => r.tanda_nombre).filter(Boolean))];
            setTandas(unique);
        } catch (err) {
            console.error('Error fetching tandas:', err);
        } finally {
            setLoadingTandas(false);
        }
    };

    const handleColorChange = async (newColor) => {
        setUserColor(newColor);
        setSavingColor(true);
        try {
            const { error } = await supabase
                .from('app_users')
                .update({ color: newColor })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving color:', error);
            alert('Error al guardar el color');
        } finally {
            setSavingColor(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/admin/usuarios');
    };

    const PRESET_COLORS = [
        '#ef4444', // Red
        '#f97316', // Orange
        '#f59e0b', // Amber
        '#84cc16', // Lime
        '#10b981', // Emerald
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#d946ef', // Fuchsia
        '#f43f5e', // Rose
        '#6b7280', // Gray (Default)
    ];

    return (
        <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
                        Panel de Usuario
                    </h1>
                    <p className="text-gray-600">Bienvenido, <span className="font-bold text-gray-800">{username}</span></p>

                    {/* Color Picker Section */}
                    <div className="mt-4 flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-500">Tu Color:</span>
                        <div className="flex items-center gap-2">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => handleColorChange(color)}
                                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 border-2 ${userColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                            <div className="relative ml-2">
                                <input
                                    type="color"
                                    value={userColor}
                                    onChange={(e) => handleColorChange(e.target.value)}
                                    className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                                    title="Color personalizado"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 hover:bg-red-100 font-bold rounded-xl transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Salir
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Cargar Boletas Card */}
                <div
                    onClick={() => navigate('/dashboard/carga-boletas')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-pink-300 hover:shadow-lg cursor-pointer transition-all group h-full flex flex-col items-center text-center"
                    style={{ borderColor: userColor !== '#6b7280' ? `${userColor}40` : '' }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: `${userColor}20` }}
                    >
                        <FileText className="w-8 h-8" style={{ color: userColor }} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Cargar Boletas</h3>
                    <p className="text-gray-500 text-sm">Selecciona las marcas y boletas que corresponden a tu cuenta.</p>
                </div>

                {/* Resumen Card */}
                <div
                    onClick={() => navigate('/dashboard/resumen')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-violet-300 hover:shadow-lg cursor-pointer transition-all group h-full flex flex-col items-center text-center"
                    style={{ borderColor: userColor !== '#6b7280' ? `${userColor}40` : '' }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: `${userColor}20` }}
                    >
                        <ClipboardList className="w-8 h-8" style={{ color: userColor }} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Resumen</h3>
                    <p className="text-gray-500 text-sm">Visualiza todas las boletas cargadas y el detalle de productos.</p>
                </div>

                {/* Calcular Transporte Card */}
                <div
                    onClick={() => navigate('/dashboard/calculo')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-lg cursor-pointer transition-all group h-full flex flex-col items-center text-center header-md:col-span-1 md:col-span-1"
                    style={{ borderColor: userColor !== '#6b7280' ? `${userColor}40` : '' }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: `${userColor}20` }}
                    >
                        <Truck className="w-8 h-8" style={{ color: userColor }} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Calcular Transporte</h3>
                    <p className="text-gray-500 text-sm">Calcula costos de envío, pilotaje y comisiones por boleta.</p>
                </div>
            </div>

            {/* ── Productos Comprados ── */}
            <section className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${userColor}20` }}
                    >
                        <ShoppingBag className="w-5 h-5" style={{ color: userColor }} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Productos Comprados</h2>
                        <p className="text-sm text-gray-500">Tandas disponibles en tu cuenta</p>
                    </div>
                </div>

                {loadingTandas ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                        <div
                            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: `${userColor}60`, borderTopColor: 'transparent' }}
                        />
                        <span className="text-sm">Cargando tandas...</span>
                    </div>
                ) : tandas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <Package className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-400 font-medium">No hay tandas disponibles aún</p>
                        <p className="text-gray-300 text-sm mt-1">Las tandas creadas en Mercancía aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {tandas.map((nombre) => (
                            <div
                                key={nombre}
                                onClick={() => navigate(`/dashboard/tanda/${encodeURIComponent(nombre)}`)}
                                className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer hover:scale-105 active:scale-95"
                                style={{ borderColor: `${userColor}25` }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: `${userColor}15` }}
                                >
                                    <Package className="w-6 h-6" style={{ color: userColor }} />
                                </div>
                                <span
                                    className="text-sm font-semibold text-gray-700 leading-tight line-clamp-2"
                                    title={nombre}
                                >
                                    {nombre}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

