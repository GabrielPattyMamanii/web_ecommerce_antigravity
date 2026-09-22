import React, { useState, useEffect, useCallback } from 'react';
import { Save, DollarSign, TrendingUp, ArrowLeft, RefreshCw, Wifi, WifiOff, AlertTriangle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadDolarConfigLocal, loadDolarConfigFromDB, saveDolarConfig } from '../../lib/dolarConfig';

export function PricingControlPanel({
    tanda,
    settings,
    onSettingsChange,
    onSave,
    loading
}) {
    const savedConfig = loadDolarConfigLocal();

    const [localCotizacion, setLocalCotizacion] = useState(settings?.cotizacion_dolar || '');
    const [localIndiceTipo, setLocalIndiceTipo] = useState(settings?.indice_ganancia_tipo || 'personalizado');
    const [localIndiceValor, setLocalIndiceValor] = useState(settings?.indice_ganancia_valor || 1.5);

    // Dólar Blue API state — persisted in Supabase (configuracion)
    const [useDolarBlue, setUseDolarBlue] = useState(savedConfig.useApi !== false);
    const [dolarBlueValue, setDolarBlueValue] = useState(null);
    const [fetchingDolar, setFetchingDolar] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [manualValue, setManualValue] = useState(
        savedConfig.useApi === false ? (savedConfig.manualValue || '') : ''
    );

    useEffect(() => {
        if (settings) {
            setLocalCotizacion(settings.cotizacion_dolar || '');
            setLocalIndiceTipo(settings.indice_ganancia_tipo || 'personalizado');
            setLocalIndiceValor(settings.indice_ganancia_valor || 1.5);
        }
    }, [settings]);

    const fetchDolarBlue = useCallback(async () => {
        setFetchingDolar(true);
        setFetchError(null);
        try {
            const res = await fetch('https://dolarapi.com/v1/dolares/blue');
            if (!res.ok) throw new Error('Error al conectar con la API');
            const json = await res.json();
            const venta = json?.venta;
            if (!venta) throw new Error('No se encontró el valor de venta');
            setDolarBlueValue(venta);
            onSettingsChange({ ...settings, cotizacion_dolar: venta });
        } catch (err) {
            setFetchError(err.message || 'Error desconocido');
        } finally {
            setFetchingDolar(false);
        }
    }, [settings, onSettingsChange]);

    // Force-sync API: if DB loads slow and overrides API fetch, force it back
    useEffect(() => {
        if (useDolarBlue && dolarBlueValue && settings?.cotizacion_dolar !== dolarBlueValue) {
            onSettingsChange({ ...settings, cotizacion_dolar: dolarBlueValue });
        }
    }, [useDolarBlue, dolarBlueValue, settings, onSettingsChange]);

    // Force-sync manual: if parent settings change (e.g. DB load in PrecioVentaDetalle),
    // push the persisted manual value back so PricingTable uses the right rate.
    useEffect(() => {
        if (!useDolarBlue && manualValue !== '' && parseFloat(manualValue) > 0) {
            const parsed = parseFloat(manualValue);
            if (settings?.cotizacion_dolar !== parsed) {
                onSettingsChange({ ...settings, cotizacion_dolar: parsed });
            }
        }
    }, [useDolarBlue, manualValue, settings, onSettingsChange]);

    // Load config from Supabase on mount, then decide whether to fetch API
    useEffect(() => {
        loadDolarConfigFromDB().then(cfg => {
            const apiActive = cfg.useApi !== false;
            setUseDolarBlue(apiActive);
            if (apiActive) {
                fetchDolarBlue();
            } else if (cfg.manualValue) {
                setManualValue(cfg.manualValue);
                onSettingsChange({ ...settings, cotizacion_dolar: parseFloat(cfg.manualValue) });
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggleDolarBlue = (checked) => {
        setUseDolarBlue(checked);
        if (checked) {
            saveDolarConfig({ useApi: true, manualValue: '' });
            fetchDolarBlue();
        } else {
            // Pre-fill manual with last known API value so user has a starting point
            const prefill = dolarBlueValue ? String(dolarBlueValue) : manualValue;
            setManualValue(prefill);
            saveDolarConfig({ useApi: false, manualValue: prefill });
            onSettingsChange({
                ...settings,
                cotizacion_dolar: prefill ? parseFloat(prefill) : ''
            });
        }
    };

    const handleManualChange = (val) => {
        setManualValue(val);
        setLocalCotizacion(val);
        saveDolarConfig({ useApi: false, manualValue: val });
        const num = val === '' ? '' : parseFloat(val);
        onSettingsChange({ ...settings, cotizacion_dolar: num });
    };

    const handleIndiceTypeChange = (type) => {
        setLocalIndiceTipo(type);
        let valor = localIndiceValor;
        if (type === '1.4') valor = 1.4;
        if (type === '1.5') valor = 1.5;
        if (type === '1.6') valor = 1.6;
        setLocalIndiceValor(valor);
        onSettingsChange({ ...settings, indice_ganancia_tipo: type, indice_ganancia_valor: valor });
    };

    const handleIndiceValueChange = (val) => {
        const num = parseFloat(val);
        setLocalIndiceValor(num);
        onSettingsChange({ ...settings, indice_ganancia_valor: num });
    };

    const effectiveDolar = useDolarBlue ? (dolarBlueValue ?? '') : manualValue;

    return (
        <>
            {/* ── Warning banner when API is disabled ── */}
            {!useDolarBlue && (
                <div className="w-full bg-amber-400 text-amber-950 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-black text-base uppercase tracking-wide leading-tight">
                                API de Dólar DESACTIVADA
                            </p>
                            <p className="text-sm font-medium mt-0.5">
                                Estás usando un valor manual de dólar
                                {manualValue ? ` ($${parseFloat(manualValue).toLocaleString('es-AR')})` : ''}.
                                Es posible que esté desactualizado.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleToggleDolarBlue(true)}
                        className="shrink-0 flex items-center gap-2 bg-amber-950 text-amber-100 px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-900 transition-colors"
                    >
                        <Wifi className="h-4 w-4" />
                        Reactivar API
                    </button>
                </div>
            )}

            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm shadow-sm border-b border-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

                    {/* Sub-header nav: volver + tanda + contador */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <Link
                            to="/admin/precio-venta-sugerido"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                            Volver al listado general
                        </Link>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-foreground bg-card px-3.5 py-1.5 rounded-xl border border-border shadow-sm">
                                <Package className="w-4 h-4 text-primary" />
                                {tanda?.tanda_nombre || 'Cargando...'}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200/60 dark:border-emerald-900/50">
                                {(tanda?.products || []).length} productos activos
                            </span>
                        </div>
                    </div>

                    {/* Pricing Engine Configuration Card */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

                            {/* Cotización Dólar */}
                            <div className={`lg:col-span-5 p-4 rounded-xl border ${!useDolarBlue ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50' : 'bg-muted/40 border-border'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                                        Cotización Dólar
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${useDolarBlue ? 'text-sky-600' : 'text-amber-600'}`}>
                                            {useDolarBlue ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                            {useDolarBlue ? 'Blue API' : 'Manual'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleDolarBlue(!useDolarBlue)}
                                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${useDolarBlue ? 'bg-sky-600' : 'bg-amber-500'}`}
                                            aria-label="Usar Dólar Blue"
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${useDolarBlue ? 'translate-x-4' : 'translate-x-0'}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground font-bold text-sm pointer-events-none">$</span>
                                    <input
                                        type="number"
                                        value={effectiveDolar}
                                        onChange={(e) => !useDolarBlue && handleManualChange(e.target.value)}
                                        readOnly={useDolarBlue}
                                        placeholder="Ej: 1050.50"
                                        className={`block w-full pl-8 pr-10 py-2 text-sm font-extrabold text-foreground bg-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ${useDolarBlue ? 'border-border opacity-75 cursor-not-allowed' : 'border-amber-400 dark:border-amber-700 focus:ring-amber-400/30'}`}
                                    />
                                    {useDolarBlue && (
                                        <button
                                            type="button"
                                            onClick={fetchDolarBlue}
                                            disabled={fetchingDolar}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-sky-600 disabled:opacity-50 transition-colors"
                                            title="Sincronizar ahora"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${fetchingDolar ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                </div>

                                {/* Status messages */}
                                {useDolarBlue && !fetchingDolar && !fetchError && dolarBlueValue && (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        Dólar Blue oficial: ${dolarBlueValue.toLocaleString('es-AR')} (venta) sincronizado
                                    </p>
                                )}
                                {useDolarBlue && fetchingDolar && (
                                    <p className="mt-2 text-[11px] text-muted-foreground">Obteniendo cotización...</p>
                                )}
                                {useDolarBlue && fetchError && (
                                    <p className="mt-2 text-[11px] text-destructive">⚠ {fetchError}</p>
                                )}
                                {!useDolarBlue && (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="w-3 h-3" /> Valor manual — puede estar desactualizado
                                    </p>
                                )}
                            </div>

                            {/* Índice de Ganancia */}
                            <div className="lg:col-span-5 bg-muted/40 p-4 rounded-xl border border-border">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
                                    Índice Multiplicador de Ganancia
                                </span>

                                <div className="grid grid-cols-4 gap-2">
                                    {['1.4', '1.5', '1.6'].map((val) => {
                                        const isActive = localIndiceTipo === val;
                                        return (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => handleIndiceTypeChange(val)}
                                                className={`py-1.5 text-xs rounded-lg border shadow-sm transition-colors ${
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground border-primary font-bold ring-2 ring-primary/30'
                                                        : 'bg-card border-border text-muted-foreground font-semibold hover:border-primary/50 hover:text-foreground'
                                                }`}
                                            >
                                                {val}x
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => handleIndiceTypeChange('personalizado')}
                                        className={`py-1.5 text-xs rounded-lg border shadow-sm transition-colors ${
                                            localIndiceTipo === 'personalizado'
                                                ? 'bg-primary text-primary-foreground border-primary font-bold ring-2 ring-primary/30'
                                                : 'bg-card border-border text-muted-foreground font-semibold hover:border-primary/50 hover:text-foreground'
                                        }`}
                                    >
                                        Custom
                                    </button>
                                </div>

                                {localIndiceTipo === 'personalizado' && (
                                    <div className="mt-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={localIndiceValor}
                                            onChange={(e) => handleIndiceValueChange(e.target.value)}
                                            placeholder="Ej: 1.7"
                                            className="w-full py-1.5 px-3 text-center text-xs font-bold text-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="lg:col-span-2 flex flex-col justify-center">
                                <button
                                    onClick={onSave}
                                    disabled={loading}
                                    className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? 'Guardando...' : 'Guardar Configuración'}
                                </button>
                                <span className="text-[10px] text-center text-muted-foreground mt-2">Afecta los valores en tiempo real</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
