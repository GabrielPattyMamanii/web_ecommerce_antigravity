import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    Plus, Pencil, Trash2, Building2, User, ToggleLeft, ToggleRight,
    X, Check, Crown, RotateCcw, AlertTriangle, RefreshCw,
    Banknote, Tag, Clock, Lock, Eye, EyeOff,
} from 'lucide-react';

export const PROPIETARIOS = ['luis', 'gabriel', 'rosa'];

export const PROPIETARIO_COLORS = {
    luis:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    gabriel: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    rosa:    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
};

const hexToStyle = (hex = '#9ca3af') => ({ bg: hex + '22', text: hex });

function formatARS(n) {
    return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatFecha(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d))
        .toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' });
}

/* ─── HistorialModal ──────────────────────────────────────────── */

function HistorialModal({ cuenta, transfers, onClose, appUsers = [] }) {
    const getUserStyle = (name) => hexToStyle(
        appUsers.find(u => u.username?.toLowerCase() === name?.toLowerCase())?.color
    );
    const total = transfers.reduce((s, v) => s + Number(v.monto_transferencia), 0);

    const byProp = {};
    for (const v of transfers) {
        const k = v.propietario || 'Sin propietario';
        if (!byProp[k]) byProp[k] = 0;
        byProp[k] += Number(v.monto_transferencia);
    }
    const propEntries = Object.entries(byProp).sort((a, b) => b[1] - a[1]);

    /* Bloquear scroll del body mientras está abierto */
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Overlay tap-to-close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col">

                {/* Handle mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                    <span className="w-10 h-1 rounded-full bg-border/80" />
                </div>

                {/* Header */}
                <div className="px-5 py-3 sm:py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-foreground text-base leading-tight">{cuenta.nombre}</h2>
                                {cuenta.propietario && (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                                        style={{ backgroundColor: getUserStyle(cuenta.propietario).bg, color: getUserStyle(cuenta.propietario).text }}
                                    >
                                        <Crown className="w-3 h-3" />
                                        {cuenta.propietario}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <User className="w-3 h-3" /> {cuenta.titular}
                            </p>
                            {cuenta.reiniciado_at && (
                                <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1 flex-wrap">
                                    <RotateCcw className="w-3 h-3 flex-shrink-0" />
                                    Reiniciado {new Date(cuenta.reiniciado_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    <span className="text-muted-foreground text-[10px]">(historial muestra todo)</span>
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors flex-shrink-0 -mt-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Resumen por propietario */}
                {propEntries.length > 0 && (
                    <div className="px-5 py-3 border-b border-border/60 flex-shrink-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Por propietario
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {propEntries.map(([prop, monto]) => {
                                const style = getUserStyle(prop);
                                return (
                                    <div
                                        key={prop}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                                        style={{ borderColor: style.text + '30', backgroundColor: style.bg }}
                                    >
                                        <span className="text-xs font-bold capitalize" style={{ color: style.text }}>
                                            {prop}
                                        </span>
                                        <span className="text-xs font-bold text-foreground tabular-nums">
                                            ${formatARS(monto)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Contador */}
                <div className="px-5 pt-2.5 pb-1 flex items-center justify-between flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                        {transfers.length} transferencia{transfers.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                        Total: <span className="text-blue-600">${formatARS(total)}</span>
                    </span>
                </div>

                {/* Lista scrolleable */}
                <div className="flex-1 overflow-y-auto">
                    {transfers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Building2 className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm">Sin transferencias registradas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40 px-4 sm:px-5">
                            {transfers.map(v => {
                                const style = getUserStyle(v.propietario);
                                return (
                                    <div key={v.id} className="py-3 flex items-center gap-2 sm:gap-3">
                                        {/* Fecha */}
                                        <span className="text-xs text-muted-foreground tabular-nums w-14 sm:w-16 flex-shrink-0">
                                            {formatFecha(v.fecha)}
                                        </span>

                                        {/* Propietario */}
                                        <span
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize flex-shrink-0"
                                            style={{ backgroundColor: style.bg, color: style.text }}
                                        >
                                            {v.propietario || '—'}
                                        </span>

                                        {/* Producto */}
                                        <div className="flex-1 min-w-0">
                                            {v.codigo ? (
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <span className="inline-flex items-center gap-0.5 text-xs bg-muted px-1.5 py-0.5 rounded font-mono font-semibold text-foreground flex-shrink-0">
                                                        <Tag className="w-2.5 h-2.5 text-muted-foreground" />
                                                        {v.codigo}
                                                    </span>
                                                    {v.producto_titulo && (
                                                        <span className="text-xs text-muted-foreground truncate hidden sm:block">
                                                            {v.producto_titulo}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground truncate block">
                                                    {v.producto_titulo || '—'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Monto */}
                                        <span className="text-sm font-bold text-blue-600 flex-shrink-0 tabular-nums">
                                            ${formatARS(v.monto_transferencia)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer total */}
                {transfers.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/30 flex-shrink-0 rounded-b-2xl">
                        <span className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-blue-600" />
                            Total recibido
                        </span>
                        <span className="text-xl font-bold text-blue-600 tabular-nums">
                            ${formatARS(total)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── ResetModal ──────────────────────────────────────────────── */

function ResetModal({ cuenta, onConfirm, onClose }) {
    const [password, setPassword] = useState('');
    const [showPwd,  setShowPwd]  = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        setError(null);
        try {
            await onConfirm(password);
        } catch (err) {
            setError(err.message || 'Error al reiniciar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card border-2 border-orange-500 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">

                {/* Handle mobile */}
                <div className="flex justify-center pt-3 pb-0 sm:hidden">
                    <span className="w-10 h-1 rounded-full bg-orange-300" />
                </div>

                {/* Cabecera */}
                <div className="bg-orange-500 px-5 py-4 mt-2 sm:mt-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-white text-base tracking-tight uppercase">
                                Reiniciar acumulado
                            </h2>
                            <p className="text-orange-100 text-xs mt-0.5 font-medium">
                                Esta acción no se puede deshacer
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    {/* Aviso */}
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-xl px-4 py-3">
                        <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
                            {cuenta.nombre}
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 leading-relaxed">
                            El acumulado y el historial se reiniciarán a cero desde hoy.
                            Las ventas anteriores <span className="font-bold">no se eliminan</span> de la base de datos.
                        </p>
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            <Lock className="w-3 h-3" /> Contraseña de administrador
                        </label>
                        <div className="relative">
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(null); }}
                                placeholder="••••••••"
                                autoFocus
                                className={[
                                    'w-full px-3 py-3 border rounded-xl text-sm bg-background text-foreground',
                                    'focus:outline-none focus:ring-2 pr-10 transition-all',
                                    error
                                        ? 'border-red-400 focus:ring-red-400'
                                        : 'border-input focus:ring-orange-500',
                                ].join(' ')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {error && (
                            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {error}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!password || loading}
                            className="flex-1 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Reiniciando…</>
                                : <><RotateCcw className="w-4 h-4" /> Reiniciar</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── CuentasBancarias ────────────────────────────────────────── */

export function CuentasBancarias() {
    const [cuentas,         setCuentas]         = useState([]);
    const [loading,         setLoading]         = useState(true);
    const [showForm,        setShowForm]        = useState(false);
    const [editing,         setEditing]         = useState(null);
    const [form,            setForm]            = useState({ nombre: '', titular: '', propietario: '' });
    const [saving,          setSaving]          = useState(false);
    const [resetting,       setResetting]       = useState(null);
    const [ventasTransf,    setVentasTransf]    = useState([]);
    const [historialCuenta, setHistorialCuenta] = useState(null);
    const [appUsers,        setAppUsers]        = useState([]);

    const fetchCuentas = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cuentas_bancarias')
            .select('*')
            .order('created_at', { ascending: true });
        if (!error) setCuentas(data || []);
        setLoading(false);
    };

    const fetchVentasTransf = async () => {
        const { data } = await supabase
            .from('ventas')
            .select('id, fecha, propietario, producto_titulo, codigo, monto_transferencia, cuenta_id, cuenta_nombre')
            .gt('monto_transferencia', 0)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false });
        setVentasTransf(data || []);
    };

    useEffect(() => {
        fetchCuentas();
        fetchVentasTransf();
        supabase.from('app_users').select('username, color').then(({ data }) => setAppUsers(data || []));
    }, []);

    const openNew = () => {
        setEditing(null);
        setForm({ nombre: '', titular: '', propietario: '' });
        setShowForm(true);
    };

    const openEdit = (cuenta) => {
        setEditing(cuenta);
        setForm({ nombre: cuenta.nombre, titular: cuenta.titular, propietario: cuenta.propietario || '' });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
    };

    const handleSave = async () => {
        if (!form.nombre.trim() || !form.titular.trim()) {
            toast.error('Completá nombre y titular');
            return;
        }
        if (!form.propietario) {
            toast.error('Seleccioná el propietario');
            return;
        }
        setSaving(true);
        const payload = {
            nombre: form.nombre.trim(),
            titular: form.titular.trim(),
            propietario: form.propietario,
        };
        try {
            if (editing) {
                const { error } = await supabase
                    .from('cuentas_bancarias')
                    .update(payload)
                    .eq('id', editing.id);
                if (error) throw error;
                toast.success('Cuenta actualizada');
            } else {
                const { error } = await supabase
                    .from('cuentas_bancarias')
                    .insert(payload);
                if (error) throw error;
                toast.success('Cuenta creada');
            }
            closeForm();
            fetchCuentas();
        } catch {
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const toggleActiva = async (cuenta) => {
        const { error } = await supabase
            .from('cuentas_bancarias')
            .update({ activa: !cuenta.activa })
            .eq('id', cuenta.id);
        if (!error) {
            setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, activa: !c.activa } : c));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta cuenta? Las ventas registradas no se verán afectadas.')) return;
        const { error } = await supabase.from('cuentas_bancarias').delete().eq('id', id);
        if (!error) {
            setCuentas(prev => prev.filter(c => c.id !== id));
            toast.success('Cuenta eliminada');
        } else {
            toast.error('Error al eliminar');
        }
    };

    const handleReset = async (cuenta, password) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password,
        });
        if (authError) throw new Error('Contraseña incorrecta');
        const reiniciado_at = new Date().toISOString();
        const { error } = await supabase
            .from('cuentas_bancarias')
            .update({ reiniciado_at })
            .eq('id', cuenta.id);
        if (error) throw new Error('Error al reiniciar');
        setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, reiniciado_at } : c));
        setResetting(null);
        toast.success(`Acumulado de "${cuenta.nombre}" reiniciado`);
    };

    const getUserColor = (name) =>
        appUsers.find(u => u.username?.toLowerCase() === name?.toLowerCase())?.color || '#9ca3af';

    const getTransfers = (cuenta) => {
        const all = ventasTransf.filter(v => v.cuenta_id === cuenta.id || v.cuenta_nombre === cuenta.nombre);
        if (!cuenta.reiniciado_at) return all;
        const reinicioDate = cuenta.reiniciado_at.substring(0, 10);
        return all.filter(v => v.fecha >= reinicioDate);
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-2xl mx-auto space-y-4">

            {historialCuenta && (
                <HistorialModal
                    cuenta={historialCuenta}
                    transfers={getTransfers(historialCuenta)}
                    onClose={() => setHistorialCuenta(null)}
                    appUsers={appUsers}
                />
            )}

            {resetting && (
                <ResetModal
                    cuenta={resetting}
                    onConfirm={(password) => handleReset(resetting, password)}
                    onClose={() => setResetting(null)}
                />
            )}

            {/* Título */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Cuentas Bancarias</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Cuentas destino para cobros por transferencia
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-1.5 sm:gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nueva cuenta</span>
                    <span className="sm:hidden">Nueva</span>
                </button>
            </div>

            {/* Formulario inline */}
            {showForm && (
                <div className="bg-card border border-primary/40 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">
                            {editing ? 'Editar cuenta' : 'Nueva cuenta'}
                        </h3>
                        <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                Nombre / Alias
                            </label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Ej: Cuenta Gabriel, MP Luis"
                                className="w-full px-3 py-3 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                Titular
                            </label>
                            <input
                                type="text"
                                value={form.titular}
                                onChange={e => setForm(f => ({ ...f, titular: e.target.value }))}
                                placeholder="Ej: Gabriel Patty"
                                className="w-full px-3 py-3 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none"
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                Propietario
                            </label>
                            <div className="flex gap-2">
                                {PROPIETARIOS.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, propietario: p }))}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize transition-colors ${
                                            form.propietario === p
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background text-foreground border-input'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={closeForm}
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Cargando...</div>
            ) : cuentas.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium text-foreground">Sin cuentas registradas</p>
                    <p className="text-sm text-muted-foreground mt-1">Agregá una cuenta para empezar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {cuentas.map(cuenta => {
                        const transfers   = getTransfers(cuenta);
                        const totalTransf = transfers.reduce((s, v) => s + Number(v.monto_transferencia), 0);

                        return (
                            <div
                                key={cuenta.id}
                                className={`bg-card border rounded-2xl overflow-hidden transition-opacity ${!cuenta.activa ? 'opacity-50' : ''}`}
                                style={cuenta.propietario ? { borderLeftColor: getUserColor(cuenta.propietario), borderLeftWidth: '4px' } : {}}
                            >
                                {/* Sección de info */}
                                <div className="px-4 py-3.5 flex items-start gap-3">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-foreground text-sm sm:text-base leading-tight">
                                                {cuenta.nombre}
                                            </p>
                                            {cuenta.propietario && (
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                                                    style={{ backgroundColor: getUserColor(cuenta.propietario) + '22', color: getUserColor(cuenta.propietario) }}
                                                >
                                                    <Crown className="w-3 h-3" />
                                                    {cuenta.propietario}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <User className="w-3 h-3" />
                                            {cuenta.titular}
                                        </p>
                                        {cuenta.reiniciado_at && (
                                            <p className="text-xs text-orange-500 flex items-center gap-1 mt-0.5">
                                                <RotateCcw className="w-3 h-3" />
                                                Reiniciado {new Date(cuenta.reiniciado_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>

                                    {/* Total recibido — visible de un vistazo */}
                                    {totalTransf > 0 && (
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">recibido</p>
                                            <p className="text-sm font-bold text-blue-600 tabular-nums leading-tight">
                                                ${formatARS(totalTransf)}
                                            </p>
                                            {transfers.length > 0 && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {transfers.length} transf.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Franja de acciones — una fila con iconos + etiquetas */}
                                <div className="border-t border-border/60 flex divide-x divide-border/60">
                                    <button
                                        onClick={() => setHistorialCuenta(cuenta)}
                                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                                    >
                                        <Clock className="w-4 h-4" />
                                        <span className="text-[10px] font-semibold">Historial</span>
                                    </button>

                                    <button
                                        onClick={() => toggleActiva(cuenta)}
                                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        {cuenta.activa
                                            ? <ToggleRight className="w-4 h-4 text-green-500" />
                                            : <ToggleLeft className="w-4 h-4" />
                                        }
                                        <span className="text-[10px] font-semibold">
                                            {cuenta.activa ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => setResetting(cuenta)}
                                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span className="text-[10px] font-semibold">Reiniciar</span>
                                    </button>

                                    <button
                                        onClick={() => openEdit(cuenta)}
                                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        <span className="text-[10px] font-semibold">Editar</span>
                                    </button>

                                    <button
                                        onClick={() => handleDelete(cuenta.id)}
                                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-[10px] font-semibold">Eliminar</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
