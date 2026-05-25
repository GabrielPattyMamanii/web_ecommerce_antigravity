

import React, { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, Package, Plus, Save, X } from 'lucide-react';
import { BrandPhotoUploader } from './BrandPhotoUploader';


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

    // Draft product state
    const [productForm, setProductForm] = useState({
        nombre: '',
        docenas: '',
        precioPorDocena: '',
        bultos: '', // New field
        codigo: '',
        observaciones: '',
        propietario: '' // Per-product owner override
    });

    // Autocomplete dropdown for product propietario
    const [openOwnerDropdown, setOpenOwnerDropdown] = useState(false);

    // Collect unique owner names from existing products + global marca owner
    const knownOwners = React.useMemo(() => {
        const names = new Set();
        if (marca.propietario && marca.propietario.trim()) names.add(marca.propietario.trim());
        (marca.productos || []).forEach(p => {
            if (p.propietario && p.propietario.trim()) names.add(p.propietario.trim());
        });
        users.forEach(u => { if (u.username) names.add(u.username); });
        return [...names];
    }, [marca.propietario, marca.productos, users]);

    const getOwnerColor = (name) => {
        const user = users.find(u => u.username === name);
        return user?.color || null;
    };

    // Validation State
    const [fieldErrors, setFieldErrors] = useState({});
    const [codigoError, setCodigoError] = useState('');


    const calculateSubtotal = () => {
        const d = parseFloat(productForm.docenas) || 0;
        const p = parseFloat(productForm.precioPorDocena) || 0;
        return d * p;
    };

    const handleAddProduct = () => {
        const errors = {};
        if (!productForm.nombre) errors.nombre = 'El nombre es obligatorio';
        if (!productForm.docenas) errors.docenas = 'Las docenas son obligatorias';
        if (!productForm.precioPorDocena) errors.precioPorDocena = 'El precio es obligatorio';
        if (!productForm.codigo) errors.codigo = 'El código es obligatorio';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        // Eliminada la validación de código duplicado para permitir códigos repetidos dentro de la misma marca.

        const newProd = {
            producto_titulo: productForm.nombre,
            cantidad_docenas: parseFloat(productForm.docenas),
            precio_docena: parseFloat(productForm.precioPorDocena),
            bultos: parseFloat(productForm.bultos) || 0, // New field
            codigo: productForm.codigo.trim().toUpperCase(),
            observaciones: productForm.observaciones,
            propietario: productForm.propietario.trim() || '',
            subtotal: parseFloat(productForm.docenas) * parseFloat(productForm.precioPorDocena)
        };

        if (editingProductIndex !== null) {
            const updatedProducts = [...(marca.productos || [])];
            updatedProducts[editingProductIndex] = newProd;
            onUpdate(index, { ...marca, productos: updatedProducts });
            setEditingProductIndex(null);
        } else {
            const updatedProducts = [...(marca.productos || []), newProd];
            onUpdate(index, { ...marca, productos: updatedProducts });
        }

        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', bultos: '', codigo: '', observaciones: '', propietario: '' });
        setCodigoError('');
        setFieldErrors({});
    };


    const handleEditProduct = (prodIndex) => {
        const prod = marca.productos[prodIndex];
        setProductForm({
            nombre: prod.producto_titulo,
            docenas: prod.cantidad_docenas,
            precioPorDocena: prod.precio_docena,
            bultos: prod.bultos || '', // New field
            codigo: prod.codigo,
            observaciones: prod.observaciones || '',
            propietario: prod.propietario || ''
        });
        setEditingProductIndex(prodIndex);
        setCodigoError('');
    };

    const handleCancelEdit = () => {
        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', bultos: '', codigo: '', observaciones: '', propietario: '' });
        setEditingProductIndex(null);
        setCodigoError('');
        setFieldErrors({});
    };


    const validateCode = (code) => {
        if (!code.trim()) {
            setCodigoError('');
            return;
        }

        // Eliminada la validación de código duplicado para permitir códigos repetidos
        setCodigoError('');
    };

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [productToDeleteIndex, setProductToDeleteIndex] = useState(null);

    const handleRemoveProductClick = (prodIndex) => {
        setProductToDeleteIndex(prodIndex);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteProduct = () => {
        if (productToDeleteIndex !== null) {
            const updatedProducts = marca.productos.filter((_, i) => i !== productToDeleteIndex);
            onUpdate(index, { ...marca, productos: updatedProducts });
            setShowDeleteConfirm(false);
            setProductToDeleteIndex(null);
        }
    };

    const cancelDeleteProduct = () => {
        setShowDeleteConfirm(false);
        setProductToDeleteIndex(null);
    };

    return (
        <div className={`border rounded-xl mb-4 overflow-hidden transition-all duration-200 ${!isExpanded ? 'shadow-sm' : 'shadow-md ring-1 ring-border'
            } bg-card border-border relative`}>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 rounded-xl">
                    <div className="bg-background border border-border rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 transform animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">¿Eliminar producto?</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={cancelDeleteProduct}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors border border-border"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteProduct}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
                        📦
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 flex-1 min-w-0">
                        {isEditing ? (
                            <input
                                type="text"
                                className="text-base font-bold text-foreground bg-background border border-input rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring w-full max-w-[200px]"
                                value={marca.nombre}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onUpdate(index, { ...marca, nombre: e.target.value })}
                            />
                        ) : (
                            <h3 className="text-base font-bold text-foreground whitespace-nowrap">{marca.nombre}</h3>
                        )}

                        <input
                            type="text"
                            className={`w-36 px-2 py-1 text-lg rounded transition-all focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 font-bold ${isEditing
                                ? 'bg-background border border-input text-foreground text-sm'
                                : 'bg-transparent border-none text-red-600 dark:text-red-400 cursor-not-allowed p-0'
                                }`}
                            placeholder="N°"
                            value={marca.codigo_boleta || ''}
                            onChange={(e) => onUpdate(index, { ...marca, codigo_boleta: e.target.value })}
                            readOnly={!isEditing}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="flex items-center gap-4 ml-auto">

                        {/* Propietario Field */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Propietario:</span>
                            <div className="relative flex items-center">
                                {/* Color Indicator */}
                                <div
                                    className="absolute left-2 w-3 h-3 rounded-full shadow-sm z-10 pointer-events-none"
                                    style={{
                                        backgroundColor: users.find(u => u.username === marca.propietario)?.color || '#e5e7eb'
                                    }}
                                />
                                <select
                                    className={`w-36 pl-7 pr-2 py-1 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all ${(!users || users.length === 0) ? 'text-muted-foreground cursor-not-allowed border-input' : 'border-input font-medium'
                                        }`}
                                    value={marca.propietario || ''}
                                    onChange={(e) => onUpdate(index, { ...marca, propietario: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={!users || users.length === 0}
                                    style={{
                                        borderColor: users.find(u => u.username === marca.propietario)?.color || ''
                                    }}
                                >
                                    <option value="">
                                        {(!users || users.length === 0) ? "Sin usuarios" : "Seleccionar..."}
                                    </option>
                                    {users && users.map(u => (
                                        <option key={u.id} value={u.username}>{u.username}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Product Count and Total */}
                        {/* Product Count and Total */}
                        <div className="flex items-center gap-3 border-l border-border pl-4">
                            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                {marca.productos?.length || 0} prod.
                            </div>
                            <div className="text-xl font-bold px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 whitespace-nowrap font-mono">
                                ${(marca.productos?.reduce((sum, p) => sum + (parseFloat(p.cantidad_docenas || 0) * parseFloat(p.precio_docena || 0)), 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-border ml-2 pb-[15px]">
                <button
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shadow-sm font-medium text-xs ${isEditing
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); setIsExpanded(true); }}
                    title={isEditing ? 'Terminar Edición' : 'Editar Marca'}
                >
                    {isEditing ? (
                        <>
                            <span className="font-bold">Listo</span>
                        </>
                    ) : (
                        <>
                            <Edit2 size={14} />
                            <span>Editar</span>
                        </>
                    )}
                </button>
                <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg transition-all shadow-sm text-xs font-medium"
                    onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                    title="Eliminar Marca"
                >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                </button>
                <button
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors ml-1"
                    title="Colapsar/Expandir"
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Content */}
            {
                isExpanded && (
                    <div className="p-4 border-t border-border">
                        {/* Inline Add Product Form */}
                        {isEditing && (
                            <div className="mb-4">
                                {/* Column Headers */}
                                <div className="flex flex-wrap gap-2 px-3 pb-2 items-end">
                                    <div className="flex-[2] min-w-[200px]">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                            Nombre <span className="text-red-500 text-sm font-black">*</span>
                                        </label>
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide text-center block">
                                            Docenas <span className="text-red-500 text-sm font-black">*</span>
                                        </label>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                            $/Docena <span className="text-red-500 text-sm font-black">*</span>
                                        </label>
                                    </div>
                                    <div className="w-16">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                            Bultos
                                        </label>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                            Código <span className="text-red-500 text-sm font-black">*</span>
                                        </label>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                            Observaciones
                                        </label>
                                    </div>
                                    <div className="w-32">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                            Propietario
                                        </label>
                                    </div>
                                    <div className="w-[38px]">
                                        {/* Spacer for button */}
                                    </div>
                                </div>

                                {/* Input Form */}
                                <div className="flex flex-wrap gap-2 bg-muted/30 p-3 rounded-lg border border-border items-start relative">
                                    {/* Nombre */}
                                    <div className="flex-[2] min-w-[200px] relative">
                                        <input
                                            className={`w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-all ${fieldErrors.nombre ? 'border-destructive focus:ring-destructive' : 'border-input'
                                                }`}
                                            placeholder="Nombre Producto *"
                                            value={productForm.nombre}
                                            onChange={e => {
                                                setProductForm({ ...productForm, nombre: e.target.value });
                                                if (e.target.value) setFieldErrors(prev => ({ ...prev, nombre: undefined }));
                                            }}
                                        />
                                        {fieldErrors.nombre && (
                                            <div className="absolute top-full left-0 mt-1 z-10 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-bold">
                                                ⚠️ {fieldErrors.nombre}
                                            </div>
                                        )}
                                    </div>

                                    {/* Docenas */}
                                    <div className="w-20 relative">
                                        <input
                                            type="number"
                                            className={`w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-center transition-all ${fieldErrors.docenas ? 'border-destructive focus:ring-destructive' : 'border-input'
                                                }`}
                                            placeholder="Docenas *"
                                            value={productForm.docenas}
                                            onChange={e => {
                                                setProductForm({ ...productForm, docenas: e.target.value });
                                                if (e.target.value) setFieldErrors(prev => ({ ...prev, docenas: undefined }));
                                            }}
                                        />
                                        {fieldErrors.docenas && (
                                            <div className="absolute top-full left-0 mt-1 z-10 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-bold">
                                                ⚠️ {fieldErrors.docenas}
                                            </div>
                                        )}
                                    </div>

                                    {/* Precio */}
                                    <div className="w-24 relative">
                                        <input
                                            type="number"
                                            className={`w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground font-mono transition-all ${fieldErrors.precioPorDocena ? 'border-destructive focus:ring-destructive' : 'border-input'
                                                }`}
                                            placeholder="$/Docena *"
                                            value={productForm.precioPorDocena}
                                            onChange={e => {
                                                setProductForm({ ...productForm, precioPorDocena: e.target.value });
                                                if (e.target.value) setFieldErrors(prev => ({ ...prev, precioPorDocena: undefined }));
                                            }}
                                        />
                                        {fieldErrors.precioPorDocena && (
                                            <div className="absolute top-full left-0 mt-1 z-10 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-bold">
                                                ⚠️ {fieldErrors.precioPorDocena}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bultos */}
                                    <input
                                        type="number"
                                        className="w-16 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-center transition-all"
                                        placeholder="Bult"
                                        value={productForm.bultos}
                                        onChange={e => setProductForm({ ...productForm, bultos: e.target.value })}
                                    />

                                    {/* Código */}
                                    <div className="relative w-24">
                                        <input
                                            className={`w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 transition-all uppercase placeholder:text-muted-foreground font-mono ${codigoError || fieldErrors.codigo
                                                    ? 'border-destructive focus:ring-destructive'
                                                    : 'border-input focus:ring-ring'
                                                }`}
                                            placeholder="Código *"
                                            value={productForm.codigo}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setProductForm({ ...productForm, codigo: val });
                                                validateCode(val);
                                                if (val) setFieldErrors(prev => ({ ...prev, codigo: undefined }));
                                            }}
                                        />
                                        {(codigoError || fieldErrors.codigo) && (
                                            <div className="absolute top-full left-0 mt-1 z-10 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-bold">
                                                ⚠️ {codigoError || fieldErrors.codigo}
                                            </div>
                                        )}
                                    </div>

                                    {/* Observaciones */}
                                    <input
                                        className="flex-1 min-w-[150px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-all"
                                        placeholder="Obs."
                                        value={productForm.observaciones}
                                        onChange={e => setProductForm({ ...productForm, observaciones: e.target.value })}
                                    />

                                    {/* Propietario del producto */}
                                    <div className="relative w-32">
                                        <div className="flex items-center">
                                            {productForm.propietario && (
                                                <span
                                                    className="absolute left-2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none"
                                                    style={{ backgroundColor: getOwnerColor(productForm.propietario) || '#9ca3af' }}
                                                />
                                            )}
                                            <input
                                                list={`owners-list-${marca.id}`}
                                                className="w-full pl-6 pr-2 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-all"
                                                placeholder={marca.propietario || 'Prop...'}
                                                value={productForm.propietario}
                                                onChange={e => setProductForm({ ...productForm, propietario: e.target.value })}
                                            />
                                        </div>
                                        <datalist id={`owners-list-${marca.id}`}>
                                            {knownOwners.map(n => <option key={n} value={n} />)}
                                        </datalist>
                                    </div>

                                    <div className="flex gap-1 h-full">
                                        <button
                                            className={`h-[38px] w-[38px] flex items-center justify-center rounded-md transition-all shadow-sm ${codigoError
                                                ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                                                : editingProductIndex !== null
                                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                                }`}
                                            onClick={handleAddProduct}
                                            disabled={!!codigoError}
                                            title={editingProductIndex !== null ? "Guardar Cambios" : "Agregar Producto"}
                                        >
                                            {editingProductIndex !== null ? <Save size={18} /> : <Plus size={18} />}
                                        </button>
                                        {editingProductIndex !== null && (
                                            <button
                                                className="h-[38px] w-[38px] flex items-center justify-center rounded-md transition-all bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                                onClick={handleCancelEdit}
                                                title="Cancelar Edición"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Subtotal Preview */}
                                {(productForm.docenas && productForm.precioPorDocena) && (
                                    <div className="flex justify-end mt-2 px-1 gap-2 items-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Subtotal:</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono bg-green-50 dark:bg-green-900/10 px-2 py-0.5 rounded">
                                            ${calculateSubtotal().toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Product List Table */}
                        <div className="overflow-x-auto rounded-lg border border-border">
                            {marca.productos && marca.productos.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Producto</th>
                                            <th className="px-4 py-3 font-medium">Código</th>
                                            <th className="px-4 py-3 font-medium text-center">Doc</th>
                                            <th className="px-4 py-3 font-medium text-right">$/Doc</th>
                                            <th className="px-4 py-3 font-medium text-center">Bultos</th>
                                            <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                                            <th className="px-4 py-3 font-medium">Propietario</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {marca.productos.map((prod, idx) => (
                                            <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-medium text-foreground">{prod.producto_titulo}</td>
                                                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{prod.codigo}</td>
                                                <td className="px-4 py-3 text-center font-bold text-foreground">{prod.cantidad_docenas}</td>
                                                <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                                                    ${parseFloat(prod.precio_docena).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center text-foreground font-medium">
                                                    {prod.bultos || 0}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 font-mono">
                                                    ${(prod.cantidad_docenas * prod.precio_docena).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const ownerName = prod.propietario?.trim() || marca.propietario?.trim() || '';
                                                        const color = getOwnerColor(ownerName);
                                                        const isInherited = !prod.propietario?.trim() && !!marca.propietario?.trim();
                                                        return ownerName ? (
                                                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#9ca3af' }} />
                                                                <span className={isInherited ? 'text-muted-foreground italic' : 'text-foreground'}>
                                                                    {ownerName}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/50 italic">—</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing && (
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                onClick={() => handleEditProduct(idx)}
                                                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                title="Editar producto"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveProductClick(idx)}
                                                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                                title="Eliminar producto"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8 text-sm text-muted-foreground border-dashed border- border-border bg-muted/5">
                                    Sin productos registrados
                                </div>
                            )}
                        </div>

                        {/* Owner Summary Section */}
                        {(() => {
                            const ownerMap = {};
                            (marca.productos || []).forEach(p => {
                                const owner = p.propietario?.trim() || marca.propietario?.trim() || 'Sin asignar';
                                if (!ownerMap[owner]) ownerMap[owner] = { items: 0, bultos: 0, total: 0 };
                                ownerMap[owner].items += 1;
                                ownerMap[owner].bultos += parseFloat(p.bultos) || 0;
                                ownerMap[owner].total += (parseFloat(p.cantidad_docenas) || 0) * (parseFloat(p.precio_docena) || 0);
                            });
                            const owners = Object.entries(ownerMap);
                            if (owners.length <= 1) return null;
                            const totalAmount = owners.reduce((s, [, v]) => s + v.total, 0);
                            return (
                                <div className="mt-3 p-3 bg-muted/10 border border-border rounded-lg">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Resumen por Propietario</p>
                                    <div className="flex flex-wrap gap-2">
                                        {owners.map(([name, data]) => {
                                            const color = getOwnerColor(name);
                                            const pct = totalAmount > 0 ? ((data.total / totalAmount) * 100).toFixed(0) : 0;
                                            return (
                                                <div key={name} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#9ca3af' }} />
                                                    <span className="font-bold text-foreground">{name}</span>
                                                    <span className="text-muted-foreground">·</span>
                                                    <span className="text-muted-foreground">{data.items} prod</span>
                                                    <span className="text-muted-foreground">·</span>
                                                    <span className="font-mono font-bold text-green-600 dark:text-green-400">${data.total.toLocaleString()}</span>
                                                    <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Bultos Totales / Personalizados Section */}
                        <div className="flex items-center justify-between bg-muted/20 p-4 rounded-lg border border-border mt-4">
                            <div className="flex items-center gap-4">
                                <div className="text-sm">
                                    <span className="text-muted-foreground font-medium">Bultos Calculados: </span>
                                    <span className="text-foreground font-bold text-lg ml-1">
                                        {marca.productos?.reduce((acc, p) => acc + (parseFloat(p.bultos) || 0), 0) || 0}
                                    </span>
                                </div>
                                <div className="h-6 w-px bg-border mx-2"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[#49EBBD]">Bultos Personalizados:</span>
                                    <input
                                        type="number"
                                        className="w-20 px-2 py-1 text-sm bg-background border border-input rounded text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/50 font-bold"
                                        placeholder="Auto"
                                        value={marca.bultos_personalizados || ''}
                                        onChange={(e) => onUpdate(index, { ...marca, bultos_personalizados: e.target.value })}
                                    />
                                    <span className="text-xs text-muted-foreground">(Sobrescribe el total)</span>
                                </div>
                            </div>
                        </div>

                        {/* Brand Photo Uploader */}
                        <BrandPhotoUploader
                            photos={marca.fotos || []}
                            onPhotosChange={(newPhotos) => {
                                onUpdate(index, { ...marca, fotos: newPhotos });
                            }}
                            maxPhotos={5}
                            brandName={marca.nombre}
                        />
                    </div>
                )
            }
        </div>
    );
}

