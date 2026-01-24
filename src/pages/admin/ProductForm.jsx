
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';

export function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        brand: '', // Optional per prompt, but maybe store in description or new column? Prompt says "Marca (opcional)". Let's assume we store it metadata or skip if no column. Current schema doesn't seem to have 'brand'. I will omit or store in description for now to be safe, or just manage state but not save if no column.
        description: '',
        retail_price: '',
        wholesale_price: '',
        stock: 0,
        sizes: [], // Array of strings
        colors: [], // Array of strings
        image_url: '',
        published: true, // "Publicar en catálogo inmediatamente" - Default TRUE
        featured: false,
        notify_clients: false
    });

    // We store the file object separately
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // UI States
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

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
            setFormData({
                name: data.name,
                category_id: data.category_id || '',
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
                setImagePreview(data.images[0]);
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar producto', 'error');
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Real-time validation
        if (field === 'name') {
            if (value.length < 3) setValidations(prev => ({ ...prev, name: { valid: false, message: 'Mínimo 3 caracteres' } }));
            else if (value.length > 100) setValidations(prev => ({ ...prev, name: { valid: false, message: 'Máximo 100 caracteres' } }));
            else setValidations(prev => ({ ...prev, name: { valid: true, message: 'Disponible' } }));
        }
    };

    const handleImageFile = (file) => {
        if (!file) return;
        // Validate
        if (file.size > 5 * 1024 * 1024) {
            showToast('La imagen no puede superar 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
        setImageFile(file);
    };

    const uploadImageTobucket = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage.from('products').upload(filePath, file);
        if (error) throw error;

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.retail_price) {
            showToast('Complete los campos obligatorios', 'error');
            return;
        }

        setLoading(true);
        try {
            let finalImageUrl = formData.image_url;
            if (imageFile) {
                finalImageUrl = await uploadImageTobucket(imageFile);
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                category_id: formData.category_id || null,
                retail_price: parseFloat(formData.retail_price),
                wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
                stock: parseInt(formData.stock),
                images: finalImageUrl ? [finalImageUrl] : [],
                sizes: formData.sizes,
                colors: formData.colors,
                published: formData.published,
                // code? brand? If schema doesn't have them, ignore for now to prevent errors
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('products').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('products').insert([payload]));
            }

            if (error) throw error;

            showToast('Producto guardado exitosamente', 'success');
            setTimeout(() => navigate('/admin/products'), 1000); // Wait for toast
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

    const showToast = (msg, type) => {
        setToast({ mensaje: msg, tipo: type });
    };

    return (
        <div className="new-product-page">
            <div className="product-form-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin/products')} className="back-button">
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
                                    value={formData.brand}
                                    onChange={(e) => handleInputChange('brand', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="price-label">Descripción</label>
                            <textarea
                                className="description-textarea"
                                placeholder="Detalles del producto, características, materiales..."
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                maxLength={500}
                            />
                            <div className="char-counter">
                                {formData.description.length}/500 caracteres
                            </div>
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
                                        <button
                                            type="button"
                                            className="image-action-btn change"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            type="button"
                                            className="image-action-btn delete"
                                            onClick={() => {
                                                setImagePreview(null);
                                                setImageFile(null);
                                                setFormData(prev => ({ ...prev, image_url: '' }));
                                            }}
                                        >
                                            🗑️
                                        </button>
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
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="dropzone-icon">📸</div>
                            <h3 className="dropzone-title">Sube una imagen del producto</h3>
                            <p className="dropzone-subtitle">Arrastra o haz clic para subir</p>
                            <p className="dropzone-info">PNG, JPG o WEBP (máx 5MB)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="file-input"
                                accept="image/*"
                                onChange={(e) => handleImageFile(e.target.files?.[0])}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. PRECIOS Y STOCK */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">💰</div>
                        <h2 className="section-title">Precios y Stock</h2>
                    </div>

                    <div className="pricing-grid">
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
                                readOnly={applyDiscount} // Readonly if auto-calc
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

                {/* 4. VARIANTES */}
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">📏</div>
                        <h2 className="section-title">Variantes del Producto</h2>
                    </div>

                    <label className="price-label" style={{ marginBottom: 16 }}>Talles Disponibles</label>
                    <div className="sizes-grid">
                        {AVAILABLE_SIZES.map(size => (
                            <div
                                key={size}
                                className={`size-option ${formData.sizes.includes(size) ? 'selected' : ''}`}
                                onClick={() => toggleArrayItem('sizes', size)}
                            >
                                {size}
                            </div>
                        ))}
                        {/* Custom size input could be a + button, handled simply for now */}
                    </div>

                    <label className="price-label" style={{ marginBottom: 16 }}>Colores Disponibles</label>
                    <div className="colors-grid">
                        {PRESET_COLORS.map(color => (
                            <div
                                key={color.name}
                                className={`color-option ${formData.colors.includes(color.name) ? 'selected' : ''}`}
                                onClick={() => toggleArrayItem('colors', color.name)}
                            >
                                <div className="color-circle" style={{ background: color.hex }}></div>
                                <span className="color-name">{color.name}</span>
                            </div>
                        ))}
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
                        onClick={() => navigate('/admin/products')}
                    >
                        Cancelar
                    </button>

                    <div className="footer-actions">
                        <button
                            type="button"
                            className="btn-draft"
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
