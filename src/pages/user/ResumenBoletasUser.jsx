import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Package, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export function ResumenBoletasUser() {
    const navigate = useNavigate();
    const [tandas, setTandas] = useState([]);
    const [selectedTanda, setSelectedTanda] = useState('');
    const [boletasDetails, setBoletasDetails] = useState([]);
    const [loading, setLoading] = useState(false);
    const userId = sessionStorage.getItem('app_user_id');

    useEffect(() => {
        if (!userId) navigate('/admin/usuarios');
        fetchTandas();
    }, [userId, navigate]);

    const fetchTandas = async () => {
        const { data } = await supabase.from('tandas').select('*').order('fecha', { ascending: false });
        if (data) setTandas(data);
    };

    useEffect(() => {
        if (selectedTanda) {
            fetchDetails();
        }
    }, [selectedTanda]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const tandaObj = tandas.find(t => t.nombre === selectedTanda);
            if (!tandaObj) return;

            // 1. Get User's Selected Boletas for this Tanda
            const { data: userSelections, error: selectionError } = await supabase
                .from('user_boletas')
                .select('marca, codigo_boleta')
                .eq('user_id', userId)
                .eq('tanda_id', tandaObj.id)
                .eq('seleccionada', true);

            if (selectionError) throw selectionError;

            if (!userSelections || userSelections.length === 0) {
                setBoletasDetails([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Details from Entradas for these selections
            // We need to construct a filter. Since supabase doesn't support extensive ORs easily for tuples,
            // and the dataset is likely small per tanda, we might fetch all entries for the tanda and filter in memory,
            // OR fetch by Marca if list is small.
            // Let's fetch all entries for the Tanda (usually < 1000 rows) and filter.

            const { data: allEntradas, error: entradasError } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', selectedTanda);

            if (entradasError) throw entradasError;

            // Filter and Group
            const grouped = {};

            userSelections.forEach(sel => {
                const key = `${sel.marca}-${sel.codigo_boleta || 'sin_codigo'}`;

                // Find matching entries
                const entries = allEntradas.filter(e =>
                    e.marca === sel.marca &&
                    (e.codigo_boleta === sel.codigo_boleta || (!e.codigo_boleta && !sel.codigo_boleta))
                );

                if (entries.length > 0) {
                    const totalBultos = entries.reduce((acc, curr) => acc + (parseFloat(curr.bultos) || 0), 0);
                    const totalPrecio = entries.reduce((acc, curr) => {
                        const precioDoc = parseFloat(curr.precio_docena) || 0;
                        const cantDoc = parseFloat(curr.cantidad_docenas) || 0;
                        return acc + (precioDoc * cantDoc);
                    }, 0);

                    grouped[key] = {
                        marca: sel.marca,
                        codigo_boleta: sel.codigo_boleta || 'S/N',
                        fecha: entries[0].created_at, // Approximate
                        totalBultos,
                        totalPrecio,
                        productos: entries.map(e => ({
                            ...e,
                            total: (parseFloat(e.precio_docena) || 0) * (parseFloat(e.cantidad_docenas) || 0)
                        })),
                        expanded: false
                    };
                }
            });

            setBoletasDetails(Object.values(grouped));

        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (index) => {
        setBoletasDetails(prev => prev.map((item, i) =>
            i === index ? { ...item, expanded: !item.expanded } : item
        ));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Resumen de Boletas</h1>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <label className="block text-gray-700 font-bold mb-2">Tanda</label>
                    <select
                        value={selectedTanda}
                        onChange={(e) => setSelectedTanda(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                    >
                        <option value="">Seleccionar Tanda</option>
                        {tandas.map(t => (
                            <option key={t.id} value={t.nombre}>{t.nombre}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando resumen...</div>
                ) : boletasDetails.length === 0 && selectedTanda ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No tienes boletas seleccionadas en esta tanda.</p>
                        <button
                            onClick={() => navigate('/dashboard/carga-boletas')}
                            className="mt-4 text-pink-600 font-bold hover:underline"
                        >
                            Ir a Cargar Boletas
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {boletasDetails.map((boleta, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header Card */}
                                <div
                                    onClick={() => toggleExpand(index)}
                                    className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-gray-50 transition"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-lg text-gray-800">{boleta.marca}</h3>
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-medium">
                                                Boleta: {boleta.codigo_boleta}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(boleta.fecha).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                {boleta.totalBultos} Bultos
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Total Boleta</p>
                                            <p className="text-xl font-bold text-green-600">
                                                ${boleta.totalPrecio.toLocaleString()}
                                            </p>
                                        </div>
                                        {boleta.expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Details Body */}
                                {boleta.expanded && (
                                    <div className="bg-gray-50 border-t border-gray-200 p-4 animate-in slide-in-from-top-2">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                                    <th className="pb-2 pl-2">Código</th>
                                                    <th className="pb-2">Producto</th>
                                                    <th className="pb-2 text-right">Cant.</th>
                                                    <th className="pb-2 text-right">Bultos</th>
                                                    <th className="pb-2 text-right">Precio/Doc</th>
                                                    <th className="pb-2 text-right pr-2">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {boleta.productos.map((prod, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-100/50">
                                                        <td className="py-3 pl-2 font-mono text-gray-600">{prod.codigo}</td>
                                                        <td className="py-3 font-medium text-gray-800">{prod.producto_titulo}</td>
                                                        <td className="py-3 text-right">{prod.cantidad_docenas} doc</td>
                                                        <td className="py-3 text-right">{prod.bultos}</td>
                                                        <td className="py-3 text-right">${prod.precio_docena}</td>
                                                        <td className="py-3 text-right pr-2 font-bold text-gray-700">
                                                            ${prod.total.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Grand Total */}
                        <div className="bg-gray-900 rounded-xl p-6 text-white flex justify-between items-center mt-8 shadow-xl">
                            <div>
                                <p className="text-gray-400 text-sm">Total General</p>
                                <p className="text-2xl font-bold">
                                    {boletasDetails.reduce((acc, curr) => acc + curr.totalBultos, 0)} Bultos
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-400 text-3xl font-bold">
                                    ${boletasDetails.reduce((acc, curr) => acc + curr.totalPrecio, 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
