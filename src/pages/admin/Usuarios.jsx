import React, { useState, useEffect } from 'react';
import { User, Plus, X, Eye, EyeOff, Save, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';

export function Usuarios() {
    const { mercanciaUser, isVerified } = useMercanciaUser(); // Admin user
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '' });

    // Auth Modal for User Access
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('app_users')
                .insert([{
                    username: newUser.username,
                    password: newUser.password // In a real app, hash this!
                }]);

            if (error) throw error;

            setShowCreateModal(false);
            setNewUser({ username: '', password: '' });
            fetchUsers();
            alert('Usuario creado exitosamente');
        } catch (error) {
            alert('Error al crear usuario: ' + error.message);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if (error) throw error;
            fetchUsers();
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setAuthPassword('');
        setAuthError('');
        setShowAuthModal(true);
    };

    const handleUserLogin = () => {
        if (authPassword === selectedUser.password) {
            // Login success for this specific feature users
            // Store in sessionStorage or Context for the session
            sessionStorage.setItem('app_user_id', selectedUser.id);
            sessionStorage.setItem('app_username', selectedUser.username);
            navigate('/dashboard'); // Go to User Dashboard
        } else {
            setAuthError('Contraseña incorrecta');
        }
    };

    return (
        <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-gray-600">Administra los usuarios de la aplicación</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Usuario
                </button>
            </header>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Cargando usuarios...</div>
                ) : users.length === 0 ? (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No hay usuarios registrados</p>
                    </div>
                ) : (
                    users.map(user => (
                        <div
                            key={user.id}
                            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 group relative cursor-pointer"
                            onClick={() => handleUserClick(user)}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-xl uppercase">
                                    {user.username.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{user.username}</h3>
                                    <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
                                <span className="text-xs text-gray-500">Click para ingresar</span>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-pink-500 transition" />
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Nuevo Usuario</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre de Usuario</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder="Ej: Juan Perez"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Contraseña</label>
                                <input
                                    type="text" // Visible for admin creation convenience
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder="Contraseña de acceso"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition shadow-lg mt-4"
                            >
                                Crear Usuario
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Auth Modal */}
            {showAuthModal && selectedUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-sm w-full relative shadow-2xl border border-gray-800 animate-in zoom-in-95 duration-200 text-center">
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-500 font-bold text-3xl mx-auto mb-4 border border-pink-500/30">
                            {selectedUser.username.charAt(0)}
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">{selectedUser.username}</h2>
                        <p className="text-gray-400 text-sm mb-6">Ingresa la contraseña para acceder</p>

                        <div className="space-y-4">
                            <div className="relative text-left">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={authPassword}
                                    onChange={(e) => {
                                        setAuthPassword(e.target.value);
                                        setAuthError('');
                                    }}
                                    className={`w-full bg-black/40 border ${authError ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:border-pink-500 outline-none transition`}
                                    placeholder="Contraseña"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {authError && (
                                <p className="text-red-500 text-sm font-medium">{authError}</p>
                            )}

                            <button
                                onClick={handleUserLogin}
                                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition shadow-lg hover:shadow-pink-500/20"
                            >
                                Ingresar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
