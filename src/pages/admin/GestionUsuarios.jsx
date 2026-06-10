import React, { useState, useEffect } from 'react';
import { Plus, X, Eye, EyeOff, Trash2, Edit2, UserCog, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { ADMIN_SECTIONS } from '../../lib/adminSections';

// Extrae el mensaje real del error de la Edge Function.
// supabase.functions.invoke() guarda la Response en error.context cuando la fn devuelve no-2xx.
async function invokeAdmin(body) {
    const { data, error } = await supabase.functions.invoke('manage-admin-users', { body });

    if (error) {
        let message = error.message ?? 'Error desconocido';
        try {
            const ctx = error.context;
            if (ctx && typeof ctx.json === 'function') {
                const json = await ctx.json();
                if (json?.error) message = json.error;
            }
        } catch { /* noop */ }
        throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);
    return data;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function GestionUsuarios() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await invokeAdmin({ action: 'list' });
            setUsers(data?.users || []);
        } catch (err) {
            toast.error('Error al cargar usuarios: ' + err.message);
        }
        setLoading(false);
    };

    const handleDelete = async (userId, email) => {
        if (!confirm(`¿Eliminar el usuario ${email}? Esta acción no se puede deshacer.`)) return;
        setDeletingId(userId);
        try {
            await invokeAdmin({ action: 'delete', user_id: userId });
            toast.success('Usuario eliminado');
            fetchUsers();
        } catch (err) {
            toast.error('Error al eliminar: ' + err.message);
        }
        setDeletingId(null);
    };

    return (
        <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Gestión de Usuarios</h1>
                    <p className="text-sm text-muted-foreground">
                        Creá y administrá usuarios con acceso restringido al panel.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-[#D13180] hover:bg-[#b52a6e] text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-lg shadow-[#D13180]/20"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
                    <UserCog className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-muted-foreground">No hay usuarios staff todavía.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Creá el primero con el botón "Nuevo Usuario".
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {users.map(user => (
                        <UserCard
                            key={user.id}
                            user={user}
                            onEdit={() => setEditingUser(user)}
                            onDelete={() => handleDelete(user.id, user.email)}
                            isDeleting={deletingId === user.id}
                        />
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => { setShowCreate(false); fetchUsers(); }}
                />
            )}

            {editingUser && (
                <EditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSuccess={() => { setEditingUser(null); fetchUsers(); }}
                />
            )}
        </div>
    );
}

// ─── UserCard ─────────────────────────────────────────────────────────────────

