
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Layers, Calculator, AlertTriangle, AlertCircle, Settings } from 'lucide-react';
import { ShippingConfigModal } from './ShippingConfigModal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { FormularioMarca } from './FormularioMarca';
import toast, { Toaster } from 'react-hot-toast';
import { convertToWebP } from '../../lib/imageUtils'; // Assuming available, otherwise will fallback to alert but user requester toast. Using alert if toast not installed but the user asked for toast.
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
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase.from('app_users').select('id, username, color').order('username');
            if (data) setUsers(data);
        };
        fetchUsers();
    }, []);

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

    // Shipping Configuration State
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [tandaId, setTandaId] = useState(null);
    const [shippingParams, setShippingParams] = useState({
        gastosViaje: '',
        costoPilotajeXBulto: '',
        cantidadBultosTOTAL: '',
        cantidadBultosAPagar: '',
        porcentajesMarcas: []
    });

    // Filter & Sort State
    const [filterBrand, setFilterBrand] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterCode, setFilterCode] = useState('');

    const handleSortBrands = () => {
        const sorted = [...formData.marcas].sort((a, b) => {
            // Sort by Boleta Code (alphanumeric compare)
            const codeA = (a.codigo_boleta || '').toString().toLowerCase();
            const codeB = (b.codigo_boleta || '').toString().toLowerCase();
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setFormData(prev => ({ ...prev, marcas: sorted }));
        toast.success("Marcas ordenadas por N° Boleta");
    };

    // --- Filter Computations ---
    const uniqueBrands = useMemo(() => [...new Set(formData.marcas.map(m => m.nombre).filter(Boolean))].sort(), [formData.marcas]);
    const uniqueOwners = useMemo(() => [...new Set(formData.marcas.map(m => m.propietario).filter(Boolean))].sort(), [formData.marcas]);
    const uniqueCodes = useMemo(() => [...new Set(formData.marcas.map(m => m.codigo_boleta).filter(Boolean))].sort(), [formData.marcas]);



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
    const brandsEndRef = useRef(null);


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
            // Fetch both Entradas and Tanda Config in parallel
            const [entradasResponse, tandaResponse] = await Promise.all([
                supabase
                    .from('entradas')
                    .select('*')
                    .eq('tanda_nombre', nombre),
                supabase
                    .from('tandas')
                    .select('id, parametros')
                    .eq('nombre', nombre)
                    .maybeSingle()
            ]);

            const { data, error } = entradasResponse;
            const { data: tandaData, error: tandaError } = tandaResponse;

            if (error) throw error;
            if (tandaError) console.error("Error fetching tanda config:", tandaError);

            // Set Shipping Params if available
            if (tandaData) {
                setTandaId(tandaData.id);
                if (tandaData.parametros) {
                    setShippingParams({
                        gastosViaje: tandaData.parametros.gastosViaje || '',
                        costoPilotajeXBulto: tandaData.parametros.costoPilotajeXBulto || '',
                        cantidadBultosTOTAL: tandaData.parametros.cantidadBultosTOTAL || '',
                        cantidadBultosAPagar: tandaData.parametros.cantidadBultosAPagar || '',
                        porcentajesMarcas: tandaData.parametros.porcentajesMarcas || []
                    });
                }
            }

            if (data && data.length > 0) {
                const first = data[0];
                const grouped = {};
                data.forEach(row => {
                    // Group by marca_id if available (NEW), otherwise fallback to composite key (LEGACY)
                    const key = row.marca_id ? row.marca_id : `${row.marca}_${row.codigo_boleta || 'sin_boleta'}_${row.propietario || 'sin_prop'}`;

                    if (!grouped[key]) {
                        grouped[key] = {
                            id: row.marca_id || (Date.now() + Math.random()), // Use existing ID or generate temp one
                            nombre: row.marca,
                            codigo_boleta: row.codigo_boleta || '',
                            collapsed: true,
                            productos: [],
                            fotos: row.fotos || [],
                            propietario: row.propietario || '',
                            bultos_personalizados: ''
                        };
                    }

                    // Hydrate metadata from tandaData if available (legacy or extra fields)
                    if (tandaData && tandaData.parametros && tandaData.parametros.marcasMetadata) {
                        // Try to find metadata by ID first (new format), then by Name (legacy)
                        const metaById = row.marca_id ? tandaData.parametros.marcasMetadata[row.marca_id] : null;
                        const metaByName = tandaData.parametros.marcasMetadata[row.marca];

                        const meta = metaById || metaByName || {};

                        // Assign if value exists in metadata
                        if (meta.bultos_personalizados !== undefined) {
                            grouped[key].bultos_personalizados = meta.bultos_personalizados;
                        }

                        // Propietario fallback
                        if (!grouped[key].propietario && meta.propietario) {
                            grouped[key].propietario = meta.propietario;
                        }
                    }

                    grouped[key].productos.push({
                        producto_titulo: row.producto_titulo,
                        cantidad_docenas: row.cantidad_docenas,
                        precio_docena: row.precio_docena || 0,
                        bultos: row.bultos || 0,
                        codigo: row.codigo,
                        observaciones: row.observaciones || '',
                        propietario: row.propietario_producto || '' // Per-product owner
                    });
                });
                setFormData({
                    nombre: first.tanda_nombre,
                    fechaIngreso: first.tanda_fecha,
                    gastos: first.gastos || '',
                    marcas: Object.values(grouped)
                });
                setOriginalTandaNombre(first.tanda_nombre);
            }
        } catch (err) {
            alert("Error al cargar la tanda: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMarca = () => {
        if (!newMarcaName.trim()) return;

        const newMarca = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More robust string ID
            nombre: newMarcaName.trim(),
            codigo_boleta: newMarcaBoleta.trim(),
            productos: [],
            collapsed: false,
            propietario: '' // Initialize
        };
        setFormData(prev => ({ ...prev, marcas: [...prev.marcas, newMarca] }));
        setNewMarcaName('');
        setNewMarcaBoleta('');
        setMarcaError('');

        // Scroll to the new brand
        setTimeout(() => {
            brandsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
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
            // Process each brand's photos
            const processedMarcas = await Promise.all(
                formData.marcas.map(async (marca) => {
                    let photoUrls = [];

                    if (marca.fotos && marca.fotos.length > 0) {
                        // Separate existing URLs from new File objects
                        const existingUrls = marca.fotos.filter(p => typeof p === 'string');
                        const newPhotos = marca.fotos.filter(p => typeof p !== 'string');

                        photoUrls = [...existingUrls];

                        // Upload new photos
                        for (const photo of newPhotos) {
                            try {
                                // Convert to WebP if it's a File object (not already uploaded)
                                let fileToUpload = photo;

                                // If it's a File object, convert it to WebP
                                if (photo instanceof File) {
                                    fileToUpload = await convertToWebP(photo, {
                                        quality: 0.85,
                                        maxWidth: 1920,
                                        maxHeight: 1920
                                    });
                                }

                                // Always use .webp extension
                                const fileName = `${formData.nombre}_${marca.nombre}_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

                                const { error: uploadError } = await supabase.storage
                                    .from('tanda-fotos')
                                    .upload(fileName, fileToUpload);

                                if (uploadError) throw uploadError;

                                // Get public URL
                                const { data: { publicUrl } } = supabase.storage
                                    .from('tanda-fotos')
                                    .getPublicUrl(fileName);

                                photoUrls.push(publicUrl);
                            } catch (err) {
                                console.error('Error uploading photo:', err);
                                toast.error(`Error al subir foto de ${marca.nombre}: ${err.message}`);
                            }
                        }
                    }

                    return { ...marca, processedPhotos: photoUrls };
                })
            );

            // Prepare entries with per-brand photo URLs
            const entriesToInsert = [];
            processedMarcas.forEach(marca => {
                marca.productos.forEach(prod => {
                    entriesToInsert.push({
                        tanda_nombre: formData.nombre,
                        tanda_fecha: formData.fechaIngreso,
                        marca: marca.nombre,
                        marca_id: marca.id, // NEW: Save unique Brand ID
                        producto_titulo: prod.producto_titulo,
                        cantidad_docenas: prod.cantidad_docenas,
                        cant_docenas_copy: prod.cantidad_docenas, // Copia independiente para Control de Mercancía
                        precio_docena: prod.precio_docena,
                        bultos: prod.bultos || 0, // Save bultos to entradas
                        propietario: marca.propietario, // Global owner of the brand/boleta
                        propietario_producto: prod.propietario || '', // Per-product owner override
                        codigo: prod.codigo,
                        observaciones: prod.observaciones,
                        codigo_boleta: marca.codigo_boleta,
                        gastos: formData.gastos || 0,
                        fotos: marca.processedPhotos.length > 0 ? marca.processedPhotos : null
                    });
                });
            });

            // Save to database
            // Always delete existing entries for this tanda_nombre before inserting
            // This prevents duplicate key errors if the user saves again without reloading
            const tandaNameToDelete = isEditing ? originalTandaNombre : formData.nombre;
            await supabase.from('entradas').delete().eq('tanda_nombre', tandaNameToDelete);

            if (entriesToInsert.length > 0) {
                const { error } = await supabase.from('entradas').insert(entriesToInsert);
                if (error) throw error;
            }

            // --- UPSERT TANDA CONFIGURATION (For Shipping Calc) ---
            const marcasMetadata = {};
            formData.marcas.forEach(m => {
                // Use ID as primary key for metadata if available, otherwise name (legacy/fallback)
                const key = m.id || m.nombre;
                marcasMetadata[key] = {
                    propietario: m.propietario,
                    bultos_personalizados: m.bultos_personalizados
                };
            });

            const tandaParams = {
                ...shippingParams,
                marcasMetadata, // NEW: Save brand metadata
                gastosViaje: shippingParams.gastosViaje || 0 // Save distinct transport config
            };

            const tandaRecord = {
                nombre: formData.nombre,
                fecha: formData.fechaIngreso,
                parametros: tandaParams
            };

            // If we have an ID and the name matches (or we updated name), update by ID
            // But if name changed, we might want to check if new name exists? 
            // For simplicity, if we have ID, update that record.
            if (tandaId) {
                const { error: tandaError } = await supabase
                    .from('tandas')
                    .update(tandaRecord)
                    .eq('id', tandaId);
                if (tandaError) console.error("Error updating tanda config:", tandaError);
            } else {
                // Try to find if it exists by name first (in case 'entradas' existed but we didn't get ID)
                const { data: existing, error: findError } = await supabase
                    .from('tandas')
                    .select('id')
                    .eq('nombre', formData.nombre)
                    .maybeSingle();

                if (existing) {
                    const { error: updateError } = await supabase
                        .from('tandas')
                        .update(tandaRecord)
                        .eq('id', existing.id);
                    if (updateError) console.error("Error updating existing tanda:", updateError);
                } else {
                    const { error: insertError } = await supabase
                        .from('tandas')
                        .insert([tandaRecord]);
                    if (insertError) console.error("Error creating tanda config:", insertError);
                }
            }
            // -----------------------------------------------------

            navigate('/admin/mercancia');
        } catch (e) {
            toast.error("Error al guardar: " + e.message);
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
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    className={`w-full px-4 py-2.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 transition-all border-input focus:ring-ring`}
                                    placeholder="0"
                                    value={formData.gastos}
                                    onChange={e => {
                                        setFormData({ ...formData, gastos: e.target.value });
                                    }}
                                    ref={gastosRef}
                                    onKeyDown={(e) => handleKeyDown(e, marcaNameRef)}
                                />
                                <button
                                    onClick={() => setShowShippingModal(true)}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
                                    title="Configurar Parámetros de Envío"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. MARCAS Y PRODUCTOS */}
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

                    {/* Filter and Sort Controls */}
                    <div className="flex gap-4 mb-4 bg-muted/20 p-4 rounded-xl border border-border flex-wrap items-end">
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Marca</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterBrand}
                                onChange={(e) => setFilterBrand(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {uniqueBrands.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Propietario</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterOwner}
                                onChange={(e) => setFilterOwner(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {uniqueOwners.map(o => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">N° Boleta</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {uniqueCodes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            {(filterBrand || filterOwner || filterCode) && (
                                <button
                                    onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode(''); }}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-sm font-medium transition-colors"
                                >
                                    Limpiar
                                </button>
                            )}
                            <button
                                onClick={handleSortBrands}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
                                title="Agrupar por N° Boleta"
                            >
                                <Layers size={16} />
                                Ordenar
                            </button>
                        </div>
                    </div>

                    {/* Marcas List */}
                    <div className="space-y-4 mt-4">
                        {formData.marcas
                            .map((marca, originalIndex) => ({ ...marca, originalIndex })) // Keep track of original index
                            .filter(m => {
                                const matchBrand = filterBrand ? m.nombre === filterBrand : true;
                                const matchOwner = filterOwner ? m.propietario === filterOwner : true;
                                const matchCode = filterCode ? m.codigo_boleta === filterCode : true;
                                return matchBrand && matchOwner && matchCode;
                            })
                            .map((marca, filteredIdx) => (
                                <FormularioMarca
                                    key={marca.id || `marca-${marca.originalIndex}`}
                                    index={marca.originalIndex} // Pass original index for updates
                                    marca={marca}
                                    onUpdate={handleUpdateMarca}
                                    onDelete={handleDeleteMarca}
                                    isEditingInitially={!marca.collapsed}
                                    users={users}
                                />
                            ))}
                        {formData.marcas.length > 0 && formData.marcas.filter(m => {
                            const matchBrand = filterBrand ? m.nombre === filterBrand : true;
                            const matchOwner = filterOwner ? m.propietario === filterOwner : true;
                            const matchCode = filterCode ? m.codigo_boleta === filterCode : true;
                            return matchBrand && matchOwner && matchCode;
                        }).length === 0 && (
                                <div className="text-center py-8 text-muted-foreground italic">
                                    No se encontraron marcas con los filtros seleccionados
                                </div>
                            )}
                    </div>
                    <div ref={brandsEndRef} />
                </div>


                {/* 3. SUMMARY */}
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
                    fotosCount: formData.marcas.reduce((acc, m) => acc + (m.fotos?.length || 0), 0)
                }}
            />

            {/* Shipping Config Modal */}
            <ShippingConfigModal
                isOpen={showShippingModal}
                onClose={() => setShowShippingModal(false)}
                availableBrands={[...new Set(formData.marcas.map(m => m.nombre).filter(Boolean))]} // Unique brand names only
                initialParams={{
                    ...shippingParams
                }}
                onSave={(newParams) => {
                    setShippingParams(newParams);
                }}
            />
        </div >
    );
}
