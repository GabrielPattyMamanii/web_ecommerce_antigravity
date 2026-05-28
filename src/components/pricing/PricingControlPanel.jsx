import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, DollarSign, TrendingUp, ArrowLeft, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const DOLAR_STORAGE_KEY = 'antigravity_dolar_api';

function loadDolarConfig() {
    try {
        return JSON.parse(localStorage.getItem(DOLAR_STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveDolarConfig(config) {
    try {
        localStorage.setItem(DOLAR_STORAGE_KEY, JSON.stringify(config));
    } catch { /* ignore */ }
}

export function PricingControlPanel({
    tanda,
    settings,
    onSettingsChange,
    onSave,
    loading
}) {
    const savedConfig = loadDolarConfig();

    const [localCotizacion, setLocalCotizacion] = useState(settings?.cotizacion_dolar || '');
    const [localIndiceTipo, setLocalIndiceTipo] = useState(settings?.indice_ganancia_tipo || 'personalizado');
    const [localIndiceValor, setLocalIndiceValor] = useState(settings?.indice_ganancia_valor || 1.5);

    // Dólar Blue API state — persisted in localStorage
    const [useDolarBlue, setUseDolarBlue] = useState(savedConfig.useApi !== false);
    const [dolarBlueValue, setDolarBlueValue] = useState(null);
    const [fetchingDolar, setFetchingDolar] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    // Manual value: start from localStorage if API was disabled
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

    // Auto-fetch on mount only if API mode is active
    useEffect(() => {
        if (useDolarBlue) fetchDolarBlue();
        else {
            // Restore saved manual value into parent settings
            const saved = loadDolarConfig();
            if (saved.manualValue) {
                onSettingsChange({ ...settings, cotizacion_dolar: parseFloat(saved.manualValue) });
            }
        }
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
                        className="shrink-0 flex items-center gap-2 bg-amber-950 text-amber-100 px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-900 transition-colors"
                    >
                        <Wifi className="h-4 w-4" />
                        Reactivar API
                    </button>
                </div>
            )}

            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm shadow-sm border-b border-border p-4 mb-6">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <Link to="/admin/precio-venta-sugerido" className="text-sm text-primary hover:underline flex items-center">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al listado
                        </Link>
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                📦 {tanda?.tanda_nombre || 'Cargando...'}
                            </h2>
                            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                                {(tanda?.products || []).length} productos
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Cotizacion Dolar */}
                        <div className={`p-3 rounded-lg border shadow-sm ${!useDolarBlue ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700' : 'bg-card border-border'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Cotización Dólar
                                </label>

                                {/* Toggle Dólar Blue */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {useDolarBlue ? (
                                            <span className="text-blue-500 font-bold flex items-center gap-1">
                                                <Wifi className="h-3 w-3" /> Blue API
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 font-bold flex items-center gap-1">
                                                <WifiOff className="h-3 w-3" /> Manual
                                            </span>
                                        )}
                                    </span>
                                    {/* Toggle switch */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleDolarBlue(!useDolarBlue)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${useDolarBlue ? 'bg-blue-500' : 'bg-amber-400'}`}
                                        aria-label="Usar Dólar Blue"
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${useDolarBlue ? 'translate-x-4' : 'translate-x-0'}`}
                                        />
                                    </button>
                                    {/* Refresh button when active */}
                                    {useDolarBlue && (
                                        <button
                                            type="button"
                                            onClick={fetchDolarBlue}
                                            disabled={fetchingDolar}
                                            className="text-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                                            title="Actualizar cotización"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${fetchingDolar ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    value={effectiveDolar}
                                    onChange={(e) => !useDolarBlue && handleManualChange(e.target.value)}
                                    readOnly={useDolarBlue}
                                    placeholder="Ej: 1050.50"
                                    className={`pl-7 font-mono font-bold text-primary bg-background border-input ${useDolarBlue ? 'opacity-75 cursor-not-allowed' : 'border-amber-400 focus:ring-amber-400'}`}
                                />
                            </div>

                            {/* Status messages */}
                            {useDolarBlue && !fetchingDolar && !fetchError && dolarBlueValue && (
                                <p className="text-xs text-blue-500 mt-1 font-medium">
                                    ✓ Dólar Blue: ${dolarBlueValue.toLocaleString('es-AR')} (venta)
                                </p>
                            )}
                            {useDolarBlue && fetchingDolar && (
                                <p className="text-xs text-muted-foreground mt-1">Obteniendo cotización...</p>
                            )}
                            {useDolarBlue && fetchError && (
                                <p className="text-xs text-destructive mt-1">⚠ {fetchError}</p>
                            )}
                            {!useDolarBlue && (
                                <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Valor manual — puede estar desactualizado
                                </p>
                            )}
                        </div>

                        {/* Indice Ganancia */}
                        <div className="bg-card p-3 rounded-lg border border-border shadow-sm">
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> Índice de Ganancia
                            </label>

                            <div className="flex gap-1.5 flex-wrap">
                                {['1.4', '1.5', '1.6'].map((val) => {
                                    const isActive = localIndiceTipo === val;
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => handleIndiceTypeChange(val)}
                                            className={`flex-1 min-w-[52px] py-2 rounded-md text-sm font-bold transition-all border ${
                                                isActive
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground'
                                            }`}
                                        >
                                            {val}x
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => handleIndiceTypeChange('personalizado')}
                                    className={`flex-1 min-w-[80px] py-2 rounded-md text-sm font-bold transition-all border ${
                                        localIndiceTipo === 'personalizado'
                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                            : 'bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground'
                                    }`}
                                >
                                    Custom
                                </button>
                            </div>

                            {localIndiceTipo === 'personalizado' && (
                                <div className="mt-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={localIndiceValor}
                                        onChange={(e) => handleIndiceValueChange(e.target.value)}
                                        placeholder="Ej: 1.7"
                                        className="w-full text-center bg-background border-input text-foreground font-bold"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-end justify-end">
                            <Button
                                onClick={onSave}
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? 'Guardando...' : 'Guardar Configuración'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
