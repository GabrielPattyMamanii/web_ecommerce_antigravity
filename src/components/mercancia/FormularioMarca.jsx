
import React, { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, Plus, Save, X, User } from 'lucide-react';
import { BrandPhotoUploader } from './BrandPhotoUploader';
import toast from 'react-hot-toast';

export function FormularioMarca({
    marca,
    index,
    onUpdate,
    onDelete,
    isEditingInitially = true,
    users = []
}) {
    const [isExpanded, setIsExpanded] = useState(marca.collapsed ? false : true);
    const [isEditing, setIsEditing] = useState(isEditingInitially);
    const [editingProductIndex, setEditingProductIndex] = useState(null);

    const [productForm, setProductForm] = useState({
        nombre: '',
        docenas: '',
        precioPorDocena: '',
        bultos: '',
        codigo: '',
        observaciones: '',
        propietario: ''
    });

    const knownOwners = React.useMemo(() => {
        const names = new Set();
        if (marca.propietario?.trim()) names.add(marca.propietario.trim());
        (marca.productos || []).forEach(p => {
            if (p.propietario?.trim()) names.add(p.propietario.trim());
        });
        users.forEach(u => { if (u.username) names.add(u.username); });
        return [...names];
    }, [marca.propietario, marca.productos, users]);

    const getOwnerColor = (name) => users.find(u => u.username === name)?.color || null;

    const [fieldErrors, setFieldErrors] = useState({});
    const [showEditModal, setShowEditModal] = useState(false);

    const calculateSubtotal = () =>
        (parseFloat(productForm.docenas) || 0) * (parseFloat(productForm.precioPorDocena) || 0);

    const handleAddProduct = () => {
        const errors = {};
        if (!productForm.nombre) errors.nombre = 'Obligatorio';
        if (!productForm.docenas) errors.docenas = 'Obligatorio';
        if (!productForm.precioPorDocena) errors.precioPorDocena = 'Obligatorio';
        if (!productForm.codigo) errors.codigo = 'Obligatorio';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        const newProd = {
            producto_titulo: productForm.nombre,
            cantidad_docenas: parseFloat(productForm.docenas),
            precio_docena: parseFloat(productForm.precioPorDocena),
            bultos: parseFloat(productForm.bultos) || 0,
            codigo: productForm.codigo.trim().toUpperCase(),
            observaciones: productForm.observaciones,
            propietario: productForm.propietario.trim() || '',
            subtotal: parseFloat(productForm.docenas) * parseFloat(productForm.precioPorDocena)
        };

        if (editingProductIndex !== null) {
            const updated = [...(marca.productos || [])];
            updated[editingProductIndex] = newProd;
            onUpdate(index, { ...marca, productos: updated });
            setEditingProductIndex(null);
            setShowEditModal(false);
            toast.success('Producto actualizado');
        } else {
            onUpdate(index, { ...marca, productos: [...(marca.productos || []), newProd] });
            toast.success(`"${newProd.producto_titulo}" agregado`);
        }

        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', bultos: '', codigo: '', observaciones: '', propietario: '' });
        setFieldErrors({});
    };

    const handleEditProduct = (prodIndex) => {
        const prod = marca.productos[prodIndex];
        setProductForm({
            nombre: prod.producto_titulo,
            docenas: prod.cantidad_docenas,
            precioPorDocena: prod.precio_docena,
            bultos: prod.bultos || '',
            codigo: prod.codigo,
            observaciones: prod.observaciones || '',
            propietario: prod.propietario || ''
        });
        setEditingProductIndex(prodIndex);
        setShowEditModal(true);
        setIsExpanded(true);
    };

    const handleCancelEdit = () => {
        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', bultos: '', codigo: '', observaciones: '', propietario: '' });
        setEditingProductIndex(null);
        setFieldErrors({});
        setShowEditModal(false);
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [productToDeleteIndex, setProductToDeleteIndex] = useState(null);

    const handleRemoveProductClick = (prodIndex) => {
        setProductToDeleteIndex(prodIndex);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteProduct = () => {
        if (productToDeleteIndex !== null) {
            const updated = marca.productos.filter((_, i) => i !== productToDeleteIndex);
            onUpdate(index, { ...marca, productos: updated });
            toast.success('Producto eliminado');
            setShowDeleteConfirm(false);
            setProductToDeleteIndex(null);
        }
    };

    const ownerColor = getOwnerColor(marca.propietario);
    const totalMarca = (marca.productos || []).reduce(
        (sum, p) => sum + (parseFloat(p.cantidad_docenas || 0) * parseFloat(p.precio_docena || 0)), 0
    );
    const totalDocenas = (marca.productos || []).reduce(
        (sum, p) => sum + (parseFloat(p.cantidad_docenas || 0)), 0
    );

    const inputCls = (err) =>
        `w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground ${
            err ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
        }`;

    return (
        <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-md ring-1 ring-border' : 'shadow-sm'} bg-card border-border relative`}>

            {/* Modal: confirmar eliminación de producto */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                    <div className="bg-background border border-border rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-4">
                                <Trash2 size={22} />
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-1">¿Eliminar producto?</h3>
                            <p className="text-sm text-muted-foreground mb-5">Esta acción no se puede deshacer.</p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setProductToDeleteIndex(null); }}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg border border-border transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteProduct}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ENCABEZADO ── */}
            <div className="bg-muted/10" style={ownerColor ? { borderLeft: `4px solid ${ownerColor}` } : {}}>

                {/* Fila principal: avatar + info + chevron */}
                <div
                    className="flex items-start gap-3 px-4 pt-4 pb-3 cursor-pointer select-none"
                    onClick={() => setIsExpanded(v => !v)}
                >
                    {/* Avatar color del propietario */}
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                            backgroundColor: ownerColor ? ownerColor + '20' : 'var(--muted)',
                            border: ownerColor ? `2px solid ${ownerColor}50` : '2px solid var(--border)'
                        }}
                    >
                        📦
                    </div>

                    {/* Nombre + boleta + propietario + stats */}
                    <div className="flex-1 min-w-0">
                        {/* Nombre y boleta */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="text-base font-bold text-foreground bg-background border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring max-w-[180px]"
                                    value={marca.nombre}
                                    onChange={(e) => onUpdate(index, { ...marca, nombre: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <h3 className="text-base font-bold text-foreground">{marca.nombre}</h3>
                            )}

                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Boleta:</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-24 px-2 py-1 text-sm rounded-lg border border-input bg-background text-red-600 dark:text-red-400 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="N°"
                                        value={marca.codigo_boleta || ''}
                                        onChange={(e) => onUpdate(index, { ...marca, codigo_boleta: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className={`text-sm font-bold font-mono ${marca.codigo_boleta ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground/40 italic'}`}>
                                        {marca.codigo_boleta || 'sin boleta'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Segunda fila: propietario + stats */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                            {/* Selector propietario */}
                            <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <div className="relative flex items-center">
                                    {marca.propietario && (
                                        <span
                                            className="absolute left-2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none"
                                            style={{ backgroundColor: ownerColor || '#e5e7eb' }}
                                        />
                                    )}
                                    <select
                                        className="pl-6 pr-3 py-1 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium min-w-[120px]"
                                        value={marca.propietario || ''}
                                        onChange={(e) => onUpdate(index, { ...marca, propietario: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                        style={ownerColor ? { borderColor: ownerColor } : {}}
                                    >
                                        <option value="">Sin propietario</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.username}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-2 ml-auto">
                                {totalDocenas > 0 && (
                                    <span className="text-xs text-muted-foreground font-medium">{totalDocenas} doc.</span>
                                )}
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {marca.productos?.length || 0} prod.
                                </span>
                                {totalMarca > 0 && (
                                    <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono">
                                        ${totalMarca.toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chevron */}
                    <div className="flex-shrink-0 mt-1 text-muted-foreground">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {/* Fila de acciones */}
                <div className="flex items-center gap-2 px-4 pb-3">
                    <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm ${
                            isEditing
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                        onClick={(e) => { e.stopPropagation(); setIsEditing(v => !v); setIsExpanded(true); }}
                    >
                        {isEditing ? <><Save size={12} /> Listo</> : <><Edit2 size={12} /> Editar</>}
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
                        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                    >
                        <Trash2 size={12} /> Eliminar marca
                    </button>
                </div>
            </div>

            {/* ── MODAL: editar producto ── */}
            {showEditModal && editingProductIndex !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <p className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Edit2 size={14} className="text-orange-500" />
                                Editando producto #{editingProductIndex + 1}
                            </p>
                            <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Form body */}
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-[1fr_7rem] gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Nombre *</label>
                                    <input
                                        className={inputCls(fieldErrors.nombre)}
                                        placeholder="Nombre del producto"
                                        value={productForm.nombre}
                                        onChange={e => { setProductForm(p => ({ ...p, nombre: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, nombre: undefined })); }}
                                    />
                                    {fieldErrors.nombre && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.nombre}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Código *</label>
                                    <input
                                        className={inputCls(fieldErrors.codigo) + ' uppercase font-mono'}
                                        placeholder="Cód."
                                        value={productForm.codigo}
                                        onChange={e => { setProductForm(p => ({ ...p, codigo: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, codigo: undefined })); }}
                                    />
                                    {fieldErrors.codigo && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.codigo}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Docenas *</label>
                                    <input
                                        type="number"
                                        className={inputCls(fieldErrors.docenas) + ' text-center'}
                                        placeholder="0"
                                        value={productForm.docenas}
                                        onChange={e => { setProductForm(p => ({ ...p, docenas: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, docenas: undefined })); }}
                                    />
                                    {fieldErrors.docenas && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.docenas}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">$ / Docena *</label>
                                    <input
                                        type="number"
                                        className={inputCls(fieldErrors.precioPorDocena) + ' font-mono'}
                                        placeholder="0"
                                        value={productForm.precioPorDocena}
                                        onChange={e => { setProductForm(p => ({ ...p, precioPorDocena: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, precioPorDocena: undefined })); }}
                                    />
                                    {fieldErrors.precioPorDocena && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.precioPorDocena}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Bultos</label>
                                    <input
                                        type="number"
                                        className={inputCls(false) + ' text-center'}
                                        placeholder="0"
                                        value={productForm.bultos}
                                        onChange={e => setProductForm(p => ({ ...p, bultos: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Observaciones</label>
                                    <input
                                        className={inputCls(false)}
                                        placeholder="Opcional"
                                        value={productForm.observaciones}
                                        onChange={e => setProductForm(p => ({ ...p, observaciones: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                        Propietario
                                        <span className="normal-case ml-1 text-muted-foreground/60 font-normal">(distinto)</span>
                                    </label>
                                    <div className="relative">
                                        {productForm.propietario && (
                                            <span
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none"
                                                style={{ backgroundColor: getOwnerColor(productForm.propietario) || '#9ca3af' }}
                                            />
                                        )}
                                        <input
                                            list={`owners-list-modal-${marca.id}`}
                                            className={inputCls(false) + (productForm.propietario ? ' pl-8' : '')}
                                            placeholder={marca.propietario || 'Sin cambio'}
                                            value={productForm.propietario}
                                            onChange={e => setProductForm(p => ({ ...p, propietario: e.target.value }))}
                                        />
                                    </div>
                                    <datalist id={`owners-list-modal-${marca.id}`}>
                                        {knownOwners.map(n => <option key={n} value={n} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/10 rounded-b-xl">
                            <div>
                                {calculateSubtotal() > 0 && (
                                    <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
                                        Subtotal: ${calculateSubtotal().toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    <X size={14} /> Cancelar
                                </button>
                                <button
                                    onClick={handleAddProduct}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm text-white bg-orange-500 hover:bg-orange-600"
                                >
                                    <Save size={14} /> Guardar cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONTENIDO EXPANDIDO ── */}
            {isExpanded && (
                <div className="p-4 border-t border-border space-y-4">

                    {/* Lista de productos */}
                    {marca.productos && marca.productos.length > 0 ? (
                        <>
                            {/* Desktop: tabla */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Producto</th>
                                            <th className="px-4 py-3">Código</th>
                                            <th className="px-4 py-3 text-center">Doc.</th>
                                            <th className="px-4 py-3 text-right">$/Doc.</th>
                                            <th className="px-4 py-3 text-center">Bultos</th>
                                            <th className="px-4 py-3 text-right">Subtotal</th>
                                            <th className="px-4 py-3">Propietario</th>
                                            {isEditing && <th className="px-4 py-3" />}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {marca.productos.map((prod, idx) => {
                                            const ownerName = prod.propietario?.trim() || marca.propietario?.trim() || '';
                                            const color = getOwnerColor(ownerName);
                                            const isInherited = !prod.propietario?.trim() && !!marca.propietario?.trim();
                                            return (
                                                <tr key={idx} className="transition-colors hover:bg-muted/20">
                                                    <td className="px-4 py-3 font-medium text-foreground">{prod.producto_titulo}</td>
                                                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{prod.codigo}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-foreground">{prod.cantidad_docenas}</td>
                                                    <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                                                        ${parseFloat(prod.precio_docena).toLocaleString('es-AR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-foreground">{prod.bultos || 0}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 font-mono">
                                                        ${(prod.cantidad_docenas * prod.precio_docena).toLocaleString('es-AR')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {ownerName ? (
                                                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#9ca3af' }} />
                                                                <span className={isInherited ? 'text-muted-foreground italic' : 'text-foreground'}>{ownerName}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/40 italic">—</span>
                                                        )}
                                                    </td>
                                                    {isEditing && (
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => handleEditProduct(idx)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Editar">
                                                                    <Edit2 size={13} />
                                                                </button>
                                                                <button onClick={() => handleRemoveProductClick(idx)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Eliminar">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile: tarjetas */}
                            <div className="md:hidden rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
                                {marca.productos.map((prod, idx) => {
                                    const ownerName = prod.propietario?.trim() || marca.propietario?.trim() || '';
                                    const color = getOwnerColor(ownerName);
                                    const isInherited = !prod.propietario?.trim() && !!marca.propietario?.trim();
                                    const subtotal = (parseFloat(prod.cantidad_docenas) || 0) * (parseFloat(prod.precio_docena) || 0);
                                    return (
                                        <div key={idx} className="p-3">
                                            {/* Nombre + código + acciones */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-foreground text-sm leading-tight">{prod.producto_titulo}</p>
                                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{prod.codigo}</p>
                                                    {ownerName && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs mt-1" style={{ color: color || '#9ca3af' }}>
                                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#9ca3af' }} />
                                                            <span className={isInherited ? 'italic' : ''}>{ownerName}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {isEditing && (
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <button onClick={() => handleEditProduct(idx)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleRemoveProductClick(idx)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Stats */}
                                            <div className="grid grid-cols-4 gap-1.5">
                                                <div className="bg-muted/30 rounded-lg p-2 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Doc.</p>
                                                    <p className="font-bold text-foreground text-sm">{prod.cantidad_docenas}</p>
                                                </div>
                                                <div className="bg-muted/30 rounded-lg p-2 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">$/Doc.</p>
                                                    <p className="font-bold text-foreground text-xs font-mono">${parseFloat(prod.precio_docena || 0).toLocaleString('es-AR')}</p>
                                                </div>
                                                <div className="bg-muted/30 rounded-lg p-2 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Bultos</p>
                                                    <p className="font-bold text-foreground text-sm">{prod.bultos || 0}</p>
                                                </div>
                                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                                    <p className="text-[10px] text-green-700 dark:text-green-400 uppercase font-semibold">Total</p>
                                                    <p className="font-bold text-green-600 dark:text-green-400 text-xs font-mono">${subtotal.toLocaleString('es-AR')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-sm text-muted-foreground bg-muted/5 rounded-xl border border-border">
                            {isEditing ? 'Completá el formulario para agregar el primer producto' : 'Sin productos registrados'}
                        </div>
                    )}

                    {/* Formulario de nuevo producto — debajo de la tabla */}
                    {isEditing && editingProductIndex === null && (
                        <div className="bg-muted/20 border border-border rounded-xl p-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Plus size={11} /> Nuevo producto
                            </p>

                            <div className="space-y-2.5">
                                <div className="grid grid-cols-[1fr_7rem] gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Nombre *</label>
                                        <input
                                            className={inputCls(fieldErrors.nombre)}
                                            placeholder="Nombre del producto"
                                            value={productForm.nombre}
                                            onChange={e => { setProductForm(p => ({ ...p, nombre: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, nombre: undefined })); }}
                                        />
                                        {fieldErrors.nombre && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.nombre}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Código *</label>
                                        <input
                                            className={inputCls(fieldErrors.codigo) + ' uppercase font-mono'}
                                            placeholder="Cód."
                                            value={productForm.codigo}
                                            onChange={e => { setProductForm(p => ({ ...p, codigo: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, codigo: undefined })); }}
                                        />
                                        {fieldErrors.codigo && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.codigo}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Docenas *</label>
                                        <input
                                            type="number"
                                            className={inputCls(fieldErrors.docenas) + ' text-center'}
                                            placeholder="0"
                                            value={productForm.docenas}
                                            onChange={e => { setProductForm(p => ({ ...p, docenas: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, docenas: undefined })); }}
                                        />
                                        {fieldErrors.docenas && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.docenas}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">$ / Docena *</label>
                                        <input
                                            type="number"
                                            className={inputCls(fieldErrors.precioPorDocena) + ' font-mono'}
                                            placeholder="0"
                                            value={productForm.precioPorDocena}
                                            onChange={e => { setProductForm(p => ({ ...p, precioPorDocena: e.target.value })); if (e.target.value) setFieldErrors(p => ({ ...p, precioPorDocena: undefined })); }}
                                        />
                                        {fieldErrors.precioPorDocena && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.precioPorDocena}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Bultos</label>
                                        <input
                                            type="number"
                                            className={inputCls(false) + ' text-center'}
                                            placeholder="0"
                                            value={productForm.bultos}
                                            onChange={e => setProductForm(p => ({ ...p, bultos: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Observaciones</label>
                                        <input
                                            className={inputCls(false)}
                                            placeholder="Opcional"
                                            value={productForm.observaciones}
                                            onChange={e => setProductForm(p => ({ ...p, observaciones: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                            Propietario
                                            <span className="normal-case ml-1 text-muted-foreground/60 font-normal">(si es distinto al de la marca)</span>
                                        </label>
                                        <div className="relative">
                                            {productForm.propietario && (
                                                <span
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none"
                                                    style={{ backgroundColor: getOwnerColor(productForm.propietario) || '#9ca3af' }}
                                                />
                                            )}
                                            <input
                                                list={`owners-list-${marca.id}`}
                                                className={inputCls(false) + (productForm.propietario ? ' pl-8' : '')}
                                                placeholder={marca.propietario || 'Sin cambio'}
                                                value={productForm.propietario}
                                                onChange={e => setProductForm(p => ({ ...p, propietario: e.target.value }))}
                                            />
                                        </div>
                                        <datalist id={`owners-list-${marca.id}`}>
                                            {knownOwners.map(n => <option key={n} value={n} />)}
                                        </datalist>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                <div>
                                    {calculateSubtotal() > 0 && (
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
                                            Subtotal: ${calculateSubtotal().toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleAddProduct}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm text-white bg-primary hover:bg-primary/90"
                                >
                                    <Plus size={14} /> Agregar producto
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resumen por propietario (solo si hay más de uno) */}
                    {(() => {
                        const ownerMap = {};
                        (marca.productos || []).forEach(p => {
                            const owner = p.propietario?.trim() || marca.propietario?.trim() || 'Sin asignar';
                            if (!ownerMap[owner]) ownerMap[owner] = { items: 0, docenas: 0, total: 0 };
                            ownerMap[owner].items += 1;
                            ownerMap[owner].docenas += parseFloat(p.cantidad_docenas) || 0;
                            ownerMap[owner].total += (parseFloat(p.cantidad_docenas) || 0) * (parseFloat(p.precio_docena) || 0);
                        });
                        const entries = Object.entries(ownerMap);
                        if (entries.length <= 1) return null;
                        const totalAmt = entries.reduce((s, [, v]) => s + v.total, 0);
                        return (
                            <div className="p-3 bg-muted/10 border border-border rounded-xl">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Resumen por propietario</p>
                                <div className="flex flex-wrap gap-2">
                                    {entries.map(([name, data]) => {
                                        const color = getOwnerColor(name);
                                        const pct = totalAmt > 0 ? ((data.total / totalAmt) * 100).toFixed(0) : 0;
                                        return (
                                            <div key={name} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#9ca3af' }} />
                                                <span className="font-bold text-foreground">{name}</span>
                                                <span className="text-muted-foreground">· {data.items} prod · {data.docenas} doc</span>
                                                <span className="font-mono font-bold text-green-600 dark:text-green-400">${data.total.toLocaleString('es-AR')}</span>
                                                <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Bultos */}
                    <div className="flex flex-wrap items-center gap-4 bg-muted/20 px-4 py-3 rounded-xl border border-border">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Bultos calculados: </span>
                            <span className="font-bold text-foreground text-lg ml-1">
                                {(marca.productos || []).reduce((acc, p) => acc + (parseFloat(p.bultos) || 0), 0)}
                            </span>
                        </div>
                        <div className="h-5 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-muted-foreground">Bultos personalizados:</span>
                            <input
                                type="number"
                                className="w-20 px-2 py-1 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-bold"
                                placeholder="Auto"
                                value={marca.bultos_personalizados || ''}
                                onChange={(e) => onUpdate(index, { ...marca, bultos_personalizados: e.target.value })}
                            />
                            <span className="text-xs text-muted-foreground">(sobrescribe el calculado)</span>
                        </div>
                    </div>

                    {/* Fotos */}
                    <BrandPhotoUploader
                        photos={marca.fotos || []}
                        onPhotosChange={(newPhotos) => onUpdate(index, { ...marca, fotos: newPhotos })}
                        maxPhotos={5}
                        brandName={marca.nombre}
                    />
                </div>
            )}
        </div>
    );
}
