import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';
import {
    ArrowLeft, ChevronRight, FileEdit, Images, DollarSign,
    SlidersHorizontal, Trash2, Camera, Lock, Check
} from 'lucide-react';

/**
 * CatalogProductForm
 * Crea o edita un producto en la tabla catalog_products.
 * Puede recibir entradaId por URL (/admin/products/new/:entradaId)
 * para autocompletar datos desde la tabla entradas.
 */
export function CatalogProductForm() {
    const { entradaId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const isEdit = !!entradaId;

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        brand: '',
        description: '',
        price: '',
        stock: 0,
        image_url: '',
        published: true,
    });
    const [codigo, setCodigo] = useState('');

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    // Where to go back (tanda origin)
    const [originTanda, setOriginTanda] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchCategories();
        if (entradaId) {
            loadFromEntrada();
        } else {
            setInitialLoading(false);
        }
    }, [entradaId]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        setCategories(data || []);
    };

    const loadFromEntrada = async () => {
        setInitialLoading(true);
        try {
            // Try to load from catalog_products first (edit mode)
            const { data: catData } = await supabase
                .from('catalog_products')
                .select('*')
                .eq('id', entradaId)
                .maybeSingle();

            if (catData) {
                // Already published — load existing data
                setFormData({
                    name: catData.name || '',
                    category_id: catData.category_id || '',
                    brand: catData.brand || '',
                    description: catData.description || '',
                    price: catData.price || '',
                    stock: catData.stock || 0,
                    image_url: catData.image_url || '',
                    published: catData.published ?? true,
                });
                if (catData.image_url) setImagePreview(catData.image_url);
            }

            // Also load entrada for reference data (autocomplete if not yet published)
            const { data: entrada, error } = await supabase
                .from('entradas')
                .select('*, tanda_nombre')
                .eq('id', entradaId)
                .single();

            if (error) throw error;

            if (entrada?.tanda_nombre) setOriginTanda(entrada.tanda_nombre);
            // Store the code from entradas (read-only)
            if (entrada?.codigo) setCodigo(entrada.codigo);

            // Only autocomplete if not already in catalog
            if (!catData) {
                setFormData(prev => ({
                    ...prev,
                    name: entrada.producto_titulo || '',
                    brand: entrada.marca || '',
                    stock: entrada.cant_docenas_copy ?? entrada.cantidad_docenas ?? 0,
                    // Price hint from precio_docena if available
                    price: entrada.precio_docena ? String(entrada.precio_docena) : '',
                }));
            }
        } catch (err) {
            console.error('Error loading entrada:', err);
            showToast('Error al cargar datos del producto', 'error');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageFile = async (file) => {
        if (!file) return;
        const validation = validateImageFile(file, 10);
        if (!validation.isValid) { showToast(validation.error, 'error'); return; }

        try {
            const webpFile = await convertToWebP(file, { quality: 0.85, maxWidth: 1920, maxHeight: 1920 });
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(webpFile);
            setImageFile(webpFile);
        } catch (error) {
            showToast('Error al procesar la imagen: ' + error.message, 'error');
        }
    };

    const uploadImage = async (file) => {
        const fileName = `catalog_${Date.now()}.webp`;
        const { error } = await supabase.storage.from('products').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            showToast('El nombre y el precio son obligatorios', 'error');
            return;
        }
        if (!entradaId) {
            showToast('No se encontró el ID del producto origen', 'error');
            return;
        }

        setLoading(true);
        try {
            let finalImageUrl = formData.image_url;
            if (imageFile) finalImageUrl = await uploadImage(imageFile);

            const payload = {
                id: entradaId,
                name: formData.name,
                description: formData.description || null,
                category_id: formData.category_id || null,
                brand: formData.brand || null,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock) || 0,
                image_url: finalImageUrl || null,
                published: formData.published,
            };

            // UPSERT — inserta o actualiza
            const { error } = await supabase
                .from('catalog_products')
                .upsert([payload], { onConflict: 'id' });

            if (error) throw error;

            showToast('Producto guardado en el catálogo ✓', 'success');
            setTimeout(() => {
                if (originTanda) {
                    navigate(`/admin/products/boletas/${encodeURIComponent(originTanda)}`);
                } else {
                    navigate('/admin/products/boletas');
                }
            }, 1000);
        } catch (error) {
            console.error(error);
            showToast('Error al guardar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg, type) => setToast({ mensaje: msg, tipo: type });

    const goBack = () => {
        window.scrollTo(0, 0);
        navigate('/admin/products');
    };

    const inputCls = 'w-full bg-background text-foreground text-sm px-3.5 py-2.5 rounded-lg border border-input shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
    const labelCls = 'text-sm font-semibold text-foreground';

    const stockStatus = formData.stock === 0
        ? { label: 'Agotado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
        : formData.stock < 5
            ? { label: `Stock Bajo (${formData.stock} doc.)`, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
            : { label: `En Stock (${formData.stock} doc.)`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="inline-flex items-center gap-3 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Cargando datos del producto...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3">
                <button onClick={goBack} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Productos
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground font-semibold">{isEdit ? 'Editar Producto del Catálogo' : 'Crear Producto para el Catálogo'}</span>
            </nav>

            {/* Título + estado + código */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            {isEdit ? 'Editar Producto del Catálogo' : 'Crear Producto para el Catálogo'}
                        </h1>
                        {isEdit && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${formData.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${formData.published ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                                {formData.published ? 'En Catálogo (Activo)' : 'Oculto del catálogo'}
                            </span>
                        )}
                        {codigo && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground font-mono">
                                <Lock className="w-3 h-3" /> {codigo}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {originTanda ? <>Origen: <strong className="text-foreground font-semibold">{originTanda}</strong></> : 'Completá la información para publicar este producto en el catálogo'}
                    </p>
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
                                <label className={labelCls}>Nombre del Producto <span className="text-primary">*</span></label>
                                <input
                                    type="text"
                                    className={inputCls}
                                    placeholder="Ej: Remera Básica Cotton Premium"
                                    value={formData.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={`${labelCls} inline-flex items-center gap-1.5`}>
                                    Código de Mercancía
                                    <Lock className="w-3 h-3 text-muted-foreground" />
                                </label>
                                <input
                                    type="text"
                                    className={`${inputCls} opacity-60 cursor-not-allowed bg-muted`}
                                    value={codigo || '— sin código —'}
                                    readOnly
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">Este código solo puede editarse desde la sección Mercancía.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls}>Categoría</label>
                                    <select
                                        className={`${inputCls} cursor-pointer`}
                                        value={formData.category_id}
                                        onChange={e => handleInputChange('category_id', e.target.value)}
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
                                        placeholder="Ej: Nike, HHP, C.H.ZHANG"
                                        value={formData.brand}
                                        onChange={e => handleInputChange('brand', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className={labelCls}>Descripción</label>
                                    <span className="text-xs text-muted-foreground">{formData.description.length}/500</span>
                                </div>
                                <textarea
                                    className={`${inputCls} resize-y min-h-[120px]`}
                                    placeholder="Detalles del producto, características, materiales..."
                                    value={formData.description}
                                    onChange={e => handleInputChange('description', e.target.value)}
                                    maxLength={500}
                                    rows={4}
                                />
                            </div>
                        </section>

                        {/* 2. Imagen del producto */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                    <Images className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Imagen del Producto</h2>
                                    <p className="text-xs text-muted-foreground">JPG, PNG o WebP — proporción 1:1 recomendada</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {imagePreview ? (
                                    <div className="relative group rounded-xl overflow-hidden shadow-sm aspect-square bg-muted">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                title="Cambiar imagen"
                                                className="w-8 h-8 rounded-full bg-card text-foreground flex items-center justify-center shadow-md hover:text-primary transition-colors"
                                            >
                                                <Camera className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setImagePreview(null); setImageFile(null); handleInputChange('image_url', ''); }}
                                                title="Eliminar"
                                                className="w-8 h-8 rounded-full bg-card text-destructive flex items-center justify-center shadow-md hover:bg-destructive/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-muted/60 aspect-square flex flex-col items-center justify-center gap-1 text-center border-2 border-dashed border-border">
                                        <span className="text-xs font-semibold text-muted-foreground">Sin imagen</span>
                                        <span className="text-[11px] text-muted-foreground">300x300px</span>
                                    </div>
                                )}

                                <div
                                    className={`rounded-xl aspect-square flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer border-2 border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/60 hover:bg-muted'}`}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                                    onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]); }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-9 h-9 rounded-full bg-card text-primary flex items-center justify-center shadow-sm">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground">Sube una imagen</span>
                                    <span className="text-[11px] text-muted-foreground">Arrastra o hacé clic — máx 10MB</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => handleImageFile(e.target.files?.[0])}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* ══════════════ COLUMNA DERECHA — SIDEBAR (4/12) ══════════════ */}
                    <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6">

                        {/* 3. Precio y Stock */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-foreground">Precio y Stock</h2>
                                        <p className="text-xs text-muted-foreground">Valores del producto en catálogo</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stockStatus.cls}`}>
                                    {stockStatus.label}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Precio ($) <span className="text-primary">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                                    <input
                                        type="number"
                                        className={`${inputCls} pl-7 text-lg font-bold`}
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={e => handleInputChange('price', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Stock (docenas)</label>
                                <input
                                    type="number"
                                    className={`${inputCls} text-lg font-bold`}
                                    placeholder="0"
                                    value={formData.stock}
                                    onChange={e => handleInputChange('stock', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Se sincroniza automáticamente con el stock de mercancía</p>
                            </div>
                        </section>

                        {/* 4. Publicación */}
                        <section className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col gap-1">
                            <div className="flex items-center gap-3 pb-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                                    <SlidersHorizontal className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-foreground">Publicación</h2>
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

            {toast && (
                <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
            )}
        </div>
    );
}

export default CatalogProductForm;
