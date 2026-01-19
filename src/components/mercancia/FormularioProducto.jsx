import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function FormularioProducto({ onAdd, existingProducts = [] }) {
    const [product, setProduct] = useState({
        producto_titulo: '',
        cantidad_docenas: '',
        precio_docena: '', // New Field
        codigo: '',
        observaciones: ''
    });
    const [error, setError] = useState('');

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

        // Duplicate Check
        const isDuplicate = existingProducts.some(p =>
            p.producto_titulo.toLowerCase() === product.producto_titulo.toLowerCase()
        );

        if (isDuplicate) {
            setError('Este producto ya existe en esta marca.');
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
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        name="codigo"
                        placeholder="Código *"
                        value={product.codigo}
                        onChange={handleChange}
                        className="bg-white"
                    />
                </div>
                <div className="md:col-span-2">
                    <Input
                        name="observaciones"
                        placeholder="Observaciones"
                        value={product.observaciones}
                        onChange={handleChange}
                        className="bg-white"
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
