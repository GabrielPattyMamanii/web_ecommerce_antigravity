import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';

const AVAILABLE_COLORS = ['blue', 'purple', 'green', 'pink', 'orange', 'red'];
const AVAILABLE_ICONS = ['📁', '👕', '👗', '👟', '🎒', '⌚', '🧢', '👔', '🧥', '👠', '🩳', '🧦'];

// Helper for color classes
const getColorClasses = (color) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[color] || colors.blue;
};

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
            console.error(error);
            if (error.code === '23503') {
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
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Categorías</h1>
                    <p className="text-muted-foreground">
                        Gestiona las categorías de tus productos
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Panel Izquierdo - Lista */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                            <div className="flex items-center gap-3 font-semibold text-lg text-foreground">
                                <span className="text-xl">📋</span>
                                Categorías Existentes
                            </div>
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
                                {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
                            </span>
                        </div>

                        <div className="p-4 border-b border-border bg-card sticky top-0 z-10">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-10 py-2.5 bg-muted/50 border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
                                    placeholder="Buscar categoría..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <>
                                    <CategorySkeleton />
                                    <CategorySkeleton />
                                    <CategorySkeleton />
                                </>
                            ) : categoriasFiltradas.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                    <p>{searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}</p>
                                </div>
                            ) : (
                                categoriasFiltradas.map((categoria) => (
                                    <div
                                        key={categoria.id}
                                        className={`group flex items-center p-4 rounded-xl border transition-all cursor-pointer ${selectedCategory?.id === categoria.id
                                            ? 'bg-primary/5 border-primary/30 shadow-sm'
                                            : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                                            }`}
                                        onClick={() => setSelectedCategory(categoria)}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mr-4 ${getColorClasses(categoria.color)}`}>
                                            {categoria.icon || '📁'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate">{categoria.name}</h3>
                                            {categoria.description && (
                                                <p className="text-sm text-muted-foreground truncate">{categoria.description}</p>
                                            )}
                                        </div>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(categoria.id, categoria.name);
                                            }}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho - Crear Nueva */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-card border border-border rounded-xl shadow-md p-6 sticky top-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                                <span className="text-2xl bg-primary/10 w-10 h-10 flex items-center justify-center rounded-lg">✨</span>
                                <h2 className="text-xl font-bold text-foreground">Nueva Categoría</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Nombre <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full px-4 py-2.5 rounded-lg bg-background border text-foreground focus:outline-none focus:ring-2 transition-all ${errors.nombre
                                            ? 'border-destructive focus:ring-destructive/20'
                                            : 'border-input focus:ring-ring focus:border-primary'
                                            }`}
                                        placeholder="Ej: Calzado deportivo"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                    {errors.nombre && (
                                        <p className="text-xs text-destructive flex items-center mt-1">
                                            <span className="mr-1">⚠️</span> {errors.nombre}
                                        </p>
                                    )}
                                </div>

                                {/* Descripción */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-foreground">Descripción</label>
                                        <span className="text-xs text-muted-foreground">Opcional</span>
                                    </div>
                                    <textarea
                                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary min-h-[100px] resize-none transition-all"
                                        placeholder="Describe esta categoría..."
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    />
                                    <p className="text-xs text-right text-muted-foreground">Máximo 200 caracteres</p>
                                </div>

                                {/* Personalización */}
                                <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
                                    <label className="text-sm font-semibold text-foreground block mb-2">Personalización</label>

                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Color</span>
                                        <div className="flex gap-3 flex-wrap">
                                            {AVAILABLE_COLORS.map(color => (
                                                <div
                                                    key={color}
                                                    className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${getColorClasses(color).split(' ')[0]
                                                        } ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary ring-offset-card scale-110' : ''
                                                        }`}
                                                    onClick={() => setFormData({ ...formData, color })}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Icono</span>
                                        <div className="grid grid-cols-6 gap-2">
                                            {AVAILABLE_ICONS.map(icon => (
                                                <div
                                                    key={icon}
                                                    className={`h-10 rounded-lg flex items-center justify-center cursor-pointer text-lg hover:bg-background transition-colors ${formData.icono === icon
                                                        ? 'bg-background shadow-sm ring-2 ring-primary ring-inset'
                                                        : 'bg-transparent'
                                                        }`}
                                                    onClick={() => setFormData({ ...formData, icono: icon })}
                                                >
                                                    {icon}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vista Previa</span>
                                    <div className="flex items-center p-4 bg-card border border-border border-dashed rounded-xl">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mr-4 ${getColorClasses(formData.color)}`}>
                                            {formData.icono}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-foreground">
                                                {formData.nombre || 'Nombre de categoría'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {formData.descripcion || 'Sin descripción'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        className="flex-1 px-4 py-3 border border-input bg-card text-foreground hover:bg-muted font-medium rounded-xl transition-colors"
                                        onClick={resetForm}
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!formData.nombre.trim()}
                                        className="flex-[2] px-4 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <span className="text-xl">+</span>
                                        Crear Categoría
                                    </button>
                                </div>
                            </form>
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
        </div>
    );
}

export default CategoryList;