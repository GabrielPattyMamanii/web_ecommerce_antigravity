import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function PriceCalculation() {
    const [precioXDocena, setPrecioXDocena] = useState('');
    const [cantDeDocenas, setCantDeDocenas] = useState('');
    const [gastoFijo, setGastoFijo] = useState(() => {
        return localStorage.getItem('gastoFijo') || '';
    });
    const [precioDocenaAlCosto, setPrecioDocenaAlCosto] = useState(null);
    const [errorFields, setErrorFields] = useState([]);

    useEffect(() => {
        if (gastoFijo) {
            localStorage.setItem('gastoFijo', gastoFijo);
        } else {
            localStorage.removeItem('gastoFijo');
        }
    }, [gastoFijo]);

    const handleNumericInput = (val, setter, fieldName) => {
        // Solo permitir números y un punto decimal
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setter(val);
            // Limpiar error del campo si estaba marcado
            setErrorFields(prev => prev.filter(f => f !== fieldName));
        }
    };

    const handleCalculate = () => {
        const errors = [];
        if (!precioXDocena) errors.push('precioXDocena');
        if (!gastoFijo) errors.push('gastoFijo');
        if (!cantDeDocenas) errors.push('cantDeDocenas');

        if (errors.length > 0) {
            setErrorFields(errors);
            return;
        }

        const pxD = parseFloat(precioXDocena);
        const gF = parseFloat(gastoFijo);
        const cD = parseFloat(cantDeDocenas);

        if (cD === 0) {
            setErrorFields(['cantDeDocenas']);
            return;
        }

        const precioTotal = (pxD * cD) + gF;
        const alCosto = precioTotal / cD;
        setPrecioDocenaAlCosto(alCosto.toFixed(2));
    };

    const handleReset = () => {
        setPrecioXDocena('');
        setCantDeDocenas('');
        setGastoFijo('');
        setPrecioDocenaAlCosto(null);
        setErrorFields([]);
        localStorage.removeItem('gastoFijo');
    };

    return (
        <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl animate-in fade-in duration-500">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 md:p-10 shadow-xl border border-slate-100 dark:border-white/5 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-green-500 text-white rounded-xl shadow-lg shadow-green-200 dark:shadow-none">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Cálculo de Precios</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Precio Docena */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                            Ingrese precio docena
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ingrese dato"
                            value={precioXDocena}
                            onChange={(e) => handleNumericInput(e.target.value, setPrecioXDocena, 'precioXDocena')}
                            className={`w-full h-14 px-4 bg-white border rounded-xl text-lg text-[#000000] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all ${errorFields.includes('precioXDocena') ? 'border-red-500 ring-4 ring-red-50 dark:ring-red-900/20' : 'border-slate-200 dark:border-white/10'
                                }`}
                        />
                    </div>

                    {/* Gasto Fijo */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                            Gasto fijo
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ingrese dato"
                            value={gastoFijo}
                            onChange={(e) => handleNumericInput(e.target.value, setGastoFijo, 'gastoFijo')}
                            className={`w-full h-14 px-4 bg-white border rounded-xl text-lg text-[#000000] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all ${errorFields.includes('gastoFijo') ? 'border-red-500 ring-4 ring-red-50 dark:ring-red-900/20' : 'border-slate-200 dark:border-white/10'
                                }`}
                        />
                    </div>

                    {/* Cantidad de Docenas */}
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                            Ingrese cantidad de docenas
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ingrese dato"
                            value={cantDeDocenas}
                            onChange={(e) => handleNumericInput(e.target.value, setCantDeDocenas, 'cantDeDocenas')}
                            className={`w-full h-14 px-4 bg-white border rounded-xl text-lg text-[#000000] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all ${errorFields.includes('cantDeDocenas') ? 'border-red-500 ring-4 ring-red-50 dark:ring-red-900/20' : 'border-slate-200 dark:border-white/10'
                                }`}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-10">
                    <button
                        onClick={handleCalculate}
                        className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <TrendingUp className="w-5 h-5" />
                        Calcular
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Reiniciar
                    </button>
                </div>

                {/* Result Area */}
                <div className={`mt-8 transition-all duration-300 transform ${precioDocenaAlCosto ? 'scale-100 opacity-100' : 'scale-95 opacity-80'}`}>
                    <div className="bg-slate-50 dark:bg-white/5 border-l-4 border-green-500 p-6 rounded-2xl shadow-sm">
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-1 uppercase tracking-wider text-xs">Precio docena al costo:</p>
                        <div className="flex items-baseline gap-1">
                            {precioDocenaAlCosto ? (
                                <>
                                    <span className="text-3xl font-black text-slate-800 dark:text-white">$</span>
                                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                                        {precioDocenaAlCosto}
                                    </span>
                                </>
                            ) : (
                                <span className="text-4xl font-black text-slate-300 dark:text-slate-700 tracking-tight">--</span>
                            )}
                        </div>
                    </div>
                </div>

                {errorFields.length > 0 && (
                    <p className="text-center text-red-500 font-bold text-sm mt-6 animate-pulse">
                        ⚠️ Por favor complete todos los campos
                    </p>
                )}
            </div>
        </div>
    );
}
