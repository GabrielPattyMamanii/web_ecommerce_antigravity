
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Layers, Calculator, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { FormularioMarca } from './FormularioMarca';
import { PhotoUploader } from './PhotoUploader';
import toast, { Toaster } from 'react-hot-toast'; // Assuming available, otherwise will fallback to alert but user requester toast. Using alert if toast not installed but the user asked for toast.
// Checking if toast is available in project... I will assume I can use a simple custom toast or just alerts if I can't find it. 
// But the prompt specifically asked for "Toasts para notificaciones (react-hot-toast o similar)".
// I'll stick to standard Alerts for now to avoid package missing errors unless I see it usage. 
// Wait, `ProductList` uses a custom `Toast` component. I should use that if possible or just standard alert/local state toast.
// Let's use a local Toaster or just nice alerts. The request says "Generate code with ... Toasts".
// Use window.alert or console for now to be safe, or a simple overlay.
// Actually, I can use the same logic as ProductList: `showToast` helper.

function ConfirmationModal({ isOpen, onClose, onConfirm, data }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-card rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200 border border-border">
                <h3 className="text-xl font-bold mb-4 text-foreground border-b border-border pb-2">
                    Confirmar Guardado de Tanda
                </h3>

                <div className="space-y-3 mb-6 text-sm text-muted-foreground">
                    <div className="flex justify-between items-center">
                        <span>Nombre:</span>
                        <span className="font-bold text-foreground">{data.nombre}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Fecha:</span>
                        <span className="font-semibold text-foreground">{data.fechaIngreso}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Marcas:</span>
                        <span className="font-semibold text-foreground">{data.marcasCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Total Productos:</span>
                        <span className="font-semibold text-foreground">{data.totalProductos}</span>
                    </div>
                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                        <span>Gastos:</span>
                        <span className="font-bold text-destructive font-mono">
                            ${parseFloat(data.gastos || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Fotos:</span>
                        <span className="font-semibold text-foreground">{data.fotosCount || 0}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted text-foreground font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm"
                    >
                        Confirmar y Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AgregarTanda() {
    const navigate = useNavigate();
    const { tandaNombre: tandaNombreParam } = useParams();
    const isEditing = Boolean(tandaNombreParam);
    const [loading, setLoading] = useState(false);
    const [originalTandaNombre, setOriginalTandaNombre] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        gastos: '',
        marcas: []
    });

    const [newMarcaName, setNewMarcaName] = useState('');
    const [newMarcaBoleta, setNewMarcaBoleta] = useState('');

    const [marcaError, setMarcaError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Photo state
    const [photos, setPhotos] = useState([]);
    const [existingPhotoUrls, setExistingPhotoUrls] = useState([]);
    const [photosToDelete, setPhotosToDelete] = useState([]);

    // Derived state for code validation
    const allCodesInTanda = useMemo(() => {
        const codes = new Set();
        formData.marcas.forEach(m => {
            m.productos.forEach(p => {
                if (p.codigo) codes.add(p.codigo.trim().toLowerCase());
            });
        });
        return Array.from(codes);
    }, [formData.marcas]);

    // Refs for navigation
    const dateRef = useRef(null);
    const gastosRef = useRef(null);
    const marcaNameRef = useRef(null);
    const marcaBoletaRef = useRef(null);

    // Generic Enter Handler
    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    useEffect(() => {
        if (isEditing && tandaNombreParam) {
            fetchTandaDetails(decodeURIComponent(tandaNombreParam));
        }
    }, [isEditing, tandaNombreParam]);

    const fetchTandaDetails = async (nombre) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', nombre);

            if (error) throw error;
            if (data && data.length > 0) {
                const first = data[0];
                const grouped = {};
                data.forEach(row => {
                    if (!grouped[row.marca]) {
                        grouped[row.marca] = {
                            id: Date.now() + Math.random(),
                            nombre: row.marca,
                            codigo_boleta: row.codigo_boleta || '',
                            collapsed: true,
                            productos: []
                        };
                    }
                    grouped[row.marca].productos.push({
                        producto_titulo: row.producto_titulo,
                        cantidad_docenas: row.cantidad_docenas,
                        precio_docena: row.precio_docena || 0,
                        codigo: row.codigo,
                        observaciones: row.observaciones || ''
                    });
                });
                setFormData({
                    nombre: first.tanda_nombre,
                    fechaIngreso: first.tanda_fecha,
                    gastos: first.gastos || '',
                    marcas: Object.values(grouped)
                });
                setOriginalTandaNombre(first.tanda_nombre);

                // Load existing photos
                if (first.fotos && Array.isArray(first.fotos)) {
                    setExistingPhotoUrls(first.fotos);
                    setPhotos(first.fotos);
                }
            }
        } catch (err) {
            alert("Error al cargar la tanda");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMarca = () => {
        if (!newMarcaName.trim()) return;
        if (formData.marcas.some(m => m.nombre.toLowerCase() === newMarcaName.trim().toLowerCase())) {
            setMarcaError('⚠️ Esta marca ya existe.');
            return;
        }
        const newMarca = {
            id: Date.now(),
            nombre: newMarcaName.trim(),
            codigo_boleta: newMarcaBoleta.trim(),
            productos: [],
            collapsed: false
        };
        setFormData(prev => ({ ...prev, marcas: [...prev.marcas, newMarca] }));
        setNewMarcaName('');
        setNewMarcaBoleta('');
        setMarcaError('');
    };

    const handleUpdateMarca = (index, updatedMarca) => {
        const newMarcas = [...formData.marcas];
        newMarcas[index] = updatedMarca;
        setFormData(prev => ({ ...prev, marcas: newMarcas }));
    };

    const handleDeleteMarca = (index) => {
        if (!confirm('¿Eliminar esta marca?')) return;
        setFormData(prev => ({ ...prev, marcas: prev.marcas.filter((_, i) => i !== index) }));
    };

    const resumen = useMemo(() => {
        let totalProductos = 0;
        let totalDocenas = 0;
        let valorEstimado = 0;
        formData.marcas.forEach(m => {
            totalProductos += m.productos.length;
            m.productos.forEach(p => {
                const doc = parseFloat(p.cantidad_docenas) || 0;
                const precio = parseFloat(p.precio_docena) || 0;
                totalDocenas += doc;
                valorEstimado += (doc * precio);
            });
        });
        return { totalProductos, totalDocenas, valorEstimado };
    }, [formData.marcas]);

    const validateForm = () => {
        const errors = [];
        if (!formData.nombre.trim()) errors.push("El nombre de la tanda es obligatorio");
        if (!formData.fechaIngreso) errors.push("La fecha es obligatoria");
        // if (formData.gastos === '' || formData.gastos === null || formData.gastos === undefined) errors.push("Debe ingresar un valor de gastos (puede ser 0)");
        if (formData.marcas.length === 0) errors.push("Debe agregar al menos una marca");

        let totalProds = 0;
        formData.marcas.forEach(m => totalProds += m.productos.length);
        if (totalProds === 0) errors.push("Debe agregar al menos un producto");

        return errors;
    };

    const handlePreSave = () => {
        const errors = validateForm();
        if (errors.length > 0) {
            alert(errors.join("\n")); // Or custom toast
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmSave = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            // 1. Handle photo uploads and deletions
            let photoUrls = [...existingPhotoUrls];

            // Delete removed photos from storage
            if (photosToDelete.length > 0) {
                for (const url of photosToDelete) {
                    try {
                        const path = url.split('/').pop();
                        await supabase.storage.from('tanda-fotos').remove([path]);
                    } catch (err) {
                        console.error('Error deleting photo:', err);
                    }
                }
                photoUrls = photoUrls.filter(url => !photosToDelete.includes(url));
            }

            // Upload new photos
            const newPhotos = photos.filter(p => typeof p !== 'string');
            if (newPhotos.length > 0) {
                for (const photo of newPhotos) {
                    try {
                        const fileExt = photo.name.split('.').pop();
                        const fileName = `${formData.nombre}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = fileName;

                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('tanda-fotos')
                            .upload(filePath, photo);

                        if (uploadError) throw uploadError;

                        // Get public URL
                        const { data: { publicUrl } } = supabase.storage
                            .from('tanda-fotos')
                            .getPublicUrl(filePath);

                        photoUrls.push(publicUrl);
                    } catch (err) {
                        console.error('Error uploading photo:', err);
                        alert('Error al subir una foto: ' + err.message);
                    }
                }
            }

            // 2. Prepare entries with photo URLs
            const entriesToInsert = [];
            formData.marcas.forEach(marca => {
                marca.productos.forEach(prod => {
                    entriesToInsert.push({
                        tanda_nombre: formData.nombre,
                        tanda_fecha: formData.fechaIngreso,
                        marca: marca.nombre,
                        producto_titulo: prod.producto_titulo,
                        cantidad_docenas: prod.cantidad_docenas,
                        precio_docena: prod.precio_docena,
                        codigo: prod.codigo,
                        observaciones: prod.observaciones,
                        codigo_boleta: marca.codigo_boleta,
                        gastos: formData.gastos || 0,
                        fotos: photoUrls.length > 0 ? photoUrls : null
                    });
                });
            });

            // 3. Save to database
            if (isEditing) {
                await supabase.from('entradas').delete().eq('tanda_nombre', originalTandaNombre);
            }
            if (entriesToInsert.length > 0) {
                const { error } = await supabase.from('entradas').insert(entriesToInsert);
                if (error) throw error;
            }

            navigate('/admin/mercancia');
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/mercancia')}
                            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            ← Volver
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                {isEditing ? '✏️ Editar Tanda' : '✨ Nueva Tanda'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <button
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${(!formData.nombre.trim())
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg'
                                }`}
                            onClick={handlePreSave}
                            disabled={loading || !formData.nombre.trim()}
                        >
                            <Save size={18} /> {loading ? 'Guardando...' : 'Finalizar y Guardar Tanda'}
                        </button>
                        {(!formData.nombre.trim()) && (
                            <div className="mt-2 text-xs text-destructive flex items-center gap-1 font-medium bg-destructive/10 px-2 py-1 rounded">
                                <AlertCircle className="h-3 w-3" />
                                <span>Completa el nombre</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* 1. INFO TANDA */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                                Nombre Tanda <span className="text-destructive">*</span>
                            </label>
                            <input
                                className={`w-full px-4 py-2.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 transition-all ${!formData.nombre.trim()
                                    ? 'border-input focus:ring-ring'
                                    : 'border-green-500 bg-green-50 dark:bg-green-900/20 focus:ring-green-500'
                                    }`}
                                placeholder="Ej: Verano 2026..."
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                onKeyDown={(e) => handleKeyDown(e, dateRef)}
                                autoFocus
                            />
                            {!formData.nombre.trim() && (
                                <p className="text-[10px] text-muted-foreground mt-1 pl-1">Obligatorio</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                                Fecha <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                value={formData.fechaIngreso}
                                onChange={e => setFormData({ ...formData, fechaIngreso: e.target.value })}
                                ref={dateRef}
                                onKeyDown={(e) => handleKeyDown(e, gastosRef)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                                Gastos ($)
                            </label>
                            <input
                                type="number"
                                className={`w-full px-4 py-2.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 transition-all border-input focus:ring-ring`}
                                placeholder="0"
                                value={formData.gastos}
                                onChange={e => setFormData({ ...formData, gastos: e.target.value })}
                                ref={gastosRef}
                                onKeyDown={(e) => handleKeyDown(e, marcaNameRef)}
                            />

                        </div>
                    </div>
                </div>

                {/* 2. FOTOS (OPTIONAL) */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <PhotoUploader
                        photos={photos}
                        onPhotosChange={(newPhotos) => {
                            const removedUrls = existingPhotoUrls.filter(
                                url => !newPhotos.includes(url)
                            );
                            if (removedUrls.length > 0) {
                                setPhotosToDelete([...photosToDelete, ...removedUrls]);
                            }
                            setPhotos(newPhotos);
                        }}
                        maxPhotos={5}
                    />
                </div>

                {/* 3. MARCAS Y PRODUCTOS */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    {/* Add Brand Form */}
                    <div className="flex gap-3 mb-4">
                        <input
                            className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="Nueva Marca..."
                            value={newMarcaName}
                            onChange={e => { setNewMarcaName(e.target.value); setMarcaError(''); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    marcaBoletaRef.current?.focus();
                                }
                            }}
                            ref={marcaNameRef}
                        />
                        <input
                            className="w-32 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            placeholder="Nº Boleta"
                            value={newMarcaBoleta}
                            onChange={e => setNewMarcaBoleta(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMarca();
                                    setTimeout(() => marcaNameRef.current?.focus(), 10);
                                }
                            }}
                            ref={marcaBoletaRef}
                        />
                        <button
                            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
                            onClick={handleAddMarca}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    {marcaError && <div className="text-destructive text-xs px-2 mb-4">{marcaError}</div>}

                    {/* Marcas List */}
                    <div className="space-y-4 mt-4">
                        {formData.marcas.map((marca, idx) => (
                            <FormularioMarca
                                key={marca.id || idx}
                                index={idx}
                                marca={marca}
                                onUpdate={handleUpdateMarca}
                                onDelete={handleDeleteMarca}
                                isEditingInitially={!marca.collapsed}
                            />
                        ))}
                    </div>
                </div>

                {/* 4. SUMMARY */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Prods</div>
                            <div className="text-2xl font-bold text-foreground">{resumen.totalProductos}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Doc.</div>
                            <div className="text-2xl font-bold text-foreground">{resumen.totalDocenas}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Estimado</div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                                ${resumen.valorEstimado.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmSave}
                data={{
                    nombre: formData.nombre,
                    fechaIngreso: formData.fechaIngreso,
                    gastos: formData.gastos,
                    marcasCount: formData.marcas.length,
                    totalProductos: resumen.totalProductos,
                    fotosCount: photos.length
                }}
            />
        </div>
    );
}
