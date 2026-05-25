import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, DollarSign, Calculator, ChevronDown, Check } from 'lucide-react';

export function CalculoTransporteUser() {
    const navigate = useNavigate();
    const userId = sessionStorage.getItem('app_user_id');
    const username = sessionStorage.getItem('app_username'); // Need username for filtering entradas
    const [tandas, setTandas] = useState([]);
    const [selectedTanda, setSelectedTanda] = useState('');
    const [route, setRoute] = useState('chile-bermejo'); // Default route

    const [boletasData, setBoletasData] = useState([]);
    const [tandaParams, setTandaParams] = useState(null);
    const [loading, setLoading] = useState(false);

    // Calculated totals
    const [totals, setTotals] = useState({
        viaje: 0,
        pilotaje: 0,
        comision: 0,
        total: 0
    });

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
            fetchData();
        } else {
            setBoletasData([]);
            setTandaParams(null);
        }
    }, [selectedTanda]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const tandaObj = tandas.find(t => t.nombre === selectedTanda);
            if (!tandaObj) return;

            setTandaParams(tandaObj.parametros || {});

            // 1. Fetch Entradas for this user and tanda
            const { data: entradas, error } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', selectedTanda)
                .eq('propietario', username); // Check against username as in CargaBoletas

            if (error) throw error;

            if (!entradas || entradas.length === 0) {
                setBoletasData([]);
                setLoading(false);
                return;
            }

            // 2. Group by Brand/Boleta to display as cards
            const marcasMetadata = tandaObj.parametros?.marcasMetadata || {};
            const porcentajesMarcas = tandaObj.parametros?.porcentajesMarcas || [];
            const grouped = {};

            entradas.forEach(e => {
                const key = e.marca_id || `${e.marca}-${e.codigo_boleta || 'sn'}`;

                if (!grouped[key]) {
                    // Check for Custom Bultos in Metadata (Priority: ID > Name)
                    let customBultos = null;
                    if (e.marca_id && marcasMetadata[e.marca_id]) {
                        customBultos = marcasMetadata[e.marca_id].bultos_personalizados;
                    } else if (marcasMetadata[e.marca]) {
                        customBultos = marcasMetadata[e.marca].bultos_personalizados;
                    }

                    // Auto-select commission: find matching brand in porcentajesMarcas by name (case-insensitive)
                    const marcaLower = (e.marca || '').toLowerCase().trim();
                    const matchedPorcentaje = porcentajesMarcas.find(
                        p => (p.descripcion || '').toLowerCase().trim() === marcaLower
                    );
                    const autoComision = matchedPorcentaje ? parseFloat(matchedPorcentaje.porcentaje) : 0;
                    const autoComisionId = matchedPorcentaje ? String(matchedPorcentaje.id) : '__none__';

                    grouped[key] = {
                        key, // ID for list
                        marca: e.marca,
                        codigo_boleta: e.codigo_boleta || 'S/N',
                        items: [],
                        totalBultosSum: 0,
                        customBultos: customBultos ? parseFloat(customBultos) : null,
                        totalMonto: 0,
                        selectedComision: autoComision,     // numeric % – used in calculations
                        selectedComisionId: autoComisionId  // unique id – used by the <select>
                    };
                }

                grouped[key].items.push(e);
                grouped[key].totalBultosSum += (parseFloat(e.bultos) || 0);

                const precio = parseFloat(e.precio_docena) || 0;
                const cantidad = parseFloat(e.cantidad_docenas) || 0;
                grouped[key].totalMonto += (precio * cantidad);
            });

            setBoletasData(Object.values(grouped));

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get effective bultos
    const getEffectiveBultos = (boleta) => {
        if (boleta.customBultos !== null && boleta.customBultos !== undefined && boleta.customBultos > 0) {
            return boleta.customBultos;
        }
        return boleta.totalBultosSum;
    };

    // Recalculate whenever inputs change
    useEffect(() => {
        if (!tandaParams || boletasData.length === 0) {
            setTotals({ viaje: 0, pilotaje: 0, comision: 0, total: 0 });
            return;
        }

        // Params
        const gastosViajeTotal = parseFloat(tandaParams.gastosViaje) || 0;
        // The divisor is 'cantidadBultosAPagar' from Admin config (calculated via toggle)
        const cantidadBultosAPagar = parseFloat(tandaParams.cantidadBultosAPagar) || 1;
        const costoPilotaje = parseFloat(tandaParams.costoPilotajeXBulto) || 0;

        let totalViaje = 0;
        let totalPilotaje = 0;
        let totalComision = 0;

        boletasData.forEach(b => {
            // Get effective bultos from the saved User Toggle Map
            // If the key exists in the map for this user, it contains the bultos amount.
            // If it doesn't exist, it means it's excluded (0).
            const savedBultos = tandaParams?.CANT_BULTOS_PAGAR_ID?.[userId]?.[b.key];
            const bultos = (savedBultos !== undefined && savedBultos !== null) ? parseFloat(savedBultos) : 0;

            // Gasto Viaje: (My Bultos * Total Trip Cost) / Total Payable Bundles
            // This depends on the toggle (CANT_BULTOS_PAGAR_ID) as requested before.
            const viaje = (bultos * gastosViajeTotal) / cantidadBultosAPagar;

            // Pilotaje: ALWAYS Bultos * CostoPilotaje (regardless of Transport toggle)
            // As per user request: "aqui para calcular eso, aca no importa la variable CANT_BULTOS_PAGAR_ID, sino que debes tomar el valor de bultos"
            const effectiveBultosForPilotaje = getEffectiveBultos(b);
            const pilotaje = effectiveBultosForPilotaje * costoPilotaje;

            // Comision: PrecioTotal * % / 100
            const comision = b.totalMonto * (parseFloat(b.selectedComision) / 100);

            totalViaje += viaje;
            totalPilotaje += pilotaje;
            totalComision += comision;
        });

        setTotals({
            viaje: totalViaje,
            pilotaje: totalPilotaje,
            comision: totalComision,
            total: 0 // Displayed separately
        });

    }, [boletasData, tandaParams]);

    const handleComisionChange = (index, selectedId) => {
        const newBoletas = [...boletasData];
        if (selectedId === '__none__') {
            newBoletas[index].selectedComision = 0;
            newBoletas[index].selectedComisionId = '__none__';
        } else {
            const entry = tandaParams?.porcentajesMarcas?.find(p => String(p.id) === selectedId);
            newBoletas[index].selectedComision = entry ? parseFloat(entry.porcentaje) : 0;
            newBoletas[index].selectedComisionId = selectedId;
        }
        setBoletasData(newBoletas);
    };

    return (
        <div className="min-h-screen bg-transparent pb-40">
            {/* Animated Content Wrapper */}
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex items-center gap-4 shadow-sm">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Cálculo de Transporte</h1>
                </header>

                <main className="max-w-6xl mx-auto px-6 py-8">
                    {/* Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Tanda</label>
                            <select
                                value={selectedTanda}
                                onChange={(e) => setSelectedTanda(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar Tanda</option>
                                {tandas.map(t => (
                                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Ruta</label>
                            <select
                                value={route}
                                onChange={(e) => setRoute(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="chile-bermejo">Chile -&gt; Bermejo</option>
                                <option value="bermejo-ba" disabled>Bermejo -&gt; Buenos Aires (Próximamente)</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Cargando cálculos...</div>
                    ) : boletasData.length === 0 && selectedTanda ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No hay boletas para calcular.</p>
                        </div>
                    ) : (
                        <>
                            {/* Boletas List */}
                            <div className="space-y-6 mb-12">
                                {boletasData.map((boleta, index) => {
                                    // Original bultos for reference
                                    const originalBultos = getEffectiveBultos(boleta);

                                    // Effective bultos for calculation (from DB map)
                                    const savedBultos = tandaParams?.CANT_BULTOS_PAGAR_ID?.[userId]?.[boleta.key];
                                    const calcBultos = (savedBultos !== undefined && savedBultos !== null) ? parseFloat(savedBultos) : 0;
                                    const isIncluded = calcBultos > 0;

                                    const gastosViajeTotal = parseFloat(tandaParams?.gastosViaje) || 0;
                                    const cantidadBultosAPagar = parseFloat(tandaParams?.cantidadBultosAPagar) || 1;
                                    const costoPilotaje = parseFloat(tandaParams?.costoPilotajeXBulto) || 0;

                                    // Calculations
                                    const viaje = (calcBultos * gastosViajeTotal) / cantidadBultosAPagar;
                                    const pilotaje = originalBultos * costoPilotaje; // Use originalBultos for Pilotaje
                                    const comision = boleta.totalMonto * (parseFloat(boleta.selectedComision) / 100);

                                    return (
                                        <div key={index} className={`bg-white rounded-2xl shadow-sm border p-6 ${isIncluded ? 'border-gray-100' : 'border-gray-100 opacity-75'}`}>
                                            <div className="flex flex-col md:flex-row justify-between mb-4 border-b border-gray-100 pb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-800">{boleta.marca}</h3>
                                                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                        <span className="bg-gray-100 px-2 py-0.5 rounded">Boleta: {boleta.codigo_boleta}</span>
                                                        <span>{originalBultos} Bultos {isIncluded ? '(Incluido)' : '(No incluido)'}</span>
                                                        <span className="text-green-600 font-medium font-mono">${boleta.totalMonto.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 md:mt-0">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comisión por Giro</label>
                                                    <select
                                                        value={boleta.selectedComisionId || '__none__'}
                                                        onChange={(e) => handleComisionChange(index, e.target.value)}
                                                        className="bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 min-w-[200px]"
                                                    >
                                                        <option value="__none__">0% (Sin comision)</option>
                                                        {tandaParams?.porcentajesMarcas?.map((p, i) => (
                                                            <option key={i} value={String(p.id)}>
                                                                {p.descripcion} ({p.porcentaje}%)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Breakdown Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Comisión ({boleta.selectedComision}%)</p>
                                                    <p className="text-lg font-bold text-gray-800">${comision.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">Pago del Viaje (ARG)</p>
                                                    <p className="text-lg font-bold text-gray-800">${viaje.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        ({calcBultos} bultos * ${gastosViajeTotal.toLocaleString()}) / {cantidadBultosAPagar} total
                                                    </p>
                                                </div>
                                                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                                                    <p className="text-xs text-purple-600 font-bold uppercase mb-1">Pago de Pilotaje (USD)</p>
                                                    <p className="text-lg font-bold text-gray-800">${pilotaje.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {originalBultos} bultos * ${costoPilotaje}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Grand Totals Footer - Outside Animated Div */}
            {!loading && boletasData.length > 0 && selectedTanda && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] md:max-w-4xl bg-white border border-gray-200 rounded-2xl p-4 shadow-2xl z-50">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6 flex-wrap justify-center">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold text-center md:text-left">Total Viaje (ARG)</p>
                                <p className="text-xl font-bold text-gray-800 text-center md:text-left">${totals.viaje.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold text-center md:text-left">Total Pilotaje (USD)</p>
                                <p className="text-xl font-bold text-gray-800 text-center md:text-left">${totals.pilotaje.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold text-center md:text-left">Total Comisiones</p>
                                <p className="text-xl font-bold text-gray-800 text-center md:text-left">${totals.comision.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <button className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition shadow-lg text-sm w-full md:w-auto">
                            Exportar PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
