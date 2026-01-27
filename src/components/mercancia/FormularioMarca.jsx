
import React, { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, Package, Plus, Save, X } from 'lucide-react';

export function FormularioMarca({
    marca,
    index,
    onUpdate,
    onDelete,
    isEditingInitially = true
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(isEditingInitially);
    const [editingProductIndex, setEditingProductIndex] = useState(null);

    // Draft product state
    const [productForm, setProductForm] = useState({
        nombre: '',
        docenas: '',
        precioPorDocena: '',
        codigo: '',
        observaciones: ''
    });

    // Validation State
    const [codigoError, setCodigoError] = useState('');

    const calculateSubtotal = () => {
        const d = parseFloat(productForm.docenas) || 0;
        const p = parseFloat(productForm.precioPorDocena) || 0;
        return d * p;
    };

    const handleAddProduct = () => {
        if (!productForm.nombre || !productForm.docenas || !productForm.precioPorDocena || !productForm.codigo) {
            alert("Complete los campos obligatorios (*)");
            return;
        }

        // Final Validation before adding
        // Final Validation before adding
        const normalizedNewCode = productForm.codigo.trim().toLowerCase();
        // Check if exists in CURRENT brand's products
        const existsInBrand = marca.productos && marca.productos.some((p, idx) => {
            if (editingProductIndex !== null && idx === editingProductIndex) return false;
            return p.codigo && p.codigo.trim().toLowerCase() === normalizedNewCode;
        });

        if (existsInBrand) {
            setCodigoError('⚠️ Código ya existe en esta marca');
            alert('⚠️ ERROR: Este código ya existe en esta marca. No se permiten duplicados dentro de la misma marca.');
            return;
        }

        if (codigoError) {
            alert(codigoError);
            return;
        }

        const newProd = {
            producto_titulo: productForm.nombre,
            cantidad_docenas: parseFloat(productForm.docenas),
            precio_docena: parseFloat(productForm.precioPorDocena),
            codigo: productForm.codigo.trim().toUpperCase(),
            observaciones: productForm.observaciones,
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

        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', codigo: '', observaciones: '' });
        setCodigoError('');
    };

    const handleEditProduct = (prodIndex) => {
        const prod = marca.productos[prodIndex];
        setProductForm({
            nombre: prod.producto_titulo,
            docenas: prod.cantidad_docenas,
            precioPorDocena: prod.precio_docena,
            codigo: prod.codigo,
            observaciones: prod.observaciones || ''
        });
        setEditingProductIndex(prodIndex);
        setCodigoError('');
    };

    const handleCancelEdit = () => {
        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', codigo: '', observaciones: '' });
        setEditingProductIndex(null);
        setCodigoError('');
    };

    const validateCode = (code) => {
        if (!code.trim()) {
            setCodigoError('');
            return;
        }

        const normalizedCode = code.trim().toLowerCase();
        // Check if exists in CURRENT brand's products
        const existsInBrand = marca.productos && marca.productos.some((p, idx) => {
            if (editingProductIndex !== null && idx === editingProductIndex) return false;
            return p.codigo && p.codigo.trim().toLowerCase() === normalizedCode;
        });

        if (existsInBrand) {
            setCodigoError('⚠️ Código ya existe en esta marca');
        } else {
            setCodigoError('');
        }
    };

    const handleRemoveProduct = (prodIndex) => {
        if (!confirm('¿Eliminar producto?')) return;
        const updatedProducts = marca.productos.filter((_, i) => i !== prodIndex);
        onUpdate(index, { ...marca, productos: updatedProducts });
    };

    return (
        <div className={`border rounded-xl mb-4 overflow-hidden transition-all duration-200 ${!isExpanded ? 'shadow-sm' : 'shadow-md ring-1 ring-border'
            } bg-card border-border`}>
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

                        {/* Editable Boleta Input in Header */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Boleta:</span>
                            <input
                                type="text"
                                className="w-24 px-2 py-1 text-sm bg-background border border-input rounded text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/50"
                                placeholder="N°"
                                value={marca.codigo_boleta || ''}
                                onChange={(e) => onUpdate(index, { ...marca, codigo_boleta: e.target.value })}
                            />
                        </div>

                        {/* Product Count Badge */}
                        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                            {marca.productos?.length || 0} productos
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                    <button
                        className={`p-2 rounded-lg transition-colors ${isEditing
                            ? 'text-primary bg-primary/10 hover:bg-primary/20'
                            : 'text-muted-foreground hover:text-primary hover:bg-muted'
                            }`}
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); setIsExpanded(true); }}
                        title={isEditing ? 'Terminar Edición' : 'Editar'}
                    >
                        {isEditing ? <span className="text-sm font-bold px-1">Listo</span> : <Edit2 size={16} />}
                    </button>
                    <button
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                        title="Eliminar Marca"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Colapsar/Expandir"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 border-t border-border">
                    {/* Inline Add Product Form */}
                    {isEditing && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2 bg-muted/30 p-3 rounded-lg border border-border items-start relative">
                                <input
                                    className="flex-[2] min-w-[200px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-all"
                                    placeholder="Nombre Producto *"
                                    value={productForm.nombre}
                                    onChange={e => setProductForm({ ...productForm, nombre: e.target.value })}
                                />
                                <input
                                    type="number"
                                    className="w-20 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-center transition-all"
                                    placeholder="Docenas *"
                                    value={productForm.docenas}
                                    onChange={e => setProductForm({ ...productForm, docenas: e.target.value })}
                                />
                                <input
                                    type="number"
                                    className="w-24 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground font-mono transition-all"
                                    placeholder="$/Docena *"
                                    value={productForm.precioPorDocena}
                                    onChange={e => setProductForm({ ...productForm, precioPorDocena: e.target.value })}
                                />
                                <div className="relative w-24">
                                    <input
                                        className={`w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 transition-all uppercase placeholder:text-muted-foreground font-mono ${codigoError
                                            ? 'border-destructive focus:ring-destructive'
                                            : 'border-input focus:ring-ring'
                                            }`}
                                        placeholder="Código *"
                                        value={productForm.codigo}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setProductForm({ ...productForm, codigo: val });
                                            validateCode(val);
                                        }}
                                    />
                                    {codigoError && (
                                        <div className="absolute top-full left-0 mt-1 z-10 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-bold">
                                            {codigoError}
                                        </div>
                                    )}
                                </div>
                                <input
                                    className="flex-1 min-w-[150px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-all"
                                    placeholder="Obs."
                                    value={productForm.observaciones}
                                    onChange={e => setProductForm({ ...productForm, observaciones: e.target.value })}
                                />

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
                                        <th className="px-4 py-3 font-medium text-right">Subtotal</th>
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
                                            <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 font-mono">
                                                ${(prod.cantidad_docenas * prod.precio_docena).toLocaleString()}
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
                                                            onClick={() => handleRemoveProduct(idx)}
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
                </div>
            )}
        </div>
    );
}
