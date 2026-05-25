import React, { useState, useMemo } from 'react';
import { useMercanciaUser } from '../../context/MiMercaderiaContext';
import { FileText, Calendar, ChevronDown, ChevronUp, Package, DollarSign, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Resumen() {
    const { tandasBoletas, boletas, mercanciaUser } = useMercanciaUser();
    const [expandedTandaId, setExpandedTandaId] = useState(null);

    // Get all boletas claimed by the current user
    const myBoletas = useMemo(() => {
        return boletas.filter(b => b.propietarioId === mercanciaUser?.id);
    }, [boletas, mercanciaUser]);

    // Group boletas by Tanda
    const tandasWithBoletas = useMemo(() => {
        const tandaGroups = {};
        myBoletas.forEach(b => {
            if (!tandaGroups[b.tandaId]) {
                const tanda = tandasBoletas.find(t => t.id === b.tandaId);
                if (tanda) {
                    tandaGroups[b.tandaId] = {
                        ...tanda,
                        boletas: []
                    };
                }
            }
            if (tandaGroups[b.tandaId]) {
                tandaGroups[b.tandaId].boletas.push(b);
            }
        });
        return Object.values(tandaGroups).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [myBoletas, tandasBoletas]);

    const toggleTanda = (tandaId) => {
        setExpandedTandaId(expandedTandaId === tandaId ? null : tandaId);
    };

    if (tandasWithBoletas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
                <FileText className="w-16 h-16 text-gray-700" />
                <h2 className="text-xl font-bold text-white">No tienes boletas cargadas</h2>
                <p className="text-gray-400 max-w-md">
                    Ve a la sección de Cargar Boletas para seleccionar las marcas y boletas que te corresponden.
                </p>
                <Link
                    to="/user/cargar-boletas"
                    className="px-6 py-3 bg-[#49EBBD] text-black font-bold rounded-xl hover:bg-[#3ddeb1] transition-colors"
                >
                    Cargar Boletas
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-[#49EBBD]">Resumen de Boletas</h1>
                <p className="text-gray-400 mt-2">Detalle de todas las boletas que has seleccionado.</p>
            </header>

            <div className="space-y-4">
                {tandasWithBoletas.map(tanda => (
                    <div key={tanda.id} className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
                        <button
                            onClick={() => toggleTanda(tanda.id)}
                            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#49EBBD]/10 rounded-xl text-[#49EBBD]">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{tanda.nombre}</h3>
                                    <p className="text-sm text-gray-400 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(tanda.fecha).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-400 bg-black/40 px-3 py-1 rounded-lg border border-gray-700">
                                    {tanda.boletas.length} boletas
                                </span>
                                {expandedTandaId === tanda.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                            </div>
                        </button>

                        {expandedTandaId === tanda.id && (
                            <div className="border-t border-gray-800 bg-black/20 p-6 space-y-6 animate-in slide-in-from-top-2">
                                {tanda.boletas.map(boleta => (
                                    <div key={boleta.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                                        {/* Boleta Header */}
                                        <div className="p-4 bg-white/5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mb-1">
                                                    <span className="bg-black/40 px-2 py-0.5 rounded border border-gray-800">{boleta.code}</span>
                                                    <span>{new Date(boleta.date).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="text-white font-bold text-lg">{boleta.houseName}</h4>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-[#49EBBD] flex items-center justify-end gap-1">
                                                    <DollarSign className="w-5 h-5" />
                                                    {boleta.total?.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items Table - Simplified for User View */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-400">
                                                <thead className="bg-black/40 text-xs uppercase font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Código</th>
                                                        <th className="px-4 py-3 text-center">Bultos</th>
                                                        <th className="px-4 py-3 text-center">Docenas</th>
                                                        <th className="px-4 py-3 text-right">$/Doc</th>
                                                        <th className="px-4 py-3 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {boleta.items?.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 font-mono text-white">{item.codigo}</td>
                                                            <td className="px-4 py-3 text-center">{item.bultos}</td>
                                                            <td className="px-4 py-3 text-center">{item.docenas}</td>
                                                            <td className="px-4 py-3 text-right">${item.precioDocena}</td>
                                                            <td className="px-4 py-3 text-right text-gray-200 font-medium">${item.precioTotal}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Footer Summaries */}
                                        <div className="p-4 bg-black/40 border-t border-gray-800 flex justify-between items-center">
                                            <div className="text-xs text-gray-500">
                                                * {boleta.customBundles ? 'Bultos personalizados aplicados' : 'Cálculo estándar de bultos'}
                                            </div>
                                            <div className="flex gap-4 text-sm font-medium text-gray-300">
                                                <span className="flex items-center gap-1">
                                                    <Package className="w-4 h-4 text-gray-500" />
                                                    {boleta.customBundles && parseFloat(boleta.customBundles) > 0
                                                        ? boleta.customBundles
                                                        : boleta.items.reduce((acc, curr) => acc + (parseFloat(curr.bultos) || 0), 0)
                                                    } Bultos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
