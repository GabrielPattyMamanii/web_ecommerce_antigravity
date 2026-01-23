import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pricingService } from '../../services/pricingService';
import { PricingControlPanel } from '../../components/pricing/PricingControlPanel';
import { PricingTable } from '../../components/pricing/PricingTable';

export function PrecioVentaDetalle() {
    const { tandaNombre } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [settings, setSettings] = useState({
        cotizacion_dolar: '',
        indice_ganancia_tipo: 'personalizado',
        indice_ganancia_valor: 1.5
    });

    useEffect(() => {
        if (tandaNombre) {
            loadData();
        }
    }, [tandaNombre]);

    const loadData = async () => {
        try {
            setLoading(true);
            const decodedName = decodeURIComponent(tandaNombre);
            const result = await pricingService.getTandaDetails(decodedName);
            setData(result);
            if (result.settings) {
                setSettings(result.settings);
            }
        } catch (error) {
            console.error(error);
            alert('Error cargando detalles');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsChange = (newSettings) => {
        setSettings(newSettings);
    };

    const handleSaveSettings = async () => {
        try {
            setLoading(true);
            await pricingService.saveTandaSettings(decodeURIComponent(tandaNombre), settings);
            alert('Configuración guardada correctamente');
        } catch (error) {
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <PricingControlPanel
                tanda={{ tanda_nombre: decodeURIComponent(tandaNombre), products: data?.products || [] }}
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onSave={handleSaveSettings}
                loading={loading}
            />

            <div className="container mx-auto px-4">
                {data?.products && (
                    <PricingTable
                        products={data.products}
                        settings={settings}
                    />
                )}
            </div>
        </div>
    );
}
