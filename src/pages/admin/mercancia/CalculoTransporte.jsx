import React, { useState } from 'react';
import { Truck, Calculator, DollarSign, Archive, Percent, TrendingUp } from 'lucide-react';
import { useMercanciaUser } from '../../../context/MiMercaderiaContext';

export function CalculoTransporte() {
    const { boletas, tandasBoletas, getCANT_BULTOS_PAGAR_ID, getTotalBultosAPagar } = useMercanciaUser();

    // State for selected Tanda
    const [selectedTandaId, setSelectedTandaId] = useState('');

    // State for selected commission percentage per boleta
    const [selectedCommissions, setSelectedCommissions] = useState({});

    const handleCommissionChange = (boletaId, porcentajeId) => {
        setSelectedCommissions(prev => ({
            ...prev,
            [boletaId]: porcentajeId
        }));
    };

    // Get selected Tanda object
    const selectedTanda = tandasBoletas.find(t => t.id === parseInt(selectedTandaId));

    // Filter boletas by selected Tanda
    const filteredBoletas = selectedTandaId
        ? boletas.filter(b => b.tandaId === parseInt(selectedTandaId))
        : [];

    // Get parameters from selected Tanda
    const params = selectedTanda?.parametros || {
        porcentajesMarcas: [],
        gastosViaje: 0,
        costoPilotajeXBulto: 0,
        cantidadBultosTOTAL: 0,
        cantidadBultosAPagar: 0
    };

    // Calculate per-boleta values
    const calculateBoletaValues = (boleta) => {
        // 1. Get bultos count (custom or calculated)
        const bultosCount = boleta.customBundles && parseFloat(boleta.customBundles) > 0
            ? parseFloat(boleta.customBundles)
            : boleta.items.reduce((sum, item) => sum + (parseFloat(item.bultos) || 0), 0);

        // 2. Get CANT_BULTOS_PAGAR_ID for THIS specific boleta
        // Returns bultos for this boleta ONLY if estado = TRUE, otherwise 0
        const cantBultosPagarID = getCANT_BULTOS_PAGAR_ID(boleta.id);

        // 3. Get total bultos a pagar for the entire Tanda (sum of all boletas with estado=TRUE)
        // Note: This is the calculated sum from current boletas
        const totalBultosAPagar = getTotalBultosAPagar(boleta.tandaId);

        // 4. Commission calculation
        const selectedPorcentajeId = selectedCommissions[boleta.id];
        let comision = 0;
        if (selectedPorcentajeId) {
            const porcentajeObj = params.porcentajesMarcas.find(p => p.id === parseInt(selectedPorcentajeId));
            if (porcentajeObj) {
                // Formula: PRECIO_TOTAL_BOLETA * ((% de cada marca / 2) / 100)
                // El porcentaje se divide por 2 antes de aplicarlo
                comision = boleta.total * ((porcentajeObj.porcentaje / 2) / 100);
            }
        }

        // 5. Travel expenses calculation
        // Formula: (CANT_BULTOS_PAGAR_ID * Gastos de viaje) / Divisor
        // Divisor priority: Configured Param > Calculated Sum > 0
        const divisor = (params.cantidadBultosAPagar && parseFloat(params.cantidadBultosAPagar) > 0)
            ? parseFloat(params.cantidadBultosAPagar)
            : totalBultosAPagar;

        const gastoViaje = divisor > 0
            ? (cantBultosPagarID * params.gastosViaje) / divisor
            : 0;

        // 6. Pilotage calculation
        // Formula: CANTIDAD_DE_BULTOS * costo de pilotaje X bulto
        const pilotaje = bultosCount * params.costoPilotajeXBulto;

        return {
            bultosCount,
            cantBultosPagarID,
            comision,
            gastoViaje,
            pilotaje,
            total: comision + gastoViaje + pilotaje
        };
    };

    // Calculate totals across all boletas
    const calculateGrandTotals = () => {
        return filteredBoletas.reduce((acc, boleta) => {
            const values = calculateBoletaValues(boleta);
            return {
                comision: acc.comision + values.comision,
                gastoViaje: acc.gastoViaje + values.gastoViaje,
                pilotaje: acc.pilotaje + values.pilotaje,
                total: acc.total + values.total
            };
        }, { comision: 0, gastoViaje: 0, pilotaje: 0, total: 0 });
    };

    const grandTotals = selectedTandaId ? calculateGrandTotals() : null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#49EBBD]/10 mb-6">
                    <Truck className="w-8 h-8 text-[#49EBBD]" />
                </div>
                <h1 className="text-3xl font-bold text-[#49EBBD]">Cálculo de Transporte</h1>
                <p className="text-gray-400 mt-2 text-lg">Distribución de costos por boleta</p>
            </header>

            {/* Tanda Selector */}
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#49EBBD]/10 rounded-xl">
                        <Archive className="w-6 h-6 text-[#49EBBD]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Seleccionar Tanda</h3>
                        <p className="text-sm text-gray-400">Elige la tanda para calcular costos</p>
                    </div>
                </div>
                <select
                    value={selectedTandaId}
                    onChange={(e) => setSelectedTandaId(e.target.value)}
                    className="w-full md:w-64 bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                >
                    <option value="">-- Seleccionar Tanda --</option>
                    {tandasBoletas.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} ({new Date(t.fecha).toLocaleDateString()})</option>
                    ))}
                </select>
            </div>

            {/* Route Selection */}
            {selectedTandaId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-6 rounded-2xl border-2 border-[#49EBBD] relative">
                        <div className="absolute top-4 right-4 bg-[#49EBBD] text-black text-xs font-bold px-3 py-1 rounded-full">
                            ACTIVO
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Chile → Bermejo</h3>
                        <p className="text-gray-400 text-sm">Cálculos para este tramo</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 opacity-50 relative">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                            <span className="text-white font-bold">Próximamente</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-500 mb-2">Bermejo → Buenos Aires</h3>
                        <p className="text-gray-600 text-sm">Segundo tramo del viaje</p>
                    </div>
                </div>
            )}

            {!selectedTandaId ? (
                <div className="text-center p-12 bg-[#1a1a1a]/50 rounded-2xl border border-dashed border-gray-800">
                    <p className="text-gray-400">Selecciona una tanda arriba para ver los cálculos.</p>
                </div>
            ) : filteredBoletas.length === 0 ? (
                <div className="text-center p-12 bg-[#1a1a1a] rounded-2xl border border-gray-800">
                    <p className="text-gray-400">No hay boletas registradas en esta tanda.</p>
                </div>
            ) : (
                <>
                    {/* Per-Boleta Calculations */}
                    <div className="space-y-6">
                        {filteredBoletas.map((boleta) => {
                            const values = calculateBoletaValues(boleta);

                            return (
                                <div key={boleta.id} className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                                    {/* Boleta Header */}
                                    <div className="p-6 bg-gradient-to-r from-[#49EBBD]/10 to-transparent border-b border-gray-800">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{boleta.houseName}</h3>
                                                <div className="flex gap-4 mt-2 text-sm">
                                                    <span className="text-gray-400">Código: <span className="text-[#49EBBD] font-mono">{boleta.code}</span></span>
                                                    <span className="text-gray-400">Bultos: <span className="text-white font-bold">{values.bultosCount}</span></span>
                                                    <span className="text-gray-400">Estado: <span className={`font-bold ${boleta.estado ? 'text-[#49EBBD]' : 'text-gray-500'}`}>{boleta.estado ? 'ACTIVO' : 'INACTIVO'}</span></span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-400">Total Boleta</div>
                                                <div className="text-2xl font-bold text-white">${boleta.total.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calculations Grid */}
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Commission */}
                                        <div className="bg-black/20 p-5 rounded-xl border border-gray-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Percent className="w-5 h-5 text-[#49EBBD]" />
                                                <h4 className="font-bold text-white">Comisión por Giro</h4>
                                            </div>

                                            {params.porcentajesMarcas.length > 0 ? (
                                                <>
                                                    <select
                                                        value={selectedCommissions[boleta.id] || ''}
                                                        onChange={(e) => handleCommissionChange(boleta.id, e.target.value)}
                                                        className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-[#49EBBD] outline-none mb-3"
                                                    >
                                                        <option value="">Sin comisión (0%)</option>
                                                        {params.porcentajesMarcas.map(p => (
                                                            <option key={p.id} value={p.id}>{p.descripcion} - {p.porcentaje}%</option>
                                                        ))}
                                                    </select>
                                                    <div className="text-2xl font-bold text-[#49EBBD]">
                                                        ${values.comision.toFixed(2)}
                                                    </div>
                                                    {selectedCommissions[boleta.id] && (
                                                        <div className="text-xs text-gray-500 mt-2">
                                                            {boleta.total.toFixed(2)} × {(params.porcentajesMarcas.find(p => p.id === parseInt(selectedCommissions[boleta.id]))?.porcentaje / 2).toFixed(2)}%
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-sm text-gray-500">No hay porcentajes configurados</div>
                                            )}
                                        </div>

                                        {/* Travel Expenses */}
                                        <div className="bg-black/20 p-5 rounded-xl border border-gray-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <DollarSign className="w-5 h-5 text-[#49EBBD]" />
                                                <h4 className="font-bold text-white">Gasto de Viaje</h4>
                                            </div>
                                            <div className="text-2xl font-bold text-[#49EBBD]">
                                                ${values.gastoViaje.toFixed(2)} <span className="text-sm text-gray-400">ARG</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                ({values.cantBultosPagarID} × {params.gastosViaje.toFixed(2)}) ÷ {params.cantidadBultosAPagar}
                                            </div>
                                        </div>

                                        {/* Pilotage */}
                                        <div className="bg-black/20 p-5 rounded-xl border border-gray-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Calculator className="w-5 h-5 text-[#49EBBD]" />
                                                <h4 className="font-bold text-white">Pilotaje</h4>
                                            </div>
                                            <div className="text-2xl font-bold text-[#49EBBD]">
                                                ${values.pilotaje.toFixed(2)} <span className="text-sm text-gray-400">USD</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                {values.bultosCount} bultos × ${params.costoPilotajeXBulto.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Boleta Total */}
                                    <div className="p-4 bg-gradient-to-r from-[#49EBBD]/20 to-transparent border-t border-gray-800">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 font-medium">Total Costos de Transporte</span>
                                            <span className="text-2xl font-bold text-[#49EBBD]">${values.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grand Totals */}
                    {grandTotals && (
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#49EBBD]/5 rounded-2xl border-2 border-[#49EBBD] p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <TrendingUp className="w-6 h-6 text-[#49EBBD]" />
                                <h3 className="text-2xl font-bold text-white">Resumen Final</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-black/40 p-6 rounded-xl border border-gray-700 text-center">
                                    <div className="text-sm text-gray-400 mb-2">Total Comisiones</div>
                                    <div className="text-3xl font-bold text-white">${grandTotals.comision.toFixed(2)}</div>
                                </div>
                                <div className="bg-black/40 p-6 rounded-xl border border-gray-700 text-center">
                                    <div className="text-sm text-gray-400 mb-2">Total Gastos Viaje</div>
                                    <div className="text-3xl font-bold text-white">${grandTotals.gastoViaje.toFixed(2)}</div>
                                </div>
                                <div className="bg-black/40 p-6 rounded-xl border border-gray-700 text-center">
                                    <div className="text-sm text-gray-400 mb-2">Total Pilotaje</div>
                                    <div className="text-3xl font-bold text-white">${grandTotals.pilotaje.toFixed(2)}</div>
                                </div>
                                <div className="bg-gradient-to-br from-[#49EBBD]/20 to-[#49EBBD]/5 p-6 rounded-xl border-2 border-[#49EBBD] text-center">
                                    <div className="text-sm text-[#49EBBD] mb-2 font-bold uppercase tracking-wider">Gran Total</div>
                                    <div className="text-4xl font-bold text-[#49EBBD]">${grandTotals.total.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
