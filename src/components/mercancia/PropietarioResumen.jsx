import React, { useMemo } from 'react';
import { Users, Package, DollarSign, Hash } from 'lucide-react';

/**
 * PropietarioResumen
 * Muestra un resumen de totales agrupados por propietario (dueño de cada item).
 * Si un item no tiene propietario asignado, usa el propietario global de la boleta (houseName).
 */
export function PropietarioResumen({ items = [], globalOwner = '', show = true }) {
    const resumen = useMemo(() => {
        if (!items || items.length === 0) return [];

        const map = {};

        items.forEach(item => {
            const owner = (item.propietario && item.propietario.trim() !== '')
                ? item.propietario.trim()
                : (globalOwner && globalOwner.trim() !== '' ? globalOwner.trim() : 'Sin asignar');

            if (!map[owner]) {
                map[owner] = { nombre: owner, items: 0, bultos: 0, cantidad: 0, total: 0 };
            }

            const bultos = parseFloat(item.bultos) || 0;
            const cantidad = parseFloat(item.cantidad) || 0;
            const precioDocena = parseFloat(item.precioDocena) || 0;
            const rowTotal = precioDocena * cantidad;

            map[owner].items += 1;
            map[owner].bultos += bultos;
            map[owner].cantidad += cantidad;
            map[owner].total += rowTotal;
        });

        // Sort: owners with explicit names first, "Sin asignar" last
        return Object.values(map).sort((a, b) => {
            if (a.nombre === 'Sin asignar') return 1;
            if (b.nombre === 'Sin asignar') return -1;
            return a.nombre.localeCompare(b.nombre);
        });
    }, [items, globalOwner]);

    if (!show || resumen.length === 0) return null;

    // Color palette per index, cycles if more than 6 owners
    const colors = [
        { bg: 'bg-[#49EBBD]/10', border: 'border-[#49EBBD]/30', text: 'text-[#49EBBD]', badge: 'bg-[#49EBBD]/20' },
        { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500/20' },
        { bg: 'bg-amber-400/10', border: 'border-amber-400/30', text: 'text-amber-400', badge: 'bg-amber-400/20' },
        { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', badge: 'bg-pink-500/20' },
        { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20' },
        { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20' },
    ];

    const grandTotal = resumen.reduce((sum, p) => sum + p.total, 0);

    return (
        <div className="mt-6 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
                <div className="p-2 bg-[#49EBBD]/10 rounded-lg">
                    <Users className="w-5 h-5 text-[#49EBBD]" />
                </div>
                <h3 className="text-base font-bold text-white">Resumen por Propietario</h3>
                <span className="ml-auto text-xs text-gray-500 font-mono">{resumen.length} propietario{resumen.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {resumen.map((prop, idx) => {
                    const color = colors[idx % colors.length];
                    const pct = grandTotal > 0 ? ((prop.total / grandTotal) * 100).toFixed(1) : 0;
                    return (
                        <div
                            key={prop.nombre}
                            className={`p-4 rounded-xl border ${color.bg} ${color.border} space-y-3`}
                        >
                            {/* Owner name + percentage */}
                            <div className="flex justify-between items-center">
                                <span className={`font-bold text-sm ${color.text} truncate max-w-[60%]`}>
                                    {prop.nombre}
                                </span>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${color.badge} ${color.text}`}>
                                    {pct}%
                                </span>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                                        <Hash className="w-3 h-3" />
                                        <span>Items</span>
                                    </div>
                                    <span className="text-white font-bold text-sm">{prop.items}</span>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                                        <Package className="w-3 h-3" />
                                        <span>Bultos</span>
                                    </div>
                                    <span className="text-white font-bold text-sm">{prop.bultos}</span>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                                        <DollarSign className="w-3 h-3" />
                                        <span>Total</span>
                                    </div>
                                    <span className={`font-bold text-sm ${color.text}`}>
                                        ${prop.total.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${color.text.replace('text-', 'bg-')}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
