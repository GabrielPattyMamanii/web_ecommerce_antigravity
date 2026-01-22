import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TandaHeader } from '../../components/costs/TandaHeader';
import { BrandList } from '../../components/costs/BrandList';
import { Calculator } from 'lucide-react';

export function CostCalculation() {
    const [tandas, setTandas] = useState({}); // Grouped by Tanda Name
    const [selectedTandaName, setSelectedTandaName] = useState('');
    const [loading, setLoading] = useState(true);

    // Calculation States
    // Store dollar rates per tanda: { "Tanda 1": "1500", "Tanda 2": "1510" }
    const [tandaRates, setTandaRates] = useState({});

    // Expenses are loaded from DB but technically could be overridden locally in session? 
    // Requirement says "el gasto no es el mismo para todas las tandas, debe ir cambiando segun el valor que el usuario introdujo".
    // Since we load it from DB, we can store it in a map too if we want to allow temporary edits without saving?
    // Or just rely on the fact that we switch the "localExpense" state when Tanda changes.
    // Let's use a simpler approach: When switching Tanda, we load the expense from DB into a state.
    // If user edits it, it changes 'localExpense'. If they switch back, should it remember the EDITED value or DB value?
    // "datos NO se editan aqui" implies no save to DB. 
    // Usually "Remember my session inputs" is expected. Let's use a map for expenses too to be safe.
    const [tandaExpenses, setTandaExpenses] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('*');

            if (error) throw error;

            const grouped = {};
            const initialExpenses = {};

            data.forEach(item => {
                const tName = item.tanda_nombre;
                if (!grouped[tName]) {
                    grouped[tName] = {
                        id: tName,
                        nombre: tName,
                        fecha: item.tanda_fecha,
                        gastos: item.gastos,
                        codigoBoleta: item.codigo_boleta,
                        totalDocenas: 0,
                        totalProductos: 0,
                        marcasMap: {}
                    };
                    // Initialize expense from DB
                    initialExpenses[tName] = item.gastos || '';
                }

                if (item.gastos && !grouped[tName].gastos) {
                    grouped[tName].gastos = item.gastos;
                    initialExpenses[tName] = item.gastos;
                }

                const tanda = grouped[tName];
                tanda.totalDocenas += (item.cantidad_docenas || 0);
                tanda.totalProductos += 1;

                const mName = item.marca;
                if (!tanda.marcasMap[mName]) {
                    tanda.marcasMap[mName] = {
                        name: mName,
                        products: []
                    };
                }
                tanda.marcasMap[mName].products.push(item);
            });

            Object.values(grouped).forEach(tanda => {
                tanda.marcas = Object.values(tanda.marcasMap).sort((a, b) => a.name.localeCompare(b.name));
                delete tanda.marcasMap;
            });

            setTandas(grouped);
            setTandaExpenses(prev => ({ ...prev, ...initialExpenses })); // Merge with existing if any? Or just set.

            const sortedNames = Object.values(grouped)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .map(t => t.nombre);

            if (sortedNames.length > 0) {
                setSelectedTandaName(sortedNames[0]);
            }

        } catch (error) {
            console.error('Error fetching data for costs:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentTanda = tandas[selectedTandaName];

    // Get current rate and expense from maps
    const dollarRate = tandaRates[selectedTandaName] || '';
    const localExpense = tandaExpenses[selectedTandaName] || '';

    const handleRateChange = (val) => {
        setTandaRates(prev => ({ ...prev, [selectedTandaName]: val }));
    };

    const handleExpenseChange = (val) => {
        setTandaExpenses(prev => ({ ...prev, [selectedTandaName]: val }));
    };

    // Calculations
    const expenseValue = parseFloat(localExpense) || 0;
    const expensePerItem = (currentTanda?.totalProductos > 0)
        ? (expenseValue / currentTanda.totalProductos)
        : 0;

    const calculateGrandTotal = () => {
        if (!currentTanda) return 0;
        let total = 0;
        // Logic Update: Total + Gastos column sum.
        // Formula for one item: (Qty * Price * Rate) + ExpensePerItem
        const rate = parseFloat(dollarRate) || 1; // Default to 1 for final calc if missing? 
        // Note: The user said "Total" column shouldn't have rate. But "Total+Gastos" is fine.
        // My previous "Total+Gastos" used the rate. 
        // So I will apply rate here.

        currentTanda.marcas.forEach(marca => {
            marca.products.forEach(prod => {
                const basePriceTotal = (prod.cantidad_docenas || 0) * (prod.precio_docena || 0);
                const convertedTotal = basePriceTotal * rate;

                total += (convertedTotal + expensePerItem);
            });
        });
        return total;
    };

    const grandTotal = calculateGrandTotal();

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando datos...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                    <Calculator className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cálculo de Costos</h1>
                    <p className="text-gray-500 mt-1">Estimación de costos y gastos por tanda</p>
                </div>
            </div>

            {/* Tanda Selector (Optional but good UX if multiple exists) */}
            {Object.keys(tandas).length > 1 && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Tanda</label>
                    <select
                        value={selectedTandaName}
                        onChange={(e) => setSelectedTandaName(e.target.value)}
                        className="w-full md:w-64 p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block"
                    >
                        {Object.values(tandas)
                            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                            .map(t => (
                                <option key={t.nombre} value={t.nombre}>
                                    {t.nombre} - {new Date(t.fecha).toLocaleDateString()}
                                </option>
                            ))}
                    </select>
                </div>
            )}

            {!currentTanda ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                    No hay tandas disponibles para calcular.
                </div>
            ) : (
                <>
                    <TandaHeader
                        tanda={currentTanda}
                        dollarRate={dollarRate}
                        setDollarRate={handleRateChange}
                        localExpense={localExpense}
                        setLocalExpense={handleExpenseChange}
                        estimatedTotal={grandTotal}
                    />

                    <BrandList
                        brands={currentTanda.marcas}
                        dollarRate={dollarRate}
                        expensePerItem={expensePerItem}
                    />
                </>
            )}
        </div>
    );
}
