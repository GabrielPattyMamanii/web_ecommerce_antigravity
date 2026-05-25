import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Package } from 'lucide-react';

export function CargaBoletas() {
    const navigate = useNavigate();
    const [tandas, setTandas] = useState([]);
    const [selectedTanda, setSelectedTanda] = useState('');
    const [userBoletas, setUserBoletas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tandaParams, setTandaParams] = useState({}); // Store parameters for the selected Tanda
    const [currentTandaId, setCurrentTandaId] = useState(null);

    // User Context
    const userId = sessionStorage.getItem('app_user_id');
    const username = sessionStorage.getItem('app_username');
    const [userColor, setUserColor] = useState('#3b82f6'); // Default blue

    useEffect(() => {
        if (!userId) {
            navigate('/admin/usuarios');
            return;
        }
        fetchUserColor();
        fetchTandas();
    }, [userId, navigate]);

    const fetchUserColor = async () => {
        const { data } = await supabase.from('app_users').select('color').eq('id', userId).single();
        if (data && data.color) setUserColor(data.color);
    };

    // Fetch available tandas
    const fetchTandas = async () => {
        const { data } = await supabase.from('tandas').select('*').order('fecha', { ascending: false });
        if (data) setTandas(data);
    };

    // When Tanda is selected, fetch owned products
    useEffect(() => {
        if (selectedTanda) {
            fetchOwnedProducts();
        }
    }, [selectedTanda]);

    const fetchOwnedProducts = async () => {
        setLoading(true);
        try {
            // Fetch entries where owner matches current user
            const { data: entradas, error } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', selectedTanda)
                .eq('propietario', username);

            if (error) throw error;

            // Get Tanda Metadata for Custom Bultos
            const tandaObj = tandas.find(t => t.nombre === selectedTanda);
            if (tandaObj) {
                setCurrentTandaId(tandaObj.id);
                setTandaParams(tandaObj.parametros || {});
            }
            const marcasMetadata = tandaObj?.parametros?.marcasMetadata || {};

            // Group by marca_id
            const grouped = {};
            entradas.forEach(e => {
                const key = e.marca_id || `${e.marca}-${e.codigo_boleta || 'sn'}`;

                if (!grouped[key]) {
                    // Check for Custom Bultos in Metadata
                    // Prioritize metadata value matching the brand name (or ID if we matched by ID in saving)
                    // The saving logic uses ID or Name. Let's try both.
                    let customBultos = null;

                    // Try by ID first
                    if (e.marca_id && marcasMetadata[e.marca_id]) {
                        customBultos = marcasMetadata[e.marca_id].bultos_personalizados;
                    }
                    // Fallback to Name
                    if (!customBultos && marcasMetadata[e.marca]) {
                        customBultos = marcasMetadata[e.marca].bultos_personalizados;
                    }

                    grouped[key] = {
                        marca: e.marca,
                        codigo_boleta: e.codigo_boleta || 'S/N',
                        fecha: e.tanda_fecha,
                        marca_id: e.marca_id,
                        items: [],
                        totalBultosSum: 0,
                        customBultos: customBultos ? parseFloat(customBultos) : null,
                        totalMonto: 0,
                        key: key // KEY for identification in toggling
                    };
                }

                grouped[key].items.push(e);
                grouped[key].totalBultosSum += (parseFloat(e.bultos) || 0);

                const precio = parseFloat(e.precio_docena) || 0;
                const cantidad = parseFloat(e.cantidad_docenas) || 0;
                grouped[key].totalMonto += (precio * cantidad);
            });

            setUserBoletas(Object.values(grouped));

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate effective total bultos (Custom > Sum)
    const getEffectiveBultos = (boleta) => {
        if (boleta.customBultos !== null && boleta.customBultos !== undefined && boleta.customBultos > 0) {
            return boleta.customBultos;
        }
        return boleta.totalBultosSum;
    };

    const handleToggleCalculation = async (brandKey, isIncluded, boletaBultos) => {
        if (!currentTandaId || !userId) return;

        const currentParams = tandaParams || {};
        const currentMap = currentParams.CANT_BULTOS_PAGAR_ID || {}; // Structure: { userId: { brandKey: bultos } }
        const userMap = currentMap[userId] || {};

        // Update User Map
        const newUserMap = { ...userMap };
        if (isIncluded) {
            newUserMap[brandKey] = boletaBultos; // Store the bultos amount
        } else {
            delete newUserMap[brandKey]; // Remove if excluded
        }

        // Update Global Map
        const newGlobalMap = {
            ...currentMap,
            [userId]: newUserMap
        };

        // Recalculate Global Total (Sum of all bultos across all users)
        let newTotalAPagar = 0;
        Object.values(newGlobalMap).forEach(uMap => {
            if (uMap && typeof uMap === 'object') {
                Object.values(uMap).forEach(val => {
                    newTotalAPagar += (parseFloat(val) || 0);
                });
            }
        });

        const updatedParams = {
            ...currentParams,
            CANT_BULTOS_PAGAR_ID: newGlobalMap,
            cantidadBultosAPagar: newTotalAPagar
        };

        setTandaParams(updatedParams); // Optimistic UI update

        try {
            // Save to DB
            const { error } = await supabase
                .from('tandas')
                .update({ parametros: updatedParams })
                .eq('id', currentTandaId);

            if (error) throw error;

            console.log('Toggle saved:', { userId, brandKey, isIncluded, newTotalAPagar });

        } catch (err) {
            console.error('Error updating toggle:', err);
            setTandaParams(currentParams); // Revert
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
            <header
                className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm"
                style={{ borderTop: `4px solid ${userColor}` }}
            >
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Volver al Dashboard</span>
                </button>
                <div className="text-xl font-bold text-gray-800 dark:text-white">Mis Boletas</div>
                <div className="w-8"></div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Tanda Selector */}
                <div className="mb-8">
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Selecciona una Tanda</label>
                    <select
                        value={selectedTanda}
                        onChange={(e) => setSelectedTanda(e.target.value)}
                        className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white focus:ring-2 outline-none shadow-sm font-medium transition-colors"
                        style={{ '--tw-ring-color': userColor }}
                    >
                        <option value="">-- Elige una tanda --</option>
                        {tandas.map(t => (
                            <option key={t.id} value={t.nombre}>{t.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Invoices List */}
                {selectedTanda && (
                    <>
                        {loading ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando boletas...</div>
                        ) : userBoletas.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">No se encontraron boletas asignadas a tu usuario en esta tanda.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {userBoletas.map((boleta, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] transition-colors"
                                    >
                                        {/* Header - Styled with User Color */}
                                        <div
                                            className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-white"
                                            style={{ backgroundColor: userColor }}
                                        >
                                            <div>
                                                <p className="text-xs opacity-80 uppercase font-bold mb-1">Nombre Marca</p>
                                                <h3 className="text-2xl font-bold tracking-wide">{boleta.marca}</h3>
                                            </div>
                                            <div>
                                                <p className="text-xs opacity-80 uppercase font-bold mb-1">Código Boleta</p>
                                                <p className="text-lg font-mono opacity-100 font-bold">{boleta.codigo_boleta}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs opacity-80 uppercase font-bold mb-1">Fecha</p>
                                                <p className="text-lg opacity-100">
                                                    {boleta.fecha ? new Date(boleta.fecha).toLocaleDateString() : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                                                    <tr>
                                                        <th className="px-6 py-4">Código</th>
                                                        <th className="px-6 py-4 text-center">Bultos</th>
                                                        <th className="px-6 py-4 text-center">Cant/Docenas</th>
                                                        <th className="px-6 py-4 text-right">Precio/Doc</th>
                                                        <th className="px-6 py-4 text-right">Total Fila</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                                                    {boleta.items.map((item, i) => {
                                                        const docenas = parseFloat(item.cantidad_docenas) || 0;
                                                        const bultos = parseFloat(item.bultos) || 0;
                                                        const cantPorBulto = bultos > 0 ? (docenas / bultos) : 0;
                                                        const precio = parseFloat(item.precio_docena) || 0;
                                                        const totalRow = docenas * precio;

                                                        return (
                                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-6 py-4 font-mono font-semibold">{item.codigo}</td>
                                                                <td className="px-6 py-4 text-center">{bultos || '-'}</td>
                                                                <td className="px-6 py-4 text-center">
                                                                    {docenas > 0 ? docenas.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">${precio}</td>
                                                                <td className="px-6 py-4 text-right font-bold" style={{ color: userColor }}>
                                                                    ${totalRow.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Footer / Totals */}
                                        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                            {/* Left Info: Total Bultos */}
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <Package className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase mr-2">Total Bultos:</span>
                                                <span className="text-xl font-bold text-gray-800 dark:text-white">
                                                    {getEffectiveBultos(boleta)}
                                                </span>
                                            </div>

                                            {/* Right Info: Total Sumatoria & Toggle */}
                                            <div className="flex flex-col items-end gap-3">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase">Total Sumatoria:</span>
                                                    <span className="text-3xl font-bold tracking-tight" style={{ color: userColor }}>
                                                        ${boleta.totalMonto.toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Toggle Switch */}
                                                <label className="flex items-center cursor-pointer gap-3 bg-white dark:bg-black/20 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={!!tandaParams?.CANT_BULTOS_PAGAR_ID?.[userId]?.[boleta.key]} // Checked if key exists and truthy for this user
                                                            onChange={(e) => handleToggleCalculation(boleta.key, e.target.checked, getEffectiveBultos(boleta))}
                                                        />
                                                        {/* Styled Checkbox Visuals */}
                                                        <div className={`block w-10 h-6 rounded-full transition-colors ${!!tandaParams?.CANT_BULTOS_PAGAR_ID?.[userId]?.[boleta.key] ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!!tandaParams?.CANT_BULTOS_PAGAR_ID?.[userId]?.[boleta.key] ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {!!tandaParams?.CANT_BULTOS_PAGAR_ID?.[userId]?.[boleta.key] ? 'Incluido en cálculo' : 'No incluido'}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
