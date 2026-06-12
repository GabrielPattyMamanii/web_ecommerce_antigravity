import React, { useState, useEffect } from 'react';
import {
    Plus, X, Eye, EyeOff, Trash2, Edit2, User, ArrowRight,
    ShieldCheck, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ADMIN_SECTIONS } from '../../lib/adminSections';

// ─── Página principal ─────────────────────────────────────────────────────────

export function Usuarios() {
    return (
        <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-foreground mb-1">Usuarios</h1>
                <p className="text-sm text-muted-foreground">
                    Gestioná los usuarios y sus permisos de acceso.
                </p>
            </header>
            <AppUsuarios />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// App Usuarios
// ═══════════════════════════════════════════════════════════════════════════════

function AppUsuarios() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching app_users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id, username) => {
        if (!confirm(`¿Eliminar el usuario ${username}? Esta acción no se puede deshacer.`)) return;
        try {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if (error) throw error;
            fetchUsers();
            toast.success('Usuario eliminado');
        } catch (err) {
            toast.error('Error al eliminar: ' + err.message);
        }
    };

    const handleEnterAsUser = (user) => {
        sessionStorage.setItem('app_user_id', user.id);
        sessionStorage.setItem('app_username', user.username);
        navigate('/dashboard');
    };

    const handleSave = async (userId, updates) => {
        const { error } = await supabase
            .from('app_users')
            .update(updates)
            .eq('id', userId);
        if (error) throw new Error(error.message);

        // Sincronizar permisos en profiles (para usuarios que entran via Supabase Auth)
        if (updates.email && updates.permissions !== undefined) {
            await supabase
                .from('profiles')
                .update({ permissions: updates.permissions })
                .eq('email', updates.email);
        }

        fetchUsers();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div />
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-[#D13180] hover:bg-[#b52a6e] text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-[#D13180]/20"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                    <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay usuarios registrados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <AppUserCard
                            key={user.id}
                            user={user}
                            onEnter={() => handleEnterAsUser(user)}
                            onEdit={() => setEditingUser(user)}
                            onDelete={() => handleDeleteUser(user.id, user.username)}
                        />
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateAppUserModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => { setShowCreate(false); fetchUsers(); }}
                />
            )}

            {editingUser && (
                <EditAppUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function AppUserCard({ user, onEnter, onEdit, onDelete }) {
    const perms = user.permissions || [];
    return (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition group relative">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-[#D13180]/10 rounded-full flex items-center justify-center text-[#D13180] font-bold text-lg uppercase select-none flex-shrink-0">
                    {user.username.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{user.username}</h3>
                    {user.email && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                        {perms.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Sin permisos</span>
                        ) : (
                            <>
                                {perms.slice(0, 4).map(key => {
                                    const sec = ADMIN_SECTIONS.find(s => s.key === key);
                                    return (
                                        <span key={key} className="text-xs bg-[#D13180]/10 text-[#D13180] px-2 py-0.5 rounded-full font-medium">
                                            {sec?.label || key}
                                        </span>
                                    );
                                })}
                                {perms.length > 4 && (
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        +{perms.length - 4} más
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-border">
                <button
                    onClick={onEnter}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D13180] hover:bg-[#D13180]/10 py-2 rounded-lg transition"
                >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Ingresar
                </button>
                <button
                    onClick={onEdit}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
                    title="Editar"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function CreateAppUserModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [permissions, setPermissions] = useState([]);
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);

    const togglePerm = (key) =>
        setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    const toggleAll = () =>
        setPermissions(permissions.length === ADMIN_SECTIONS.length ? [] : ADMIN_SECTIONS.map(s => s.key));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('app_users')
                .insert([{
                    username: form.username.trim(),
                    email: form.email.trim().toLowerCase() || null,
                    password: form.password,
                    permissions,
                }]);
            if (error) throw error;
            toast.success('Usuario creado exitosamente');
            onSuccess();
        } catch (err) {
            toast.error('Error al crear usuario: ' + err.message);
        }
        setSaving(false);
    };

    return (
        <ModalShell title="Nuevo Usuario" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Nombre de usuario">
                    <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Ej: Juan Perez" required className={inputCls} />
                </Field>
                <Field label="Correo electrónico" hint="Opcional">
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@ejemplo.com" className={inputCls} />
                </Field>
                <Field label="Contraseña">
                    <div className="relative">
                        <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Contraseña de acceso" className={`${inputCls} pr-10`} />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </Field>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Secciones habilitadas</span>
                        <button type="button" onClick={toggleAll} className="text-xs text-[#D13180] hover:underline font-medium">
                            {permissions.length === ADMIN_SECTIONS.length ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                    </div>
                    <PermissionsGrid permissions={permissions} onToggle={togglePerm} />
                </div>
                <button type="submit" disabled={saving} className="w-full py-3 bg-[#D13180] hover:bg-[#b52a6e] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                    {saving ? 'Guardando...' : 'Crear Usuario'}
                </button>
            </form>
        </ModalShell>
    );
}

function EditAppUserModal({ user, onClose, onSave }) {
    const [form, setForm] = useState({
        username: user.username || '',
        email: user.email || '',
        newPassword: user.password || '',
    });
    const [permissions, setPermissions] = useState(user.permissions || []);
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);

    const togglePerm = (key) =>
        setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    const toggleAll = () =>
        setPermissions(permissions.length === ADMIN_SECTIONS.length ? [] : ADMIN_SECTIONS.map(s => s.key));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updates = {
                username: form.username.trim(),
                email: form.email.trim().toLowerCase() || null,
                permissions,
            };
            if (form.newPassword) updates.password = form.newPassword;
            await onSave(user.id, updates);
            toast.success('Usuario actualizado');
            onClose();
        } catch (err) {
            toast.error(err.message);
        }
        setSaving(false);
    };

    return (
        <ModalShell title={`Editar — ${user.username}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Nombre de usuario">
                    <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Correo electrónico" hint="Opcional">
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@ejemplo.com" className={inputCls} />
                </Field>
                <Field label="Nueva contraseña" hint="Dejar vacío para mantener la actual">
                    <div className="relative">
                        <input type={showPass ? 'text' : 'password'} minLength={1} value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Nueva contraseña (opcional)" className={`${inputCls} pr-10`} />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </Field>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Secciones habilitadas</span>
                        <button type="button" onClick={toggleAll} className="text-xs text-[#D13180] hover:underline font-medium">
                            {permissions.length === ADMIN_SECTIONS.length ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                    </div>
                    <PermissionsGrid permissions={permissions} onToggle={togglePerm} />
                </div>
                <button type="submit" disabled={saving} className="w-full py-3 bg-[#D13180] hover:bg-[#b52a6e] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        </ModalShell>
    );
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function PermissionsGrid({ permissions, onToggle }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {ADMIN_SECTIONS.map(({ key, label }) => {
                const checked = permissions.includes(key);
                return (
                    <button key={key} type="button" onClick={() => onToggle(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-all ${
                            checked ? 'bg-[#D13180]/10 border-[#D13180]/40 text-[#D13180]' : 'bg-background border-border text-muted-foreground hover:border-[#D13180]/30'
                        }`}
                    >
                        <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${checked ? 'bg-[#D13180] border-[#D13180]' : 'border-border'}`}>
                            {checked && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </span>
                        <span className="truncate">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}

function ModalShell({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-foreground">{label}</label>
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </div>
            {children}
        </div>
    );
}

const inputCls = 'w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D13180]/40 transition';
