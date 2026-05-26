import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Building2, User, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';

export function CuentasBancarias() {
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null); // cuenta obj o null
    const [form, setForm] = useState({ nombre: '', titular: '' });
    const [saving, setSaving] = useState(false);

    const fetchCuentas = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cuentas_bancarias')
            .select('*')
            .order('created_at', { ascending: true });
        if (!error) setCuentas(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchCuentas(); }, []);

    const openNew = () => {
        setEditing(null);
        setForm({ nombre: '', titular: '' });
        setShowForm(true);
    };

    const openEdit = (cuenta) => {
        setEditing(cuenta);
        setForm({ nombre: cuenta.nombre, titular: cuenta.titular });
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
        setSaving(true);
        try {
            if (editing) {
                const { error } = await supabase
                    .from('cuentas_bancarias')
                    .update({ nombre: form.nombre.trim(), titular: form.titular.trim() })
                    .eq('id', editing.id);
                if (error) throw error;
                toast.success('Cuenta actualizada');
            } else {
                const { error } = await supabase
                    .from('cuentas_bancarias')
                    .insert({ nombre: form.nombre.trim(), titular: form.titular.trim() });
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

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Cuentas Bancarias</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Cuentas destino para cobros por transferencia
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nueva cuenta
                </button>
            </div>

            {/* Formulario inline */}
            {showForm && (
                <div className="bg-card border border-primary/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">
                            {editing ? 'Editar cuenta' : 'Nueva cuenta'}
                        </h3>
                        <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                Nombre / Alias
                            </label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Ej: Cuenta Gabriel, MP Luis"
                                className="w-full px-3 py-2.5 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none"
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
                                className="w-full px-3 py-2.5 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none"
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={closeForm}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                    <p className="text-sm text-muted-foreground mt-1">Agregá una cuenta para empezar a registrar transferencias</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {cuentas.map(cuenta => (
                        <div
                            key={cuenta.id}
                            className={`bg-card border rounded-2xl px-5 py-4 flex items-center gap-4 transition-opacity ${!cuenta.activa ? 'opacity-50' : ''}`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground">{cuenta.nombre}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {cuenta.titular}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Toggle activa */}
                                <button
                                    onClick={() => toggleActiva(cuenta)}
                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                    title={cuenta.activa ? 'Desactivar' : 'Activar'}
                                >
                                    {cuenta.activa
                                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                                        : <ToggleLeft className="w-5 h-5" />
                                    }
                                </button>
                                <button
                                    onClick={() => openEdit(cuenta)}
                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(cuenta.id)}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
