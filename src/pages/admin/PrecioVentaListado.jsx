import React, { useEffect, useState } from 'react';
import { pricingService } from '../../services/pricingService';
import { TandaCard } from '../../components/pricing/TandaCard';

export function PrecioVentaListado() {
    const [tandas, setTandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTandas();
    }, []);

    const fetchTandas = async () => {
        try {
            setLoading(true);
            const data = await pricingService.getTandasSummary();
            // Sort by date descending (newest first)
            const sorted = data.sort((a, b) => new Date(b.tanda_fecha) - new Date(a.tanda_fecha));
            setTandas(sorted);
        } catch (err) {
            console.error(err);
            setError('Error al cargar las tandas.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl mx-4 mt-8">
            {error}
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Precio de Venta Sugerido</h1>
                <p className="text-gray-500 max-w-2xl mx-auto">
                    Gestiona los precios de venta, configura el índice de ganancia y publica productos al catálogo oficial.
                </p>
            </div>

            {tandas.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No hay tandas registradas en el sistema.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tandas.map((tanda) => (
                        <TandaCard key={tanda.tanda_nombre} tanda={tanda} />
                    ))}
                </div>
            )}
        </div>
    );
}
