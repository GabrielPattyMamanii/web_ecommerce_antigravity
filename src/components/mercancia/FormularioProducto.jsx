import React, { useState, useRef } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function FormularioProducto({ onAdd, existingProducts = [], allCodesSet = new Set() }) {
    const [product, setProduct] = useState({
        producto_titulo: '',
        cantidad_docenas: '',
        precio_docena: '', // New Field
        codigo: '',
        observaciones: ''
    });
    const [error, setError] = useState('');

    // Refs
    const docenasRef = useRef(null);
    const precioRef = useRef(null);
    const codigoRef = useRef(null);
    const obsRef = useRef(null);
    const addButtonRef = useRef(null);

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            setTimeout(() => {
                nextRef?.current?.focus();
            }, 0);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProduct(prev => ({ ...prev, [name]: value }));
        setError(''); // Clear error on change
    };

    const handleAdd = (e) => {
        e.preventDefault();

        // Basic Validation
        if (!product.producto_titulo || !product.cantidad_docenas || !product.codigo) {
            setError('Complete todos los campos obligatorios (*).');
            return;
        }

        if (Number(product.cantidad_docenas) <= 0) {
            setError('La cantidad debe ser mayor a 0.');
            return;
        }

        // Duplicate Check (Strict Global)
        const normalizeCode = (c) => c.trim().toLowerCase();
        const newCode = normalizeCode(product.codigo);

        // Check local first (just in case they are adding same product twice in a row before parent updates)
        const isDuplicateLocal = existingProducts.some(p => normalizeCode(p.codigo) === newCode);

        // Check global set
        const isDuplicateGlobal = Array.from(allCodesSet).some(c => normalizeCode(c) === newCode);

        if (isDuplicateLocal || isDuplicateGlobal) {
            setError('⛔ ERROR: Este código de producto ya existe en esta tanda (en esta u otra marca). No se permiten duplicados.');
            return;
        }

        onAdd({
            ...product,
            cantidad_docenas: Number(product.cantidad_docenas),
            precio_docena: product.precio_docena ? Number(product.precio_docena) : 0
        });

        // Reset form
        setProduct({
            producto_titulo: '',
            cantidad_docenas: '',
            precio_docena: '',
            codigo: '',
            observaciones: ''
        });
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Agregar Nuevo Producto</h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                    <Input
                        name="producto_titulo"
                        placeholder="Título del Producto *"
                        value={product.producto_titulo}
                        onChange={handleChange}
                        className="bg-white"
                        onKeyDown={(e) => handleKeyDown(e, docenasRef)}
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        type="number"
                        name="cantidad_docenas"
                        placeholder="Docenas *"
                        value={product.cantidad_docenas}
                        onChange={handleChange}
                        className="bg-white"
                        min="1"
                        ref={docenasRef}
                        onKeyDown={(e) => handleKeyDown(e, precioRef)}
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        type="number"
                        name="precio_docena"
                        placeholder="Precio x Doc."
                        value={product.precio_docena}
                        onChange={handleChange}
                        className="bg-white"
                        min="0"
                        step="0.01"
                        ref={precioRef}
                        onKeyDown={(e) => handleKeyDown(e, codigoRef)}
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        name="codigo"
                        placeholder="Código *"
                        value={product.codigo}
                        onChange={handleChange}
                        className="bg-white"
                        ref={codigoRef}
                        onKeyDown={(e) => handleKeyDown(e, obsRef)}
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        name="observaciones"
                        placeholder="Observaciones"
                        value={product.observaciones}
                        onChange={handleChange}
                        className="bg-white"
                        ref={obsRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd(e);
                            }
                        }}
                    />
                </div>
                <div className="md:col-span-1 flex items-end">
                    <Button
                        type="button"
                        onClick={handleAdd}
                        size="icon"
                        className="w-full bg-black hover:bg-gray-800"
                        title="Agregar Producto"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mt-2 flex items-center text-red-600 text-xs font-medium">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {error}
                </div>
            )}
        </div>
    );
}
