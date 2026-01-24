import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TandaHeader } from '../../components/costs/TandaHeader';
import { BrandList } from '../../components/costs/BrandList';
import { Calculator, ArrowLeft, Calendar, Package, Layers } from 'lucide-react';
import BuscadorMercancia from '../../components/mercancia/BuscadorMercancia';
import { Button } from '../../components/ui/Button';

export function CostCalculation() {
    const [tandas, setTandas] = useState({}); // Grouped by Tanda Name
    const [selectedTandaName, setSelectedTandaName] = useState(null); // null = List View, string = Detail View
    const [loading, setLoading] = useState(true);

    // Search State (Client-side)
    const [searchTerm, setSearchTerm] = useState('');

    // Calculation States
    // Store dollar rates per tanda: { "Tanda 1": "1500", "Tanda 2": "1510" }
    const [tandaRates, setTandaRates] = useState({});

    // Expenses logic
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
            setTandaExpenses(prev => ({ ...prev, ...initialExpenses }));

            // Do NOT auto-select first tanda anymore. Start in List View.
            // if (sortedNames.length > 0) setSelectedTandaName(sortedNames[0]);

        } catch (error) {
            console.error('Error fetching data for costs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Client-side Filter Logic
    const getFilteredTandas = () => {
        const allTandas = Object.values(tandas).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        if (!searchTerm.trim()) return allTandas;

        const lowerTerm = searchTerm.toLowerCase();
        return allTandas.filter(tanda => {
            // Check Tanda Name
            if (tanda.nombre.toLowerCase().includes(lowerTerm)) return true;

            // Check Products Codes inside Tanda
            // tanda.marcas is an array of { name, products: [] }
            return tanda.marcas.some(marca =>
                marca.products.some(prod =>
                    (prod.codigo && prod.codigo.toLowerCase().includes(lowerTerm)) ||
                    (prod.codigo_boleta && prod.codigo_boleta.toLowerCase().includes(lowerTerm))
                )
            );
        });
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
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
        const rate = parseFloat(dollarRate) || 1;

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

    // View: Detail
    if (selectedTandaName) {
        if (!currentTanda) return <div>Tanda no encontrada</div>;

        return (
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <button
                    onClick={() => setSelectedTandaName(null)}
                    className="mb-6 flex items-center text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver al listado
                </button>

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
                    highlightCode={searchTerm} // Pass search term to highlight if we implemented it in BrandList
                />
            </div>
        );
    }

    // View: List
    const filteredTandas = getFilteredTandas();

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cálculo de Costos</h1>
                        <p className="text-gray-500 mt-1">Estimación de costos y gastos por tanda</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-8 max-w-lg mx-auto">
                <BuscadorMercancia onSearch={handleSearch} onClear={handleClearSearch} />
            </div>

            {/* Grid */}
            {filteredTandas.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-400">
                    No se encontraron tandas con el criterio de búsqueda.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTandas.map(tanda => (
                        <div key={tanda.nombre} className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-600 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {new Date(tanda.fecha).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-4 text-gray-900 line-clamp-1" title={tanda.nombre}>{tanda.nombre}</h3>

                            <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-50 mb-4">
                                <div className="text-center">
                                    <span className="block text-xs text-gray-500 uppercase">Marcas</span>
                                    <span className="font-bold text-gray-900">{tanda.marcas.length}</span>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <span className="block text-xs text-gray-500 uppercase">Prods</span>
                                    <span className="font-bold text-gray-900">{tanda.totalProductos}</span>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <span className="block text-xs text-gray-500 uppercase">Docenas</span>
                                    <span className="font-bold text-green-600">{tanda.totalDocenas}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => setSelectedTandaName(tanda.nombre)}
                            >
                                Calcular Costos
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
