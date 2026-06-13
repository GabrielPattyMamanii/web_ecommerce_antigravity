
import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';
import './ProductFormImages.css';

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
        notify_clients: false,
        applyWatermark: true
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
        price: { valid: null }
    });

    const [applyDiscount, setApplyDiscount] = useState(false);
    const [discountPercent, setDiscountPercent] = useState(20);

    const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    // For colors, maybe we just allow free text or some presets? Prompt shows specifics.
    const PRESET_COLORS = [
        { name: 'Rojo', hex: '#ef4444' },
        { name: 'Azul', hex: '#3b82f6' },
        { name: 'Negro', hex: '#000000' },
        { name: 'Blanco', hex: '#ffffff' }
    ];

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
                // Handle array vs string if schema changed. Previous code used comma string. 
                // Let's stick to array in state, convert on save/load if needed.
                // Assuming schema is text[] or similar, or we just split/join. Reviewing old code: `data.sizes.join(', ')`. 
                // So it stores arrays in supabase (jsonb or arrays).
                sizes: data.sizes || [],
                colors: data.colors || [],
                image_url: (data.images && data.images[0]) || '',
                published: data.published === true, // Ensure boolean
                featured: false, // Column might not exist
                notify_clients: false
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

    // Helper for array toggles
    const toggleArrayItem = (field, item) => {
        setFormData(prev => {
            const list = prev[field];
            if (list.includes(item)) return { ...prev, [field]: list.filter(i => i !== item) };
            return { ...prev, [field]: [...list, item] };
        });
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

    return (
        <div className="new-product-page">
            <div className="product-form-header">
                <div className="header-left">
                    <button onClick={() => { window.scrollTo(0, 0); navigate('/admin/products'); }} className="back-button">
                        ← Volver a Productos
                    </button>
                    <div className="header-title-group">
                        <h1>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                        <span className="header-subtitle">Completa la información del producto</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-preview" type="button">
                        👁️ Vista Previa
                    </button>
                    <button
                        className="btn-save-draft"
                        type="button"
                        onClick={handleSubmit} // Just save
                    >
                        Guardar Borrador
                    </button>
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
                        <div className="product-name-group">
                            <label className="price-label">Nombre del Producto *</label>
                            <input
                                type="text"
                                className={`product-name-input ${validations.name.valid === true ? 'valid' : validations.name.valid === false ? 'error' : ''}`}
                                placeholder="Ej: Remera Básica Cotton Premium"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                            />
                            {validations.name.valid === true && (
                                <span className="availability-badge show">✓ Disponible</span>
                            )}
                            {validations.name.valid === false && (
                                <span style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{validations.name.message}</span>
                            )}
                        </div>

                        <div className="category-brand-grid">
                            <div>
                                <label className="price-label">Categoría *</label>
                                <div className="category-select-wrapper">
                                    <select
                                        className="category-select"
                                        value={formData.category_id}
                                        onChange={(e) => handleInputChange('category_id', e.target.value)}
                                    >
                                        <option value="">Seleccionar Categoría</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="price-label">Marca (opcional)</label>
                                <input
                                    type="text"
                                    className="product-name-input"
                                    placeholder="Ej: Nike, Adidas"
                                    value={formData.marca}
                                    onChange={(e) => handleInputChange('marca', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label className="price-label" style={{ marginBottom: 0 }}>Descripción</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 11, color: '#888' }}>Acepta HTML + clases Tailwind</span>
                                    <button
                                        type="button"
                                        onClick={() => setDescPreview(v => !v)}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            padding: '4px 12px',
                                            borderRadius: 6,
                                            border: '1px solid #d1d5db',
                                            background: descPreview ? '#6366f1' : '#fff',
                                            color: descPreview ? '#fff' : '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {descPreview ? '✏️ Editar' : '👁️ Vista previa'}
                                    </button>
                                </div>
                            </div>

                            {descPreview ? (
                                <div
                                    style={{
                                        minHeight: 120,
                                        padding: '12px 14px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        background: '#fafafa',
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                        color: '#374151'
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(formData.description || '<span style="color:#aaa">Sin descripción...</span>')
                                    }}
                                />
                            ) : (
                                <textarea
                                    className="description-textarea"
                                    placeholder={`Texto plano o HTML con Tailwind:\n<p class="font-bold text-lg">Título</p>\n<ul class="list-disc pl-4"><li>Material 100% algodón</li></ul>`}
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                                />
                            )}

                            {!descPreview && (
                                <div className="char-counter">
                                    {formData.description.length} caracteres
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. TALLES */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">📐</div>
                        <h2 className="section-title">Talles</h2>
                    </div>

                    {/* Atajos predefinidos */}
                    <div className="size-presets-wrapper">
                        <span className="size-presets-label">Predefinidos:</span>
                        <div className="size-presets-grid">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Único'].map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`size-preset-btn${formData.sizes.includes(preset) ? ' active' : ''}`}
                                    onClick={() => {
                                        if (formData.sizes.includes(preset)) {
                                            removeSize(preset);
                                        } else {
                                            setFormData(prev => ({ ...prev, sizes: [...prev.sizes, preset] }));
                                        }
                                    }}
                                >
                                    {preset}
                                    {formData.sizes.includes(preset) && <span className="size-preset-check">✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chips de talles agregados */}
                    <div className="size-chips-container">
                        {formData.sizes.length === 0 && (
                            <span className="size-chips-empty">Sin talles agregados</span>
                        )}
                        {formData.sizes.map(size => (
                            <span key={size} className="size-chip">
                                {size}
                                <button
                                    type="button"
                                    className="size-chip-remove"
                                    onClick={() => removeSize(size)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Input para talle personalizado */}
                    <div className="size-add-container">
                        <input
                            ref={sizeInputRef}
                            type="text"
                            className="size-custom-input"
                            value={sizeInput}
                            onChange={e => setSizeInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                            placeholder="Ej: 38, 40, S/M, 2XL..."
                        />
                        <button
                            type="button"
                            className="size-add-btn"
                            onClick={addSize}
                        >
                            + Agregar
                        </button>
                    </div>
                </div>

                {/* 2. IMAGEN */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">🖼️</div>
                        <h2 className="section-title">Imagen del Producto</h2>
                    </div>

                    <div className="multi-image-container">
                        <div className="images-list">
                            {images.map((img, index) => (
                                <div key={index} className={`image-item ${index === 0 ? 'main-image' : ''}`}>
                                    {index === 0 && <span className="main-badge">⭐ Principal (Catálogo)</span>}
                                    <img src={img.preview} alt={`Preview ${index}`} className="item-img" />
                                    <div className="item-actions">
                                        {index !== 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); makeMainImage(index); }}
                                                className="btn-make-main"
                                            >
                                                ↑ Hacer Principal
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                            className="btn-delete-img"
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {images.length < 5 && (
                                <div
                                    className={`image-dropzone compact ${isDragging ? 'dragover' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files);
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="dropzone-icon">📸</div>
                                    <p className="dropzone-subtitle">Añadir foto ({images.length}/5)</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="file-input"
                                        accept="image/*"
                                        onChange={(e) => handleImageFiles(e.target.files)}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            )}
                        </div>
                        {images.length === 0 && (
                            <div className="no-images-hint">No has subido ninguna imagen todavía. Agrega hasta 5 imágenes del producto.</div>
                        )}
                    </div>
                </div>

                {/* 3. PRECIOS Y STOCK */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">💰</div>
                        <h2 className="section-title">Precios y Stock</h2>
                    </div>

                    {/* Toggle: A Consultar */}
                    <div
                        className={`config-option ${priceOnRequest ? 'active' : ''}`}
                        onClick={() => setPriceOnRequest(v => !v)}
                        style={{ marginBottom: 20, cursor: 'pointer' }}
                    >
                        <div className="config-checkbox"></div>
                        <div className="config-label">
                            <div className="config-title">Precio "A Consultar"</div>
                            <div className="config-description">En lugar del precio se mostrará "A consultar" en el catálogo público</div>
                        </div>
                    </div>

                    <div className="pricing-grid" style={{ opacity: priceOnRequest ? 0.4 : 1, pointerEvents: priceOnRequest ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                        <div className="price-input-group">
                            <label className="price-label">Precio Minorista ($) *</label>
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                className="price-input"
                                placeholder="0.00"
                                value={formData.retail_price}
                                onChange={(e) => handleInputChange('retail_price', e.target.value)}
                            />
                        </div>
                        <div className="price-input-group">
                            <label className="price-label">Precio Mayorista ($)</label>
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                className="price-input"
                                placeholder="0.00"
                                value={formData.wholesale_price}
                                onChange={(e) => handleInputChange('wholesale_price', e.target.value)}
                                readOnly={applyDiscount}
                            />
                        </div>
                        <div className="price-input-group">
                            <label className="price-label">Stock *</label>
                            <input
                                type="number"
                                className="stock-input"
                                placeholder="0"
                                value={formData.stock}
                                onChange={(e) => handleInputChange('stock', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={`discount-option ${applyDiscount ? 'active' : ''}`}>
                        <div
                            className="discount-checkbox-wrapper"
                            onClick={() => setApplyDiscount(!applyDiscount)}
                        >
                            <input
                                type="checkbox"
                                className="discount-checkbox"
                                checked={applyDiscount}
                                readOnly
                            />
                        </div>
                        <div className="discount-content">
                            <div className="discount-label" onClick={() => setApplyDiscount(!applyDiscount)}>
                                Aplicar descuento automático en mayorista
                            </div>
                            {applyDiscount && (
                                <div className="discount-input-wrapper">
                                    <input
                                        type="number"
                                        className="discount-input"
                                        value={discountPercent}
                                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                    />
                                    <span>% de descuento</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. CONFIGURACION */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">⚙️</div>
                        <h2 className="section-title">Configuración Adicional</h2>
                    </div>

                    <div className="config-options">
                        <div
                            className={`config-option ${formData.applyWatermark ? 'active' : ''}`}
                            onClick={() => handleInputChange('applyWatermark', !formData.applyWatermark)}
                        >
                            <div className="config-checkbox"></div>
                            <div className="config-label">
                                <div className="config-title">Aplicar Marca de Agua</div>
                                <div className="config-description">Añadir automáticamente el logo centrado a las imágenes nuevas</div>
                            </div>
                        </div>

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

                        {/* Additional mockup options */}
                        <div
                            className={`config-option ${formData.featured ? 'active' : ''}`}
                            onClick={() => handleInputChange('featured', !formData.featured)}
                        >
                            <div className="config-checkbox"></div>
                            <div className="config-label">
                                <div className="config-title">Producto destacado</div>
                                <div className="config-description">Aparecerá primero en los listados</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="form-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => { window.scrollTo(0, 0); navigate('/admin/products'); }}
                    >
                        Cancelar
                    </button>

                    <div className="footer-actions">
                        <button
                            type="button"
                            className="btn-save-draft"
                            onClick={() => { /* Save as draft logic, maybe set published=false */ }}
                        >
                            Guardar como Borrador
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Publicar Producto'}
                        </button>
                    </div>
                </div>
            </form>

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
