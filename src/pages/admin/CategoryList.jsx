import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';

// ─── Category Skeleton ─────────────────────────────────────────────
const CategorySkeleton = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--muted)', opacity: 0.5 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--border)' }} />
        <div style={{ flex: 1 }}>
            <div style={{ width: '55%', height: 14, background: 'var(--border)', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ width: '30%', height: 11, background: 'var(--border)', borderRadius: 4 }} />
        </div>
    </div>
);

// ─── Delete Confirm Modal ──────────────────────────────────────────
const DeleteConfirmModal = ({ info, onConfirm, onCancel, loading }) => {
    if (!info) return null;
    const isCategory = info.type !== 'subcategoria';
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.15s ease',
        }}>
            <div style={{
                background: 'var(--card)', borderRadius: 18,
                border: '1.5px solid var(--border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                padding: 28, width: 420, maxWidth: '92vw',
            }}>
                {/* Icon */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
                        background: 'color-mix(in srgb, var(--destructive) 12%, transparent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    }}>🗑️</div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                        ¿Eliminar {isCategory ? 'categoría' : 'subcategoría'}?
                    </h3>
                </div>

                {/* Name */}
                <div style={{
                    background: 'var(--muted)', borderRadius: 10, padding: '10px 14px',
                    marginBottom: 16, textAlign: 'center',
                }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)' }}>"{info.nombre}"</span>
                </div>

                {/* Warnings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                    {isCategory && info.subCount > 0 && (
                        <div style={{
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                            padding: '10px 12px', borderRadius: 10,
                            background: 'color-mix(in srgb, #f59e0b 10%, transparent)',
                            border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)',
                        }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>
                                También se eliminarán <strong>{info.subCount} {info.subCount === 1 ? 'subcategoría' : 'subcategorías'}</strong> que contiene.
                            </p>
                        </div>
                    )}
                    <div style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '10px 12px', borderRadius: 10,
                        background: 'color-mix(in srgb, #3b82f6 10%, transparent)',
                        border: '1px solid color-mix(in srgb, #3b82f6 25%, transparent)',
                    }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>
                            Los productos con esta categoría <strong>no se eliminarán</strong>; simplemente quedarán sin categoría asignada.
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 11, cursor: 'pointer',
                            border: '1.5px solid var(--border)', background: 'var(--card)',
                            color: 'var(--foreground)', fontWeight: 600, fontSize: 14,
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '11px 0', borderRadius: 11, cursor: loading ? 'not-allowed' : 'pointer',
                            border: 'none',
                            background: loading ? 'var(--muted)' : 'var(--destructive)',
                            color: loading ? 'var(--muted-foreground)' : 'white',
                            fontWeight: 700, fontSize: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        {loading ? 'Eliminando...' : '🗑️ Eliminar'}
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

    const [formData, setFormData] = useState({ nombre: '', tipo: 'categoria' });
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState(null); // { id, nombre, type, subCount }
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Drag state
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

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
                parent_id: null,
            };
            const { data, error } = await supabase
                .from('categories')
                .insert([newCat])
                .select();
            if (error) throw error;
            showToast(
                formData.tipo === 'subcategoria'
                    ? '✅ Subcategoría creada. Arrástrala bajo una categoría.'
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

    // ─── Drag & Drop ─────────────────────────────────────────────────
    const handleDragStart = useCallback((e, subId) => {
        setDraggedId(subId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e, catId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(catId);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback(async (e, parentCatId) => {
        e.preventDefault();
        setDragOverId(null);
        if (!draggedId || draggedId === parentCatId) return;

        try {
            const { error } = await supabase
                .from('categories')
                .update({ parent_id: parentCatId })
                .eq('id', draggedId);
            if (error) throw error;
            setCategorias(prev =>
                prev.map(c => c.id === draggedId ? { ...c, parent_id: parentCatId } : c)
            );
            showToast('✅ Subcategoría asignada', 'success');
        } catch (err) {
            console.error(err);
            showToast('❌ Error al asignar subcategoría', 'error');
        } finally {
            setDraggedId(null);
        }
    }, [draggedId]);

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        setDragOverId(null);
    }, []);

    // ─── Remove parent (unassign subcategory) ──────────────────────
    const handleUnassign = async (subId) => {
        try {
            const { error } = await supabase
                .from('categories')
                .update({ parent_id: null })
                .eq('id', subId);
            if (error) throw error;
            setCategorias(prev =>
                prev.map(c => c.id === subId ? { ...c, parent_id: null } : c)
            );
            showToast('Subcategoría desasignada', 'info');
        } catch (err) {
            showToast('❌ Error al desasignar', 'error');
        }
    };

    const resetForm = () => {
        setFormData({ nombre: '', tipo: 'categoria' });
        setErrors({});
    };

    const showToast = (mensaje, tipo = 'info') => setToast({ mensaje, tipo });

    const totalCats = categorias.filter(c => c.type !== 'subcategoria').length;
    const totalSubs = categorias.filter(c => c.type === 'subcategoria').length;

    // ─── Row Components ──────────────────────────────────────────────
    const CategoryRow = ({ cat }) => {
        const subs = subcategsByParent[cat.id] || [];
        const isDropTarget = dragOverId === cat.id;
        const anyDragging = !!draggedId;

        return (
            <div
                key={cat.id}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cat.id)}
                style={{
                    borderRadius: 14,
                    border: isDropTarget
                        ? '2px dashed var(--primary)'
                        : '1.5px solid var(--border)',
                    background: isDropTarget
                        ? 'color-mix(in srgb, var(--primary) 6%, var(--card))'
                        : 'var(--card)',
                    transition: 'all 0.18s',
                    overflow: 'hidden',
                    boxShadow: isDropTarget
                        ? '0 0 0 4px color-mix(in srgb, var(--primary) 15%, transparent)'
                        : '0 1px 3px rgba(0,0,0,0.06)',
                }}
            >
                {/* Category header row */}
                <div
                    className="group"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '13px 16px',
                        cursor: 'pointer',
                        background: selectedCategory?.id === cat.id
                            ? 'color-mix(in srgb, var(--primary) 8%, var(--card))'
                            : 'transparent',
                    }}
                    onClick={() => setSelectedCategory(cat)}
                >
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                    }}>
                        📁
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)', lineHeight: 1.3 }}>
                            {cat.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
                            Categoría · {subs.length} {subs.length === 1 ? 'subcategoría' : 'subcategorías'}
                        </div>
                    </div>
                    {anyDragging && (
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--primary)',
                            background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                            borderRadius: 6, padding: '2px 8px',
                            opacity: isDropTarget ? 1 : 0.5,
                        }}>
                            {isDropTarget ? 'Soltar aquí' : 'Zona de soltar'}
                        </span>
                    )}
                    <button
                        className="delete-btn"
                        style={{
                            width: 30, height: 30, borderRadius: 8, border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: 15,
                            color: 'var(--muted-foreground)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name, cat.type); }}
                        title="Eliminar categoría"
                    >
                        🗑️
                    </button>
                </div>

                {/* Subcategories nested */}
                {subs.length > 0 && (
                    <div style={{
                        borderTop: '1px solid var(--border)',
                        background: 'color-mix(in srgb, var(--muted) 30%, var(--card))',
                        padding: '6px 12px 8px 12px',
                    }}>
                        {subs.map(sub => (
                            <SubcategoryRow key={sub.id} sub={sub} />
                        ))}
                    </div>
                )}

                {/* Empty drop hint */}
                {subs.length === 0 && isDropTarget && (
                    <div style={{
                        borderTop: '1px dashed var(--border)',
                        padding: '8px 16px',
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--primary)',
                    }}>
                        Soltar subcategoría aquí
                    </div>
                )}
            </div>
        );
    };

    const SubcategoryRow = ({ sub, showUnassign = false }) => {
        const isDragging = draggedId === sub.id;
        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, sub.id)}
                onDragEnd={handleDragEnd}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 9, margin: '3px 0',
                    cursor: 'grab', userSelect: 'none',
                    background: isDragging
                        ? 'color-mix(in srgb, var(--primary) 10%, var(--muted))'
                        : 'color-mix(in srgb, var(--muted) 50%, var(--card))',
                    border: '1px solid',
                    borderColor: isDragging ? 'var(--primary)' : 'var(--border)',
                    opacity: isDragging ? 0.55 : 1,
                    transition: 'all 0.15s',
                    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
                }}
                onClick={() => setSelectedCategory(sub)}
            >
                <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>⠿</span>
                <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, flexShrink: 0,
                }}>
                    🏷️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--foreground)' }}>
                        {sub.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>
                        Subcategoría
                    </div>
                </div>
                {showUnassign && (
                    <button
                        title="Desasignar de categoría padre"
                        style={{
                            fontSize: 11, padding: '2px 7px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'var(--card)',
                            cursor: 'pointer', color: 'var(--muted-foreground)',
                        }}
                        onClick={(e) => { e.stopPropagation(); handleUnassign(sub.id); }}
                    >
                        Desasignar
                    </button>
                )}
                <button
                    style={{
                        width: 26, height: 26, borderRadius: 7, border: 'none',
                        background: 'transparent', cursor: 'pointer', fontSize: 14,
                        color: 'var(--muted-foreground)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub.id, sub.name, sub.type); }}
                    title="Eliminar"
                >
                    🗑️
                </button>
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background">
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4 }}>
                        Categorías
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                        Gestiona las categorías y subcategorías de tus productos
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── LEFT PANEL ─────────────────────────────────── */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col"
                        style={{ height: 'calc(100vh - 200px)' }}>

                        {/* Panel header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--muted)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15 }}>
                                <span>📋</span> Categorías Existentes
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{
                                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                                    color: 'var(--primary)',
                                    fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
                                }}>
                                    {totalCats} {totalCats === 1 ? 'categoría' : 'categorías'}
                                </span>
                                {totalSubs > 0 && (
                                    <span style={{
                                        background: 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)',
                                        color: 'var(--muted-foreground)',
                                        fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
                                    }}>
                                        {totalSubs} {totalSubs === 1 ? 'subcategoría' : 'subcategorías'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Search */}
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>🔍</span>
                                <input
                                    type="text"
                                    style={{
                                        width: '100%', padding: '9px 36px', borderRadius: 9,
                                        border: '1px solid var(--input)', background: 'var(--muted)',
                                        color: 'var(--foreground)', fontSize: 13, outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                    placeholder="Buscar categoría..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        style={{
                                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
                                        }}
                                    >✕</button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {loading ? (
                                <>
                                    <CategorySkeleton />
                                    <CategorySkeleton />
                                    <CategorySkeleton />
                                </>
                            ) : topCategories.length === 0 && orphanSubs.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--muted-foreground)', fontSize: 14 }}>
                                    <span style={{ fontSize: 36, marginBottom: 10 }}>📂</span>
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
                                        <div style={{
                                            borderRadius: 12,
                                            border: '1.5px dashed var(--border)',
                                            padding: '10px 14px',
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Subcategorías sin asignar — arrástralas a una categoría
                                            </div>
                                            {orphanSubs.map(sub => (
                                                <SubcategoryRow key={sub.id} sub={sub} showUnassign={false} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT PANEL ────────────────────────────────── */}
                    <div className="lg:col-span-5">
                        <div style={{
                            background: 'var(--card)', border: '1.5px solid var(--border)',
                            borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                            padding: 24, position: 'sticky', top: 24,
                        }}>
                            {/* Panel title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                                <span style={{
                                    fontSize: 22, width: 42, height: 42, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', borderRadius: 12,
                                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                                }}>✨</span>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}>
                                    Nueva Categoría
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                                {/* Nombre */}
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 6 }}>
                                        Nombre <span style={{ color: 'var(--destructive)' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        style={{
                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                            border: `1.5px solid ${errors.nombre ? 'var(--destructive)' : 'var(--input)'}`,
                                            background: 'var(--background)', color: 'var(--foreground)',
                                            fontSize: 14, outline: 'none', boxSizing: 'border-box',
                                            transition: 'border-color 0.15s',
                                        }}
                                        placeholder="Ej: Calzado deportivo"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        onFocus={e => { if (!errors.nombre) e.target.style.borderColor = 'var(--primary)'; }}
                                        onBlur={e => { if (!errors.nombre) e.target.style.borderColor = 'var(--input)'; }}
                                    />
                                    {errors.nombre && (
                                        <p style={{ fontSize: 12, color: 'var(--destructive)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            ⚠️ {errors.nombre}
                                        </p>
                                    )}
                                </div>

                                {/* Tipo */}
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 6 }}>
                                        Tipo
                                    </label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {[
                                            { value: 'categoria', label: '📁 Categoría', desc: 'Nivel principal' },
                                            { value: 'subcategoria', label: '🏷️ Subcategoría', desc: 'Nivel secundario' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipo: opt.value })}
                                                style={{
                                                    flex: 1, padding: '12px 10px', borderRadius: 11, cursor: 'pointer',
                                                    border: `2px solid ${formData.tipo === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: formData.tipo === opt.value
                                                        ? 'color-mix(in srgb, var(--primary) 8%, var(--card))'
                                                        : 'var(--muted)',
                                                    transition: 'all 0.15s',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <div style={{ fontSize: 14, fontWeight: 700, color: formData.tipo === opt.value ? 'var(--primary)' : 'var(--foreground)', marginBottom: 2 }}>
                                                    {opt.label}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                                                    {opt.desc}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {formData.tipo === 'subcategoria' && (
                                        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 8, padding: '6px 10px', background: 'var(--muted)', borderRadius: 7 }}>
                                            💡 Después de crear, arrastra la subcategoría debajo de una categoría para asignarla.
                                        </p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        style={{
                                            flex: 1, padding: '11px 0', borderRadius: 11, cursor: 'pointer',
                                            border: '1.5px solid var(--border)', background: 'var(--card)',
                                            color: 'var(--foreground)', fontWeight: 600, fontSize: 14, transition: 'all 0.15s',
                                        }}
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!formData.nombre.trim()}
                                        style={{
                                            flex: 2, padding: '11px 0', borderRadius: 11, cursor: 'pointer',
                                            border: 'none',
                                            background: !formData.nombre.trim()
                                                ? 'var(--muted)'
                                                : 'var(--primary)',
                                            color: !formData.nombre.trim()
                                                ? 'var(--muted-foreground)'
                                                : 'var(--primary-foreground)',
                                            fontWeight: 800, fontSize: 14, transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        }}
                                    >
                                        <span style={{ fontSize: 16 }}>+</span>
                                        Crear {formData.tipo === 'subcategoria' ? 'Subcategoría' : 'Categoría'}
                                    </button>
                                </div>
                            </form>

                            {/* Legend */}
                            <div style={{ marginTop: 28, padding: '14px 16px', background: 'var(--muted)', borderRadius: 11, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Leyenda
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                                            📁
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Categoría</div>
                                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Nivel principal, agrupa subcategorías</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                                            🏷️
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Subcategoría</div>
                                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Arrastrala bajo una categoría para asignarla</div>
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
        </div>
    );
}

export default CategoryList;