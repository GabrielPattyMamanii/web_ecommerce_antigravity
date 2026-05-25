import React, { useState } from 'react';
import { useMercanciaUser } from '../../../context/MiMercaderiaContext';
import { BoletaForm } from '../../../components/mercancia/BoletaForm';
import { FileText, Calendar, DollarSign, Search, FolderOpen, ArrowRight, Layers, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export function ResumenBoletas() {
    const { boletas, updateBoleta, tandasBoletas, toggleBoletaEstado } = useMercanciaUser();

    // View State: 'tandas' | 'details'
    const [view, setView] = useState('tandas');
    const [selectedTandaId, setSelectedTandaId] = useState(null);
    const [selectedBoleta, setSelectedBoleta] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Derived Data ---
    const getTandaStats = (tandaId) => {
        const tandaBoletas = boletas.filter(b => b.tandaId === tandaId);
        const total = tandaBoletas.reduce((sum, b) => sum + (b.total || 0), 0);
        return { count: tandaBoletas.length, total };
    };

    const handleSelectTanda = (tandaId) => {
        setSelectedTandaId(tandaId);
        setView('details');
        setSearchTerm('');
    };

    const handleBackToTandas = () => {
        setSelectedTandaId(null);
        setView('tandas');
    };

    // --- Filtered Data for Details View ---
    const filteredBoletas = selectedTandaId
        ? boletas.filter(boleta => {
            const matchesTanda = boleta.tandaId === selectedTandaId;
            const matchesSearch = boleta.houseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                boleta.code.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesTanda && matchesSearch;
        })
        : [];

    const currentTanda = tandasBoletas.find(t => t.id === selectedTandaId);
    const totalGastadoTanda = filteredBoletas.reduce((sum, b) => sum + (b.total || 0), 0);


    // --- View: Single Boleta Details (Read Only) ---
    if (selectedBoleta) {
        return (
            <BoletaForm
                boleta={selectedBoleta}
                onCancel={() => setSelectedBoleta(null)}
                readOnly={true}
            />
        );
    }

    // --- View: Tandas List (Cards) ---
    if (view === 'tandas') {
        const totalGlobal = boletas.reduce((sum, b) => sum + (b.total || 0), 0);

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <header>
                    <h1 className="text-3xl font-bold text-[#49EBBD]">Resumen de Boletas</h1>
                    <p className="text-gray-400 mt-2">Selecciona una tanda para ver el detalle de gastos</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Global Stat Card */}
                    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 lg:col-span-4 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Gasto Total Histórico</p>
                            <h3 className="text-3xl font-bold text-white mb-0">${totalGlobal.toFixed(2)}</h3>
                        </div>
                        <div className="p-4 bg-[#49EBBD]/10 rounded-full">
                            <DollarSign className="w-8 h-8 text-[#49EBBD]" />
                        </div>
                    </div>

                    {/* Tanda Cards */}
                    {tandasBoletas.map(tanda => {
                        const stats = getTandaStats(tanda.id);
                        return (
                            <button
                                key={tanda.id}
                                onClick={() => handleSelectTanda(tanda.id)}
                                className="text-left bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-[#49EBBD]/50 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-[#49EBBD]/10"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                                        <Layers className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <span className="text-xs font-mono text-gray-500 bg-black/40 px-2 py-1 rounded-md border border-gray-800 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(tanda.fecha).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#49EBBD] transition-colors truncate">
                                    {tanda.nombre}
                                </h3>

                                <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Boletas</span>
                                        <span className="text-white font-medium">{stats.count}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total</span>
                                        <span className="text-[#49EBBD] font-bold">${stats.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {tandasBoletas.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-800">
                            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No hay tandas registradas.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- View: Boleta Details for Selected Tanda ---
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
                        {currentTanda?.nombre}
                    </h1>
                    <p className="text-gray-400 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(currentTanda?.fecha || Date.now()).toLocaleDateString()}
                    </p>
                </div>
                <div className="bg-[#1a1a1a] px-6 py-3 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-xs uppercase tracking-wider block">Total Tanda</span>
                    <span className="text-2xl font-bold text-[#49EBBD]">${totalGastadoTanda.toFixed(2)}</span>
                </div>
            </header>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar boleta en esta tanda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-[#49EBBD] outline-none transition-colors"
                />
            </div>

            {/* Boletas List (Table View) */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-gray-400 text-sm uppercase tracking-wider border-b border-gray-800">
                                <th className="p-4">Código</th>
                                <th className="p-4">Casa</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4 text-center">Foto</th>
                                <th className="p-4 text-center">Items</th>
                                <th className="p-4 text-center">Bultos</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredBoletas.map((boleta) => (
                                <tr
                                    key={boleta.id}
                                    onClick={() => setSelectedBoleta(boleta)}
                                    className="hover:bg-white/5 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 font-mono text-sm text-gray-500 group-hover:text-[#49EBBD]">
                                        {boleta.code}
                                    </td>
                                    <td className="p-4 font-medium text-white">
                                        {boleta.houseName}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {new Date(boleta.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        {boleta.imageUrl ? (
                                            <div className="flex justify-center">
                                                <img
                                                    src={boleta.imageUrl}
                                                    alt="Thumbnail"
                                                    className="w-10 h-10 object-cover rounded-lg border border-gray-700 shadow-sm"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex justify-center">
                                                <div className="w-10 h-10 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-center text-gray-600">
                                                    <ImageIcon className="w-4 h-4 opacity-30" />
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center text-gray-500">
                                        {boleta.items?.length || 0}
                                    </td>
                                    <td className="p-4 text-center">
                                        {(() => {
                                            const customBundles = boleta.customBundles && parseFloat(boleta.customBundles) > 0
                                                ? parseFloat(boleta.customBundles)
                                                : null;
                                            const sumBultos = boleta.items?.reduce((sum, item) => sum + (parseFloat(item.bultos) || 0), 0) || 0;

                                            if (customBundles !== null) {
                                                return (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="font-bold text-pink-400 text-sm">{customBundles}</span>
                                                    </div>
                                                );
                                            } else if (sumBultos > 0) {
                                                return <span className="font-bold text-blue-400">{sumBultos}</span>;
                                            } else {
                                                return <span className="text-xs text-gray-600 italic">sin bultos</span>;
                                            }
                                        })()}
                                    </td>
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => toggleBoletaEstado(boleta.id)}
                                            className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${boleta.estado ? 'bg-[#49EBBD]' : 'bg-gray-700'}`}
                                            title={boleta.estado ? 'Incluida en cálculo' : 'No incluida'}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${boleta.estado ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </td>
                                    <td className="p-4 text-right font-bold text-[#49EBBD]">
                                        ${(boleta.total || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {filteredBoletas.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        No se encontraron boletas en esta tanda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
