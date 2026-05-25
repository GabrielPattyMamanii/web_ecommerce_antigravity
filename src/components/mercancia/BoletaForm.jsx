import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Trash2, Plus, Edit2, ArrowLeft, User } from 'lucide-react';
import { BoletaImageUploader } from './BoletaImageUploader';
import { PropietarioResumen } from './PropietarioResumen';

export function BoletaForm({ boleta, onSave, onCancel, onDelete, readOnly = false }) {
    const [isEditing, setIsEditing] = useState(!boleta && !readOnly);
    const [imageFile, setImageFile] = useState(null);
    const [formData, setFormData] = useState({
        houseName: '',
        code: '',
        date: new Date().toISOString().split('T')[0],
        estado: true, // TRUE/FALSE - affects CANT_BULTOS_PAGAR_ID
        customBundles: '', // Manual override for bundles count
        items: [],
        imageUrl: null
    });

    // Autocomplete state per row: { [itemId]: boolean }
    const [openDropdown, setOpenDropdown] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (boleta) {
            setFormData(boleta);
            setIsEditing(false);
        } else {
            // Initialize with one empty row for new boletas
            setFormData(prev => ({
                ...prev,
                items: [{ id: Date.now(), codigo: '', bultos: '', cantidad: '', precioDocena: '', propietario: '' }]
            }));
        }
    }, [boleta]);

    // Close dropdown on outside click
    useEffect(() => {
        const handle = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Collect all unique owner names already used across items (for autocomplete)
    const knownOwners = useMemo(() => {
        const names = new Set();
        if (formData.houseName && formData.houseName.trim() !== '') {
            names.add(formData.houseName.trim());
        }
        formData.items.forEach(item => {
            if (item.propietario && item.propietario.trim() !== '') {
                names.add(item.propietario.trim());
            }
        });
        return [...names];
    }, [formData.items, formData.houseName]);

    const handleHeaderChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), codigo: '', bultos: '', cantidad: '', precioDocena: '', propietario: '' }]
        }));
    };

    const removeItem = (id) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const calculateRowTotal = (item) => {
        const cantidad = parseFloat(item.cantidad) || 0;
        const precioDocena = parseFloat(item.precioDocena) || 0;
        return precioDocena * cantidad;
    };

    const calculateGrandTotal = () => {
        return formData.items.reduce((sum, item) => sum + calculateRowTotal(item), 0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, total: calculateGrandTotal(), imageFile });
        setIsEditing(false);
    };

    // Get suggestions filtered by current input value
    const getFilteredSuggestions = (currentValue) => {
        if (!currentValue || currentValue.trim() === '') return knownOwners;
        const lc = currentValue.toLowerCase();
        return knownOwners.filter(n => n.toLowerCase().includes(lc) && n.toLowerCase() !== lc);
    };

    // Color dot per propietario name (consistent per name)
    const ownerColors = ['bg-[#49EBBD]', 'bg-violet-400', 'bg-amber-400', 'bg-pink-400', 'bg-blue-400', 'bg-orange-400'];
    const ownerColorMap = useMemo(() => {
        const map = {};
        let idx = 0;
        knownOwners.forEach(name => {
            if (!map[name]) {
                map[name] = ownerColors[idx % ownerColors.length];
                idx++;
            }
        });
        return map;
    }, [knownOwners]);

    const getDotColor = (name) => {
        if (!name || name.trim() === '') return 'bg-gray-600';
        const trimmed = name.trim();
        return ownerColorMap[trimmed] || 'bg-gray-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver
                </button>
                <div className="flex gap-2">
                    {!isEditing && !readOnly && (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                            >
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(formData)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Eliminar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 space-y-8">
                {/* Header Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Nombre Casa</label>
                        <input
                            type="text"
                            disabled={!isEditing}
                            value={formData.houseName}
                            onChange={(e) => handleHeaderChange('houseName', e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none disabled:opacity-50"
                            placeholder="Ej: Nike Store"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Código Boleta</label>
                        <input
                            type="text"
                            disabled={!isEditing}
                            value={formData.code}
                            onChange={(e) => handleHeaderChange('code', e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none disabled:opacity-50"
                            placeholder="Ej: B-001"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Fecha</label>
                        <input
                            type="date"
                            disabled={!isEditing}
                            value={formData.date}
                            onChange={(e) => handleHeaderChange('date', e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none disabled:opacity-50"
                            required
                        />
                    </div>
                </div>

                {/* Estado and Custom Bundles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black/20 rounded-xl border border-gray-700">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Estado de Boleta</label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                disabled={!isEditing}
                                onClick={() => handleHeaderChange('estado', !formData.estado)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${formData.estado ? 'bg-[#49EBBD]' : 'bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${formData.estado ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                            <span className="text-white font-medium">
                                {formData.estado ? 'Incluir en cálculo' : 'No incluir'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Si está en TRUE, los bultos de esta boleta se suman a CANT_BULTOS_PAGAR_ID
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Bultos Personalizados (Opcional)</label>
                        <input
                            type="number"
                            disabled={!isEditing}
                            value={formData.customBundles}
                            onChange={(e) => handleHeaderChange('customBundles', e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#49EBBD] outline-none disabled:opacity-50"
                            placeholder="Dejar vacío para calcular automáticamente"
                        />
                        <p className="text-xs text-gray-500">
                            Si se especifica, este valor reemplaza la suma de bultos de los productos
                        </p>
                    </div>
                </div>

                {/* Image Upload */}
                <BoletaImageUploader
                    imageUrl={formData.imageUrl}
                    onImageChange={(file) => {
                        setImageFile(file);
                        if (!file) {
                            setFormData(prev => ({ ...prev, imageUrl: null }));
                        }
                    }}
                    boletaName={formData.houseName || formData.code}
                    readOnly={!isEditing}
                />

                {/* Items Table */}
                <div className="overflow-x-auto" ref={dropdownRef}>
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="py-4 px-2">Código</th>
                                <th className="py-4 px-2 text-center">Bultos</th>
                                <th className="py-4 px-2 text-center">Cant/Bulto</th>
                                <th className="py-4 px-2 text-right">Precio/Doc</th>
                                <th className="py-4 px-2 text-right">Total Fila</th>
                                <th className="py-4 px-2">
                                    <span className="flex items-center gap-1 text-[#49EBBD]/80">
                                        <User className="w-3.5 h-3.5" />
                                        Propietario
                                    </span>
                                </th>
                                {isEditing && <th className="py-4 px-2 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {formData.items.map((item) => {
                                const suggestions = getFilteredSuggestions(item.propietario);
                                const showDropdown = openDropdown === item.id && suggestions.length > 0 && isEditing;
                                const dotColor = getDotColor(item.propietario);

                                return (
                                    <tr key={item.id} className="group hover:bg-white/5 relative">
                                        <td className="py-3 px-2">
                                            <input
                                                type="text"
                                                disabled={!isEditing}
                                                value={item.codigo}
                                                onChange={(e) => handleItemChange(item.id, 'codigo', e.target.value)}
                                                className="w-full bg-transparent border-b border-gray-700 focus:border-[#49EBBD] outline-none py-1 text-white disabled:border-transparent"
                                                placeholder="COD..."
                                            />
                                        </td>
                                        <td className="py-3 px-2">
                                            <input
                                                type="number"
                                                disabled={!isEditing}
                                                value={item.bultos}
                                                onChange={(e) => handleItemChange(item.id, 'bultos', e.target.value)}
                                                className="w-full bg-transparent border-b border-gray-700 focus:border-[#49EBBD] outline-none py-1 text-white text-center disabled:border-transparent"
                                            />
                                        </td>
                                        <td className="py-3 px-2">
                                            <input
                                                type="number"
                                                disabled={!isEditing}
                                                value={item.cantidad}
                                                onChange={(e) => handleItemChange(item.id, 'cantidad', e.target.value)}
                                                className="w-full bg-transparent border-b border-gray-700 focus:border-[#49EBBD] outline-none py-1 text-white text-center disabled:border-transparent"
                                            />
                                        </td>
                                        <td className="py-3 px-2">
                                            <input
                                                type="number"
                                                disabled={!isEditing}
                                                value={item.precioDocena}
                                                onChange={(e) => handleItemChange(item.id, 'precioDocena', e.target.value)}
                                                className="w-full bg-transparent border-b border-gray-700 focus:border-[#49EBBD] outline-none py-1 text-white text-right disabled:border-transparent"
                                            />
                                        </td>
                                        <td className="py-3 px-2 text-right font-mono font-medium text-[#49EBBD]">
                                            ${calculateRowTotal(item).toFixed(2)}
                                        </td>

                                        {/* Owner cell */}
                                        <td className="py-3 px-2 relative" style={{ minWidth: '150px' }}>
                                            <div className="flex items-center gap-2">
                                                {/* Color dot */}
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${dotColor}`} />
                                                {isEditing ? (
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={item.propietario || ''}
                                                            onChange={(e) => {
                                                                handleItemChange(item.id, 'propietario', e.target.value);
                                                                setOpenDropdown(item.id);
                                                            }}
                                                            onFocus={() => setOpenDropdown(item.id)}
                                                            className="w-full bg-transparent border-b border-gray-700 focus:border-[#49EBBD] outline-none py-1 text-white text-sm placeholder:text-gray-600"
                                                            placeholder={formData.houseName || 'Sin asignar'}
                                                        />
                                                        {/* Autocomplete dropdown */}
                                                        {showDropdown && (
                                                            <div className="absolute top-full left-0 mt-1 z-50 bg-[#111] border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                                                                {suggestions.map(name => (
                                                                    <button
                                                                        key={name}
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            handleItemChange(item.id, 'propietario', name);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#49EBBD]/10 hover:text-[#49EBBD] flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ownerColorMap[name] || 'bg-gray-500'}`} />
                                                                        {name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-300 truncate">
                                                        {item.propietario && item.propietario.trim() !== ''
                                                            ? item.propietario
                                                            : <span className="text-gray-600 italic">{formData.houseName || '—'}</span>
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {isEditing && (
                                            <td className="py-3 px-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={isEditing ? 7 : 6} className="pt-4">
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="flex items-center gap-2 text-sm text-[#49EBBD] hover:underline"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar Fila
                                        </button>
                                    )}
                                </td>
                            </tr>
                            <tr className="border-t-2 border-gray-700">
                                <td colSpan="5" className="py-6 text-right text-lg font-bold text-white">TOTAL SUMATORIA:</td>
                                <td className="py-6 px-2 text-right text-2xl font-bold text-[#49EBBD]">
                                    ${calculateGrandTotal().toFixed(2)}
                                </td>
                                {isEditing && <td></td>}
                            </tr>
                            {/* Custom Bundles Override Field */}
                            <tr>
                                <td colSpan="5" className="py-2 text-right text-sm font-bold text-gray-400">Total Bultos (Manual - Opcional):</td>
                                <td className="py-2 px-2">
                                    <input
                                        type="number"
                                        disabled={!isEditing}
                                        value={formData.customBundles}
                                        onChange={(e) => handleHeaderChange('customBundles', e.target.value)}
                                        className="w-full bg-black/40 border-b border-gray-700 focus:border-[#49EBBD] outline-none py-1 text-white text-right disabled:border-transparent font-mono text-lg"
                                        placeholder="Auto"
                                    />
                                </td>
                                {isEditing && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* ── Resumen por propietario ── */}
                <PropietarioResumen
                    items={formData.items}
                    globalOwner={formData.houseName}
                    show={formData.items.length > 0}
                />

                {isEditing && (
                    <div className="flex justify-end pt-4 border-t border-gray-800">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-8 py-3 bg-[#49EBBD] text-black font-bold rounded-xl hover:bg-[#3ddeb1] transition-all shadow-lg shadow-[#49EBBD]/20"
                        >
                            <Save className="w-5 h-5" />
                            Guardar Boleta
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
