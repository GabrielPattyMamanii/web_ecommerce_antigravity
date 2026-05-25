import React, { useState, useEffect } from 'react';
import { LogIn, Settings, Calendar, Plus, ArrowLeft, Layers, LogOut, FileText, Truck, ClipboardList, User, Camera, Check, Eye, EyeOff, X, Percent, DollarSign, Package, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';
import { useNavigate } from 'react-router-dom';
import { AvatarUploader } from '../../components/mercancia/AvatarUploader';

export function MiMercaderia() {
    const {
        mercanciaUser,
        loginMercancia,
        logoutMercancia,
        tandasBoletas,
        addTandaBoleta,
        updateUserProfile,
        updateTandaParametros
    } = useMercanciaUser();

    const navigate = useNavigate();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showCreateTandaModal, setShowCreateTandaModal] = useState(false);

    // Login State
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Tanda State
    const [newTanda, setNewTanda] = useState({ nombre: '', fecha: '' });

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({ password: '', newPassword: '' });
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [showProfilePassword, setShowProfilePassword] = useState(false);
    const [showNewProfilePassword, setShowNewProfilePassword] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    // --- NEW ADMIN STATES ---
    const [vistaActual, setVistaActual] = useState('lista'); // 'lista' | 'parametros'
    const [tandaSeleccionada, setTandaSeleccionada] = useState(null);
    const [guardadoExitoso, setGuardadoExitoso] = useState(false);

    // Admin Edit Params State
    const [parametros, setParametros] = useState({
        ruta: '',
        porcentajesMarca: [],
        gastosViaje: 0,
        pilotaje: {
            costoPorBulto: 0,
            cantidadBultosTotal: 0,
            cantidadBultosPagar: 0
        }
    });

    const [nuevaMarca, setNuevaMarca] = useState({
        porcentaje: '',
        descripcion: ''
    });

    // Handle Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);
        try {
            await loginMercancia(loginData.username, loginData.password);
            setShowLoginModal(false);
            setLoginData({ username: '', password: '' });
        } catch (err) {
            setLoginError(err.message || 'Usuario o contraseña incorrectos');
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Handle Logout
    const handleLogout = async () => {
        await logoutMercancia();
        navigate('/admin/dashboard');
    };

    // Handle Create Tanda (Admin only)
    const handleCreateTanda = (e) => {
        e.preventDefault();
        if (newTanda.nombre && newTanda.fecha) {
            const tanda = {
                id: Date.now(),
                nombre: newTanda.nombre,
                fecha: newTanda.fecha,
                parametros: {
                    ruta: '',
                    porcentajesMarca: [],
                    gastosViaje: 0,
                    pilotaje: {
                        costoPorBulto: 0,
                        cantidadBultosTotal: 0,
                        cantidadBultosPagar: 0
                    }
                }
            };
            addTandaBoleta(tanda);
            setShowCreateTandaModal(false);
            setNewTanda({ nombre: '', fecha: '' });
        }
    };

    // Update Profile Picture
    const handleImageUpdate = async (url) => {
        try {
            await updateUserProfile(mercanciaUser.id, { profile_image: url });
        } catch (err) {
            console.error('Error updating profile image:', err);
        }
    };

    // Update Password
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setProfileMsg('');
        setIsUpdatingProfile(true);

        if (profileData.newPassword.length < 6) {
            setProfileMsg('La nueva contraseña debe tener al menos 6 caracteres');
            setIsUpdatingProfile(false);
            return;
        }

        try {
            await updateUserProfile(mercanciaUser.id, { password: profileData.newPassword });
            setProfileMsg('Contraseña actualizada correctamente');
            setProfileData({ password: '', newPassword: '' });
            setShowProfilePassword(false);
            setShowNewProfilePassword(false);
            setTimeout(() => setIsEditingProfile(false), 2000);
        } catch (err) {
            setProfileMsg(err.message || 'Error al actualizar contraseña');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // --- ADMIN ACTIONS ---
    const handleConfigureTanda = (tandaId) => {
        const tanda = tandasBoletas.find(t => t.id === tandaId);
        if (tanda) {
            setTandaSeleccionada(tanda);
            // Load params, ensure structure exists
            const existingParams = tanda.parametros || {};
            setParametros({
                ruta: existingParams.ruta || '',
                porcentajesMarca: existingParams.porcentajesMarca || [],
                gastosViaje: existingParams.gastosViaje || 0,
                pilotaje: {
                    costoPorBulto: existingParams.pilotaje?.costoPorBulto || 0,
                    cantidadBultosTotal: existingParams.pilotaje?.cantidadBultosTotal || 0,
                    cantidadBultosPagar: existingParams.pilotaje?.cantidadBultosPagar || 0
                }
            });
            setVistaActual('parametros');
        }
    };

    const handleAgregarMarca = () => {
        if (nuevaMarca.porcentaje && nuevaMarca.descripcion) {
            setParametros({
                ...parametros,
                porcentajesMarca: [
                    ...parametros.porcentajesMarca,
                    {
                        descripcion: nuevaMarca.descripcion,
                        porcentaje: parseFloat(nuevaMarca.porcentaje)
                    }
                ]
            });
            setNuevaMarca({ porcentaje: '', descripcion: '' });
        }
    };

    const handleEliminarMarca = (index) => {
        setParametros({
            ...parametros,
            porcentajesMarca: parametros.porcentajesMarca.filter((_, i) => i !== index)
        });
    };

    const handleGuardarCambios = async () => {
        if (tandaSeleccionada) {
            await updateTandaParametros(tandaSeleccionada.id, parametros);
            setGuardadoExitoso(true);
            setTimeout(() => setGuardadoExitoso(false), 3000);
        }
    };


    // --- RENDER LOGIC ---

    // 1. Logged In View
    if (mercanciaUser) {
        // 1.1 ADMIN VIEW
        if (mercanciaUser.role === 'admin') {

            // ADMIN: PARAMETERS VIEW
            if (vistaActual === 'parametros' && tandaSeleccionada) {
                return (
                    <div className="min-h-screen bg-transparent pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header Parametros */}
                        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm rounded-xl">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setVistaActual('lista')}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span className="font-medium">Volver a Mi Mercadería</span>
                                </button>

                                <button
                                    onClick={handleGuardarCambios}
                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg hover:shadow-xl"
                                >
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </button>
                            </div>
                        </header>

                        {/* Toast Notification */}
                        {guardadoExitoso && (
                            <div className="fixed top-24 right-6 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 z-50">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-semibold">Cambios guardados exitosamente</span>
                            </div>
                        )}

                        <main className="max-w-7xl mx-auto px-6 py-8">
                            <div className="mb-6 flex items-center gap-4">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                                    Parámetros: {tandaSeleccionada.nombre}
                                </h1>
                                <input
                                    type="text"
                                    value={parametros.ruta}
                                    onChange={(e) => setParametros({ ...parametros, ruta: e.target.value })}
                                    placeholder="Ruta (ej: Chile -> Bermejo)"
                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="space-y-6">
                                {/* Porcentajes de Marca */}
                                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 border-b border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <Percent className="w-6 h-6 text-emerald-400" />
                                            <h2 className="text-xl font-bold text-white">Porcentajes de Marca</h2>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-gray-400 text-sm font-medium mb-2">Porcentaje (%)</label>
                                                <input
                                                    type="number"
                                                    value={nuevaMarca.porcentaje}
                                                    onChange={(e) => setNuevaMarca({ ...nuevaMarca, porcentaje: e.target.value })}
                                                    placeholder="0.00"
                                                    step="0.1"
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 text-sm font-medium mb-2">Descripción</label>
                                                <input
                                                    type="text"
                                                    value={nuevaMarca.descripcion}
                                                    onChange={(e) => setNuevaMarca({ ...nuevaMarca, descripcion: e.target.value })}
                                                    placeholder="Ej: Nike, Adidas..."
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    onClick={handleAgregarMarca}
                                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Agregar
                                                </button>
                                            </div>
                                        </div>

                                        {parametros.porcentajesMarca.length > 0 && (
                                            <div className="bg-gray-800/50 rounded-xl p-4">
                                                <div className="grid grid-cols-2 gap-4 mb-3 px-4">
                                                    <span className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Descripción</span>
                                                    <span className="text-emerald-400 text-sm font-bold uppercase tracking-wider text-right">Porcentaje</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {parametros.porcentajesMarca.map((marca, index) => (
                                                        <div key={index} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition group">
                                                            <span className="text-white font-medium">{marca.descripcion}</span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-emerald-400 text-lg font-bold">{marca.porcentaje}%</span>
                                                                <button
                                                                    onClick={() => handleEliminarMarca(index)}
                                                                    className="p-2 hover:bg-red-500/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Gastos del Viaje */}
                                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 border-b border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="w-6 h-6 text-emerald-400" />
                                            <h2 className="text-xl font-bold text-white">Gastos del Viaje (Total en ARG)</h2>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-gray-400 text-sm font-medium mb-2">Monto Total ($ARG)</label>
                                                <input
                                                    type="number"
                                                    value={parametros.gastosViaje}
                                                    onChange={(e) => setParametros({ ...parametros, gastosViaje: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-lg"
                                                />
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-xl p-6 border border-emerald-700/50">
                                                <div className="text-emerald-400 text-sm font-medium mb-1">VALOR ACTUAL</div>
                                                <div className="text-white text-3xl font-bold">
                                                    ${parametros.gastosViaje.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Pilotaje */}
                                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 border-b border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <Package className="w-6 h-6 text-emerald-400" />
                                            <h2 className="text-xl font-bold text-white">Pilotaje</h2>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-gray-400 text-sm font-medium mb-2">Costo por Bulto (USD)</label>
                                                <input
                                                    type="number"
                                                    value={parametros.pilotaje.costoPorBulto}
                                                    onChange={(e) => setParametros({
                                                        ...parametros,
                                                        pilotaje: { ...parametros.pilotaje, costoPorBulto: parseFloat(e.target.value) || 0 }
                                                    })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                />
                                                <p className="text-emerald-400 text-sm mt-2">Actual: ${parametros.pilotaje.costoPorBulto?.toFixed(2)} USD</p>
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 text-sm font-medium mb-2">Cantidad de Bultos TOTAL</label>
                                                <input
                                                    type="number"
                                                    value={parametros.pilotaje.cantidadBultosTotal}
                                                    onChange={(e) => setParametros({
                                                        ...parametros,
                                                        pilotaje: { ...parametros.pilotaje, cantidadBultosTotal: parseInt(e.target.value) || 0 }
                                                    })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                />
                                                <p className="text-emerald-400 text-sm mt-2">Actual: {parametros.pilotaje.cantidadBultosTotal}</p>
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 text-sm font-medium mb-2">Cantidad de Bultos a PAGAR</label>
                                                <input
                                                    type="number"
                                                    value={parametros.pilotaje.cantidadBultosPagar}
                                                    onChange={(e) => setParametros({
                                                        ...parametros,
                                                        pilotaje: { ...parametros.pilotaje, cantidadBultosPagar: parseInt(e.target.value) || 0 }
                                                    })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                />
                                                <p className="text-emerald-400 text-sm mt-2">Actual: {parametros.pilotaje.cantidadBultosPagar}</p>
                                            </div>

                                            {/* CALCULATION CARD */}
                                            <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-xl p-6 border border-emerald-700/50 md:col-span-3">
                                                <div className="text-emerald-400 text-sm font-medium mb-1">COSTO TOTAL PILOTAJE (Costo x Total Bultos)</div>
                                                <div className="text-white text-3xl font-bold">
                                                    ${(parametros.pilotaje.costoPorBulto * parametros.pilotaje.cantidadBultosTotal).toFixed(2)} USD
                                                </div>
                                                <p className="text-gray-400 text-xs mt-1">
                                                    Cálculo basado en: Costo ({parametros.pilotaje.costoPorBulto}) x Bultos TOTAL ({parametros.pilotaje.cantidadBultosTotal})
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                );
            }

            // ADMIN: LIST VIEW
            return (
                <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">
                    <header className="mb-8">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-2">
                                Gestión de Tandas
                            </h1>
                            <p className="text-gray-600">Configura y administra las tandas activas</p>
                        </div>
                        {/* Logout button removed as per user request */}
                    </header>

                    {/* Card Principal */}
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Tandas Disponibles</h2>
                                <p className="text-gray-400">Selecciona una tanda para configurar o gestionar</p>
                            </div>
                            <button
                                onClick={() => setShowCreateTandaModal(true)}
                                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg hover:shadow-xl"
                            >
                                <Plus className="w-5 h-5" />
                                Nueva Tanda
                            </button>
                        </div>

                        {/* Grid de Tandas */}
                        {tandasBoletas.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-xl">
                                <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                <p className="text-gray-400">No hay tandas creadas</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {tandasBoletas.map(tanda => (
                                    <div
                                        key={tanda.id}
                                        className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-6 border border-gray-700 hover:border-emerald-500 transition-all hover:shadow-xl group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                                                <Package className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(tanda.fecha).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-4">{tanda.nombre}</h3>

                                        <button
                                            onClick={() => handleConfigureTanda(tanda.id)}
                                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-semibold transition group-hover:scale-105"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Configurar Parámetros
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mi Perfil Section */}
                        <div className="border-t border-gray-700 pt-6">
                            <h3 className="text-gray-400 text-sm font-semibold mb-4">Mi Perfil (Admin)</h3>
                            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-4 border border-gray-700 inline-flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                    {mercanciaUser.profile_image ? (
                                        <img src={mercanciaUser.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        (mercanciaUser.email?.[0] || 'A').toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-semibold">{mercanciaUser.email}</p>
                                    <p className="text-emerald-400 text-sm">Administrador</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Create Tanda Modal */}
                    {showCreateTandaModal && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 max-w-md w-full relative">
                                <button
                                    onClick={() => setShowCreateTandaModal(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <h2 className="text-2xl font-bold text-white mb-6">Crear Nueva Tanda</h2>
                                <form onSubmit={handleCreateTanda} className="space-y-4">
                                    {/* Same form as before */}
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Nombre de la Tanda</label>
                                        <input
                                            type="text"
                                            value={newTanda.nombre}
                                            onChange={(e) => setNewTanda({ ...newTanda, nombre: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                                            placeholder="Ej: Verano 2024"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Fecha</label>
                                        <input
                                            type="date"
                                            value={newTanda.fecha}
                                            onChange={(e) => setNewTanda({ ...newTanda, fecha: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            type="submit"
                                            className="w-full px-4 py-3 bg-[#49EBBD] hover:bg-[#3ddeb1] text-black font-bold rounded-xl transition-colors"
                                        >
                                            Crear
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // 1.2 USER VIEW (Cards) - Unchanged but re-included
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#49EBBD]">Mi Mercadería</h1>
                        <p className="text-gray-400 mt-2">Bienvenido al panel de gestión</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/30 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Actions Column */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div
                            onClick={() => navigate('/user/boletas')}
                            className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 hover:border-[#49EBBD]/50 hover:bg-[#1a1a1a]/80 cursor-pointer transition-all group h-full"
                        >
                            <div className="w-12 h-12 bg-[#49EBBD]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileText className="w-6 h-6 text-[#49EBBD]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Cargar Boletas</h3>
                            <p className="text-gray-400 text-sm">Registra nuevas boletas para las tandas activas.</p>
                        </div>

                        <div
                            onClick={() => navigate('/user/resumen-boletas')}
                            className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 hover:border-[#49EBBD]/50 hover:bg-[#1a1a1a]/80 cursor-pointer transition-all group h-full"
                        >
                            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <ClipboardList className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Resumen</h3>
                            <p className="text-gray-400 text-sm">Visualiza todas tus boletas cargadas.</p>
                        </div>

                        <div
                            onClick={() => navigate('/user/calculo-transporte')}
                            className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 hover:border-[#49EBBD]/50 hover:bg-[#1a1a1a]/80 cursor-pointer transition-all group md:col-span-2 h-full"
                        >
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Truck className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Calcular Transporte</h3>
                            <p className="text-gray-400 text-sm">Calcula costos de envío y comisiones.</p>
                        </div>
                    </div>

                    {/* User Profile Column */}
                    <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
                            <button
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className="text-[#49EBBD] text-sm hover:underline"
                            >
                                {isEditingProfile ? 'Cancelar' : 'Editar'}
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-6">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700 mb-4 relative group">
                                {mercanciaUser.profile_image ? (
                                    <img src={mercanciaUser.profile_image} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                                        <User className="w-10 h-10" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                    <AvatarUploader onImageUpload={handleImageUpdate}>
                                        <div className="text-white text-xs flex flex-col items-center">
                                            <Camera className="w-5 h-5 mb-1" />
                                            Cambiar
                                        </div>
                                    </AvatarUploader>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white">{mercanciaUser.username}</h3>
                            <p className="text-sm text-gray-500">{mercanciaUser.email || 'Sin correo registrado'}</p>

                            {mercanciaUser.isVerified ? (
                                <span className="mt-2 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Verificado
                                </span>
                            ) : (
                                <span className="mt-2 text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full">
                                    Correo no verificado
                                </span>
                            )}
                        </div>
                        {/* Profile Edit Form here if needed, omitted for brevity as it's same as old code */}
                        {isEditingProfile ? (
                            <form onSubmit={handlePasswordUpdate} className="space-y-4 pt-4 border-t border-gray-800 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-bold text-gray-400">Cambiar Contraseña</h4>
                                <div className="relative">
                                    <input
                                        type={showProfilePassword ? "text" : "password"}
                                        value={profileData.password}
                                        onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-white text-sm focus:border-[#49EBBD] outline-none"
                                        placeholder="Contraseña actual"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowProfilePassword(!showProfilePassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showNewProfilePassword ? "text" : "password"}
                                        value={profileData.newPassword}
                                        onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-white text-sm focus:border-[#49EBBD] outline-none"
                                        placeholder="Nueva contraseña"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewProfilePassword(!showNewProfilePassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showNewProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className={`w-full font-bold py-2 rounded-lg text-sm transition-colors ${isUpdatingProfile ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-[#49EBBD] hover:bg-[#3ddeb1] text-black'}`}
                                >
                                    {isUpdatingProfile ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </button>
                                {profileMsg && (
                                    <p className={`text-xs text-center ${profileMsg.includes('correctamente') ? 'text-green-500' : 'text-red-500'}`}>
                                        {profileMsg}
                                    </p>
                                )}
                            </form>
                        ) : (
                            <div className="space-y-3 pt-4 border-t border-gray-800">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Rol</span>
                                    <span className="text-white capitalize">{mercanciaUser.role}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">ID Usuario</span>
                                    <span className="text-white font-mono">{mercanciaUser.id.substring(0, 8)}...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 2. GUEST VIEW (Login)
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#49EBBD]">Mi Mercadería</h1>
                    <p className="text-gray-400 mt-2">
                        Panel de gestión de tandas y boletas
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowLoginModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#49EBBD] hover:bg-[#3ddeb1] text-black font-bold rounded-xl transition-colors"
                    >
                        <LogIn className="w-5 h-5" />
                        Iniciar Sesión
                    </button>
                </div>
            </header>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 max-w-md w-full relative">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-white mb-6">Iniciar Sesión</h2>
                        {loginError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                {loginError}
                            </div>
                        )}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Usuario o Email</label>
                                <input
                                    type="text"
                                    value={loginData.username}
                                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="Ingresa tu usuario o email"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Contraseña</label>
                                <div className="relative">
                                    <input
                                        type={showLoginPassword ? "text" : "password"}
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-white focus:border-[#49EBBD] outline-none"
                                        placeholder="Ingresa tu contraseña"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={isLoggingIn}
                                    className={`w-full px-4 py-3 font-bold rounded-xl transition-colors ${isLoggingIn ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-[#49EBBD] hover:bg-[#3ddeb1] text-black'}`}
                                >
                                    {isLoggingIn ? 'Ingresando...' : 'Ingresar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Add animation helper
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in-from-right-4 {
        from { transform: translateX(10px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .animate-in { animation-duration: 0.3s; animation-fill-mode: both; }
    .fade-in { animation-name: fade-in; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .slide-in-from-right-4 { animation-name: slide-in-from-right-4; }
`;
document.head.appendChild(style);
