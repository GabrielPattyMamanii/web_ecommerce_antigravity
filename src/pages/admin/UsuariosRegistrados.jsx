import React, { useState } from 'react';
import { Users, Plus, Trash2, Mail, Lock, User, ShieldCheck, Eye, EyeOff, Send } from 'lucide-react';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';

export function UsuariosRegistrados() {
    const { authorizedUsers, registerUser, resendUserInvite, deleteUser } = useMercanciaUser();

    const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [resendingEmail, setResendingEmail] = useState(null); // Track which user is being resent
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleResendInvite = async (email, username) => {
        setResendingEmail(email);
        setError('');
        setSuccessMsg('');
        try {
            await resendUserInvite(email);
            setSuccessMsg(`Correo de confirmación reenviado a ${username} (${email})`);
        } catch (err) {
            console.error('Error resending invite:', err);
            setError('Error al reenviar el correo. Intente nuevamente.');
        } finally {
            setResendingEmail(null);
        }
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsRegistering(true);

        try {
            await registerUser(newUser.username, newUser.email, newUser.newUser_password || newUser.password);
            setSuccessMsg(`Usuario ${newUser.username} invitado. Se enviará un correo de confirmación a ${newUser.email}`);
            setNewUser({ username: '', email: '', password: '' });
            setShowAddForm(false);
            setShowPassword(false);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Error al registrar usuario');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#49EBBD]">Usuarios Registrados</h1>
                    <p className="text-gray-400 mt-2">
                        Gestión de acceso y cuentas de usuario
                    </p>
                </div>

                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#49EBBD] hover:bg-[#3ddeb1] text-black font-bold rounded-xl transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    {showAddForm ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </header>

            {/* Success/Error Messages */}
            {successMsg && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    {successMsg}
                </div>
            )}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                    {error}
                </div>
            )}

            {/* Add User Form */}
            {showAddForm && (
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 animate-in slide-in-from-top-4">
                    <h2 className="text-xl font-bold text-white mb-6">Agregar Nuevo Usuario</h2>
                    <form onSubmit={handleRegisterUser} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="Nombre de usuario"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="correo@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-12 py-3 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="Contraseña segura"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={isRegistering}
                                className={`px-8 py-3 font-bold rounded-xl border transition-colors ${isRegistering ? 'opacity-50 cursor-not-allowed bg-gray-800' : 'bg-[#49EBBD]/10 hover:bg-[#49EBBD]/20 text-[#49EBBD] border-[#49EBBD]/30'}`}
                            >
                                {isRegistering ? 'Registrando...' : 'Registrar Usuario'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users List */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/40 border-b border-gray-800">
                                <th className="p-6 text-gray-400 font-medium text-sm">Usuario</th>
                                <th className="p-6 text-gray-400 font-medium text-sm">Correo Electrónico</th>
                                <th className="p-6 text-gray-400 font-medium text-sm">Estado</th>
                                <th className="p-6 text-gray-400 font-medium text-sm text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {authorizedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#49EBBD]/10 rounded-full flex items-center justify-center text-[#49EBBD] font-bold overflow-hidden">
                                                {user.profile_image ? (
                                                    <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    user.username ? user.username[0].toUpperCase() : '?'
                                                )}
                                            </div>
                                            <span className="font-bold text-white">{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${user.isVerified ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                            {user.isVerified ? 'Verificado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right flex items-center justify-end gap-2">
                                        {!user.isVerified && (
                                            <button
                                                onClick={() => handleResendInvite(user.email, user.username)}
                                                disabled={resendingEmail === user.email}
                                                className={`p-2 rounded-lg transition-colors ${resendingEmail === user.email ? 'text-gray-600 bg-gray-800 animate-pulse' : 'text-gray-500 hover:text-[#49EBBD] hover:bg-[#49EBBD]/10'}`}
                                                title="Reenviar correo de confirmación"
                                            >
                                                <Send className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Eliminar usuario"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
