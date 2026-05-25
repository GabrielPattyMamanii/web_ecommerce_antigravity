import React, { useState, useMemo } from 'react';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';
import { Truck, Calendar, Calculator, DollarSign, AlertCircle } from 'lucide-react';

export function CalculoTransporte() {
    const { tandasBoletas, boletas, mercanciaUser, getTotalBultosAPagar } = useMercanciaUser();
    const [selectedTandaId, setSelectedTandaId] = useState('');
    const [route, setRoute] = useState('CHILE_BERMEJO'); // Default route

    // Get Claimed Boletas for Tanda
    const claimedBoletas = useMemo(() => {
        if (!selectedTandaId) return [];
        return boletas.filter(b => b.tandaId === parseInt(selectedTandaId) && b.propietarioId === mercanciaUser?.id);
    }, [selectedTandaId, boletas, mercanciaUser]);

    // Get Tanda Params
    const tandaParams = useMemo(() => {
        if (!selectedTandaId) return null;
        return tandasBoletas.find(t => t.id === parseInt(selectedTandaId))?.parametros || {};
    }, [selectedTandaId, tandasBoletas]);

    // --- Calculations ---
    const totalBultosTanda = useMemo(() => {
        if (!selectedTandaId) return 0;
        return getTotalBultosAPagar(parseInt(selectedTandaId));
    }, [selectedTandaId, getTotalBultosAPagar]);

    // If param for manual Total Bultos is set, use it. Otherwise use calculated sum.
    // However, the requested formula says "Total Bultos a Pagar (admin)" which implies the admin sets the total divisor.
    // Let's check tandaParams.cantidadBultosAPagar
    const divisorBultos = tandaParams?.cantidadBultosAPagar || totalBultosTanda || 1;

    const calculations = useMemo(() => {
        if (!tandaParams) return [];

        return claimedBoletas.map(boleta => {
            // 1. Get Brand %
            const brandName = boleta.houseName;
            const percentageObj = tandaParams.porcentajesMarcas?.find(p => p.descripcion === brandName);
            const percentage = percentageObj ? percentageObj.porcentaje : 0;

            // 2. Identify Bultos for this boleta
            const bultosBoleta = boleta.customBundles && parseFloat(boleta.customBundles) > 0
                ? parseFloat(boleta.customBundles)
                : boleta.items.reduce((s, i) => s + (parseFloat(i.bultos) || 0), 0);

            // 3. Calculate "Precio Total Boleta" with %
            // Formula: Total * (Porcentaje / 100) -> Wait, usually it's commission added? 
            // Request says: "PRECIO TOTAL DE BOLETA * (% de cada marca / 100)"
            // This sounds like the "Costo de Marca" or "Impuesto". Let's assume it's a cost component.
            const costoMarca = (boleta.total || 0) * (percentage / 100);

            // 4. Calculate Trip Cost (Gasto de Viaje)
            // Formula: (Bultos_Boleta * Gastos_Viaje_Tanda) / Cantidad_Bultos_A_PAGAR_Tanda
            const gastoViajeTotalTanda = tandaParams.gastosViaje || 0;
            const gastoViaje = (bultosBoleta * gastoViajeTotalTanda) / divisorBultos;

            // 5. Calculate Pilotage
            // Formula: Bultos_Boleta * Costo_Pilotaje_X_Bulto
            const pilotaje = bultosBoleta * (tandaParams.costoPilotajeXBulto || 0);

            return {
                boletaId: boleta.id,
                boletaCode: boleta.code,
                boletaName: boleta.houseName,
                bultos: bultosBoleta,
                percentage,
                costoMarca,
                gastoViaje,
                pilotaje,
                totalBoletaTransporte: costoMarca + gastoViaje + pilotaje // Sum of these costs? Or just display components?
                // The summary table requests: Gasto de viaje, Pilotaje, Comision por giro
            };
        });
    }, [claimedBoletas, tandaParams, divisorBultos]);

    const totalResumen = useMemo(() => {
        return calculations.reduce((acc, curr) => ({
            gastoViaje: acc.gastoViaje + curr.gastoViaje,
            pilotaje: acc.pilotaje + curr.pilotaje,
            costoMarca: acc.costoMarca + curr.costoMarca // "Comisión" equivalent maybe?
        }), { gastoViaje: 0, pilotaje: 0, costoMarca: 0 });
    }, [calculations]);


    if (!tandasBoletas.length) {
        return (
            <div className="p-8 text-center bg-[#1a1a1a] rounded-2xl border border-gray-800">
                <p className="text-gray-400">No hay tandas disponibles.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-[#49EBBD]">Cálculo de Transporte</h1>
                <p className="text-gray-400 mt-2">Calcula los costos de envío para tus boletas seleccionadas.</p>
            </header>

            {/* Filters */}
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Seleccionar Tanda</label>
                    <div className="relative">
                        <select
                            onChange={(e) => setSelectedTandaId(e.target.value)}
                            value={selectedTandaId}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none appearance-none"
                        >
                            <option value="">-- Elegir Tanda --</option>
                            {tandasBoletas.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                        <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Ruta de Envío</label>
                    <div className="relative">
                        <select
                            onChange={(e) => setRoute(e.target.value)}
                            value={route}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none appearance-none"
                        >
                            <option value="CHILE_BERMEJO">Chile ➔ Bermejo</option>
                            <option value="BERMEJO_BAIRES" disabled>Bermejo ➔ Buenos Aires (Próximamente)</option>
                        </select>
                        <Truck className="absolute right-4 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {selectedTandaId && calculations.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Totals Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-blue-900/10 p-6 rounded-3xl border border-blue-500/30 sticky top-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Calculator className="text-blue-400" /> Totales
                            </h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                                    <span className="text-gray-400">Gasto de Viaje</span>
                                    <span className="text-white font-mono font-bold">${totalResumen.gastoViaje.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                                    <span className="text-gray-400">Pilotaje</span>
                                    <span className="text-white font-mono font-bold">${totalResumen.pilotaje.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                                    <span className="text-gray-400">Comisión / Marcas</span>
                                    <span className="text-white font-mono font-bold">${totalResumen.costoMarca.toFixed(2)}</span>
                                </div>
                                <div className="pt-4 flex justify-between items-center">
                                    <span className="text-blue-400 font-bold uppercase tracking-wider text-sm">Total a Pagar</span>
                                    <span className="text-3xl font-bold text-white shadow-blue-500/20 drop-shadow-lg">
                                        ${(totalResumen.gastoViaje + totalResumen.pilotaje + totalResumen.costoMarca).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="lg:col-span-2 space-y-4">
                        {calculations.map(calc => (
                            <div key={calc.boletaId} className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row gap-6 hover:border-gray-600 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-gray-500">{calc.boletaCode}</span>
                                        <span className="text-xs text-[#49EBBD] font-bold border border-[#49EBBD]/30 px-2 py-0.5 rounded-full">{calc.percentage}% Marca</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">{calc.boletaName || 'Sin Nombre'}</h4>
                                    <div className="text-sm text-gray-400">
                                        {calc.bultos} Bultos
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm w-full md:w-auto">
                                    <div className="bg-black/20 p-3 rounded-lg border border-gray-800">
                                        <span className="block text-[10px] text-gray-500 uppercase mb-1">Viaje</span>
                                        <span className="text-white font-mono">${calc.gastoViaje.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-lg border border-gray-800">
                                        <span className="block text-[10px] text-gray-500 uppercase mb-1">Pilotaje</span>
                                        <span className="text-white font-mono">${calc.pilotaje.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-lg border border-gray-800">
                                        <span className="block text-[10px] text-gray-500 uppercase mb-1">Marca</span>
                                        <span className="text-white font-mono">${calc.costoMarca.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-[#1a1a1a] rounded-2xl border border-gray-800 text-center">
                    {selectedTandaId ? (
                        <>
                            <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Sin boletas seleccionadas</h3>
                            <p className="text-gray-400">No has cargado boletas para esta tanda aún.</p>
                            <Link to="/user/cargar-boletas" className="mt-4 text-[#49EBBD] font-bold hover:underline">
                                Ir a Cargar Boletas
                            </Link>
                        </>
                    ) : (
                        <>
                            <Calculator className="w-12 h-12 text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-white lg:text-center">Selecciona una tanda</h3>
                            <p className="text-gray-400">Elige una tanda para ver el cálculo detallado.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
