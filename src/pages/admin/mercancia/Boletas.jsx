import React, { useState } from 'react';
import { useMercanciaUser } from '../../../context/MiMercaderiaContext';
import { BoletaForm } from '../../../components/mercancia/BoletaForm';
import { TandaBoletasList } from './TandaBoletasList';
import { Plus, FileText, Calendar, DollarSign, ArrowLeft, Users } from 'lucide-react';

export function Boletas() {
    const { boletas, addBoleta, updateBoleta, deleteBoleta, tandasBoletas, addTandaBoleta, deleteTandaBoleta } = useMercanciaUser();

    // View State: 'tandas' | 'list' | 'form'
    const [view, setView] = useState('tandas');
    const [selectedTanda, setSelectedTanda] = useState(null);
    const [selectedBoleta, setSelectedBoleta] = useState(null);

    // --- Tanda Handlers ---
    const handleSelectTanda = (tanda) => {
        setSelectedTanda(tanda);
        setView('list');
    };

    const handleCreateTanda = (newTanda) => {
        addTandaBoleta(newTanda);
    };

    const handleDeleteTanda = (tandaId) => {
        deleteTandaBoleta(tandaId);
        // Optional: Delete associated boletas? For now keeping it simple as per context logic
    };

    const handleBackToTandas = () => {
        setSelectedTanda(null);
        setView('tandas');
    };

    // --- Boleta Handlers ---
    const handleNewBoleta = () => {
        setSelectedBoleta(null);
        setView('form');
    };

    const handleEditBoleta = (boleta) => {
        setSelectedBoleta(boleta);
        setView('form');
    };

    const handleSaveBoleta = async (savedBoleta) => {
        try {
            const boletaWithTanda = { ...savedBoleta, tandaId: selectedTanda.id };

            if (selectedBoleta) {
                await updateBoleta(boletaWithTanda);
            } else {
                await addBoleta(boletaWithTanda);
            }
            setView('list');
        } catch (error) {
            console.error('Error saving boleta:', error);
            alert('Error al guardar la boleta: ' + (error.message || 'Error desconocido'));
        }
    };

    const handleDeleteBoleta = (boletaToDelete) => {
        if (window.confirm('¿Estás seguro de eliminar esta boleta?')) {
            deleteBoleta(boletaToDelete.id);
            if (view === 'form') setView('list');
        }
    };

    // --- Filters ---
    const filteredBoletas = selectedTanda
        ? boletas.filter(b => b.tandaId === selectedTanda.id)
        : [];

    // --- Renders ---

    if (view === 'tandas') {
        return (
            <TandaBoletasList
                tandas={tandasBoletas}
                onSelectTanda={handleSelectTanda}
                onCreateTanda={handleCreateTanda}
                onDeleteTanda={handleDeleteTanda}
            />
        );
    }

    if (view === 'form') {
        return (
            <BoletaForm
                boleta={selectedBoleta}
                tandaId={selectedTanda?.id}
                onSave={handleSaveBoleta}
                onCancel={() => setView('list')}
                onDelete={selectedBoleta ? handleDeleteBoleta : null}
            />
        );
    }

    // --- Boleta List View ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <button
                        onClick={handleBackToTandas}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver a Tandas
                    </button>
                    <h1 className="text-3xl font-bold text-[#49EBBD]">
                        {selectedTanda?.nombre}
                    </h1>
                    <p className="text-gray-400 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedTanda?.fecha).toLocaleDateString()}
                    </p>
                </div>
                <button
                    onClick={handleNewBoleta}
                    className="flex items-center gap-2 px-4 py-2 bg-[#49EBBD] text-black font-bold rounded-lg hover:bg-[#3ddeb1] transition-colors shadow-lg shadow-[#49EBBD]/20"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Boleta
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBoletas.map((boleta) => (
                    <button
                        key={boleta.id}
                        onClick={() => handleEditBoleta(boleta)}
                        className="text-left bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-[#49EBBD]/50 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-[#49EBBD]/10 w-full"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-[#49EBBD]/10 rounded-xl group-hover:bg-[#49EBBD]/20 transition-colors">
                                <FileText className="w-6 h-6 text-[#49EBBD]" />
                            </div>
                            <span className="text-xs font-mono text-gray-500 bg-black/40 px-2 py-1 rounded-md border border-gray-800">
                                {boleta.code}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1 truncate w-full">{boleta.houseName}</h3>

                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                            <Calendar className="w-4 h-4" />
                            {new Date(boleta.date).toLocaleDateString()}
                        </div>

                        <div className="pt-4 border-t border-gray-800 space-y-2">
                            {/* Unique owners chips */}
                            {(() => {
                                const owners = [...new Set(
                                    (boleta.items || [])
                                        .map(i => i.propietario?.trim())
                                        .filter(Boolean)
                                )];
                                if (owners.length > 1) {
                                    return (
                                        <div className="flex items-center gap-1 flex-wrap mb-1">
                                            <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                            {owners.slice(0, 3).map(o => (
                                                <span key={o} className="text-xs bg-white/5 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full truncate max-w-[80px]">{o}</span>
                                            ))}
                                            {owners.length > 3 && (
                                                <span className="text-xs text-gray-500">+{owners.length - 3}</span>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-500 text-sm">{boleta.items?.length || 0} items</span>
                                <div className="flex items-center gap-1 text-[#49EBBD] font-bold text-lg">
                                    <DollarSign className="w-5 h-5" />
                                    {typeof boleta.total === 'number' ? boleta.total.toFixed(2) : '0.00'}
                                </div>
                            </div>
                            {/* Bultos Display */}
                            {(() => {
                                const customBundles = boleta.customBundles && parseFloat(boleta.customBundles) > 0
                                    ? parseFloat(boleta.customBundles)
                                    : null;
                                const sumBultos = boleta.items?.reduce((sum, item) => sum + (parseFloat(item.bultos) || 0), 0) || 0;

                                if (customBundles !== null) {
                                    return (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-pink-400 font-medium">bultos</span>
                                            <span className="text-sm font-bold text-pink-400">{customBundles}</span>
                                        </div>
                                    );
                                } else if (sumBultos > 0) {
                                    return (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-blue-400 font-medium">bultos</span>
                                            <span className="text-sm font-bold text-blue-400">{sumBultos}</span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="flex justify-end">
                                            <span className="text-xs text-gray-600 italic">sin bultos agregados</span>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </button>
                ))}

                {/* Empty State Action */}
                <button
                    onClick={handleNewBoleta}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-800 hover:border-[#49EBBD] hover:bg-[#49EBBD]/5 transition-all group min-h-[200px]"
                >
                    <div className="p-4 bg-gray-800 rounded-full mb-4 group-hover:bg-[#49EBBD]/20 transition-colors">
                        <Plus className="w-8 h-8 text-gray-400 group-hover:text-[#49EBBD]" />
                    </div>
                    <span className="text-gray-400 font-medium group-hover:text-[#49EBBD]">Crear Nueva Boleta</span>
                </button>
            </div>
        </div>
    );
}
