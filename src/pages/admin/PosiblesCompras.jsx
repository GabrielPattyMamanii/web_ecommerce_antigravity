import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Plus, X, Calculator, DollarSign, Save, Loader2, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { convertToWebP, validateImageFile, formatFileSize } from '../../lib/imageUtils';
import { loadDolarConfigFromDB } from '../../lib/dolarConfig';

export function PosiblesCompras() {
    // Main State
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Modal Form State
    const [formData, setFormData] = useState({
        photo: null,
        photoPreview: null,
        productName: '',
        brand: '',
        code: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        quantityDozen: '',
        costDozen: '',
        importExpenses: '',
        notes: '',
        dolarType: null, // 'blue' or 'oficial'
        dolarRate: null,
        dolarLoading: false
    });

    // Load initial items (Mock or separate table if needed, using local state for now as requested "interface similar to Mercaderia Guardada")
    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase.from('posibles_compras').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setItems(data);
        } catch (error) {
            // Table might not exist yet, ignoring for this UI demo phase or defaulting to empty
            console.log('Error fetching items or table missing', error);
        }
    };

    // Calculations
    const calculations = useMemo(() => {
        const qty = parseFloat(formData.quantityDozen) || 0;
        const price = parseFloat(formData.costDozen) || 0;
        const fixed = parseFloat(formData.importExpenses) || 0;

        const totalPurchaseCost = price * qty;

        // Avoid division by zero
        const realUnitCost = qty > 0 ? (totalPurchaseCost + fixed) / (qty * 12) : 0;
        const costPerDozen = qty > 0 ? (totalPurchaseCost + fixed) / qty : 0;

        return {
            totalPurchaseCost,
            realUnitCost,
            costPerDozen
        };
    }, [formData.quantityDozen, formData.costDozen, formData.importExpenses]);

    const arsCalculations = useMemo(() => {
        if (!formData.dolarRate) return { unit: 0, dozen: 0 };
        return {
            unit: calculations.realUnitCost * formData.dolarRate,
            dozen: calculations.costPerDozen * formData.dolarRate
        };
    }, [calculations, formData.dolarRate]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const validation = validateImageFile(file, 10);
        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }

        const originalSize = file.size;

        try {
            // Convert to WebP
            const webpFile = await convertToWebP(file, {
                quality: 0.85,
                maxWidth: 1920,
                maxHeight: 1920
            });

            const compressionPercent = Math.round((1 - webpFile.size / originalSize) * 100);

            // Show compression info
            toast.success(
                `Imagen optimizada: ${formatFileSize(originalSize)} → ${formatFileSize(webpFile.size)} (${compressionPercent}% reducción)`,
                { duration: 3000 }
            );

            setFormData(prev => ({
                ...prev,
                photo: webpFile,
                photoPreview: URL.createObjectURL(webpFile)
            }));
        } catch (error) {
            console.error('Error converting image:', error);
            toast.error('Error al procesar la imagen: ' + error.message);
        }
    };

    const fetchDolar = async (type) => {
        setFormData(prev => ({ ...prev, dolarLoading: true, dolarType: type }));
        try {
            const dolarCfg = await loadDolarConfigFromDB();
            if (dolarCfg.useApi !== false) {
                const response = await fetch(`https://dolarapi.com/v1/dolares/${type}`);
                const data = await response.json();
                setFormData(prev => ({
                    ...prev,
                    dolarRate: data.venta,
                    dolarLoading: false
                }));
                toast.success(`Dólar ${type} actualizado: $${data.venta}`);
            } else {
                const manualVal = parseFloat(dolarCfg.manualValue);
                if (!manualVal) throw new Error('No hay valor manual de dólar configurado');
                setFormData(prev => ({
                    ...prev,
                    dolarRate: manualVal,
                    dolarLoading: false
                }));
                toast.success(`Dólar manual: $${manualVal}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al consultar Dólar API');
            setFormData(prev => ({ ...prev, dolarLoading: false }));
        }
    };

    const handleSave = async () => {
        if (!formData.quantityDozen || !formData.costDozen) {
            toast.error('Complete cantidad y costo');
            return;
        }

        setLoading(true);
        try {
            let photoUrl = formData.photoPreview; // Default to existing if not changed
            if (formData.photo) {
                // Always use .webp extension since we convert all images
                const fileName = `posible_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from('tanda-fotos')
                    .upload(fileName, formData.photo);

                if (!uploadError) {
                    const { data } = supabase.storage.from('tanda-fotos').getPublicUrl(fileName);
                    photoUrl = data.publicUrl;
                }
            }

            const itemData = {
                product_name: formData.productName,
                brand: formData.brand,
                code: formData.code,
                quantity: parseFloat(formData.quantityDozen),
                cost_dozen: parseFloat(formData.costDozen),
                import_expenses: parseFloat(formData.importExpenses) || 0,
                dolar_rate: formData.dolarRate,
                dolar_type: formData.dolarType,
                notes: formData.notes,
                foto_url: photoUrl,
                created_at: new Date().toISOString()
            };

            if (editingId) {
                const { error } = await supabase.from('posibles_compras').update(itemData).eq('id', editingId);
                if (error) throw error;
                toast.success('Actualizado correctamente');
            } else {
                const { error } = await supabase.from('posibles_compras').insert(itemData);
                if (error) throw error;
                toast.success('Guardado en Posibles Compras');
            }

            setIsModalOpen(false);
            setEditingId(null);
            fetchItems();
            resetForm();

        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta posible compra?')) return;
        try {
            const { error } = await supabase.from('posibles_compras').delete().eq('id', id);
            if (error) throw error;
            toast.success('Eliminado');
            fetchItems();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar');
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            photo: null,
            photoPreview: item.foto_url,
            productName: item.product_name,
            brand: item.brand,
            code: item.code,
            purchaseDate: new Date().toISOString().split('T')[0],
            quantityDozen: item.quantity,
            costDozen: item.cost_dozen,
            importExpenses: item.import_expenses,
            notes: item.notes || '',
            dolarType: item.dolar_type,
            dolarRate: item.dolar_rate,
            dolarLoading: false
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            photo: null,
            photoPreview: null,
            productName: '',
            brand: '',
            code: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            quantityDozen: '',
            costDozen: '',
            importExpenses: '',
            notes: '',
            dolarType: null,
            dolarRate: null,
            dolarLoading: false
        });
        setEditingId(null);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10">
            <Toaster position="top-right" />

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <ShoppingCart className="w-8 h-8" />
                    Posibles Compras
                </h1>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-[#d946a6] text-white rounded-lg hover:bg-[#b03082] font-bold shadow-md transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Agregar
                </button>
            </div>

            {/* Empty State / List */}
            {items.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                    <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                    <p className="text-gray-500 dark:text-slate-400">No hay posibles compras registradas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item, idx) => {
                        const totalUsd = (item.cost_dozen * item.quantity) + (item.import_expenses || 0);
                        const unitUsd = totalUsd / (item.quantity * 12);
                        const totalArs = totalUsd * (item.dolar_rate || 0);
                        const unitArs = unitUsd * (item.dolar_rate || 0);

                        return (
                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-all group">
                                {/* Image Container */}
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-slate-700 group">
                                    {item.foto_url ? (
                                        <img src={item.foto_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <ShoppingCart className="w-12 h-12 opacity-20" />
                                        </div>
                                    )}

                                    {/* Actions Overlay */}
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md text-blue-600 dark:text-blue-400 hover:scale-105 transition-transform">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md text-red-600 dark:text-red-400 hover:scale-105 transition-transform">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Total Price Tag - Bottom Right */}
                                    <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm font-bold text-slate-800 dark:text-white text-sm border border-gray-100 dark:border-slate-700">
                                        ${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="text-gray-500 text-xs font-normal">Total</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 space-y-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight uppercase font-serif tracking-wide truncate">{item.product_name}</h3>
                                        <div className="flex gap-2 mt-2">
                                            <span className="inline-block px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded uppercase tracking-wider">{item.brand || 'GEN'}</span>
                                            <span className="inline-block px-2.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded uppercase tracking-wider">{item.code || 'NULL'}</span>
                                        </div>
                                    </div>

                                    {/* USD Section */}
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-900/20">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded">USD</span>
                                            <span className="text-[10px] text-blue-600 dark:text-blue-300 font-medium">Costo x Docena</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0">Unitario Real</span>
                                                ${unitUsd.toFixed(2)}
                                            </span>
                                            <div className="text-right leading-tight">
                                                <div className="font-bold text-blue-700 dark:text-blue-400 text-lg">${(totalUsd / item.quantity).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ARS Section */}
                                    <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-xl p-3 border border-purple-100 dark:border-purple-900/20">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded">ARS</span>
                                            <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium">Precio x Docena</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                <span className="text-[10px] uppercase font-bold text-purple-400 block mb-0">Unidad</span>
                                                ${unitArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                            </span>
                                            <div className="text-right leading-tight">
                                                <div className="font-bold text-purple-700 dark:text-purple-400 text-lg">
                                                    ${(totalArs / item.quantity).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* POPUP MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200">

                        {/* LEFT: Image & Basic Info */}
                        <div className="w-full md:w-5/12 bg-gray-50 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-center border-r border-gray-100 dark:border-slate-700 relative">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 left-4 md:hidden p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className={`w-full bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center mb-6 overflow-hidden relative group cursor-pointer transition-colors hover:border-[#d946a6]/50 ${formData.photoPreview ? '' : 'aspect-square'}`}>
                                {formData.photoPreview ? (
                                    <img src={formData.photoPreview} alt="Preview" className="w-full h-auto max-h-[60vh] object-contain" />
                                ) : (
                                    <>
                                        <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                            <div className="w-12 h-12 text-gray-400 dark:text-slate-500 flex items-center justify-center">
                                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            </div>
                                        </div>
                                        <p className="text-gray-400 dark:text-slate-500 font-medium">Sin Imagen</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handlePhotoChange}
                                />
                            </div>

                            <label className="w-full">
                                <span className="sr-only">Cambiar Foto</span>
                                <div className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-medium cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-2">
                                    <UploadIcon />
                                    Cambiar Foto
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </label>
                        </div>

                        {/* RIGHT: Form & Calculations */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Detalles del Producto</h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Edita la información y recalcula costos fácilmente.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Basic Fields */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nombre del Producto</label>
                                    <input
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.productName}
                                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Marca</label>
                                        <input
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.brand}
                                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Código</label>
                                        <input
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 dark:border-slate-700 my-6"></div>

                                {/* Costos Inputs */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Costos y Precios</h3>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-1 rounded-lg flex mb-4">
                                        <button className="flex-1 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300">UNIDAD</button>
                                        <button className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 rounded shadow-sm">DOCENA</button>
                                        <button className="flex-1 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300">PACK</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Cantidad (DOCENA)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.quantityDozen}
                                                onChange={e => setFormData({ ...formData, quantityDozen: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Costo (DOCENA)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={formData.costDozen}
                                                onChange={e => setFormData({ ...formData, costDozen: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                            <label className="block text-xs text-green-700 dark:text-green-400 mb-1">Costo Total Compra</label>
                                            <div className="text-xl font-bold text-green-700 dark:text-green-400">
                                                $ {calculations.totalPurchaseCost.toLocaleString('en-US')}
                                            </div>
                                        </div>
                                        <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                            <label className="block text-xs text-orange-700 dark:text-orange-400 mb-1">Gastos Importación (FIXED)</label>
                                            <div className="flex items-center gap-1">
                                                <span className="text-orange-700 dark:text-orange-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent text-lg font-bold text-orange-700 dark:text-orange-400 outline-none placeholder-orange-300"
                                                    value={formData.importExpenses}
                                                    onChange={e => setFormData({ ...formData, importExpenses: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded shadow-sm">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Costo Unitario Real:</span>
                                            <span className="font-bold text-slate-800 dark:text-white font-mono">${calculations.realUnitCost.toFixed(2)} USD</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Costo por Docena:</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">${calculations.costPerDozen.toFixed(2)} USD</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Notas Input */}
                                <div className="py-4">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Notas / Comentarios</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                        rows="3"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Detalles sobre el proveedor, calidad, etc."
                                    />
                                </div>

                                {/* Conversión Pesos */}
                                <div className="pt-2">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Conversión a Pesos</h3>

                                    <div className="flex gap-3 mb-4">
                                        <button
                                            onClick={() => fetchDolar('blue')}
                                            className={`flex-1 py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${formData.dolarType === 'blue'
                                                ? 'bg-[#5b3af0] border-[#5b3af0] text-white shadow-lg shadow-indigo-500/30'
                                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:border-[#5b3af0]/50'
                                                }`}
                                        >
                                            <span className="text-xs font-bold uppercase mb-1">Dólar Blue</span>
                                            {formData.dolarType === 'blue' && formData.dolarRate ? (
                                                <span className="text-lg font-bold flex items-center gap-1 animate-in fade-in">
                                                    ${formData.dolarRate.toLocaleString('es-AR')}
                                                </span>
                                            ) : (
                                                <span className="text-xs">(Click para cargar)</span>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => fetchDolar('oficial')}
                                            className={`flex-1 py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${formData.dolarType === 'oficial'
                                                ? 'bg-[#5b3af0] border-[#5b3af0] text-white shadow-lg shadow-indigo-500/30'
                                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:border-[#5b3af0]/50'
                                                }`}
                                        >
                                            <span className="text-xs font-bold uppercase mb-1">Dólar Oficial</span>
                                            {formData.dolarType === 'oficial' && formData.dolarRate ? (
                                                <span className="text-lg font-bold flex items-center gap-1 animate-in fade-in">
                                                    ${formData.dolarRate.toLocaleString('es-AR')}
                                                </span>
                                            ) : (
                                                <span className="text-xs">(Click para cargar)</span>
                                            )}
                                        </button>
                                    </div>

                                    <div className="bg-gradient-to-r from-[#704dfc] to-[#5b3af0] rounded-xl p-5 text-white shadow-lg shadow-indigo-500/20">
                                        <div className="text-xs font-bold opacity-80 uppercase tracking-wider mb-2 border-b border-white/20 pb-2">Precio Final Total (ARS)</div>

                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm opacity-90">x Unidad</span>
                                            <span className="text-4xl font-bold tracking-tight">
                                                {arsCalculations.unit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARG
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm opacity-90">x Docena</span>
                                            <span className="text-2xl font-bold tracking-tight">
                                                {arsCalculations.dozen.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARG
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                                    GUARDAR CAMBIOS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* DETAIL MODAL */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                        {/* Image Section */}
                        <div className="w-full md:w-1/2 bg-gray-100 dark:bg-slate-900/50 relative group">
                            {selectedItem.foto_url ? (
                                <img src={selectedItem.foto_url} alt={selectedItem.product_name} className="w-full h-full object-contain max-h-[50vh] md:max-h-full" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-10">
                                    <ShoppingCart className="w-20 h-20 opacity-20 mb-4" />
                                    <span className="text-sm opacity-50">Sin imagen</span>
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 left-4 md:hidden p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-full shadow-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Details Section */}
                        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto bg-white dark:bg-slate-800">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{selectedItem.product_name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase tracking-wider">
                                            {selectedItem.brand}
                                        </span>
                                        {selectedItem.code && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                #{selectedItem.code}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* DATA GRID */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cantidad</div>
                                        <div className="font-bold text-slate-800 dark:text-white">
                                            {selectedItem.quantity} <span className="text-xs font-normal opacity-70">Docenas</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Costo Docena</div>
                                        <div className="font-bold text-slate-800 dark:text-white">
                                            ${selectedItem.cost_dozen?.toLocaleString('en-US')} <span className="text-xs font-normal opacity-70">USD</span>
                                        </div>
                                    </div>
                                    <div className="p-3 col-span-2 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                        <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Gastos Importación</div>
                                        <div className="font-bold text-orange-700 dark:text-orange-300">
                                            ${selectedItem.import_expenses?.toLocaleString('en-US')} <span className="text-xs font-normal opacity-70">USD (Fijo)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 dark:border-slate-700"></div>

                                {/* COSTS USD */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                                            <DollarSign size={14} />
                                        </div>
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Costos Reales (USD)</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Unitario Real</span>
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                ${(((selectedItem.cost_dozen * selectedItem.quantity) + (selectedItem.import_expenses || 0)) / (selectedItem.quantity * 12)).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Docena</span>
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                ${(((selectedItem.cost_dozen * selectedItem.quantity) + (selectedItem.import_expenses || 0)) / selectedItem.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Costo Total Lote</span>
                                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-lg">
                                                ${((selectedItem.cost_dozen * selectedItem.quantity) + (selectedItem.import_expenses || 0)).toLocaleString('en-US')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 dark:border-slate-700"></div>

                                {/* PRICES ARS */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
                                                <Calculator size={14} />
                                            </div>
                                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Precios Finales (ARS)</h3>
                                        </div>
                                        <div className="px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600 text-[10px] text-gray-500 dark:text-gray-400">
                                            Dólar: ${selectedItem.dolar_rate?.toLocaleString('es-AR')} ({selectedItem.dolar_type})
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                            <div className="text-xs text-purple-600 dark:text-purple-300 uppercase font-bold mb-1 opacity-80">Por Unidad</div>
                                            <div className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                                                {((((selectedItem.cost_dozen * selectedItem.quantity) + (selectedItem.import_expenses || 0)) / (selectedItem.quantity * 12)) * selectedItem.dolar_rate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg text-purple-500">ARG</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Por Docena</div>
                                            <div className="text-xl font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                                                {((((selectedItem.cost_dozen * selectedItem.quantity) + (selectedItem.import_expenses || 0)) / selectedItem.quantity) * selectedItem.dolar_rate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm opacity-50">ARG</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedItem(null);
                                            handleEdit(selectedItem);
                                        }}
                                        className="flex-1 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Pencil size={18} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="flex-1 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                                    >
                                        Cerrar Resumen
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple Icon component
const UploadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
);
