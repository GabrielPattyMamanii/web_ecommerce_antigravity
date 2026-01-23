
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';

const AVAILABLE_COLORS = ['blue', 'purple', 'green', 'pink', 'orange', 'red'];
const AVAILABLE_ICONS = ['📁', '👕', '👗', '👟', '🎒', '⌚', '🧢', '👔', '🧥', '👠', '🩳', '🧦'];

// Simple skeleton for initial load
const CategorySkeleton = () => (
    <div className="category-item" style={{ borderColor: 'transparent', boxShadow: 'none' }}>
        <div className="category-icon" style={{ background: '#f0f0f0', border: 'none' }}></div>
        <div className="category-info" style={{ marginLeft: 16 }}>
            <div style={{ width: '60%', height: 20, background: '#f0f0f0', marginBottom: 8, borderRadius: 4 }}></div>
            <div style={{ width: '40%', height: 16, background: '#f0f0f0', borderRadius: 4 }}></div>
        </div>
    </div>
);

export function CategoryList() {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        icono: '📁',
        color: 'blue'
    });

    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        setLoading(true);
        try {
            // Fetch categories, ideally we also want product counts if possible?
            // Since supabase doesn't do complex joins/counts easily in one go without a view or rpc, 
            // we might just fetch categories and rely on separate counts or just show categories first.
            // The prompt UI shows product count "[📊] 12 productos".
            // We can fetch products and aggregate in JS or fetch counts. 
            // For now, let's fetch categories. To get counts, maybe user has a foreign key setup? 
            // Let's assume we want to show counts if feasible, but user prompt code snippet for 'api.getCategories()' implies simple fetch.
            // I will implement simple fetch for now. If I need counts, I'd need to fetch all products or use a view.

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategorias(data || []);

        } catch (error) {
            console.error(error);
            showToast('Error al cargar categorías', 'error');
        } finally {
            setLoading(false);
        }
    };

    const categoriasFiltradas = useMemo(() => {
        return categorias.filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [categorias, searchTerm]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = '⚠️ El nombre es obligatorio';
        } else if (formData.nombre.length < 2) {
            newErrors.nombre = '⚠️ Mínimo 2 caracteres';
        } else if (formData.nombre.length > 50) {
            newErrors.nombre = '⚠️ Máximo 50 caracteres';
        }

        const existe = categorias.some(
            cat => cat.name.toLowerCase() === formData.nombre.toLowerCase().trim()
        );

        if (existe) {
            newErrors.nombre = '⚠️ Ya existe esta categoría';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            const slug = formData.nombre.toLowerCase().replace(/\s+/g, '-');

            const newCat = {
                name: formData.nombre,
                slug: slug,
                description: formData.descripcion,
                icon: formData.icono,
                color: formData.color
            };

            const { data, error } = await supabase
                .from('categories')
                .insert([newCat])
                .select();

            if (error) throw error;

            showToast('✅ Categoría creada exitosamente', 'success');
            resetForm();
            // Add to list immediately
            if (data) {
                setCategorias(prev => [...prev, data[0]]);
            } else {
                fetchCategorias();
            }
        } catch (error) {
            console.error(error);
            showToast('❌ Error al crear categoría', 'error');
        }
    };

    const handleDelete = async (categoriaId, categoriaNombre) => {
        if (!window.confirm(`¿Eliminar "${categoriaNombre}"?`)) return;

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoriaId);

            if (error) throw error;

            showToast('🗑️ Categoría eliminada', 'success');
            setCategorias(prev => prev.filter(c => c.id !== categoriaId));
            if (selectedCategory?.id === categoriaId) setSelectedCategory(null);
        } catch (error) {
            // Check for FK violation if possible, though supabase generic error
            console.error(error);
            if (error.code === '23503') { // Postgres foreign_key_violation
                showToast('⚠️ No se puede eliminar: tiene productos asociados', 'error');
            } else {
                showToast('❌ Error al eliminar', 'error');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            icono: '📁',
            color: 'blue'
        });
        setErrors({});
    };

    const showToast = (mensaje, tipo = 'info') => {
        setToast({ mensaje, tipo });
        // Toast auto-closes
    };

    return (
        <div className="categories-page">
            <div className="categories-header">
                <h1 className="categories-title">Categorías</h1>
                <p className="categories-subtitle">
                    Gestiona las categorías de tus productos
                </p>
            </div>

            <div className="categories-grid">
                {/* Panel Izquierdo - Lista */}
                <div className="categories-list-panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <span className="panel-title-icon">📋</span>
                            Categorías Existentes
                        </div>
                        <span className="panel-badge">
                            {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
                        </span>
                    </div>

                    <div className="category-search">
                        <span className="category-search-icon">🔍</span>
                        <input
                            type="text"
                            className="category-search-input"
                            placeholder="Buscar categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className="category-search-clear"
                                onClick={() => setSearchTerm('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="categories-list">
                        {loading ? (
                            <>
                                <CategorySkeleton />
                                <CategorySkeleton />
                                <CategorySkeleton />
                            </>
                        ) : categoriasFiltradas.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                                {searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}
                            </div>
                        ) : (
                            categoriasFiltradas.map((categoria) => (
                                <div
                                    key={categoria.id}
                                    className={`category-item ${selectedCategory?.id === categoria.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedCategory(categoria)}
                                >
                                    <div className="category-info">
                                        <div className={`category-icon color-${categoria.color || 'blue'}`}>
                                            {categoria.icon || '📁'}
                                        </div>
                                        <div className="category-details">
                                            <span className="category-name">{categoria.name}</span>
                                            {categoria.description && (
                                                <span style={{ fontSize: 13, color: '#666', display: 'block' }}>
                                                    {categoria.description}
                                                </span>
                                            )}
                                            {/* If we had counts, we'd render them here */}
                                        </div>
                                    </div>

                                    <div className="category-actions">
                                        <button
                                            className="category-action-btn delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(categoria.id, categoria.name);
                                            }}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Panel Derecho - Crear Nueva */}
                <div className="new-category-panel">
                    <div className="new-category-header">
                        <div className="new-category-title">
                            <span className="new-category-icon">✨</span>
                            Nueva Categoría
                        </div>
                    </div>

                    <form className="category-form" onSubmit={handleSubmit}>
                        {/* Nombre */}
                        <div className="form-group">
                            <label className="form-label">
                                Nombre <span className="form-label-required">*</span>
                            </label>
                            <input
                                type="text"
                                className={`form-input ${errors.nombre ? 'error' : ''}`}
                                placeholder="Ej: Calzado deportivo"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            />
                            {errors.nombre && (
                                <span className="form-error">
                                    <span className="form-error-icon">⚠️</span>
                                    {errors.nombre}
                                </span>
                            )}
                        </div>

                        {/* Descripción */}
                        <div className="form-group">
                            <label className="form-label">Descripción (opcional)</label>
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Describe esta categoría..."
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            />
                            <span className="form-helper">
                                Máximo 200 caracteres
                            </span>
                        </div>

                        {/* Color e Icono */}
                        <div className="form-group">
                            <label className="form-label">Personalización</label>
                            <div className="icon-color-selector">
                                <span className="icon-color-label">Color</span>
                                <div className="color-options">
                                    {AVAILABLE_COLORS.map(color => (
                                        <div
                                            key={color}
                                            className={`color-option ${color} ${formData.color === color ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}
                                </div>

                                <span className="icon-color-label">Icono</span>
                                <div className="icon-options">
                                    {AVAILABLE_ICONS.map(icon => (
                                        <div
                                            key={icon}
                                            className={`icon-option ${formData.icono === icon ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, icono: icon })}
                                        >
                                            {icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="category-preview">
                            <div className="category-preview-label">Vista Previa</div>
                            <div className="category-preview-card">
                                <div className={`category-preview-icon color-${formData.color}`}>
                                    {formData.icono}
                                </div>
                                <div className="category-preview-info">
                                    <span className="category-preview-name">
                                        {formData.nombre || 'Nombre de categoría'}
                                    </span>
                                    <span className="category-preview-desc">
                                        {formData.descripcion || 'Sin descripción'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn-create"
                                disabled={!formData.nombre.trim()}
                            >
                                <span className="btn-create-icon">+</span>
                                Crear Categoría
                            </button>
                            <button
                                type="button"
                                className="btn-reset"
                                onClick={resetForm}
                            >
                                Limpiar
                            </button>
                        </div>
                    </form>
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

// Default export if needed, or named export is fine as existing was named
export default CategoryList; 