function UserCard({ user, onEdit, onDelete, isDeleting }) {
    const perms = user.permissions || [];

    return (
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-full bg-[#D13180]/10 flex items-center justify-center text-[#D13180] font-bold text-lg uppercase flex-shrink-0 select-none">
                {(user.display_name || user.email || '?').charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                    {user.display_name || <span className="text-muted-foreground italic">Sin nombre</span>}
                </p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>

                <div className="flex flex-wrap gap-1 mt-2">
                    {perms.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Sin permisos asignados</span>
                    ) : (
                        <>
                            {perms.slice(0, 5).map(key => {
                                const sec = ADMIN_SECTIONS.find(s => s.key === key);
                                return (
                                    <span key={key} className="text-xs bg-[#D13180]/10 text-[#D13180] px-2 py-0.5 rounded-full font-medium">
                                        {sec?.label || key}
                                    </span>
                                );
                            })}
                            {perms.length > 5 && (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                    +{perms.length - 5} más
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={onEdit}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
                    title="Editar usuario"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Eliminar usuario"
                >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

// ─── CreateModal ──────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSuccess }) {
    const [mode, setMode] = useState('nuevo'); // 'nuevo' | 'vincular'
    const [form, setForm] = useState({ email: '', password: '', display_name: '' });
    const [permissions, setPermissions] = useState([]);
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);

    const togglePerm = (key) =>
        setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const toggleAll = () =>
        setPermissions(permissions.length === ADMIN_SECTIONS.length ? [] : ADMIN_SECTIONS.map(s => s.key));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email) return;
        if (mode === 'nuevo' && !form.password) return;
        setSaving(true);
        try {
            if (mode === 'nuevo') {
                await invokeAdmin({
                    action: 'create',
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    display_name: form.display_name.trim() || null,
                    permissions,
                });
                toast.success('Usuario creado correctamente');
            } else {
                await invokeAdmin({
                    action: 'adopt',
                    email: form.email.trim().toLowerCase(),
                    display_name: form.display_name.trim() || null,
                    permissions,
                });
                toast.success('Usuario vinculado correctamente');
            }
            onSuccess();
        } catch (err) {
            toast.error(err.message);
        }
        setSaving(false);
    };

    return (
        <ModalShell title="Agregar Usuario" onClose={onClose}>
            {/* Selector de modo */}
            <div className="flex rounded-xl border border-border overflow-hidden mb-5">
                {[
                    { key: 'nuevo',    label: 'Crear nuevo' },
                    { key: 'vincular', label: 'Vincular existente' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setMode(tab.key); setForm({ email: '', password: '', display_name: '' }); setPermissions([]); }}
                        className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                            mode === tab.key
                                ? 'bg-[#D13180] text-white'
                                : 'text-muted-foreground hover:bg-accent'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {mode === 'vincular' && (
                <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-4">
                    Ingresá el email de un usuario que ya tiene cuenta. Se le asignarán permisos de acceso al panel sin modificar su contraseña ni sus datos.
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Correo electrónico">
                    <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="usuario@ejemplo.com"
                        className={inputCls}
                    />
                </Field>

                <Field label="Nombre para mostrar">
                    <input
                        type="text"
                        value={form.display_name}
                        onChange={e => setForm({ ...form, display_name: e.target.value })}
                        placeholder="Ej: Juan Pérez"
                        className={inputCls}
                    />
                </Field>

                {mode === 'nuevo' && (
                    <Field label="Contraseña">
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                required
                                minLength={6}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                                className={`${inputCls} pr-10`}
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </Field>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Secciones habilitadas</span>
                        <button type="button" onClick={toggleAll}
                            className="text-xs text-[#D13180] hover:underline font-medium">
                            {permissions.length === ADMIN_SECTIONS.length ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                    </div>
                    <PermissionsGrid permissions={permissions} onToggle={togglePerm} />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-[#D13180] hover:bg-[#b52a6e] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {saving
                        ? (mode === 'nuevo' ? 'Creando...' : 'Vinculando...')
                        : (mode === 'nuevo' ? 'Crear Usuario' : 'Vincular Usuario')
                    }
                </button>
            </form>
        </ModalShell>
    );
}

// ─── EditModal ────────────────────────────────────────────────────────────────

function EditModal({ user, onClose, onSuccess }) {
    const [permissions, setPermissions] = useState(user.permissions || []);
    const [displayName, setDisplayName] = useState(user.display_name || '');
    const [newPassword, setNewPassword] = useState('');
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
            await invokeAdmin({
                action: 'update_permissions',
                user_id: user.id,
                permissions,
                display_name: displayName.trim() || null,
            });

            if (newPassword) {
                await invokeAdmin({ action: 'update_password', user_id: user.id, password: newPassword });
            }

            toast.success('Usuario actualizado');
            onSuccess();
        } catch (err) {
            toast.error(err.message);
        }
        setSaving(false);
    };

    return (
        <ModalShell title="Editar Usuario" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email (solo lectura) */}
                <Field label="Correo electrónico">
                    <input
                        type="email"
                        readOnly
                        value={user.email}
                        className={`${inputCls} opacity-60 cursor-not-allowed`}
                    />
                </Field>

                {/* Nombre */}
                <Field label="Nombre para mostrar">
                    <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className={inputCls}
                    />
                </Field>

                {/* Nueva contraseña (opcional) */}
                <Field label="Nueva contraseña" hint="Dejar vacío para mantener la actual">
                    <div className="relative">
                        <input
                            type={showPass ? 'text' : 'password'}
                            minLength={6}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nueva contraseña (opcional)"
                            className={`${inputCls} pr-10`}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </Field>

                {/* Permisos */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Secciones habilitadas</span>
                        <button type="button" onClick={toggleAll}
                            className="text-xs text-[#D13180] hover:underline font-medium">
                            {permissions.length === ADMIN_SECTIONS.length ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                    </div>
                    <PermissionsGrid permissions={permissions} onToggle={togglePerm} />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-[#D13180] hover:bg-[#b52a6e] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        </ModalShell>
    );
}

// ─── Subcomponentes reutilizables ─────────────────────────────────────────────

function PermissionsGrid({ permissions, onToggle }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {ADMIN_SECTIONS.map(({ key, label }) => {
                const checked = permissions.includes(key);
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onToggle(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-all ${
                            checked
                                ? 'bg-[#D13180]/10 border-[#D13180]/40 text-[#D13180]'
                                : 'bg-background border-border text-muted-foreground hover:border-[#D13180]/30'
                        }`}
                    >
                        <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                            checked ? 'bg-[#D13180] border-[#D13180]' : 'border-border'
                        }`}>
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
