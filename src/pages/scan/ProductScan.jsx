import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calcPrice, formatARS } from '../../utils/pricingUtils';

export function ProductScan() {
    const { productId } = useParams();

    const [product, setProduct] = useState(null);
    const [precioARS, setPrecioARS] = useState(null);
    const [precioUSD, setPrecioUSD] = useState(null);
    const [dolarVenta, setDolarVenta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [inputValue, setInputValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchAll();
    }, [productId]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // 1. Producto + campos de costo
            const { data, error } = await supabase
                .from('entradas')
                .select('id, producto_titulo, marca, cant_docenas_copy, cantidad_docenas, codigo, precio_docena, gastos, bultos, tanda_nombre')
                .eq('id', productId)
                .maybeSingle();

            if (error) throw error;
            if (!data) { setNotFound(true); return; }
            setProduct(data);

            // 2. Índice de ganancia de la tanda
            const { data: tandaSettings } = await supabase
                .from('tanda_settings')
                .select('indice_ganancia_valor')
                .eq('tanda_nombre', data.tanda_nombre)
                .maybeSingle();

            const indice = tandaSettings?.indice_ganancia_valor ?? 1.5;

            // 3. Dólar blue en vivo
            let dolar = null;
            try {
                const res = await fetch('https://dolarapi.com/v1/dolares/blue');
                if (res.ok) {
                    const json = await res.json();
                    dolar = json?.venta ?? null;
                }
            } catch { /* sin conexión a la API */ }

            setDolarVenta(dolar);

            // 4. Calcular precio
            const { precioDeVenta, precioVentaArg } = calcPrice(data, {
                indice_ganancia_valor: indice,
                cotizacion_dolar: dolar ?? 0,
            });

            setPrecioUSD(precioDeVenta);
            setPrecioARS(precioVentaArg);

        } catch (err) {
            console.error(err);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const cantActual = product
        ? (product.cant_docenas_copy ?? product.cantidad_docenas ?? 0)
        : 0;

    const handleSave = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        const val = parseFloat(inputValue);

        if (isNaN(val) || val <= 0) {
            setErrorMsg('Ingresa un valor válido mayor a 0.');
            return;
        }
        if (val > cantActual) {
            setErrorMsg(`No puedes restar más de ${cantActual} docenas disponibles.`);
            return;
        }

        setSaving(true);
        try {
            const newCant = cantActual - val;

            const { error } = await supabase.rpc('restar_cant_docenas_copy', {
                entrada_id: String(productId),
                cantidad: val
            });

            if (error) throw error;

            setProduct(prev => ({ ...prev, cant_docenas_copy: newCant }));
            setInputValue('');
            setSuccessMsg(`✓ Se restaron ${val} docenas. Restante: ${newCant}`);
        } catch (err) {
            setErrorMsg('Error al guardar. Intenta de nuevo.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // ───── Render states ─────

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Cargando producto...</p>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-6">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h1 className="text-white text-xl font-bold mb-2">Producto no encontrado</h1>
                    <p className="text-slate-400 text-sm">El QR escaneado no corresponde a ningún producto activo.</p>
                </div>
            </div>
        );
    }

    const hasPrecio = precioARS != null;

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-start px-5 py-10 font-sans">

            {/* Badge */}
            <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">Control de Mercancía</span>
            </div>

            {/* Product Card */}
            <div className="w-full max-w-sm bg-[#1e293b] rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden">

                {/* Header stripe */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 pt-8 pb-10">
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">{product.marca}</p>
                    <h1 className="text-white text-2xl font-bold leading-tight">{product.producto_titulo}</h1>
                    {product.codigo && (
                        <p className="text-indigo-200 text-xs mt-2 font-mono">Cód: {product.codigo}</p>
                    )}
                </div>

                {/* Precio de venta sugerido */}
                <div className="px-6 -mt-5">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 shadow-inner">
                        <p className="text-emerald-400 text-xs uppercase tracking-wide font-semibold mb-2">Precio de Venta Sugerido</p>
                        {hasPrecio ? (
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <p className="text-3xl font-black text-emerald-300 leading-none">
                                        {formatARS(precioARS)}
                                    </p>
                                    <p className="text-emerald-700 text-xs mt-1 font-mono">
                                        USD {Number(precioUSD).toFixed(2)} · Blue ${Number(dolarVenta).toLocaleString('es-AR')}
                                    </p>
                                </div>
                                <span className="text-2xl shrink-0">🏷️</span>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">
                                {dolarVenta == null ? 'Sin cotización del dólar' : 'Sin precio configurado'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Cantidad restante */}
                <div className="px-6 mt-4">
                    <div className="bg-[#0f172a] rounded-2xl border border-slate-700 px-6 py-5 flex items-center justify-between shadow-inner">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-1">Cantidad Restante</p>
                            <p className="text-5xl font-black text-white leading-none">{cantActual}</p>
                            <p className="text-slate-500 text-xs mt-1">docenas disponibles</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center">
                            <span className="text-2xl">📦</span>
                        </div>
                    </div>
                </div>

                {/* Input section */}
                <div className="px-6 py-6 space-y-4">
                    <div>
                        <label className="text-slate-300 text-sm font-semibold block mb-2">
                            ¿Cuántas docenas retirar?
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="w-full bg-[#0f172a] border border-slate-600 focus:border-indigo-500 text-white text-xl font-bold text-center rounded-xl px-4 py-4 outline-none transition-colors placeholder:text-slate-600"
                            placeholder="0"
                            value={inputValue}
                            onChange={e => {
                                setInputValue(e.target.value);
                                setErrorMsg('');
                                setSuccessMsg('');
                            }}
                        />
                    </div>

                    {inputValue && !isNaN(parseFloat(inputValue)) && parseFloat(inputValue) > 0 && (
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700">
                            <span className="text-slate-400 text-sm">Resultará en:</span>
                            <span className={`text-lg font-black ${(cantActual - parseFloat(inputValue)) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {cantActual - parseFloat(inputValue)} doc.
                            </span>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3 font-medium">
                            {successMsg}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving || !inputValue}
                        className={`w-full py-4 rounded-2xl text-base font-bold transition-all duration-200
                            ${saving || !inputValue
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Guardando...
                            </span>
                        ) : 'Guardar'}
                    </button>
                </div>
            </div>

            <p className="mt-8 text-slate-600 text-xs text-center max-w-xs">
                Los cambios se reflejan en tiempo real en el panel de Control de Mercancía.
            </p>
        </div>
    );
}
