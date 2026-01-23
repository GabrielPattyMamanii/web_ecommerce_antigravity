import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, DollarSign, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PricingControlPanel({
    tanda,
    settings,
    onSettingsChange,
    onSave,
    loading
}) {
    const [localCotizacion, setLocalCotizacion] = useState(settings?.cotizacion_dolar || '');
    const [localIndiceTipo, setLocalIndiceTipo] = useState(settings?.indice_ganancia_tipo || 'personalizado');
    const [localIndiceValor, setLocalIndiceValor] = useState(settings?.indice_ganancia_valor || 1.5);

    useEffect(() => {
        if (settings) {
            setLocalCotizacion(settings.cotizacion_dolar || '');
            setLocalIndiceTipo(settings.indice_ganancia_tipo || 'personalizado');
            setLocalIndiceValor(settings.indice_ganancia_valor || 1.5);
        }
    }, [settings]);

    // Handle changes and propagate up
    const handleCotizacionChange = (val) => {
        setLocalCotizacion(val);
        onSettingsChange({
            ...settings,
            cotizacion_dolar: parseFloat(val)
        });
    };

    const handleIndiceTypeChange = (type) => {
        setLocalIndiceTipo(type);
        let valor = localIndiceValor;
        if (type === '1.4') valor = 1.4;
        if (type === '1.5') valor = 1.5;
        if (type === '1.6') valor = 1.6;

        setLocalIndiceValor(valor);
        onSettingsChange({
            ...settings,
            indice_ganancia_tipo: type,
            indice_ganancia_valor: valor
        });
    };

    const handleIndiceValueChange = (val) => {
        const num = parseFloat(val);
        setLocalIndiceValor(num);
        onSettingsChange({
            ...settings,
            indice_ganancia_valor: num
        });
    };

    return (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-gray-200 p-4 mb-6">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <Link to="/admin/precio-venta-sugerido" className="text-sm text-blue-600 hover:underline flex items-center">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al listado
                    </Link>
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            📦 {tanda?.tanda_nombre || 'Cargando...'}
                        </h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {(tanda?.products || []).length} productos
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Cotizacion Dolar */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Cotización Dólar
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                            <Input
                                type="number"
                                value={localCotizacion}
                                onChange={(e) => handleCotizacionChange(e.target.value)}
                                placeholder="Ej: 1050.50"
                                className="pl-7 font-mono font-bold text-blue-600"
                            />
                        </div>
                    </div>

                    {/* Indice Ganancia */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Índice de Ganancia
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={localIndiceTipo}
                                onChange={(e) => handleIndiceTypeChange(e.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <option value="1.4">1.4x (40%)</option>
                                <option value="1.5">1.5x (50%)</option>
                                <option value="1.6">1.6x (60%)</option>
                                <option value="personalizado">Personalizado</option>
                            </select>
                            {localIndiceTipo === 'personalizado' && (
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={localIndiceValor}
                                    onChange={(e) => handleIndiceValueChange(e.target.value)}
                                    className="w-24 text-center"
                                />
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-end justify-end">
                        <Button
                            onClick={onSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
