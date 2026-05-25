import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';
import { ArrowLeft, Package, Save, Eye } from 'lucide-react';

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
        <div className="new-product-page">
            {/* Header */}
            <div className="product-form-header">
                <div className="header-left">
                    <button
                        onClick={() => originTanda
                            ? navigate(`/admin/products/boletas/${encodeURIComponent(originTanda)}`)
                            : navigate('/admin/products/boletas')
                        }
                        className="back-button"
                    >
                        ← Volver a Boletas
                    </button>
                    <div className="header-title-group">
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={22} style={{ color: '#7c3aed' }} />
                            {isEdit ? 'Editar Producto del Catálogo' : 'Crear Producto para el Catálogo'}
                        </h1>
                        <span className="header-subtitle">
                            {formData.brand ? `Marca: ${formData.brand}` : 'Completa la información del producto'}
                        </span>
                    </div>
                </div>
            </div>

            <form className="product-form" onSubmit={handleSubmit}>
                {/* 1. INFO BASICA */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">📝</div>
                        <h2 className="section-title">Información Básica</h2>
                    </div>

                    <div className="info-basica-grid">
                        {/* Nombre */}
                        <div className="product-name-group">
                            <label className="price-label">Nombre del Producto *</label>
                            <input
                                type="text"
                                className="product-name-input"
                                placeholder="Ej: Remera Básica Cotton Premium"
                                value={formData.name}
                                onChange={e => handleInputChange('name', e.target.value)}
                            />
                        </div>

                        {/* Código (solo lectura) */}
                        <div>
                            <label className="price-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                Código de Mercancía
                                <span
                                    title="Solo editable desde la sección Mercancía"
                                    style={{ cursor: 'help', fontSize: 13, color: '#9ca3af' }}
                                > 🔒</span>
                            </label>
                            <input
                                type="text"
                                className="product-name-input"
                                value={codigo || '— sin código —'}
                                readOnly
                                disabled
                                style={{ opacity: 0.65, cursor: 'not-allowed', backgroundColor: 'var(--muted, #f3f4f6)' }}
                            />
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                Este código solo puede editarse desde la sección Mercancía.
                            </p>
                        </div>

                        {/* Categoría + Marca */}
                        <div className="category-brand-grid">
                            <div>
                                <label className="price-label">Categoría</label>
                                <div className="category-select-wrapper">
                                    <select
                                        className="category-select"
                                        value={formData.category_id}
                                        onChange={e => handleInputChange('category_id', e.target.value)}
                                    >
                                        <option value="">Seleccionar Categoría</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="price-label">Marca</label>
                                <input
                                    type="text"
                                    className="product-name-input"
                                    placeholder="Ej: Nike, HHP, C.H.ZHANG"
                                    value={formData.brand}
                                    onChange={e => handleInputChange('brand', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="price-label">Descripción</label>
                            <textarea
                                className="description-textarea"
                                placeholder="Detalles del producto, características, materiales..."
                                value={formData.description}
                                onChange={e => handleInputChange('description', e.target.value)}
                                maxLength={500}
                            />
                            <div className="char-counter">{formData.description.length}/500 caracteres</div>
                        </div>
                    </div>
                </div>

                {/* 2. IMAGEN */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">🖼️</div>
                        <h2 className="section-title">Imagen del Producto</h2>
                    </div>

                    <div className="image-upload-grid">
                        <div className={`image-preview ${imagePreview ? 'has-image' : ''}`}>
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" className="preview-image" />
                                    <div className="image-actions">
                                        <button type="button" className="image-action-btn change" onClick={() => fileInputRef.current?.click()}>✏️</button>
                                        <button
                                            type="button"
                                            className="image-action-btn delete"
                                            onClick={() => { setImagePreview(null); setImageFile(null); handleInputChange('image_url', ''); }}
                                        >🗑️</button>
                                    </div>
                                </>
                            ) : (
                                <div className="preview-placeholder">
                                    <div className="preview-placeholder-text">[Imagen]</div>
                                    <div className="preview-placeholder-text">Preview</div>
                                    <div className="preview-placeholder-text">300x300px</div>
                                </div>
                            )}
                        </div>

                        <div
                            className={`image-dropzone ${isDragging ? 'dragover' : ''}`}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]); }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="dropzone-icon">📸</div>
                            <h3 className="dropzone-title">Sube una imagen del producto</h3>
                            <p className="dropzone-subtitle">Arrastra o haz clic para subir</p>
                            <p className="dropzone-info">PNG, JPG o WEBP (máx 10MB)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={e => handleImageFile(e.target.files?.[0])}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. PRECIO Y STOCK */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">💰</div>
                        <h2 className="section-title">Precio y Stock</h2>
                    </div>

                    <div className="pricing-grid">
                        <div className="price-input-group">
                            <label className="price-label">Precio ($) *</label>
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                className="price-input"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={e => handleInputChange('price', e.target.value)}
                            />
                        </div>
                        <div className="price-input-group">
                            <label className="price-label">Stock (docenas)</label>
                            <input
                                type="number"
                                className="stock-input"
                                placeholder="0"
                                value={formData.stock}
                                onChange={e => handleInputChange('stock', e.target.value)}
                            />
                            <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                                Se sincroniza automáticamente con el stock de mercancía
                            </p>
                        </div>
                    </div>
                </div>

                {/* 4. PUBLICACION */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">⚙️</div>
                        <h2 className="section-title">Publicación</h2>
                    </div>
                    <div className="config-options">
                        <div
                            className={`config-option ${formData.published ? 'active' : ''}`}
                            onClick={() => handleInputChange('published', !formData.published)}
                        >
                            <div className="config-checkbox"></div>
                            <div className="config-label">
                                <div className="config-title">Publicar en catálogo inmediatamente</div>
                                <div className="config-description">El producto será visible para todos los clientes</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="form-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => originTanda
                            ? navigate(`/admin/products/boletas/${encodeURIComponent(originTanda)}`)
                            : navigate('/admin/products/boletas')
                        }
                    >
                        Cancelar
                    </button>
                    <div className="footer-actions">
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading}
                            style={{ background: '#7c3aed' }}
                        >
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar Producto' : 'Publicar Producto')}
                        </button>
                    </div>
                </div>
            </form>

            {toast && (
                <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
            )}
        </div>
    );
}

export default CatalogProductForm;
