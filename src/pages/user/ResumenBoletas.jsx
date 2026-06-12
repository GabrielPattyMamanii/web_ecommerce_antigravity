
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, DollarSign, Package, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

export function ResumenBoletas() {
    const [loading, setLoading] = useState(true);
    const [boletas, setBoletas] = useState([]);
    const [tandaConfigs, setTandaConfigs] = useState({}); // { 'Verano 2026': { ...config } }
    const [brandParams, setBrandParams] = useState({});   // { 'Verano 2026_Nike': { percentage: 10 } }
    const [tandaTotals, setTandaTotals] = useState({});   // { 'Verano 2026': { totalBultos: 100 } }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const userId = sessionStorage.getItem('mercancia_user_id');
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            // 1. Get User Selections
            const { data: userBoletas, error: boletasError } = await supabase
                .from('boletas_cliente')
                .select('*')
                .eq('cliente_id', userId)
                .eq('seleccionada', true);

            if (boletasError) throw boletasError;
            if (!userBoletas || userBoletas.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Get Details for each selected boleta (Products)
            const uniqueTandas = [...new Set(userBoletas.map(b => b.tanda_nombre))];

            // Allow fetching all configs for relevant tandas
            const { data: configs } = await supabase.from('tandas_config').select('*').in('tanda_nombre', uniqueTandas);
            const configMap = {};
            configs?.forEach(c => configMap[c.tanda_nombre] = c);
            setTandaConfigs(configMap);

            // Fetch Brand Params
            const { data: bParams } = await supabase.from('tanda_marca_parametros').select('*').in('tanda_nombre', uniqueTandas);
            const bParamsMap = {};
            bParams?.forEach(bp => bParamsMap[`${bp.tanda_nombre}_${bp.marca}`] = bp);
            setBrandParams(bParamsMap);

            // 3. Calculate Tanda Totals (Total Bultos) for Travel Cost Distribution
            // We need to fetch ALL entries for these tandas to sum bultos, OR rely on a pre-calculated field.
            // Since we might not have a pre-calc, let's fetch all brands' bultos from 'entradas' for these tandas.
            // Optimization: Maybe create a distinct query for sums.
            const tTotals = {};
            for (const tName of uniqueTandas) {
                const { data: entries } = await supabase.from('entradas').select('bultos').eq('tanda_nombre', tName);
                let sumBultos = 0;
                entries?.forEach(e => sumBultos += (e.bultos || 0));

                // Override with manual if exists
                if (configMap[tName]?.bultos_totales_manual > 0) {
                    sumBultos = configMap[tName].bultos_totales_manual;
                }
                tTotals[tName] = { totalBultos: sumBultos };
            }
            setTandaTotals(tTotals);


            // 4. Build Boleta Data Structure
            const fullBoletas = await Promise.all(userBoletas.map(async (ub) => {
                const { data: products } = await supabase
                    .from('entradas')
                    .select('*')
                    .eq('tanda_nombre', ub.tanda_nombre)
                    .eq('marca', ub.marca);

                return {
                    ...ub,
                    products: products || []
                };
            }));

            setBoletas(fullBoletas);

        } catch (error) {
            console.error(error);
            toast.error("Error al cargar resumen");
        } finally {
            setLoading(false);
        }
    };

    const calculations = useMemo(() => {
        if (boletas.length === 0) return null;

        let grandTotal = 0;
        let totalItems = 0;
        let totalBultosUser = 0;

        const details = boletas.map(boleta => {
            const config = tandaConfigs[boleta.tanda_nombre] || {};
            const bParam = brandParams[`${boleta.tanda_nombre}_${boleta.marca}`] || { porcentaje_costo: 0 };
            const tTotal = tandaTotals[boleta.tanda_nombre] || { totalBultos: 1 }; // Avoid div by 0

            // 1. Product Cost
            let boletaProductCost = 0;
            let boletaBultos = 0;

            boleta.products.forEach(p => {
                const basePrice = (p.cantidad_docenas || 0) * (p.precio_docena || 0);
                const markUp = 1 + ((bParam.porcentaje_costo || 0) / 100);
                boletaProductCost += (basePrice * markUp);
            });

            // Estimate bultos for this boleta if not stored on boleta_cliente directly
            // We stored bultos on 'entradas' row? Yes, we added it.
            // Assumption: All rows for a brand have the same 'bultos' value? 
            // Or 'bultos' is sum of rows?
            // In 'AgregarTanda', we stored `bultos: marca.bultos` on EVERY row of that brand.
            // So we just take the first row's bultos.
            if (boleta.products.length > 0) {
                boletaBultos = boleta.products[0].bultos || 0;
            }

            // 2. Travel Cost Share
            // Formula: (My Bultos / Total Bultos Tanda) * Total Travel Cost
            const travelCostTotal = config.gastos_viaje_arg || 0;
            const share = tTotal.totalBultos > 0 ? (boletaBultos / tTotal.totalBultos) : 0;
            const myTravelCost = share * travelCostTotal;

            // 3. Pilotaje Cost
            // Formula: My Bultos * Pilotaje USD Rate
            // We need Exchange Rate? Usually Pilotaje is paid in USD or converted.
            // Let's assume this display is in USD or we show both.
            // For the "Grand Total", we probably need everything in one currency.
            // Let's assume everything calculates to the Tanda's currency or separates them.
            // If Travel is ARG and Pilotaje USD, we can't sum them easily without a rate.
            // Let's keep them separate in display.
            const pilotajeRate = config.costo_pilotaje_usd || 0;
            const myPilotajeCostRef = boletaBultos * pilotajeRate;

            grandTotal += boletaProductCost; // Only summing products for now? Or should we sum ALL expenses?
            // Usually "Costo Total" includes expenses. 
            // Warning: Without exchange rate, summing ARG and USD is wrong.
            // Let's Display: "Costo Mercadería" (Calculated with %), "Gastos" (Separated).

            totalItems += boleta.products.length;
            totalBultosUser += boletaBultos;

            return {
                ...boleta,
                bultos: boletaBultos,
                productCost: boletaProductCost,
                travelCost: myTravelCost,
                pilotajeCost: myPilotajeCostRef,
                percentageUsed: bParam.porcentaje_costo,
                itemCount: boleta.products.length
            };
        });

        return { details, grandTotal, totalItems, totalBultosUser };
    }, [boletas, tandaConfigs, brandParams, tandaTotals]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando resumen...</div>;
    if (!calculations || calculations.details.length === 0) return <div className="p-8 text-center text-muted-foreground">No hay boletas cargadas.</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-foreground">Resumen de Costos</h1>

            {/* Top Cards for Aggregate Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <Package size={20} /> <span className="text-sm font-bold uppercase">Mis Bultos</span>
                    </div>
                    <div className="text-3xl font-bold text-foreground">{calculations.totalBultosUser}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <DollarSign size={20} /> <span className="text-sm font-bold uppercase">Mercadería (Est.)</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono">
                        ${calculations.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                </div>
                {/* Placeholders for Travel/Pilotaje totals if we want them aggregated */}
            </div>

            {/* Detailed Cards per Boleta */}
            <div className="space-y-4">
                {calculations.details.map((item, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-4 border-b border-border">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    {item.marca}
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{item.tanda_nombre}</span>
                                </h3>
                                <p className="text-xs text-muted-foreground">Boleta Código: {item.products[0]?.codigo_boleta || 'N/A'}</p>
                            </div>
                            <div className="flex gap-6 text-sm">
                                <div>
                                    <span className="block text-muted-foreground text-xs uppercase">Bultos</span>
                                    <span className="font-bold">{item.bultos}</span>
                                </div>
                                <div>
                                    <span className="block text-muted-foreground text-xs uppercase">Items</span>
                                    <span className="font-bold">{item.itemCount}</span>
                                </div>
                                <div>
                                    <span className="block text-muted-foreground text-xs uppercase">Markup</span>
                                    <span className="font-bold text-blue-600">+{item.percentageUsed}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Cost Column */}
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Costo Mercadería</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Base:</span>
                                        <span>${(item.productCost / (1 + item.percentageUsed / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-foreground pt-1 border-t border-border">
                                        <span>Total (+{item.percentageUsed}%):</span>
                                        <span className="text-green-600">${item.productCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics Column */}
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Logística & Viaje</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Viaje (ARG):</span>
                                        <span className="font-mono">${item.travelCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Pilotaje (USD):</span>
                                        <span className="font-mono text-blue-600">US${item.pilotajeCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 text-right italic">
                                        * Basado en {item.bultos} bultos
                                    </p>
                                </div>
                            </div>

                            {/* Actions / Status */}
                            <div className="flex items-center justify-end">
                                <button className="text-primary text-sm font-bold hover:underline">
                                    Ver Detalle Productos →
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
