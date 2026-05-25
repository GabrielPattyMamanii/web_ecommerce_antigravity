import React, { useState, useEffect } from 'react';
import { Settings, Plus, Calculator, DollarSign, Trash2, ArrowLeft, Percent } from 'lucide-react';
import { useMercanciaUser } from '../../../context/MiMercaderiaContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ParametrosCostos() {
    const { tandasBoletas, updateTandaParametros } = useMercanciaUser();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tandaId = parseInt(searchParams.get('tandaId'));

    // Find the selected Tanda
    const selectedTanda = tandasBoletas.find(t => t.id === tandaId);

    // Form Inputs for Porcentajes de Marca
    const [porcentajeInput, setPorcentajeInput] = useState({ porcentaje: '', descripcion: '' });

    // Form Inputs for other params
    const [gastosViajeInput, setGastosViajeInput] = useState('');
    const [costoPilotajeInput, setCostoPilotajeInput] = useState('');
    const [cantidadBultosTotalInput, setCantidadBultosTotalInput] = useState('');
    const [cantidadBultosAPagarInput, setCantidadBultosAPagarInput] = useState('');

    // Load params when Tanda is selected
    useEffect(() => {
        if (selectedTanda && selectedTanda.parametros) {
            setGastosViajeInput(selectedTanda.parametros.gastosViaje || '');
            setCostoPilotajeInput(selectedTanda.parametros.costoPilotajeXBulto || '');
            setCantidadBultosTotalInput(selectedTanda.parametros.cantidadBultosTOTAL || '');
            setCantidadBultosAPagarInput(selectedTanda.parametros.cantidadBultosAPagar || '');
        }
    }, [selectedTanda]);

    // Redirect if no Tanda selected
    if (!selectedTanda) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                <div className="text-center p-12 bg-[#1a1a1a] rounded-2xl border border-gray-800">
                    <p className="text-gray-400 mb-4">No se encontró la tanda seleccionada</p>
                    <button
                        onClick={() => navigate('/admin/mi-mercaderia')}
                        className="px-6 py-3 bg-[#49EBBD] hover:bg-[#3ddeb1] text-black font-bold rounded-xl transition-colors"
                    >
                        Volver a Mi Mercadería
                    </button>
                </div>
            </div>
        );
    }

    // --- Porcentajes de Marca Handlers ---
    const handleAddPorcentaje = () => {
        const porcentaje = parseFloat(porcentajeInput.porcentaje);
        if (!porcentaje || isNaN(porcentaje) || !porcentajeInput.descripcion.trim()) return;

        const newPorcentaje = {
            id: Date.now(),
            porcentaje: porcentaje,
            descripcion: porcentajeInput.descripcion.trim()
        };

        const updatedPorcentajes = [...(selectedTanda.parametros.porcentajesMarcas || []), newPorcentaje];
        updateTandaParametros(selectedTanda.id, { porcentajesMarcas: updatedPorcentajes });

        setPorcentajeInput({ porcentaje: '', descripcion: '' });
    };

    const handleDeletePorcentaje = (id) => {
        const updatedPorcentajes = selectedTanda.parametros.porcentajesMarcas.filter(p => p.id !== id);
        updateTandaParametros(selectedTanda.id, { porcentajesMarcas: updatedPorcentajes });
    };

    // --- Other Parameters Handlers ---
    const handleUpdateGastosViaje = () => {
        const valor = parseFloat(gastosViajeInput);
        if (isNaN(valor)) return;
        updateTandaParametros(selectedTanda.id, { gastosViaje: valor });
    };

    const handleUpdateCostoPilotaje = () => {
        const valor = parseFloat(costoPilotajeInput);
        if (isNaN(valor)) return;
        updateTandaParametros(selectedTanda.id, { costoPilotajeXBulto: valor });
    };

    const handleUpdateBultosTOTAL = () => {
        const valor = parseFloat(cantidadBultosTotalInput);
        if (isNaN(valor)) return;
        updateTandaParametros(selectedTanda.id, { cantidadBultosTOTAL: valor });
    };

    const handleUpdateBultosAPagar = () => {
        const valor = parseFloat(cantidadBultosAPagarInput);
        if (isNaN(valor)) return;
        updateTandaParametros(selectedTanda.id, { cantidadBultosAPagar: valor });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
                <div className="flex flex-col">
                    <button
                        onClick={() => navigate('/admin/mi-mercaderia')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver a Mi Mercadería
                    </button>
                    <div className="flex items-center gap-2 mt-2">
                        <h1 className="text-2xl font-bold text-[#49EBBD]">Parámetros: {selectedTanda.nombre}</h1>
                        <span className="text-gray-500 text-sm bg-black/20 px-2 py-1 rounded border border-gray-800">
                            Chile ➔ Bermejo
                        </span>
                    </div>
                </div>
                <div className="p-3 bg-[#49EBBD]/10 rounded-xl">
                    <Settings className="w-6 h-6 text-[#49EBBD]" />
                </div>
            </header>

            {/* Section 1: Porcentajes de Marca */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 bg-white/5 flex items-center gap-3">
                    <Percent className="w-5 h-5 text-[#49EBBD]" />
                    <h2 className="text-lg font-bold text-white">Porcentajes de Marca</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Porcentaje (%)</label>
                            <input
                                type="number"
                                value={porcentajeInput.porcentaje}
                                onChange={(e) => setPorcentajeInput({ ...porcentajeInput, porcentaje: e.target.value })}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Descripción</label>
                            <input
                                type="text"
                                value={porcentajeInput.descripcion}
                                onChange={(e) => setPorcentajeInput({ ...porcentajeInput, descripcion: e.target.value })}
                                placeholder="Ej: Nike, Adidas..."
                                className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-[#49EBBD] outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddPorcentaje}
                            className="bg-[#49EBBD] hover:bg-[#3ddeb1] text-black font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors h-[42px]"
                        >
                            <Plus className="w-4 h-4" /> Agregar
                        </button>
                    </div>

                    {/* List of Porcentajes */}
                    {selectedTanda.parametros.porcentajesMarcas?.length > 0 && (
                        <div className="bg-black/20 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-gray-500 bg-white/5">
                                    <tr>
                                        <th className="px-4 py-3">Descripción</th>
                                        <th className="px-4 py-3 text-right text-[#49EBBD]">Porcentaje</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {selectedTanda.parametros.porcentajesMarcas.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/5">
                                            <td className="px-4 py-2 text-white font-medium">{item.descripcion}</td>
                                            <td className="px-4 py-2 text-[#49EBBD] text-right font-bold">{item.porcentaje}%</td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick={() => handleDeletePorcentaje(item.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Gastos del Viaje */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 bg-white/5 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-[#49EBBD]" />
                    <h2 className="text-lg font-bold text-white">Gastos del Viaje (Total en ARG)</h2>
                </div>
                <div className="p-6">
                    <div className="flex gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm text-gray-400">Monto Total ($ARG)</label>
                            <input
                                type="number"
                                value={gastosViajeInput}
                                onChange={(e) => setGastosViajeInput(e.target.value)}
                                onBlur={handleUpdateGastosViaje}
                                placeholder="0.00"
                                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#49EBBD] outline-none"
                            />
                        </div>
                        <div className="flex flex-col justify-center items-center p-4 bg-gradient-to-br from-black/40 to-[#49EBBD]/10 rounded-xl border border-[#49EBBD]/20 min-w-[200px]">
                            <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Valor Actual</span>
                            <span className="text-2xl font-bold text-white">${selectedTanda.parametros.gastosViaje?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Pilotaje */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 bg-white/5 flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-[#49EBBD]" />
                    <h2 className="text-lg font-bold text-white">Pilotaje</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Costo por Bulto (USD)</label>
                            <input
                                type="number"
                                value={costoPilotajeInput}
                                onChange={(e) => setCostoPilotajeInput(e.target.value)}
                                onBlur={handleUpdateCostoPilotaje}
                                placeholder="0.00"
                                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                Actual: ${selectedTanda.parametros.costoPilotajeXBulto?.toFixed(2) || '0.00'} USD
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Cantidad de Bultos TOTAL</label>
                            <input
                                type="number"
                                value={cantidadBultosTotalInput}
                                onChange={(e) => setCantidadBultosTotalInput(e.target.value)}
                                onBlur={handleUpdateBultosTOTAL}
                                placeholder="0"
                                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                Actual: {selectedTanda.parametros.cantidadBultosTOTAL || 0}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Cantidad de Bultos a PAGAR</label>
                            <input
                                type="number"
                                value={cantidadBultosAPagarInput}
                                onChange={(e) => setCantidadBultosAPagarInput(e.target.value)}
                                onBlur={handleUpdateBultosAPagar}
                                placeholder="0"
                                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                Actual: {selectedTanda.parametros.cantidadBultosAPagar || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
