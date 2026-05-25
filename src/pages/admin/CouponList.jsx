import React, { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Edit, Trash2, Zap, ZapOff, RefreshCw, X, Check, Timer, Info, Filter, AlertCircle, Clock, CheckCircle, TimerOff, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCountdown(secs) {
    if (secs <= 0) return '00:00:00';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function durationToSeconds({ days = 0, hours = 0, minutes = 0 }) {
    return (Number(days) * 86400) + (Number(hours) * 3600) + (Number(minutes) * 60);
}

// ─── Countdown hook ──────────────────────────────────────────────────────────

function useCountdown(endTime) {
    const [secs, setSecs] = useState(0);

    useEffect(() => {
        if (!endTime) return;
        const update = () => {
            const diff = Math.max(0, Math.floor((new Date(endTime) - new Date()) / 1000));
            setSecs(diff);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [endTime]);

    return secs;
}

// ─── Coupon Card ─────────────────────────────────────────────────────────────

function CouponCard({ coupon, onEdit, onDelete, onToggleStatus, onActivateBanner, onRemoveBanner, onRestartCounter }) {
    const secs = useCountdown(coupon.show_in_banner ? coupon.counter_end_time : null);
    const isPublished = coupon.status === 'publicado';
    const canActivate = isPublished && !coupon.show_in_banner;

    return (
        <div className={`bg-card p-6 border border-border/50 hover:bg-accent/30 rounded-xl transition-all group relative overflow-hidden shadow-sm hover:shadow-md ${coupon.show_in_banner ? 'border-primary/30 ring-1 ring-primary/20' : ''}`}>
            
            {/* Top Right Action Menu */}
            <div className="absolute top-2 right-2 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(coupon)} className="text-muted-foreground hover:text-primary transition-colors p-1 bg-background/80 rounded-md shadow-sm">
                    <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(coupon)} className="text-muted-foreground hover:text-destructive transition-colors p-1 bg-background/80 rounded-md shadow-sm">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Header info */}
            <div className="flex justify-between items-start mb-6 pr-12">
                <div>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1 block line-clamp-1">{coupon.name}</span>
                    <h3 className="text-xl font-bold text-foreground font-mono">{coupon.code}</h3>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 whitespace-nowrap">
                    {coupon.discount_percentage}% OFF
                </div>
            </div>

            {/* Status lines */}
            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                    {isPublished ? <CheckCircle className="text-emerald-500 w-4 h-4" /> : <Clock className="text-muted-foreground w-4 h-4" />}
                    <span className="text-sm text-foreground">Estado: 
                        <span className={`font-bold ml-1 ${isPublished ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            {isPublished ? 'Publicado' : 'Borrador'}
                        </span>
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {coupon.has_counter ? (
                        coupon.show_in_banner ? (
                            <>
                                <AlertCircle className="text-orange-500 w-4 h-4" />
                                <span className="text-sm text-foreground">
                                    Vence en: <span className="text-orange-500 font-bold font-mono ml-1">{formatCountdown(secs)}</span>
                                </span>
                            </>
                        ) : (
                            <>
                                <Timer className="text-muted-foreground w-4 h-4" />
                                <span className="text-sm text-muted-foreground">
                                    Duración: <span className="font-bold ml-1">{formatCountdown(coupon.counter_duration_seconds)}</span>
                                </span>
                            </>
                        )
                    ) : (
                        <>
                            <TimerOff className="text-muted-foreground w-4 h-4 opacity-50" />
                            <span className="text-sm text-muted-foreground italic">Sin contador activo</span>
                        </>
                    )}
                </div>
            </div>

            {/* Action buttons area */}
            <div className="flex gap-2">
                {coupon.show_in_banner ? (
                    <div className="flex-1 flex gap-2">
                        <button onClick={() => onRestartCounter(coupon)} className="flex-1 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
                            <RotateCcw className="w-4 h-4" />
                            Reiniciar
                        </button>
                        <button onClick={() => onRemoveBanner(coupon)} className="flex-1 py-2 bg-muted text-muted-foreground hover:bg-muted/80 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                            <ZapOff className="w-4 h-4" />
                            Ocultar
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => onActivateBanner(coupon)} 
                        disabled={!canActivate} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${canActivate ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-foreground' : 'bg-muted/50 text-muted-foreground cursor-not-allowed'}`}
                    >
                        <Zap className="w-4 h-4" />
                        Activar Banner
                    </button>
                )}

                {/* Status Toggle Switch */}
                <button onClick={() => onToggleStatus(coupon)} className="w-14 items-center bg-muted/60 p-1 rounded-lg flex justify-center hover:bg-muted transition-colors">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${isPublished ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isPublished ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                </button>
            </div>
            
        </div>
    );
}

// ─── Modal Form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    name: '',
    code: '',
    discount_percentage: '',
    description: '',
    message: '',
    has_counter: false,
    duration_days: '',
    duration_hours: '',
    duration_minutes: '',
    status: 'borrador',
};

