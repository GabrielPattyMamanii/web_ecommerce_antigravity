import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';
import {
    ArrowLeft, ChevronRight, FileEdit, Ruler, Images, DollarSign, Package,
    SlidersHorizontal, Star, Trash2, Plus, Camera, Eye, Archive, CloudUpload,
    Code, TrendingUp, X, Check
} from 'lucide-react';

export function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const fileInputRef = useRef(null);
    const sizeInputRef = useRef(null);
    const [sizeInput, setSizeInput] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        marca: '',
        description: '',
        retail_price: '',
        wholesale_price: '',
        stock: 0,
        image_url: '',
        sizes: [],
        published: true,
        featured: false,
        applyWatermark: true,
        // Solo lectura — llenados desde la fila real al editar, nunca inventados
        code: '',
        created_at: null,
    });

    // Toggle "A Consultar" - oculta el precio en el catálogo público
    const [priceOnRequest, setPriceOnRequest] = useState(false);

    // Store array of images: { file: File|null, preview: string, url: string|null }
    const [images, setImages] = useState([]);

    // UI States
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const [descPreview, setDescPreview] = useState(false);

    // Validation visual states
    const [validations, setValidations] = useState({
        name: { valid: null, message: '' }, // null = dirty/untouched state logic handled visually
    });

    const [applyDiscount, setApplyDiscount] = useState(false);
    const [discountPercent, setDiscountPercent] = useState(20);

    useEffect(() => {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
        fetchCategories();
        if (isEdit) fetchProduct();
    }, [id]);

    // Auto-calculate wholesale price
    useEffect(() => {
        if (applyDiscount && formData.retail_price) {
            const retail = parseFloat(formData.retail_price);
            if (!isNaN(retail)) {
                const discount = (100 - discountPercent) / 100;
                const wholesale = (retail * discount).toFixed(2);
                setFormData(prev => ({ ...prev, wholesale_price: wholesale }));
            }
        }
    }, [applyDiscount, discountPercent, formData.retail_price]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*');
        setCategories(data || []);
    };

    const fetchProduct = async () => {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            if (error) throw error;

            // Map DB fields to state
            setPriceOnRequest(data.price_on_request === true);
            setFormData({
                name: data.name,
                category_id: data.category_id || '',
                marca: data.marca || '',
                description: data.description || '',
                retail_price: data.retail_price || '',
                wholesale_price: data.wholesale_price || '',
                stock: data.stock || 0,
                sizes: data.sizes || [],
                image_url: (data.images && data.images[0]) || '',
                published: data.published === true, // Ensure boolean
                featured: false, // Columna aún no persistida en el backend — se preserva el comportamiento existente
                applyWatermark: true,
                code: data.code || '',
                created_at: data.created_at || null,
            });

            if (data.images && data.images.length > 0) {
                setImages(data.images.map(url => ({ file: null, preview: url, url })));
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar producto', 'error');
        }
    };

    const handleInputChange = (field, value) => {
        let formattedValue = value;

        // Formateo automático de texto
        if (field === 'name' || field === 'marca') {
            // Capitalización de Títulos (ej: "remera nike" -> "Remera Nike")
            formattedValue = value
                .split(' ')
                .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                .join(' ');
        } else if (field === 'description') {
            // Solo capitalizar si no contiene etiquetas HTML
            const hasHtml = /<[a-z][\s\S]*>/i.test(value);
            if (!hasHtml && value.length > 0) {
                formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
            }
        }

        setFormData(prev => ({ ...prev, [field]: formattedValue }));

        // Real-time validation
        if (field === 'name') {
            if (formattedValue.length < 3) setValidations(prev => ({ ...prev, name: { valid: false, message: 'Mínimo 3 caracteres' } }));
            else if (formattedValue.length > 100) setValidations(prev => ({ ...prev, name: { valid: false, message: 'Máximo 100 caracteres' } }));
            else setValidations(prev => ({ ...prev, name: { valid: true, message: 'Disponible' } }));
        }
    };

    const handleImageFiles = async (filesList) => {
        if (!filesList || filesList.length === 0) return;

        const fileArray = Array.from(filesList);
        if (images.length + fileArray.length > 5) {
            showToast('Máximo 5 imágenes por producto. Selecciona menos archivos.', 'error');
            return;
        }

        for (const file of fileArray) {
            const validation = validateImageFile(file, 10);
            if (!validation.isValid) {
                showToast(validation.error, 'error');
                continue;
            }

            try {
                const webpFile = await convertToWebP(file, {
                    quality: 0.85,
                    maxWidth: 1920,
                    maxHeight: 1920,
                    applyWatermark: formData.applyWatermark
                });

                const reader = new FileReader();
                reader.onload = (e) => {
                    setImages(prev => [...prev, {
                        file: webpFile,
                        preview: e.target.result,
                        url: null
                    }]);
                };
                reader.readAsDataURL(webpFile);
            } catch (error) {
                console.error('Error converting image:', error);
                showToast('Error al procesar la imagen: ' + error.message, 'error');
            }
        }
    };

    const makeMainImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            const [selected] = newImages.splice(index, 1);
            newImages.unshift(selected);
            return newImages;
        });
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImageTobucket = async (file) => {
        // Always use .webp extension since we convert all images
        const fileName = `${Date.now()}.webp`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage.from('products').upload(filePath, file);
        if (error) throw error;

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || (!formData.retail_price && !priceOnRequest)) {
            showToast('Complete los campos obligatorios (nombre y precio, o activa "A Consultar")', 'error');
            return;
        }

        setLoading(true);
        try {
            // Upload multiple images
            const finalImageUrls = [];
            for (const img of images) {
                if (img.file) {
                    const url = await uploadImageTobucket(img.file);
                    if (url) finalImageUrls.push(url);
                } else if (img.url) {
                    finalImageUrls.push(img.url);
                }
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                category_id: formData.category_id || null,
                retail_price: priceOnRequest ? 0 : parseFloat(formData.retail_price),
                wholesale_price: priceOnRequest ? 0 : (formData.wholesale_price ? parseFloat(formData.wholesale_price) : null),
                stock: parseInt(formData.stock),
                images: finalImageUrls,
                published: formData.published,
                source: 'manual',
                marca: formData.marca || null,
                price_on_request: priceOnRequest,
                sizes: formData.sizes,
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('products').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('products').insert([payload]));
            }

            if (error) throw error;

            showToast('Producto guardado exitosamente', 'success');
            setTimeout(() => { window.scrollTo(0, 0); navigate('/admin/products'); }, 1000);
        } catch (error) {
            console.error(error);
            showToast('Error al guardar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const addSize = () => {
        const val = sizeInput.trim().toUpperCase();
        if (!val) return;
        if (formData.sizes.includes(val)) {
            setSizeInput('');
            return;
        }
        setFormData(prev => ({ ...prev, sizes: [...prev.sizes, val] }));
        setSizeInput('');
        sizeInputRef.current?.focus();
    };

    const removeSize = (size) => {
        setFormData(prev => ({ ...prev, sizes: prev.sizes.filter(s => s !== size) }));
    };

    const showToast = (msg, type) => {
        setToast({ mensaje: msg, tipo: type });
    };

    const goBack = () => { window.scrollTo(0, 0); navigate('/admin/products'); };

    const categoryName = categories.find(c => c.id === formData.category_id)?.name;

    const stockStatus = formData.stock === 0
        ? { label: 'Agotado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
        : formData.stock < 10
            ? { label: `Stock Bajo (${formData.stock})`, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
            : { label: `En Stock (${formData.stock})`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };

    const inputCls = 'w-full bg-background text-foreground text-sm px-3.5 py-2.5 rounded-lg border border-input shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
    const labelCls = 'text-sm font-semibold text-foreground';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3">
                <button onClick={goBack} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Productos
                </button>
                {categoryName && (
                    <>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>{categoryName}</span>
                    </>
                )}
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground font-semibold">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</span>
            </nav>

            {/* Título + estado + acciones rápidas */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
                        </h1>
                        {isEdit && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${formData.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${formData.published ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                                {formData.published ? 'En Catálogo (Activo)' : 'Oculto del catálogo'}
                            </span>
                        )}
                        {formData.code && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground font-mono">
                                <Code className="w-3 h-3" /> {formData.code}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isEdit ? (
                            <>
                                Editando: <strong className="text-foreground font-semibold">{formData.name || '…'}</strong>
                                {formData.created_at && ` • Creado el ${new Date(formData.created_at).toLocaleDateString('es-AR')}`}
                            </>
                        ) : 'Completá la información para publicar un nuevo producto en el catálogo'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        disabled={!isEdit}
                        onClick={() => window.open(`/catalog/${id}`, '_blank', 'noopener,noreferrer')}
                        title={isEdit ? 'Ver en la tienda' : 'Guardá el producto para poder verlo'}
                        className="inline-flex items-center gap-1.5 bg-card text-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-sm border border-border hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        Vista Previa
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 bg-card text-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-sm border border-border hover:bg-muted transition-all disabled:opacity-50"
                    >
                        <Archive className="w-4 h-4 text-muted-foreground" />
                        Guardar Borrador
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" />
                        {loading ? 'Guardando…' : isEdit ? 'Publicar Cambios' : 'Publicar Producto'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* ══════════════ COLUMNA IZQUIERDA (8/12) ══════════════ */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* 1. Información Básica */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                    <FileEdit className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Información Básica</h2>
                                    <p className="text-xs text-muted-foreground">Identificadores principales del producto</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className={labelCls}>Nombre del Producto <span className="text-primary">*</span></label>
                                    <span className="text-xs text-muted-foreground">{formData.name.length}/120</span>
                                </div>
                                <input
                                    type="text"
                                    className={`${inputCls} ${validations.name.valid === true ? 'border-emerald-500' : validations.name.valid === false ? 'border-destructive' : ''}`}
                                    placeholder="Ej: Remera Básica Cotton Premium"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                />
                                {validations.name.valid === true && (
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ {validations.name.message}</span>
                                )}
                                {validations.name.valid === false && (
                                    <span className="text-xs font-medium text-destructive">{validations.name.message}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls}>Categoría <span className="text-primary">*</span></label>
                                    <select
                                        className={`${inputCls} cursor-pointer`}
                                        value={formData.category_id}
                                        onChange={(e) => handleInputChange('category_id', e.target.value)}
                                    >
                                        <option value="">Seleccionar Categoría</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls}>Marca <span className="font-normal text-muted-foreground">(opcional)</span></label>
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder="Ej: Nike, Adidas"
                                        value={formData.marca}
                                        onChange={(e) => handleInputChange('marca', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <label className={labelCls}>Descripción</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Acepta HTML + clases Tailwind</span>
                                        <button
                                            type="button"
                                            onClick={() => setDescPreview(v => !v)}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${descPreview ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {descPreview ? <FileEdit className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            {descPreview ? 'Editar' : 'Vista previa'}
                                        </button>
                                    </div>
                                </div>

                                {descPreview ? (
                                    <div
                                        className="min-h-[120px] px-3.5 py-3 rounded-lg border border-input bg-muted/30 text-sm leading-relaxed text-foreground"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(formData.description || '<span class="text-muted-foreground">Sin descripción…</span>')
                                        }}
                                    />
                                ) : (
                                    <textarea
                                        className={`${inputCls} font-mono text-xs resize-y min-h-[120px]`}
                                        placeholder={`Texto plano o HTML con Tailwind:\n<p class="font-bold text-lg">Título</p>\n<ul class="list-disc pl-4"><li>Material 100% algodón</li></ul>`}
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        rows={4}
                                    />
                                )}

                                {!descPreview && (
                                    <span className="text-xs text-muted-foreground text-right">{formData.description.length} caracteres</span>
                                )}
                            </div>
                        </section>

                        {/* 2. Talles */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                        <Ruler className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-foreground">Talles</h2>
                                        <p className="text-xs text-muted-foreground">Variantes de talle disponibles para este producto</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                                    {formData.sizes.length} talle{formData.sizes.length !== 1 ? 's' : ''} activo{formData.sizes.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Atajos predefinidos */}
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">Predefinidos:</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Único'].map(preset => {
                                        const active = formData.sizes.includes(preset);
                                        return (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => active ? removeSize(preset) : setFormData(prev => ({ ...prev, sizes: [...prev.sizes, preset] }))}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                                }`}
                                            >
                                                {preset}
                                                {active && <Check className="w-3 h-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Chips de talles agregados */}
                            <div className="flex flex-wrap items-center gap-2 min-h-[2rem]">
                                {formData.sizes.length === 0 && (
                                    <span className="text-xs text-muted-foreground italic">Sin talles agregados</span>
                                )}
                                {formData.sizes.map(size => (
                                    <span key={size} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        {size}
                                        <button
                                            type="button"
                                            onClick={() => removeSize(size)}
                                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Input para talle personalizado */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    ref={sizeInputRef}
                                    type="text"
                                    className={`${inputCls} flex-1`}
                                    value={sizeInput}
                                    onChange={e => setSizeInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                                    placeholder="Ej: 38, 40, S/M, 2XL…"
                                />
                                <button
                                    type="button"
                                    onClick={addSize}
                                    className="inline-flex items-center justify-center gap-1.5 bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted/70 transition-colors shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar
                                </button>
                            </div>
                        </section>

                        {/* 3. Galería de imágenes */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                        <Images className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-foreground">Galería de Imágenes</h2>
                                        <p className="text-xs text-muted-foreground">JPG, PNG o WebP — hasta 5 fotos, proporción 1:1 recomendada</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                                    <CloudUpload className="w-3.5 h-3.5" />
                                    {images.length} de 5 fotos
                                </span>
                            </div>

                            <div
                                className={`grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg transition-colors ${isDragging ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files);
                                }}
                            >
                                {images.map((img, index) => (
                                    <div key={index} className="relative group rounded-xl overflow-hidden shadow-sm aspect-square bg-muted">
                                        <img src={img.preview} alt={`Vista previa ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        {index === 0 && (
                                            <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md">
                                                <Star className="w-2.5 h-2.5" fill="currentColor" />
                                                Principal
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {index !== 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); makeMainImage(index); }}
                                                    title="Hacer principal"
                                                    className="w-8 h-8 rounded-full bg-card text-foreground flex items-center justify-center shadow-md hover:text-primary transition-colors"
                                                >
                                                    <Star className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                title="Eliminar"
                                                className="w-8 h-8 rounded-full bg-card text-destructive flex items-center justify-center shadow-md hover:bg-destructive/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {images.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="rounded-xl bg-muted/60 hover:bg-muted transition-colors cursor-pointer aspect-square flex flex-col items-center justify-center gap-2 p-3 text-center group border-2 border-dashed border-border"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-card text-primary flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <Camera className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">Añadir foto</span>
                                        <span className="text-[11px] text-muted-foreground">{images.length}/5 usados</span>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleImageFiles(e.target.files)}
                                        />
                                    </button>
                                )}
                            </div>

                            {images.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center">No subiste ninguna imagen todavía. Agregá hasta 5 fotos del producto.</p>
                            )}

                            {/* Marca de agua */}
                            <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-muted/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-card text-muted-foreground flex items-center justify-center shadow-sm shrink-0">
                                        <Images className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Aplicar Marca de Agua</p>
                                        <p className="text-xs text-muted-foreground">Superpone el logo centrado en las imágenes nuevas</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('applyWatermark', !formData.applyWatermark)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${formData.applyWatermark ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.applyWatermark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* ══════════════ COLUMNA DERECHA — SIDEBAR FIJO (4/12) ══════════════ */}
                    <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6">

                        {/* 4. Precios */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Precios</h2>
                                    <p className="text-xs text-muted-foreground">Esquema minorista y mayorista</p>
                                </div>
                            </div>

                            {/* Precio "A Consultar" */}
                            <div className="p-3.5 rounded-lg bg-muted/40 flex items-start justify-between gap-3">
                                <div>
                                    <span className="block text-sm font-semibold text-foreground">Precio "A Consultar"</span>
                                    <span className="text-xs text-muted-foreground">Muestra "A consultar" en vez de un precio fijo</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPriceOnRequest(v => !v)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors mt-0.5 ${priceOnRequest ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${priceOnRequest ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            <div className={`flex flex-col gap-4 transition-opacity ${priceOnRequest ? 'opacity-40 pointer-events-none' : ''}`}>
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls}>Precio Minorista ($) <span className="text-primary">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                                        <input
                                            type="number"
                                            className={`${inputCls} pl-7 text-lg font-bold`}
                                            placeholder="0.00"
                                            value={formData.retail_price}
                                            onChange={(e) => handleInputChange('retail_price', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls}>Precio Mayorista ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                                        <input
                                            type="number"
                                            className={`${inputCls} pl-7 text-lg font-bold disabled:opacity-60`}
                                            placeholder="0.00"
                                            value={formData.wholesale_price}
                                            onChange={(e) => handleInputChange('wholesale_price', e.target.value)}
                                            readOnly={applyDiscount}
                                        />
                                    </div>
                                </div>

                                {/* Descuento automático */}
                                <div className={`rounded-lg p-3.5 transition-colors ${applyDiscount ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'}`}>
                                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                        <div
                                            className="w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                                            style={applyDiscount ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' } : { borderColor: 'var(--border)' }}
                                            onClick={() => setApplyDiscount(!applyDiscount)}
                                        >
                                            {applyDiscount && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-xs text-foreground leading-tight" onClick={() => setApplyDiscount(!applyDiscount)}>
                                            Calcular el mayorista automáticamente aplicando un descuento sobre el minorista
                                        </span>
                                    </label>
                                    {applyDiscount && (
                                        <div className="flex items-center gap-2 mt-2.5">
                                            <input
                                                type="number"
                                                className="w-16 px-2 py-1.5 rounded-md border border-input bg-background text-center text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={discountPercent}
                                                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-muted-foreground">% de descuento sobre el minorista</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* 5. Inventario */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-foreground">Inventario</h2>
                                        <p className="text-xs text-muted-foreground">Stock disponible del producto</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stockStatus.cls}`}>
                                    {stockStatus.label}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Stock <span className="text-primary">*</span></label>
                                <input
                                    type="number"
                                    className={`${inputCls} text-lg font-bold`}
                                    placeholder="0"
                                    value={formData.stock}
                                    onChange={(e) => handleInputChange('stock', e.target.value)}
                                />
                            </div>
                        </section>

                        {/* 6. Visibilidad */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-1">
                            <div className="flex items-center gap-3 pb-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                    <SlidersHorizontal className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-foreground">Visibilidad</h2>
                            </div>

                            <div className="flex items-center justify-between py-2.5 border-t border-border">
                                <div className="pr-2">
                                    <p className="text-sm font-semibold text-foreground">Publicar en catálogo</p>
                                    <p className="text-xs text-muted-foreground">Visible de inmediato para los clientes</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('published', !formData.published)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${formData.published ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.published ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-2.5 border-t border-border">
                                <div className="pr-2">
                                    <p className="text-sm font-semibold text-foreground">Producto Destacado</p>
                                    <p className="text-xs text-muted-foreground">Aparece primero en los listados</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('featured', !formData.featured)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${formData.featured ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.featured ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </form>

            {/* Barra de acciones fija inferior */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 px-4 sm:px-6 lg:px-8 pb-4 pointer-events-none z-30">
                <div className="max-w-5xl mx-auto bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl px-5 py-3 flex items-center justify-between pointer-events-auto">
                    <button
                        type="button"
                        onClick={goBack}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                        Cancelar
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
                        >
                            Guardar como Borrador
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            {loading ? 'Guardando…' : isEdit ? 'Actualizar Producto' : 'Publicar Producto'}
                        </button>
                    </div>
                </div>
            </div>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

// Named export to match original file structure (it was named export)
export default ProductForm;
