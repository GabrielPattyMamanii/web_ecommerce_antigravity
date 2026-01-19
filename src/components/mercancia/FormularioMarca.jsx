import React, { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, Package, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { FormularioProducto } from './FormularioProducto';

export function FormularioMarca({ marca, index, onUpdate, onDelete, isEditingInitially = false }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(isEditingInitially);

    // Handlers for products
    const handleAddProduct = (newProduct) => {
        const updatedProducts = [...(marca.productos || []), newProduct];
        onUpdate(index, { ...marca, productos: updatedProducts });
    };

    const handleRemoveProduct = (prodIndex) => {
        const updatedProducts = marca.productos.filter((_, i) => i !== prodIndex);
        onUpdate(index, { ...marca, productos: updatedProducts });
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm mb-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">{marca.nombre}</h3>
                        <p className="text-xs text-gray-500">
                            {(marca.productos || []).length} productos cargados
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); setIsExpanded(true); }}
                        className={isEditing ? "bg-blue-50 text-blue-600" : ""}
                    >
                        {isEditing ? 'Terminar Edición' : 'Editar'} <Edit2 className="ml-2 w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="text-gray-400 ml-2">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4">

                    {/* List of Products */}
                    {marca.productos && marca.productos.length > 0 ? (
                        <div className="overflow-x-auto mb-4">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2">Título</th>
                                        <th className="px-4 py-2">Código</th>
                                        <th className="px-4 py-2 text-center">Docenas</th>
                                        <th className="px-4 py-2">Observaciones</th>
                                        {isEditing && <th className="px-4 py-2 text-right">Acción</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {marca.productos.map((prod, pIndex) => (
                                        <tr key={pIndex} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium">{prod.producto_titulo}</td>
                                            <td className="px-4 py-2 text-gray-600">{prod.codigo}</td>
                                            <td className="px-4 py-2 text-center font-bold">{prod.cantidad_docenas}</td>
                                            <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{prod.observaciones || '-'}</td>
                                            {isEditing && (
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        onClick={() => handleRemoveProduct(pIndex)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                                                        title="Eliminar producto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-lg mb-4">
                            No hay productos en esta marca aún.
                        </div>
                    )}

                    {/* Add Product Form (Only if Editing) */}
                    {isEditing ? (
                        <FormularioProducto
                            onAdd={handleAddProduct}
                            existingProducts={marca.productos || []}
                        />
                    ) : (
                        <div className="text-center text-xs text-gray-400 mt-2">
                            Haz click en "Editar" para agregar o quitar productos.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
