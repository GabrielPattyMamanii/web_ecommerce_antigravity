
import React, { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, Package, Plus } from 'lucide-react';

export function FormularioMarca({
    marca,
    index,
    onUpdate,
    onDelete,
    isEditingInitially = true
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(isEditingInitially);

    // Draft product state
    const [productForm, setProductForm] = useState({
        nombre: '',
        docenas: '',
        precioPorDocena: '',
        codigo: '',
        observaciones: ''
    });

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

        const newProd = {
            producto_titulo: productForm.nombre,
            cantidad_docenas: parseFloat(productForm.docenas),
            precio_docena: parseFloat(productForm.precioPorDocena),
            codigo: productForm.codigo.toUpperCase(),
            observaciones: productForm.observaciones,
            subtotal: parseFloat(productForm.docenas) * parseFloat(productForm.precioPorDocena)
        };

        const updatedProducts = [...(marca.productos || []), newProd];
        onUpdate(index, { ...marca, productos: updatedProducts });

        setProductForm({ nombre: '', docenas: '', precioPorDocena: '', codigo: '', observaciones: '' });
    };

    const handleRemoveProduct = (prodIndex) => {
        if (!confirm('¿Eliminar producto?')) return;
        const updatedProducts = marca.productos.filter((_, i) => i !== prodIndex);
        onUpdate(index, { ...marca, productos: updatedProducts });
    };

    return (
        <div className={`marca-card ${!isExpanded ? 'collapsed' : ''} compact`}>
            {/* Header */}
            <div className="marca-header compact" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3 flex-1">
                    <div className="marca-icon compact">📦</div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 flex-1">
                        <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">{marca.nombre}</h3>

                        {/* Orange Box: Editable Boleta Input in Header */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs font-semibold text-gray-500 uppercase">Boleta:</span>
                            <input
                                type="text"
                                className="marca-header-input"
                                placeholder="Ingresar N°"
                                value={marca.codigo_boleta || ''}
                                onChange={(e) => onUpdate(index, { ...marca, codigo_boleta: e.target.value })}
                            />
                        </div>

                        {/* Red Box: Separated Product Count */}
                        <div className="product-count-badge">
                            {marca.productos?.length || 0} productos
                        </div>
                    </div>
                </div>

                <div className="marca-actions compact">
                    <button
                        className="marca-action-btn edit"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); setIsExpanded(true); }}
                        title={isEditing ? 'Terminar Edición' : 'Editar'}
                    >
                        {isEditing ? 'Listo' : 'Editar'} ✏️
                    </button>
                    <button
                        className="marca-action-btn delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                        title="Eliminar Marca"
                    >
                        🗑️
                    </button>
                    <button className="marca-action-btn collapse" title="Colapsar/Expandir">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="marca-content compact">
                    {/* Inline Add Product Form */}
                    {isEditing && (
                        <div className="add-product-section compact">
                            <div className="add-product-form compact">
                                <input
                                    className="product-input compact"
                                    placeholder="Nombre Producto *"
                                    value={productForm.nombre}
                                    onChange={e => setProductForm({ ...productForm, nombre: e.target.value })}
                                />
                                <input
                                    type="number"
                                    className="product-input compact text-center"
                                    placeholder="Docenas *"
                                    value={productForm.docenas}
                                    onChange={e => setProductForm({ ...productForm, docenas: e.target.value })}
                                />
                                <input
                                    type="number"
                                    className="product-input compact font-mono"
                                    placeholder="$/Docena *"
                                    value={productForm.precioPorDocena}
                                    onChange={e => setProductForm({ ...productForm, precioPorDocena: e.target.value })}
                                />
                                <input
                                    className="product-input compact uppercase"
                                    placeholder="Código *"
                                    value={productForm.codigo}
                                    onChange={e => setProductForm({ ...productForm, codigo: e.target.value })}
                                />
                                <input
                                    className="product-input compact"
                                    placeholder="Obs."
                                    value={productForm.observaciones}
                                    onChange={e => setProductForm({ ...productForm, observaciones: e.target.value })}
                                />

                                <button className="btn-add-product compact" onClick={handleAddProduct}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            {/* Compact Subtotal */}
                            {(productForm.docenas && productForm.precioPorDocena) && (
                                <div className="subtotal-preview compact">
                                    <span className="text-xs font-semibold text-gray-600">Subtotal:</span>
                                    <span className="text-sm font-bold text-green-600 font-mono">
                                        ${calculateSubtotal().toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Product List Table */}
                    <div className="products-list-section compact">
                        {marca.productos && marca.productos.length > 0 ? (
                            <table className="products-table compact">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Código</th>
                                        <th className="text-center">Doc</th>
                                        <th className="text-right">$/Doc</th>
                                        <th className="text-right">Subtotal</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marca.productos.map((prod, idx) => (
                                        <tr key={idx}>
                                            <td className="font-semibold">{prod.producto_titulo}</td>
                                            <td className="text-gray-500 font-mono text-xs">{prod.codigo}</td>
                                            <td className="text-center font-bold">{prod.cantidad_docenas}</td>
                                            <td className="text-right text-gray-600 font-mono">
                                                ${parseFloat(prod.precio_docena).toLocaleString()}
                                            </td>
                                            <td className="text-right font-bold text-green-600 font-mono">
                                                ${(prod.cantidad_docenas * prod.precio_docena).toLocaleString()}
                                            </td>
                                            <td className="text-right">
                                                {isEditing && (
                                                    <button
                                                        onClick={() => handleRemoveProduct(idx)}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-4 text-xs text-gray-400 border border-dashed rounded-lg">
                                Sin productos
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
