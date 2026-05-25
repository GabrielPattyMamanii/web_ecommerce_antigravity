import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    HandCoins, Search, CheckCircle2, Clock, XCircle, RefreshCw,
    ChevronDown, Package, MapPin, ToggleLeft, ToggleRight,
    Save, Plus, Trash2, ShieldCheck, Settings2, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
    pending:   { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700',  icon: <Clock        className="w-3 h-3" /> },
    approved:  { label: 'Aprobada',   color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
    rejected:  { label: 'Rechazada',  color: 'bg-red-100 text-red-700',      icon: <XCircle      className="w-3 h-3" /> },
    cancelled: { label: 'Cancelada',  color: 'bg-gray-100 text-gray-600',    icon: <XCircle      className="w-3 h-3" /> },
};

const FILTER_OPTIONS = [
    { value: 'all',       label: 'Todas' },
    { value: 'pending',   label: 'Pendientes' },
    { value: 'approved',  label: 'Aprobadas' },
    { value: 'rejected',  label: 'Rechazadas' },
    { value: 'cancelled', label: 'Canceladas' },
];

const WA_ICON = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

export function SenasList() {
    // — Lista de señas —
    const [senas, setSenas]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [filterStatus, setFilter]       = useState('approved');
    const [updatingId, setUpdatingId]     = useState(null);

    // — Configuración de señas —
    const [configId, setConfigId]         = useState(null);
    const [senaEnabled, setSenaEnabled]   = useState(true);
    const [toggleLoading, setToggleLoad]  = useState(false);
    const [configOpen, setConfigOpen]     = useState(false);
    const [senaSaving, setSenaSaving]     = useState(false);
    const [locationSaving, setLocSaving]  = useState(false);
    const [locations, setLocations]       = useState([]);
    const [newLocation, setNewLocation]   = useState('');

    const { register, handleSubmit, setValue, watch } = useForm();
    const senaType = watch('sena_type', 'fixed');

    // ── Carga inicial ──────────────────────────────────────────────
    const fetchSenas = async () => {
        setLoading(true);
        const [senasRes, configRes] = await Promise.all([
            supabase.from('senas').select('*').order('created_at', { ascending: false }),
            supabase.from('site_config').select('*').single(),
        ]);

        if (senasRes.error) {
            toast.error('Error al cargar señas');
        } else {
            setSenas(senasRes.data || []);
        }

        if (configRes.data) {
            const cfg = configRes.data;
            setConfigId(cfg.id);
            setSenaEnabled(cfg.sena_enabled ?? true);
            setValue('sena_type',       cfg.sena_type       || 'fixed');
            setValue('sena_amount',     cfg.sena_amount      ?? 0);
            setValue('sena_percentage', cfg.sena_percentage  ?? 10);
            setLocations(cfg.sena_delivery_locations || []);
        }

        setLoading(false);
    };

    useEffect(() => { fetchSenas(); }, []);

    // ── Toggle habilitado/deshabilitado ───────────────────────────
    const toggleSena = async () => {
        const newVal = !senaEnabled;
        setToggleLoad(true);
        const { error } = await supabase
            .from('site_config')
            .update({ sena_enabled: newVal })
            .eq('id', configId);

        if (error) {
            toast.error('Error al actualizar configuración');
        } else {
            setSenaEnabled(newVal);
            toast.success(newVal ? 'Señas habilitadas en el catálogo' : 'Señas deshabilitadas en el catálogo');
        }
        setToggleLoad(false);
    };

    // ── Guardar tipo y monto ──────────────────────────────────────
    const onSaveSena = async (data) => {
        setSenaSaving(true);
        const payload = {
            sena_enabled:    senaEnabled,
            sena_type:       data.sena_type       || 'fixed',
            sena_amount:     parseFloat(data.sena_amount)     || 0,
            sena_percentage: parseFloat(data.sena_percentage) || 0,
        };

        let error;
        if (configId) {
            ({ error } = await supabase.from('site_config').update(payload).eq('id', configId));
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from('site_config').insert([payload]).select().single();
            error = insertError;
            if (inserted) setConfigId(inserted.id);
        }

        if (error) {
            if (error.message?.includes('column') || error.code === '42703') {
                toast.error('Ejecutá la migración SQL primero.');
            } else {
                toast.error('Error al guardar: ' + error.message);
            }
        } else {
            toast.success('Configuración de señas guardada');
        }
        setSenaSaving(false);
    };

    // ── Lugares de entrega ────────────────────────────────────────
    const addLocation = () => {
        const trimmed = newLocation.trim();
        if (!trimmed) return;
        if (locations.includes(trimmed)) { toast.error('Ese lugar ya existe'); return; }
        setLocations(prev => [...prev, trimmed]);
        setNewLocation('');
    };

    const removeLocation = (loc) => setLocations(prev => prev.filter(l => l !== loc));

    const saveLocations = async () => {
        setLocSaving(true);
        let error;
        if (configId) {
            ({ error } = await supabase
                .from('site_config')
                .update({ sena_delivery_locations: locations })
                .eq('id', configId));
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from('site_config')
                .insert([{ sena_delivery_locations: locations }])
                .select().single();
            error = insertError;
            if (inserted) setConfigId(inserted.id);
        }

        if (error) {
            if (error.message?.includes('column') || error.code === '42703') {
                toast.error('Ejecutá la migración SQL primero.');
            } else {
                toast.error('Error al guardar lugares: ' + error.message);
            }
        } else {
            toast.success('Lugares de entrega guardados');
        }
        setLocSaving(false);
    };

    // ── Actualizar estado de una seña ─────────────────────────────
    const updateStatus = async (id, newStatus) => {
        setUpdatingId(id);
        const { error } = await supabase
            .from('senas')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error('Error al actualizar estado');
        } else {
            toast.success(`Seña marcada como ${STATUS_LABELS[newStatus]?.label}`);
            setSenas(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
        }
        setUpdatingId(null);
    };

    // ── Filtros ───────────────────────────────────────────────────
    const filtered = senas.filter(s => {
        const fullName = `${s.buyer_name || ''} ${s.buyer_lastname || ''}`.toLowerCase();
        const matchSearch = !search ||
            s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
            fullName.includes(search.toLowerCase()) ||
            s.buyer_email?.toLowerCase().includes(search.toLowerCase()) ||
            s.buyer_whatsapp?.includes(search) ||
            s.delivery_location?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || s.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const totals = {
        all:       senas.length,
        pending:   senas.filter(s => s.status === 'pending').length,
        approved:  senas.filter(s => s.status === 'approved').length,
        rejected:  senas.filter(s => s.status === 'rejected').length,
        cancelled: senas.filter(s => s.status === 'cancelled').length,
    };

    const totalAprobado = senas
        .filter(s => s.status === 'approved')
        .reduce((acc, s) => acc + (Number(s.amount_paid) || 0), 0);

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <HandCoins className="w-6 h-6 text-[#009EE3]" />
                        Gestión de Señas
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Administrá las reservas realizadas por los compradores.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSena}
                        disabled={toggleLoading || configId === null}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all shadow-sm disabled:opacity-50
                            ${senaEnabled
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            }`}
                    >
                        {senaEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        Señas {senaEnabled ? 'habilitadas' : 'deshabilitadas'}
                    </button>
                    <button
                        onClick={fetchSenas}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                    <button
                        onClick={() => setConfigOpen(true)}
                        title="Configuración de señas"
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#009EE3] hover:border-[#009EE3]/40 transition-colors shadow-sm"
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ── Modal de configuración ── */}
            {configOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setConfigOpen(false)}
                    />
                    {/* Panel */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                        {/* Header del modal */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-[#009EE3]" />
                                Configuración de Señas
                            </h2>
                            <button
                                onClick={() => setConfigOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-6">

                            {/* Tipo y monto */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                    <HandCoins className="w-4 h-4 text-[#009EE3]" />
                                    Monto de la seña
                                </h3>
                                <form onSubmit={handleSubmit(onSaveSena)} className="space-y-4">
                                    <div className="flex gap-3">
                                        <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${senaType === 'fixed' ? 'border-[#009EE3] bg-[#009EE3]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input type="radio" value="fixed" {...register('sena_type')} className="accent-[#009EE3]" />
                                            <div>
                                                <p className="font-semibold text-sm">Monto fijo</p>
                                                <p className="text-xs text-gray-500">Todos pagan lo mismo</p>
                                            </div>
                                        </label>
                                        <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${senaType === 'percentage' ? 'border-[#009EE3] bg-[#009EE3]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input type="radio" value="percentage" {...register('sena_type')} className="accent-[#009EE3]" />
                                            <div>
                                                <p className="font-semibold text-sm">Porcentaje</p>
                                                <p className="text-xs text-gray-500">% del precio del producto</p>
                                            </div>
                                        </label>
                                    </div>

                                    {senaType === 'fixed' ? (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Monto fijo (ARS)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <Input {...register('sena_amount')} type="number" min="0" step="0.01" placeholder="5000" className="pl-7" />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Todos los productos tendrán esta seña fija.</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Porcentaje sobre el precio</label>
                                            <div className="relative">
                                                <Input {...register('sena_percentage')} type="number" min="1" max="100" step="0.5" placeholder="20" className="pr-8" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Ej: 20% de $50.000 = seña de $10.000.</p>
                                        </div>
                                    )}

                                    <Button type="submit" disabled={senaSaving} className="w-full bg-[#009EE3] hover:bg-[#0073BD]">
                                        <Save className="mr-2 h-4 w-4" />
                                        {senaSaving ? 'Guardando...' : 'Guardar monto'}
                                    </Button>
                                </form>
                            </div>

                            <div className="border-t border-gray-100" />

                            {/* Lugares de entrega */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-[#009EE3]" />
                                        Lugares de entrega
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Los compradores elegirán uno de estos lugares al hacer una seña.</p>
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        value={newLocation}
                                        onChange={e => setNewLocation(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                                        placeholder="Ej: Sucursal Centro, Envío a domicilio..."
                                        className="flex-1"
                                    />
                                    <Button type="button" onClick={addLocation} disabled={!newLocation.trim()} className="flex-shrink-0">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                {locations.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-xl">
                                        No hay lugares configurados. Agregá al menos uno.
                                    </p>
                                ) : (
                                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                                        {locations.map((loc, i) => (
                                            <li key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <MapPin className="w-3.5 h-3.5 text-[#009EE3] flex-shrink-0" />
                                                    {loc}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLocation(loc)}
                                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <Button
                                    type="button"
                                    onClick={saveLocations}
                                    disabled={locationSaving}
                                    className="w-full bg-[#009EE3] hover:bg-[#0073BD]"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {locationSaving ? 'Guardando...' : 'Guardar lugares'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Métricas ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Total señas</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{totals.all}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm">
                    <p className="text-xs text-amber-600 font-medium">Pendientes</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{totals.pending}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
                    <p className="text-xs text-green-600 font-medium">Aprobadas</p>
                    <p className="text-2xl font-black text-green-700 mt-1">{totals.approved}</p>
                </div>
                <div className="bg-[#009EE3]/10 rounded-xl p-4 border border-[#009EE3]/20 shadow-sm">
                    <p className="text-xs text-[#0073BD] font-medium">Total cobrado</p>
                    <p className="text-2xl font-black text-[#0073BD] mt-1">${totalAprobado.toLocaleString('es-AR')}</p>
                </div>
            </div>

            {/* ── Filtros ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por producto, nombre, WhatsApp o lugar..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#009EE3]/20 focus:border-[#009EE3]"
                    />
                </div>
                <div className="relative">
                    <select
                        value={filterStatus}
                        onChange={e => setFilter(e.target.value)}
                        className="appearance-none w-full sm:w-44 pl-4 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#009EE3]/20 bg-white"
                    >
                        {FILTER_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>
                                {o.label} {o.value !== 'all' ? `(${totals[o.value]})` : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* ── Lista ── */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
                            <div className="flex gap-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
                    <HandCoins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay señas para mostrar</p>
                    {search && <p className="text-sm mt-1">Intentá con otro término de búsqueda</p>}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(sena => {
                        const statusConfig = STATUS_LABELS[sena.status] || STATUS_LABELS.pending;
                        const fecha = new Date(sena.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                        });
                        const fullName = [sena.buyer_name, sena.buyer_lastname].filter(Boolean).join(' ');
                        const waLink = sena.buyer_whatsapp
                            ? `https://wa.me/${sena.buyer_whatsapp.replace(/\D/g, '')}`
                            : null;

                        return (
                            <div key={sena.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4">

                                    {/* Imagen */}
                                    <div className="flex-shrink-0">
                                        {sena.product_image ? (
                                            <img src={sena.product_image} alt={sena.product_name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                                                <Package className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info comprador + producto */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-gray-900 truncate">{sena.product_name}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                                                {statusConfig.icon}
                                                {statusConfig.label}
                                            </span>
                                            {sena.mp_payment_id && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    Verificado MP
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm font-semibold text-gray-700">{fullName || '—'}</p>

                                        <a href={`mailto:${sena.buyer_email}`} className="text-xs text-gray-500 hover:text-[#009EE3] transition-colors block">
                                            {sena.buyer_email}
                                        </a>

                                        {sena.buyer_whatsapp && (
                                            <a
                                                href={waLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#25D366] transition-colors font-medium"
                                            >
                                                {WA_ICON}
                                                {sena.buyer_whatsapp}
                                            </a>
                                        )}

                                        {sena.delivery_location && (
                                            <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                                                <MapPin className="w-3 h-3 text-[#009EE3] flex-shrink-0" />
                                                {sena.delivery_location}
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-400">{fecha}</p>
                                    </div>

                                    {/* Monto + acciones */}
                                    <div className="flex flex-col items-end gap-2 sm:text-right flex-shrink-0">
                                        <div>
                                            <p className="text-xs text-gray-400">Monto seña</p>
                                            <p className="text-xl font-black text-[#0073BD]">${Number(sena.amount_paid).toLocaleString('es-AR')}</p>
                                            {sena.product_price && (
                                                <p className="text-xs text-gray-400">Producto: ${Number(sena.product_price).toLocaleString('es-AR')}</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2 flex-wrap justify-end">
                                            {sena.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => updateStatus(sena.id, 'approved')}
                                                        disabled={updatingId === sena.id}
                                                        className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(sena.id, 'rejected')}
                                                        disabled={updatingId === sena.id}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Rechazar
                                                    </button>
                                                </>
                                            )}
                                            {sena.status === 'approved' && (
                                                <button
                                                    onClick={() => updateStatus(sena.id, 'cancelled')}
                                                    disabled={updatingId === sena.id}
                                                    className="px-3 py-1.5 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {(sena.mp_preference_id || sena.mp_payment_id) && (
                                    <div className="border-t border-gray-50 px-4 py-1.5 bg-gray-50 flex flex-wrap gap-x-4 gap-y-0.5">
                                        {sena.mp_preference_id && (
                                            <p className="text-[10px] text-gray-400 font-mono truncate">
                                                Preferencia: {sena.mp_preference_id}
                                            </p>
                                        )}
                                        {sena.mp_payment_id && (
                                            <p className="text-[10px] text-blue-500 font-mono truncate font-semibold">
                                                Pago ID: {sena.mp_payment_id}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
