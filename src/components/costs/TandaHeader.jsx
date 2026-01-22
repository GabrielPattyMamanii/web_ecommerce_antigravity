import React from 'react';
import { Calendar, Package } from 'lucide-react';

export function TandaHeader({ tanda, dollarRate, setDollarRate, localExpense, setLocalExpense, estimatedTotal }) {
    if (!tanda) return null;

    const formattedDate = new Date(tanda.fecha).toLocaleDateString();

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                {/* Tanda Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-black text-white rounded-lg">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{tanda.nombre}</h2>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" /> {formattedDate}
                                </span>
                                <span>•</span>
                                <span>{tanda.totalDocenas} docenas en total</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inputs & Total */}
                <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">

                    {/* Cotización del Dólar */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            Cotización del dólar
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <input
                                type="number"
                                value={dollarRate || ''}
                                onChange={(e) => setDollarRate(e.target.value)}
                                placeholder="0.00"
                                className="w-full md:w-32 pl-7 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 font-mono"
                            />
                        </div>
                    </div>

                    {/* Ingresar Gasto */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            Ingresar gasto
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <input
                                type="number"
                                value={localExpense || ''}
                                onChange={(e) => setLocalExpense(e.target.value)}
                                placeholder="0.00"
                                className="w-full md:w-32 pl-7 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 font-mono"
                            />
                        </div>
                    </div>

                    {/* Valor Total Estimado */}
                    <div className="bg-green-50 px-6 py-2 rounded-lg border border-green-100 min-w-[160px] text-right">
                        <label className="block text-xs font-semibold text-green-700 uppercase mb-1">
                            Valor Total Estimado
                        </label>
                        <div className="text-2xl font-bold text-green-700">
                            ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-green-600">
                            {tanda.totalProductos} productos
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
