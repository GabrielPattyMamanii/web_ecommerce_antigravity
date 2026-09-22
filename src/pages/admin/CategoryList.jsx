import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import {
    Folder, Tag, Search, X, Plus, Trash2, Sparkles, AlertTriangle, Info,
    FolderOpen, ClipboardList, MousePointerClick, CornerDownRight, ChevronRight,
    ChevronDown, ArrowUpDown
} from 'lucide-react';

// ─── Category Skeleton ─────────────────────────────────────────────
const CategorySkeleton = () => (
    <div className="flex items-center gap-3 p-3 px-4 rounded-xl bg-muted/50 animate-pulse">
        <div className="w-9 h-9 rounded-lg bg-border shrink-0" />
        <div className="flex-1 space-y-1.5">
            <div className="w-1/2 h-3.5 bg-border rounded" />
            <div className="w-1/3 h-2.5 bg-border rounded" />
        </div>
    </div>
);

// ─── Delete Confirm Modal ──────────────────────────────────────────
const DeleteConfirmModal = ({ info, onConfirm, onCancel, loading }) => {
    if (!info) return null;
    const isCategory = info.type !== 'subcategoria';
    return (
        <div className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-7 w-[420px] max-w-[92vw] animate-in zoom-in-95 duration-150">
                {/* Icon */}
                <div className="text-center mb-4">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-destructive/12 flex items-center justify-center">
                        <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-extrabold text-foreground">
                        ¿Eliminar {isCategory ? 'categoría' : 'subcategoría'}?
                    </h3>
                </div>

                {/* Name */}
                <div className="bg-muted rounded-lg px-3.5 py-2.5 mb-4 text-center">
                    <span className="font-bold text-[15px] text-foreground">"{info.nombre}"</span>
                </div>

                {/* Warnings */}
                <div className="flex flex-col gap-2 mb-5">
                    {isCategory && info.subCount > 0 && (
                        <div className="flex gap-2.5 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground leading-relaxed">
                                También se eliminarán <strong>{info.subCount} {info.subCount === 1 ? 'subcategoría' : 'subcategorías'}</strong> que contiene.
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2.5 items-start p-3 rounded-lg bg-blue-500/10 border border-blue-500/25">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground leading-relaxed">
                            Los productos con esta categoría <strong>no se eliminarán</strong>; simplemente quedarán sin categoría asignada.
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-bold text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {loading ? 'Eliminando…' : (<><Trash2 className="w-4 h-4" /> Eliminar</>)}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────
export function CategoryList() {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [formData, setFormData] = useState({ nombre: '', tipo: 'categoria', parentId: '' });
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState(null); // { id, nombre, type, subCount }
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Parent reassignment state (row currently showing its "mover a" select as busy)
    const [movingId, setMovingId] = useState(null);

    useEffect(() => { fetchCategorias(); }, []);

    const fetchCategorias = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');
            if (error) throw error;
            setCategorias(data || []);
        } catch (err) {
            console.error(err);
            showToast('Error al cargar categorías', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── Hierarchy ──────────────────────────────────────────────────
    const { topCategories, subcategsByParent, orphanSubs } = useMemo(() => {
        const filtered = categorias.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const topCats = filtered.filter(c => c.type !== 'subcategoria');
        const subsByParent = {};
        const orphans = [];

        filtered
            .filter(c => c.type === 'subcategoria')
            .forEach(sub => {
                if (sub.parent_id) {
                    if (!subsByParent[sub.parent_id]) subsByParent[sub.parent_id] = [];
                    subsByParent[sub.parent_id].push(sub);
                } else {
                    orphans.push(sub);
                }
            });

        return { topCategories: topCats, subcategsByParent: subsByParent, orphanSubs: orphans };
    }, [categorias, searchTerm]);

    // Lista completa de categorías principales (sin filtrar por búsqueda), para los selects de asignación
    const allTopCategories = useMemo(
        () => categorias.filter(c => c.type !== 'subcategoria'),
        [categorias]
    );

    // ─── Validation ─────────────────────────────────────────────────
    const validateForm = () => {
        const newErrors = {};
        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        } else if (formData.nombre.length < 2) {
            newErrors.nombre = 'Mínimo 2 caracteres';
        } else if (formData.nombre.length > 50) {
            newErrors.nombre = 'Máximo 50 caracteres';
        }
        const existe = categorias.some(
            c => c.name.toLowerCase() === formData.nombre.toLowerCase().trim()
        );
        if (existe) newErrors.nombre = 'Ya existe esta categoría';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ─── Submit ──────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            const slug = formData.nombre.toLowerCase().replace(/\s+/g, '-');
            const newCat = {
                name: formData.nombre,
                slug,
                type: formData.tipo,
                parent_id: formData.tipo === 'subcategoria' && formData.parentId ? formData.parentId : null,
            };
            const { data, error } = await supabase
                .from('categories')
                .insert([newCat])
                .select();
            if (error) throw error;
            showToast(
                formData.tipo === 'subcategoria' && !newCat.parent_id
                    ? '✅ Subcategoría creada sin asignar. Puedes asignarla desde la lista.'
                    : formData.tipo === 'subcategoria'
                        ? '✅ Subcategoría creada y asignada'
                        : '✅ Categoría creada exitosamente',
                'success'
            );
            resetForm();
            if (data) setCategorias(prev => [...prev, data[0]]);
            else fetchCategorias();
        } catch (err) {
            console.error(err);
            showToast('❌ Error al crear', 'error');
        }
    };

    // ─── Delete — open modal with context ────────────────────────────
    const handleDelete = (id, nombre, type) => {
        // Count subcategories so the modal can warn accordingly
        const subCount = categorias.filter(c => c.parent_id === id).length;
        setDeleteModal({ id, nombre, type: type || 'categoria', subCount });
    };

    // ─── Delete — actually execute after user confirms ────────────────
    const handleConfirmDelete = async () => {
        if (!deleteModal) return;
        setDeleteLoading(true);
        const { id, type } = deleteModal;
        try {
            // Collect all IDs to unlink from products (the item + its children if category)
            const childIds = (type !== 'subcategoria')
                ? categorias.filter(c => c.parent_id === id).map(c => c.id)
                : [];
            const allIdsToUnlink = [id, ...childIds];

            // Step 1: Nullify category_id in 'products' table (avoids FK constraint error)
            for (const catId of allIdsToUnlink) {
                await supabase
                    .from('products')
                    .update({ category_id: null })
                    .eq('category_id', catId);
                // Also nullify in catalog_products (ON DELETE SET NULL handles this too, but belt-and-suspenders)
                await supabase
                    .from('catalog_products')
                    .update({ category_id: null })
                    .eq('category_id', catId);
            }

            // Step 2: Delete child subcategories first (if any)
            if (childIds.length > 0) {
                const { error: subErr } = await supabase
                    .from('categories')
                    .delete()
                    .in('id', childIds);
                if (subErr) throw subErr;
            }

            // Step 3: Delete the category/subcategory itself
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;

            showToast('🗑️ Eliminado correctamente', 'success');
            // Remove from local state (item + its subcategories)
            setCategorias(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
            if (selectedCategory?.id === id) setSelectedCategory(null);
        } catch (err) {
            console.error(err);
            showToast('❌ Error al eliminar', 'error');
        } finally {
            setDeleteLoading(false);
            setDeleteModal(null);
        }
    };

    // ─── Reasignar categoría padre de una subcategoría ────────────────
    const handleChangeParent = useCallback(async (subId, newParentId) => {
        setMovingId(subId);
        try {
            const { error } = await supabase
                .from('categories')
                .update({ parent_id: newParentId })
                .eq('id', subId);
            if (error) throw error;
            setCategorias(prev =>
                prev.map(c => c.id === subId ? { ...c, parent_id: newParentId } : c)
            );
            showToast(newParentId ? '✅ Subcategoría asignada' : 'Subcategoría desasignada', newParentId ? 'success' : 'info');
        } catch (err) {
            console.error(err);
            showToast('❌ Error al reasignar subcategoría', 'error');
        } finally {
            setMovingId(null);
        }
    }, []);

    const resetForm = () => {
        setFormData({ nombre: '', tipo: 'categoria', parentId: '' });
        setErrors({});
    };

    const showToast = (mensaje, tipo = 'info') => setToast({ mensaje, tipo });

    const totalCats = categorias.filter(c => c.type !== 'subcategoria').length;
    const totalSubs = categorias.filter(c => c.type === 'subcategoria').length;

    // ─── Row Components ──────────────────────────────────────────────
    const CategoryRow = ({ cat }) => {
        const subs = subcategsByParent[cat.id] || [];
        const isSelected = selectedCategory?.id === cat.id;

        return (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-colors">
                {/* Category header row */}
                <div
                    className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/8' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedCategory(cat)}
                >
                    <div className="w-9 h-9 rounded-lg bg-primary/12 text-primary flex items-center justify-center shrink-0">
                        <Folder className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-foreground leading-tight truncate">
                            {cat.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            Categoría · {subs.length} {subs.length === 1 ? 'subcategoría' : 'subcategorías'}
                        </div>
                    </div>
                    <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name, cat.type); }}
                        title="Eliminar categoría"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Subcategories nested */}
                {subs.length > 0 && (
                    <div className="border-t border-border bg-muted/30 p-2.5 pl-3 space-y-1.5">
                        {subs.map(sub => (
                            <SubcategoryRow key={sub.id} sub={sub} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const SubcategoryRow = ({ sub }) => {
        const isMoving = movingId === sub.id;
        return (
            <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg bg-card border border-border select-none transition-opacity ${isMoving ? 'opacity-50' : ''}`}>
                <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <div className="w-[26px] h-[26px] rounded-md bg-muted-foreground/15 text-muted-foreground flex items-center justify-center shrink-0">
                    <Tag className="w-3.5 h-3.5" />
                </div>
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedCategory(sub)}
                >
                    <div className="font-semibold text-[13px] text-foreground truncate">
                        {sub.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        Subcategoría
                    </div>
                </div>
                <div className="relative shrink-0">
                    <select
                        value={sub.parent_id || ''}
                        disabled={isMoving}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleChangeParent(sub.id, e.target.value || null)}
                        title="Mover a otra categoría"
                        className="appearance-none text-[11px] pl-1.5 pr-5 py-1 rounded-md border border-border bg-card text-foreground max-w-[130px] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                        <option value="">Sin categoría</option>
                        {allTopCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                    className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub.id, sub.name, sub.type); }}
                    title="Eliminar"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
                <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <span>Catálogo &amp; Inventario</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-primary">Categorías</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Categorías</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gestioná las categorías y subcategorías para clasificar tus productos
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/12 text-primary">
                        <Folder className="w-3.5 h-3.5" /> {totalCats} {totalCats === 1 ? 'categoría' : 'categorías'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                        <Tag className="w-3.5 h-3.5" /> {totalSubs} {totalSubs === 1 ? 'subcategoría' : 'subcategorías'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── LEFT PANEL: árbol de categorías ─────────────────────── */}
                <div className="lg:col-span-7 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>

                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center gap-2.5 shrink-0">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        <h2 className="font-bold text-[15px] text-foreground">Categorías Existentes</h2>
                    </div>

                    {/* Search */}
                    <div className="px-4 py-3 border-b border-border shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-input bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all"
                                placeholder="Buscar categoría o subcategoría…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                        {loading ? (
                            <>
                                <CategorySkeleton />
                                <CategorySkeleton />
                                <CategorySkeleton />
                            </>
                        ) : topCategories.length === 0 && orphanSubs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-44 text-muted-foreground text-sm gap-2.5">
                                <FolderOpen className="w-9 h-9 text-muted-foreground/50" />
                                <p>{searchTerm ? 'No se encontraron resultados' : 'No hay categorías registradas'}</p>
                            </div>
                        ) : (
                            <>
                                {/* Top-level categories */}
                                {topCategories.map(cat => (
                                    <CategoryRow key={cat.id} cat={cat} />
                                ))}

                                {/* Orphan subcategories */}
                                {orphanSubs.length > 0 && (
                                    <div className="rounded-xl border-2 border-dashed border-border p-3.5">
                                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                            Subcategorías sin asignar — elegí una categoría en el selector
                                        </div>
                                        <div className="space-y-1.5">
                                            {orphanSubs.map(sub => (
                                                <SubcategoryRow key={sub.id} sub={sub} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Hint de reasignación en tiempo real */}
                    <div className="px-4 py-2.5 border-t border-border shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ArrowUpDown className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Podés cambiar la categoría padre de cualquier subcategoría en tiempo real usando el selector.</span>
                    </div>
                </div>

                {/* ── RIGHT PANEL: nueva categoría + leyenda ──────────────── */}
                <div className="lg:col-span-5">
                    <div className="bg-card border border-border rounded-2xl shadow-md p-6 lg:sticky lg:top-6">
                        {/* Panel title */}
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                            <span className="w-11 h-11 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </span>
                            <h2 className="text-lg font-extrabold text-foreground">Nueva Categoría</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                            {/* Nombre */}
                            <div>
                                <label className="text-sm font-semibold text-foreground block mb-1.5">
                                    Nombre <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 transition-colors ${
                                        errors.nombre
                                            ? 'border-destructive focus:ring-destructive/20'
                                            : 'border-input focus:border-primary focus:ring-primary/20'
                                    }`}
                                    placeholder="Ej: Calzado deportivo"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                                {errors.nombre && (
                                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> {errors.nombre}
                                    </p>
                                )}
                            </div>

                            {/* Tipo */}
                            <div>
                                <label className="text-sm font-semibold text-foreground block mb-1.5">Tipo</label>
                                <div className="flex gap-2.5">
                                    {[
                                        { value: 'categoria', label: 'Categoría', desc: 'Nivel principal', Icon: Folder },
                                        { value: 'subcategoria', label: 'Subcategoría', desc: 'Nivel secundario', Icon: Tag },
                                    ].map(opt => {
                                        const active = formData.tipo === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipo: opt.value })}
                                                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                                                    active ? 'border-primary bg-primary/8' : 'border-border bg-muted/40 hover:bg-muted'
                                                }`}
                                            >
                                                <opt.Icon className={`w-4 h-4 mx-auto mb-1 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <div className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                                                    {opt.label}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Categoría padre (solo para subcategorías) */}
                            {formData.tipo === 'subcategoria' && (
                                <div>
                                    <label className="text-sm font-semibold text-foreground block mb-1.5">Categoría padre</label>
                                    <div className="relative">
                                        <select
                                            value={formData.parentId}
                                            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                            className="appearance-none w-full px-3.5 py-2.5 pr-9 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                        >
                                            <option value="">Sin asignar (asignar después)</option>
                                            {allTopCategories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-2.5 pt-1">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors"
                                >
                                    Limpiar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formData.nombre.trim()}
                                    className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crear {formData.tipo === 'subcategoria' ? 'Subcategoría' : 'Categoría'}
                                </button>
                            </div>
                        </form>

                        {/* Legend */}
                        <div className="mt-7 p-4 rounded-xl bg-muted/50 border border-border">
                            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                Leyenda
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center shrink-0">
                                        <Folder className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-bold text-foreground">Categoría</div>
                                        <div className="text-[11px] text-muted-foreground">Nivel principal, agrupa subcategorías</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-muted-foreground/15 text-muted-foreground flex items-center justify-center shrink-0">
                                        <Tag className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-bold text-foreground">Subcategoría</div>
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <MousePointerClick className="w-3 h-3" />
                                            Usá el selector de la fila para asignarla a otra categoría
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                info={deleteModal}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal(null)}
                loading={deleteLoading}
            />

            {/* Toast */}
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

export default CategoryList;
