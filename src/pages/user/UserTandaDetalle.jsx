import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, Package, X, Upload, Trash2,
    ImageIcon, Tag, Hash, Layers, DollarSign, MessageSquare, Save,
    ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';

const EMPTY_FORM = {
    nombre: '',
    marca: '',
    codigo: '',
    cant_docenas: '',
    costo_docena: '',
    comentarios: '',
};

export function UserTandaDetalle() {
    const { tandaNombre } = useParams();
    const navigate = useNavigate();

    const [userId, setUserId] = useState(null);
    const [userColor, setUserColor] = useState('#6b7280');
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const nombre = decodeURIComponent(tandaNombre || '');

    // ── Auth check ───────────────────────────────────────────────────────────
    useEffect(() => {
        const uid = sessionStorage.getItem('app_user_id');
        if (!uid) { navigate('/admin/usuarios'); return; }
        setUserId(uid);
        fetchUserColor(uid);
        fetchProductos(uid);
    }, [nombre]);

    const fetchUserColor = async (uid) => {
        const { data } = await supabase.from('app_users').select('color').eq('id', uid).single();
        if (data?.color) setUserColor(data.color);
    };

    // ── Fetch products ────────────────────────────────────────────────────────
    const fetchProductos = async (uid) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_productos_comprados')
                .select('*')
                .eq('user_id', uid)
                .eq('tanda_nombre', nombre)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setProductos(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openNew = () => {
        setForm(EMPTY_FORM);
        setImageFile(null);
        setImagePreview(null);
        setEditId(null);
        setError('');
        setShowModal(true);
    };

    const openEdit = (p) => {
        setForm({
            nombre: p.nombre,
            marca: p.marca,
            codigo: p.codigo,
            cant_docenas: String(p.cant_docenas),
            costo_docena: String(p.costo_docena),
            comentarios: p.comentarios || '',
        });
        setImageFile(null);
        setImagePreview(p.imagen_url || null);
        setEditId(p.id);
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditId(null);
        setForm(EMPTY_FORM);
        setImageFile(null);
        setImagePreview(null);
        setError('');
    };

    // ── Image handling ───────────────────────────────────────────────────────
    const handleImageChange = async (file) => {
        const validation = validateImageFile(file, 10);
        if (!validation.isValid) { setError(validation.error); return; }
        try {
            const webp = await convertToWebP(file, { quality: 0.85, maxWidth: 1200, maxHeight: 1200 });
            setImageFile(webp);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(webp);
        } catch (e) {
            setError('Error al procesar la imagen: ' + e.message);
        }
    };

    const uploadImage = async (file) => {
        const path = `user-products/${userId}/${Date.now()}.webp`;
        const { error } = await supabase.storage.from('products').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(path);
        return data.publicUrl;
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        setError('');

        // Validate required fields
        const required = ['nombre', 'marca', 'codigo', 'cant_docenas', 'costo_docena'];
        for (const field of required) {
            if (!form[field].toString().trim()) {
                setError('Completa todos los campos obligatorios.');
                return;
            }
        }

        setSaving(true);
        try {
            let imagen_url = imagePreview && !imageFile ? imagePreview : null;
            if (imageFile) {
                imagen_url = await uploadImage(imageFile);
            }

            const payload = {
                user_id: userId,
                tanda_nombre: nombre,
                nombre: form.nombre.trim(),
                marca: form.marca.trim(),
                codigo: form.codigo.trim(),
                cant_docenas: parseFloat(form.cant_docenas),
                costo_docena: parseFloat(form.costo_docena),
                comentarios: form.comentarios.trim() || null,
                imagen_url,
            };

            let err;
            if (editId) {
                ({ error: err } = await supabase
                    .from('user_productos_comprados')
                    .update(payload)
                    .eq('id', editId));
            } else {
                ({ error: err } = await supabase
                    .from('user_productos_comprados')
                    .insert([payload]));
            }
            if (err) throw err;

            closeModal();
            fetchProductos(userId);
        } catch (e) {
            console.error(e);
            setError('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este producto?')) return;
        try {
            const { error } = await supabase
                .from('user_productos_comprados')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchProductos(userId);
        } catch (e) {
            alert('Error al eliminar: ' + e.message);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const totalCosto = productos.reduce(
        (sum, p) => sum + (p.cant_docenas * p.costo_docena), 0
    );

    const Field = ({ label, icon: Icon, required, children }) => (
        <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                            <span>Productos Comprados</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span className="font-medium" style={{ color: userColor }}>{nombre}</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{nombre}</h1>
                    </div>
                </div>

                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${userColor}, ${userColor}dd)` }}
                >
                    <Plus className="w-4 h-4" />
                    Cargar Producto
                </button>
            </header>

            {/* ── Stats row ── */}
            {productos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">Productos</p>
                        <p className="text-2xl font-bold text-gray-800">{productos.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">Total Docenas</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {productos.reduce((s, p) => s + p.cant_docenas, 0)}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 col-span-2 sm:col-span-1">
                        <p className="text-xs text-gray-400 mb-1">Costo Total</p>
                        <p className="text-2xl font-bold" style={{ color: userColor }}>
                            ${totalCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Product list ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                    <div
                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: `${userColor}80`, borderTopColor: 'transparent' }}
                    />
                    <span>Cargando productos...</span>
                </div>
            ) : productos.length === 0 ? (
                <div
                    onClick={openNew}
                    className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-white/60 cursor-pointer hover:border-gray-300 hover:bg-white transition-all group"
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${userColor}15` }}
                    >
                        <Package className="w-8 h-8" style={{ color: userColor }} />
                    </div>
                    <p className="text-gray-500 font-semibold mb-1">Aún no cargaste productos</p>
                    <p className="text-gray-400 text-sm">Hacé clic para agregar el primero</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {productos.map((p) => (
                        <ProductCard
                            key={p.id}
                            producto={p}
                            userColor={userColor}
                            onEdit={() => openEdit(p)}
                            onDelete={() => handleDelete(p.id)}
                        />
                    ))}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editId ? 'Editar Producto' : 'Cargar Producto'}
                                </h2>
                                <p className="text-sm text-gray-400 mt-0.5">Tanda: <span className="font-medium" style={{ color: userColor }}>{nombre}</span></p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">

                            {/* Nombre */}
                            <Field label="Nombre del producto" icon={Tag} required>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                    placeholder="Ej: Remera Básica"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                                    style={{ '--tw-ring-color': userColor }}
                                />
                            </Field>

                            {/* Marca + Código */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Marca" icon={Package} required>
                                    <input
                                        type="text"
                                        value={form.marca}
                                        onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                                        placeholder="Ej: Nike"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                                    />
                                </Field>
                                <Field label="Código" icon={Hash} required>
                                    <input
                                        type="text"
                                        value={form.codigo}
                                        onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                                        placeholder="Ej: RB-001"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                                    />
                                </Field>
                            </div>

                            {/* Docenas + Costo */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Cant. docenas" icon={Layers} required>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={form.cant_docenas}
                                        onChange={e => setForm(f => ({ ...f, cant_docenas: e.target.value }))}
                                        placeholder="0"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                                    />
                                </Field>
                                <Field label="Costo por docena ($)" icon={DollarSign} required>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.costo_docena}
                                        onChange={e => setForm(f => ({ ...f, costo_docena: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                                    />
                                </Field>
                            </div>

                            {/* Comentarios */}
                            <Field label="Comentarios" icon={MessageSquare}>
                                <textarea
                                    value={form.comentarios}
                                    onChange={e => setForm(f => ({ ...f, comentarios: e.target.value }))}
                                    placeholder="Observaciones, detalles adicionales... (opcional)"
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition resize-none"
                                />
                            </Field>

                            {/* Imagen */}
                            <Field label="Imagen del producto" icon={ImageIcon}>
                                {imagePreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 group">
                                        <img
                                            src={imagePreview}
                                            alt="preview"
                                            className="w-full h-44 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-gray-700 rounded-lg text-xs font-medium shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Upload className="w-3.5 h-3.5" /> Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-2xl h-36 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all"
                                    >
                                        <Upload className="w-6 h-6 text-gray-300" />
                                        <p className="text-sm text-gray-400">Subir imagen <span className="text-gray-300">(opcional)</span></p>
                                        <p className="text-xs text-gray-300">JPG, PNG, WebP · máx 10MB</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                                />
                            </Field>

                            {/* Costo parcial preview */}
                            {form.cant_docenas && form.costo_docena && (
                                <div
                                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold"
                                    style={{ backgroundColor: `${userColor}12`, color: userColor }}
                                >
                                    <span>Costo total de este producto</span>
                                    <span>
                                        ${(parseFloat(form.cant_docenas) * parseFloat(form.costo_docena)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {error && (
                                <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                                    style={{ background: `linear-gradient(135deg, ${userColor}, ${userColor}cc)` }}
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {editId ? 'Actualizar' : 'Guardar'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Subcomponent: ProductCard ────────────────────────────────────────────────
function ProductCard({ producto: p, userColor, onEdit, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
            {/* Image */}
            <div className="relative h-40 bg-gray-50 overflow-hidden">
                {p.imagen_url ? (
                    <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <ImageIcon className="w-8 h-8 text-gray-200" />
                        <span className="text-xs text-gray-300">Sin imagen</span>
                    </div>
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={onEdit}
                        className="p-2 bg-white rounded-xl shadow text-gray-700 hover:bg-gray-50 transition"
                        title="Editar"
                    >
                        <Tag className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 bg-white rounded-xl shadow text-red-500 hover:bg-red-50 transition"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{p.nombre}</h3>
                    <span
                        className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${userColor}15`, color: userColor }}
                    >
                        {p.marca}
                    </span>
                </div>

                <p className="text-xs text-gray-400 mb-3 font-mono">#{p.codigo}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-gray-400 mb-0.5">Docenas</p>
                        <p className="font-bold text-gray-700">{p.cant_docenas}</p>
                    </div>
                    <div className="rounded-xl p-2 text-center" style={{ backgroundColor: `${userColor}10` }}>
                        <p className="text-gray-400 mb-0.5">Total</p>
                        <p className="font-bold" style={{ color: userColor }}>
                            ${(p.cant_docenas * p.costo_docena).toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>

                {p.comentarios && (
                    <p className="mt-3 text-xs text-gray-400 italic line-clamp-2 border-t border-gray-50 pt-2">
                        {p.comentarios}
                    </p>
                )}
            </div>
        </div>
    );
}
