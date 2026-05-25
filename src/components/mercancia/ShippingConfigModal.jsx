
import React, { useEffect, useState } from 'react';
import { X, Percent, DollarSign, Calculator, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '../ui/Button';

export function ShippingConfigModal({ isOpen, onClose, initialParams, availableBrands = [], onSave }) {
    if (!isOpen) return null;

    const [params, setParams] = useState({
        gastosViaje: '',
        costoPilotajeXBulto: '',
        cantidadBultosTOTAL: '',
        cantidadBultosAPagar: '',
        porcentajesMarcas: []
    });

    const [newPorcentaje, setNewPorcentaje] = useState({ descripcion: '', porcentaje: '' });

    useEffect(() => {
        if (initialParams) {
            setParams({
                gastosViaje: initialParams.gastosViaje || '',
                costoPilotajeXBulto: initialParams.costoPilotajeXBulto || '',
                cantidadBultosTOTAL: initialParams.cantidadBultosTOTAL || '',
                cantidadBultosAPagar: initialParams.cantidadBultosAPagar || '',
                // Load entries as-is. Each saved entry has: { id, descripcion, rawPorcentaje, porcentaje, saved: true }
                porcentajesMarcas: initialParams.porcentajesMarcas || []
            });
        }
    }, [initialParams]);

    const handleAddPorcentaje = () => {
        const porc = parseFloat(newPorcentaje.porcentaje);
        if (!newPorcentaje.descripcion.trim() || isNaN(porc)) return;

        setParams(prev => ({
            ...prev,
            porcentajesMarcas: [
                ...prev.porcentajesMarcas,
                {
                    id: Date.now(),
                    descripcion: newPorcentaje.descripcion,
                    rawPorcentaje: porc,   // Original value entered by user
                    porcentaje: porc / 2,  // Divided value (calculated once, stored here)
                    saved: false            // Not yet persisted; will be marked true on save
                }
            ]
        }));
        setNewPorcentaje({ descripcion: '', porcentaje: '' });
    };

    const removePorcentaje = (id) => {
        setParams(prev => ({
            ...prev,
            porcentajesMarcas: prev.porcentajesMarcas.filter(p => p.id !== id)
        }));
    };

    const handleSave = () => {
        // Convert strings to numbers where appropriate
        const cleanParams = {
            gastosViaje: parseFloat(params.gastosViaje) || 0,
            costoPilotajeXBulto: parseFloat(params.costoPilotajeXBulto) || 0,
            cantidadBultosTOTAL: parseFloat(params.cantidadBultosTOTAL) || 0,
            cantidadBultosAPagar: parseFloat(params.cantidadBultosAPagar) || 0,
            // Mark all entries as saved. Division was already done when adding, NOT here.
            porcentajesMarcas: params.porcentajesMarcas.map(p => ({
                ...p,
                saved: true  // Mark as persisted so future saves won't re-divide
            }))
        };
        onSave(cleanParams);
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-[#1a1a1a] z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-[#49EBBD]" />
                        Configuración de Envío y Costos
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* General Costs Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Costos Generales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Gastos de Viaje ($ARG)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="0.00"
                                    value={params.gastosViaje}
                                    onChange={e => setParams({ ...params, gastosViaje: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Costo Pilotaje x Bulto (USD)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="0.00"
                                    value={params.costoPilotajeXBulto}
                                    onChange={e => setParams({ ...params, costoPilotajeXBulto: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bundle Counts Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            Estimaciones de Bultos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Cantidad Bultos TOTAL (Real)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="0"
                                    value={params.cantidadBultosTOTAL}
                                    onChange={e => setParams({ ...params, cantidadBultosTOTAL: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Cantidad Bultos A PAGAR (Cálculo)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="0"
                                    value={params.cantidadBultosAPagar}
                                    onChange={e => setParams({ ...params, cantidadBultosAPagar: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Brand Percentages Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Percent className="w-4 h-4" /> Comisiones por Marca
                        </h3>

                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-400 mb-1">Marca / Descripción</label>

                                <select
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none appearance-none"
                                    value={newPorcentaje.descripcion}
                                    onChange={e => setNewPorcentaje({ ...newPorcentaje, descripcion: e.target.value })}
                                >
                                    <option value="">Seleccionar Marca...</option>
                                    {availableBrands.map((brand, idx) => (
                                        <option key={idx} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs text-gray-400 mb-1">% Com.</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                                    placeholder="0"
                                    value={newPorcentaje.porcentaje}
                                    onChange={e => setNewPorcentaje({ ...newPorcentaje, porcentaje: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleAddPorcentaje()}
                                />
                            </div>
                            <button
                                onClick={handleAddPorcentaje}
                                className="h-[42px] px-4 bg-[#49EBBD] hover:bg-[#3ddeb1] text-black rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {params.porcentajesMarcas.length > 0 ? (
                            <div className="bg-black/20 rounded-lg overflow-hidden border border-gray-800">
                                {params.porcentajesMarcas.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-medium">{p.descripcion}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-400">{p.rawPorcentaje ?? (p.porcentaje * 2)}%</span>
                                                <span className="text-gray-600">→</span>
                                                <span className="text-[#49EBBD] font-bold">{p.porcentaje}%</span>
                                            </div>
                                            <button
                                                onClick={() => removePorcentaje(p.id)}
                                                className="text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 bg-black/20 rounded-lg border border-dashed border-gray-800 text-sm">
                                No hay porcentajes configurados
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-[#1a1a1a] sticky bottom-0">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-[#49EBBD] hover:bg-[#3ddeb1] text-black font-bold rounded-lg shadow-lg shadow-[#49EBBD]/20 hover:shadow-[#49EBBD]/40 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
}
