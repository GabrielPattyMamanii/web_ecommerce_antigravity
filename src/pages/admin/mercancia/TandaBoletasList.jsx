import React, { useState } from 'react';
import { Plus, Calendar, FolderOpen, ArrowRight, Trash2 } from 'lucide-react';

export function TandaBoletasList({ tandas, onSelectTanda, onCreateTanda, onDeleteTanda }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newTanda, setNewTanda] = useState({
        nombre: '',
        fecha: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newTanda.nombre.trim()) return;
        onCreateTanda(newTanda);
        setNewTanda({ nombre: '', fecha: new Date().toISOString().split('T')[0] });
        setIsCreating(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#49EBBD]">Tandas de Boletas</h1>
                    <p className="text-gray-400 mt-2">Selecciona una tanda para ver sus boletas</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#49EBBD] text-black font-bold rounded-lg hover:bg-[#3ddeb1] transition-colors shadow-lg shadow-[#49EBBD]/20"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Tanda
                </button>
            </header>

            {isCreating && (
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 animate-in slide-in-from-top-4">
                    <h3 className="text-xl font-bold text-white mb-4">Crear Nueva Tanda</h3>
                    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-sm font-medium text-gray-400">Nombre de la Tanda</label>
                            <input
                                type="text"
                                value={newTanda.nombre}
                                onChange={(e) => setNewTanda({ ...newTanda, nombre: e.target.value })}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                                placeholder="Ej: Verano 2024"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Fecha</label>
                            <input
                                type="date"
                                value={newTanda.fecha}
                                onChange={(e) => setNewTanda({ ...newTanda, fecha: e.target.value })}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-[#49EBBD] text-black font-bold rounded-xl hover:bg-[#3ddeb1] transition-colors"
                            >
                                Crear
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tandas.map((tanda) => (
                    <div
                        key={tanda.id}
                        className="group relative bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-[#49EBBD]/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#49EBBD]/10"
                    >
                        <div
                            onClick={() => onSelectTanda(tanda)}
                            className="cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-[#49EBBD]/10 rounded-xl group-hover:bg-[#49EBBD]/20 transition-colors">
                                    <FolderOpen className="w-6 h-6 text-[#49EBBD]" />
                                </div>
                                <span className="text-xs font-mono text-gray-500 bg-black/40 px-2 py-1 rounded-md border border-gray-800 flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(tanda.fecha).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#49EBBD] transition-colors">{tanda.nombre}</h3>

                            <div className="flex items-center gap-2 text-gray-400 text-sm mt-4 group-hover:translate-x-1 transition-transform">
                                <span>Ver Boletas</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>

                        {onDeleteTanda && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('¿Estás seguro de eliminar esta tanda y sus referencias?')) {
                                        onDeleteTanda(tanda.id);
                                    }
                                }}
                                className="absolute top-4 right-4 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg"
                                title="Eliminar Tanda"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}

                {tandas.length === 0 && !isCreating && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-800">
                        <FolderOpen className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No hay tandas creadas</h3>
                        <p className="text-gray-400 mb-6">Crea una nueva tanda para comenzar a agregar boletas.</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="px-6 py-3 bg-[#49EBBD]/10 text-[#49EBBD] font-bold rounded-xl hover:bg-[#49EBBD]/20 transition-colors"
                        >
                            Crear Primera Tanda
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
