import React, { useState, useMemo } from 'react';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';
import { FileText, Calendar, Check, X, FolderOpen, Package, DollarSign } from 'lucide-react';

export function CargarBoletas() {
    const { tandasBoletas, boletas, mercanciaUser, claimBoleta, unclaimBoleta } = useMercanciaUser();

    const [selectedTandaId, setSelectedTandaId] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);

    // Filter boletas by Tanda
    const tandaBoletas = useMemo(() => {
        return selectedTandaId ? boletas.filter(b => b.tandaId === selectedTandaId) : [];
    }, [selectedTandaId, boletas]);

    // Extract unique brands from the filtered boletas
    const availableBrands = useMemo(() => {
        const brands = new Set(tandaBoletas.map(b => b.houseName || 'Sin Marca'));
        return Array.from(brands).sort();
    }, [tandaBoletas]);

    // Filter by Brand
    const filteredBoletas = useMemo(() => {
        return selectedBrand
            ? tandaBoletas.filter(b => (b.houseName || 'Sin Marca') === selectedBrand)
            : [];
    }, [selectedBrand, tandaBoletas]);

    const handleTandaChange = (e) => {
        setSelectedTandaId(parseInt(e.target.value));
        setSelectedBrand(null);
    };

    const handleToggleClaim = (boleta) => {
        const isClaimedByMe = boleta.propietarioId === mercanciaUser?.id;

        if (isClaimedByMe) {
            if (window.confirm('¿Deseas deseleccionar esta boleta?')) {
                unclaimBoleta(boleta.id);
            }
        } else {
            if (boleta.propietarioId) {
                alert('Esta boleta ya ha sido seleccionada por otro usuario.');
                return;
            }
            claimBoleta(boleta.id, mercanciaUser.id);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-[#49EBBD]">Cargar Boletas</h1>
                <p className="text-gray-400 mt-2">Selecciona tu tanda y marca para registrar tus boletas.</p>
            </header>

            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 space-y-6">
                {/* Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Seleccionar Tanda</label>
                        <div className="relative">
                            <select
                                onChange={handleTandaChange}
                                value={selectedTandaId || ''}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none appearance-none"
                            >
                                <option value="">-- Elegir Tanda --</option>
                                {tandasBoletas.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre} ({new Date(t.fecha).toLocaleDateString()})</option>
                                ))}
                            </select>
                            <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Seleccionar Marca</label>
                        <div className="relative">
                            <select
                                onChange={(e) => setSelectedBrand(e.target.value)}
                                value={selectedBrand || ''}
                                disabled={!selectedTandaId}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none appearance-none disabled:opacity-50"
                            >
                                <option value="">-- Elegir Marca --</option>
                                {availableBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                            <FolderOpen className="absolute right-4 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Boletas List */}
                {selectedBrand && (
                    <div className="mt-8 space-y-4">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-[#49EBBD]" />
                            Boletas de {selectedBrand}
                        </h3>

                        {filteredBoletas.length === 0 ? (
                            <p className="text-gray-500">No hay boletas disponibles para esta marca.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredBoletas.map(boleta => {
                                    const isClaimedByMe = boleta.propietarioId === mercanciaUser?.id;
                                    const isClaimedByOther = boleta.propietarioId && !isClaimedByMe;

                                    // Calculate display values
                                    const bultos = boleta.customBundles && parseFloat(boleta.customBundles) > 0
                                        ? parseFloat(boleta.customBundles)
                                        : boleta.items.reduce((s, i) => s + (parseFloat(i.bultos) || 0), 0);

                                    return (
                                        <div
                                            key={boleta.id}
                                            className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${isClaimedByMe
                                                    ? 'bg-[#49EBBD]/5 border-[#49EBBD] shadow-[0_0_15px_-3px_rgba(73,235,189,0.2)]'
                                                    : isClaimedByOther
                                                        ? 'bg-red-900/10 border-red-900/30 opacity-60' // Disabled look
                                                        : 'bg-black/20 border-gray-800 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 flex-1 w-full">
                                                <div className={`p-3 rounded-lg ${isClaimedByMe ? 'bg-[#49EBBD]/20 text-[#49EBBD]' : 'bg-gray-800 text-gray-400'}`}>
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs bg-black/40 px-2 py-0.5 rounded text-gray-400">{boleta.code}</span>
                                                        {isClaimedByOther && <span className="text-[10px] text-red-400 uppercase font-bold">Ocupado</span>}
                                                    </div>
                                                    <h4 className="text-white font-bold">{boleta.houseName}</h4>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {bultos} Bultos</span>
                                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${boleta.total?.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                                {/* Switch Logic */}
                                                <label className="flex items-center cursor-pointer relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isClaimedByMe}
                                                        disabled={isClaimedByOther}
                                                        onChange={() => handleToggleClaim(boleta)}
                                                    />
                                                    <div className={`w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${isClaimedByMe ? 'peer-checked:bg-[#49EBBD]' : ''
                                                        } ${isClaimedByOther ? 'cursor-not-allowed opacity-50' : ''}`}></div>
                                                    <span className="ml-3 text-sm font-medium text-gray-300 min-w-[3rem]">
                                                        {isClaimedByMe ? 'SI' : 'NO'}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