function CouponModal({ coupon, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (coupon) {
            const totalSecs = coupon.counter_duration_seconds || 0;
            const days = Math.floor(totalSecs / 86400);
            const hours = Math.floor((totalSecs % 86400) / 3600);
            const minutes = Math.floor((totalSecs % 3600) / 60);
            setForm({
                name: coupon.name || '',
                code: coupon.code || '',
                discount_percentage: coupon.discount_percentage || '',
                description: coupon.description || '',
                message: coupon.message || '',
                has_counter: coupon.has_counter || false,
                duration_days: days || '',
                duration_hours: hours || '',
                duration_minutes: minutes || '',
                status: coupon.status || 'borrador',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [coupon]);

    const showToast = (mensaje, tipo = 'error') => setToast({ mensaje, tipo });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) return showToast('El nombre es requerido');
        if (!form.code.trim()) return showToast('El código es requerido');
        if (!form.discount_percentage || Number(form.discount_percentage) < 1 || Number(form.discount_percentage) > 100) {
            return showToast('El descuento debe ser entre 1 y 100');
        }

        let duration_seconds = null;
        if (form.has_counter) {
            duration_seconds = durationToSeconds({
                days: form.duration_days,
                hours: form.duration_hours,
                minutes: form.duration_minutes,
            });
            if (duration_seconds <= 0) return showToast('Ingresa una duración válida para el contador');
        }

        const payload = {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            discount_percentage: Number(form.discount_percentage),
            description: form.description.trim() || null,
            message: form.message.trim() || null,
            has_counter: form.has_counter,
            counter_duration_seconds: form.has_counter ? duration_seconds : null,
            status: form.status,
        };

        setSaving(true);
        let error;
        if (coupon?.id) {
            ({ error } = await supabase.from('coupons').update(payload).eq('id', coupon.id));
        } else {
            ({ error } = await supabase.from('coupons').insert(payload));
        }
        setSaving(false);

        if (error) return showToast(error.message || 'Error al guardar');
        onSaved();
        onClose();
    };

    const set = (field) => (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: val }));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="my-auto w-full max-w-5xl bg-card rounded-2xl overflow-hidden shadow-2xl relative border border-border">
                
                {/* Modal Header */}
                <div className="bg-muted/40 px-8 py-5 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-3">
                        <Edit className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">
                            {coupon ? 'Edición de Cupón' : 'Configuración de Nuevo Cupón'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground hidden sm:block">* Campos obligatorios</span>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-background text-muted-foreground transition-colors shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Main Form Fields */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NOMBRE DEL CUPÓN*</label>
                                    <input
                                        value={form.name}
                                        onChange={set('name')}
                                        placeholder="Ej: Especial Verano"
                                        className="w-full bg-background text-foreground border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-muted-foreground/50 transition-shadow"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CÓDIGO*</label>
                                    <div className="relative">
                                        <input
                                            value={form.code}
                                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                                            placeholder="VERANO25"
                                            className="w-full bg-background text-foreground border border-border rounded-lg p-3 pr-10 text-sm font-mono focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-muted-foreground/50 transition-shadow tracking-widest uppercase"
                                        />
                                        <Ticket className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 opacity-50" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DESCUENTO*</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={form.discount_percentage}
                                            onChange={set('discount_percentage')}
                                            placeholder="25"
                                            className="w-full bg-background text-foreground border border-border rounded-lg p-3 pr-10 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-muted-foreground/50 transition-shadow"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">%</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ESTADO INICIAL</label>
                                    <div className="flex items-center gap-4 h-[46px] bg-background px-4 border border-border rounded-lg">
                                        <span className={`text-xs ${form.status === 'borrador' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>Borrador</span>
                                        <div 
                                            onClick={() => setForm(f => ({ ...f, status: f.status === 'publicado' ? 'borrador' : 'publicado' }))}
                                            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors shadow-inner ${form.status === 'publicado' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${form.status === 'publicado' ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </div>
                                        <span className={`text-xs ${form.status === 'publicado' ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>Publicado</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DESCRIPCIÓN INTERNA</label>
                                <textarea
                                    value={form.description}
                                    onChange={set('description')}
                                    placeholder="Propósito interno de este cupón..."
                                    className="w-full bg-background text-foreground border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-muted-foreground/50 transition-shadow"
                                    rows="2"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    MENSAJE DEL BANNER
                                    <span className="text-[10px] font-normal lowercase text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400 px-2 py-0.5 rounded border border-pink-200 dark:border-pink-900/50">HTML permitido</span>
                                </label>
                                <textarea
                                    value={form.message}
                                    onChange={set('message')}
                                    placeholder="¡Oferta! Usa el código <b>KINETIC20</b> para un 20% OFF."
                                    className="w-full font-mono bg-background text-foreground border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-muted-foreground/50 transition-shadow"
                                    rows="3"
                                />
                            </div>
                        </div>

                        {/* Sidebar Form Configuration */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-muted/30 p-6 rounded-xl border border-border h-full flex flex-col">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                                    <div className="flex items-center gap-2">
                                        <Timer className="text-primary w-5 h-5" />
                                        <h3 className="font-bold text-sm text-foreground">Contador de Tiempo</h3>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.has_counter}
                                        onChange={(e) => setForm((f) => ({ ...f, has_counter: e.target.checked }))}
                                        className="w-5 h-5 rounded border-border text-primary cursor-pointer focus:ring-0 focus:ring-offset-0 bg-background"
                                    />
                                </div>

                                <div className={`space-y-6 flex-1 transition-opacity duration-300 ${form.has_counter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-3">DURACIÓN (DÍAS / HORAS / MINUTOS)</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.duration_days}
                                                onChange={set('duration_days')}
                                                className="flex-1 bg-background text-foreground border border-border rounded-lg p-3 text-center text-sm focus:ring-1 focus:ring-primary/40"
                                                placeholder="0 d"
                                            />
                                            <span className="text-muted-foreground font-bold">:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="23"
                                                value={form.duration_hours}
                                                onChange={set('duration_hours')}
                                                className="flex-1 bg-background text-foreground border border-border rounded-lg p-3 text-center text-sm focus:ring-1 focus:ring-primary/40"
                                                placeholder="24 h"
                                            />
                                            <span className="text-muted-foreground font-bold">:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={form.duration_minutes}
                                                onChange={set('duration_minutes')}
                                                className="flex-1 bg-background text-foreground border border-border rounded-lg p-3 text-center text-sm focus:ring-1 focus:ring-primary/40"
                                                placeholder="00 m"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 mt-auto">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                            <p className="text-[11px] text-foreground/80 leading-relaxed">
                                                Al habilitar el contador, el cupón mostrará una cuenta regresiva si lo activas como banner. Una vez termine, deberás reiniciarlo manualmente para extenderlo.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Form Actions */}
                    <div className="bg-muted/40 px-8 py-5 flex justify-end gap-3 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold rounded-lg hover:bg-background text-foreground transition-colors border border-transparent hover:border-border"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-gradient-to-br from-pink-500 to-pink-600 text-white px-8 py-2.5 rounded-lg font-bold hover:brightness-110 shadow-lg shadow-pink-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2 min-w-[140px] justify-center"
                        >
                            {saving ? (
                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : null}
                            {saving ? 'Guardando...' : 'Guardar Cupón'}
                        </button>
                    </div>
                </form>
            </div>

            {toast && (
                <div className="absolute z-[300] bottom-6 right-6">
                    <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
                </div>
            )}
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ coupon, onClose, onConfirm, deleting }) {
    if (!coupon) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -z-10 pointer-events-none"></div>
                <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    ¿Eliminar cupón?
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Se eliminará permanentemente el cupón <span className="font-bold text-foreground block mt-1">{coupon.name} ({coupon.code})</span>
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold rounded-lg hover:bg-muted text-foreground transition-colors border border-border/50">
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="px-6 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                    >
                        {deleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block"></span> : null}
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CouponList() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCoupon, setEditingCoupon] = useState(null); // null = closed, false = new, obj = edit
    const [deletingCoupon, setDeletingCoupon] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((mensaje, tipo = 'success') => setToast({ mensaje, tipo }), []);

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        setCoupons(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

    const handleToggleStatus = async (coupon) => {
        const newStatus = coupon.status === 'publicado' ? 'borrador' : 'publicado';
        const updates = { status: newStatus };

        if (newStatus === 'borrador') {
            // Al desactivar: quitar del banner
            updates.show_in_banner = false;
        } else if (newStatus === 'publicado' && coupon.has_counter && coupon.counter_duration_seconds) {
            // Al reactivar con contador: reiniciar el contador y mostrar en banner automáticamente
            // Primero quitar cualquier otro banner activo
            await supabase.from('coupons').update({ show_in_banner: false }).neq('id', coupon.id);
            const endTime = new Date(Date.now() + coupon.counter_duration_seconds * 1000).toISOString();
            updates.show_in_banner = true;
            updates.counter_end_time = endTime;
        }

        const { error } = await supabase.from('coupons').update(updates).eq('id', coupon.id);
        if (error) return showToast('Error al cambiar estado', 'error');
        showToast(newStatus === 'publicado' ? 'Cupón reactivado y banner en vivo 🎉' : 'Cupón desactivado', newStatus === 'publicado' ? 'success' : 'success');
        fetchCoupons();
    };

    const handleActivateBanner = async (coupon) => {
        // Reset all banners first
        await supabase.from('coupons').update({ show_in_banner: false }).neq('id', '00000000-0000-0000-0000-000000000000');

        const updates = { show_in_banner: true };

        // Solo calcular endTime si tiene contador configurado
        if (coupon.has_counter && coupon.counter_duration_seconds) {
            const endTime = new Date(Date.now() + coupon.counter_duration_seconds * 1000).toISOString();
            updates.counter_end_time = endTime;
        }

        const { error } = await supabase.from('coupons')
            .update(updates)
            .eq('id', coupon.id);
        if (error) return showToast('Error al activar banner', 'error');
        showToast('Banner activado');
        fetchCoupons();
    };

    const handleRemoveBanner = async (coupon) => {
        const { error } = await supabase.from('coupons').update({ show_in_banner: false }).eq('id', coupon.id);
        if (error) return showToast('Error al quitar el banner', 'error');
        showToast('Banner desactivado');
        fetchCoupons();
    };

    const handleRestartCounter = async (coupon) => {
        if (!coupon.counter_duration_seconds) return showToast('Sin duración configurada', 'error');
        const endTime = new Date(Date.now() + coupon.counter_duration_seconds * 1000).toISOString();
        const { error } = await supabase.from('coupons')
            .update({ counter_end_time: endTime })
            .eq('id', coupon.id);
        if (error) return showToast('Error al reiniciar contador', 'error');
        showToast('Contador reiniciado');
        fetchCoupons();
    };

    const handleDelete = async () => {
        if (!deletingCoupon) return;
        setDeleting(true);
        const { error } = await supabase.from('coupons').delete().eq('id', deletingCoupon.id);
        setDeleting(false);
        if (error) return showToast('Error al eliminar', 'error');
        setDeletingCoupon(null);
        showToast('Cupón eliminado');
        fetchCoupons();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">Gestión de Cupones</h1>
                    <p className="text-muted-foreground max-w-md">Administra tus campañas promocionales y códigos de descuento con precisión editorial.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-card border border-border text-foreground px-6 py-2.5 rounded-lg font-bold hover:bg-muted transition-all flex items-center gap-2 shadow-sm">
                        <Filter className="w-4 h-4" />
                        Filtrar
                    </button>
                    <button
                        onClick={() => setEditingCoupon(false)}
                        className="bg-gradient-to-br from-pink-500 to-pink-600 text-white px-6 py-2.5 rounded-lg font-bold hover:brightness-110 shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Nuevo Cupón
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : coupons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-2xl bg-card/50">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                        <Ticket className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No tienes cupones configurados</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-sm">Impulsa tus ventas creando campañas promocionales atractivas para tus clientes.</p>
                    <button
                        onClick={() => setEditingCoupon(false)}
                        className="bg-gradient-to-br from-pink-500 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Mi Primer Cupón
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 relative z-10">
                    {coupons.map((c) => (
                        <CouponCard
                            key={c.id}
                            coupon={c}
                            onEdit={(coupon) => setEditingCoupon(coupon)}
                            onDelete={(coupon) => setDeletingCoupon(coupon)}
                            onToggleStatus={handleToggleStatus}
                            onActivateBanner={handleActivateBanner}
                            onRemoveBanner={handleRemoveBanner}
                            onRestartCounter={handleRestartCounter}
                        />
                    ))}
                </div>
            )}

            {/* Modal (new or edit) */}
            {editingCoupon !== null && (
                <CouponModal
                    coupon={editingCoupon || null}
                    onClose={() => setEditingCoupon(null)}
                    onSaved={() => { fetchCoupons(); showToast('Cupón guardado exitosamente'); }}
                />
            )}

            {/* Delete confirm */}
            <DeleteModal
                coupon={deletingCoupon}
                onClose={() => setDeletingCoupon(null)}
                onConfirm={handleDelete}
                deleting={deleting}
            />

            {toast && (
                <div className="fixed bottom-6 right-6 z-[200]">
                    <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
                </div>
            )}
            
            {/* Visual background lights for admin similar to stitch design */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 dark:bg-pink-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-blue-500/10 dark:bg-blue-500/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>
        </div>
    );
}
