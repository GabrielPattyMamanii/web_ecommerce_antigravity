import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormularioMarca } from './FormularioMarca';
import { supabase } from '../../lib/supabase';

export function AgregarTanda() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Tanda State
    const [tandaNombre, setTandaNombre] = useState('');
    const [tandaFecha, setTandaFecha] = useState(new Date().toISOString().split('T')[0]);

    // Marcas State (Array of objects: { nombre, productos: [] })
    const [marcas, setMarcas] = useState([]);

    // New Brand Input State
    const [newMarcaName, setNewMarcaName] = useState('');
    const [marcaError, setMarcaError] = useState('');

    const handleAddMarca = () => {
        if (!newMarcaName.trim()) return;

        // Check duplicate brand in this Tanda
        const exists = marcas.some(m => m.nombre.toLowerCase() === newMarcaName.trim().toLowerCase());
        if (exists) {
            setMarcaError('⚠️ Esta marca ya fue agregada a esta tanda.');
            return;
        }

        setMarcas([...marcas, { nombre: newMarcaName.trim(), productos: [] }]);
        setNewMarcaName('');
        setMarcaError('');
    };

    const handleUpdateMarca = (index, updatedMarca) => {
        const newMarcas = [...marcas];
        newMarcas[index] = updatedMarca;
        setMarcas(newMarcas);
    };

    const handleDeleteMarca = (index) => {
        if (!confirm('¿Eliminar esta marca y todos sus productos?')) return;
        setMarcas(marcas.filter((_, i) => i !== index));
    };

    const handleSaveTanda = async () => {
        if (!tandaNombre.trim() || !tandaFecha) {
            alert('Por favor complete el nombre de la tanda y la fecha.');
            return;
        }

        if (marcas.length === 0) {
            alert('Debe agregar al menos una marca.');
            return;
        }

        // Validate that all brands have products (optional, but good practice)
        const emptyBrands = marcas.filter(m => m.productos.length === 0);
        if (emptyBrands.length > 0) {
            if (!confirm(`Hay ${emptyBrands.length} marca(s) sin productos. ¿Desea continuar y guardarlas vacías? (No se guardarán productos para ellas)`)) {
                return;
            }
        }

        setLoading(true);
        try {
            // Prepare payload for "entradas" table
            // We need to flatten the structure: Tanda -> Marcas -> Productos => Rows
            const entriesToInsert = [];

            marcas.forEach(marca => {
                marca.productos.forEach(prod => {
                    entriesToInsert.push({
                        tanda_nombre: tandaNombre,
                        tanda_fecha: tandaFecha,
                        marca: marca.nombre,
                        producto_titulo: prod.producto_titulo,
                        cantidad_docenas: prod.cantidad_docenas,
                        precio_docena: prod.precio_docena, // New Field
                        codigo: prod.codigo,
                        observaciones: prod.observaciones
                    });
                });
            });

            if (entriesToInsert.length === 0) {
                alert('No hay productos para guardar.');
                setLoading(false);
                return;
            }

            const { error } = await supabase
                .from('entradas')
                .insert(entriesToInsert);

            if (error) throw error;

            alert('✅ Tanda y mercancía guardada correctamente.');
            navigate('/admin/mercancia');

        } catch (error) {
            console.error('Error saving tanda:', error);
            if (error.code === '23505') { // Unique violation
                alert('Error: Algunos productos ya existen para esta Tanda y Marca. Verifique duplicados.');
            } else {
                alert('Error al guardar: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" className="pl-0 gap-2" onClick={() => navigate('/admin/mercancia')}>
                    <ArrowLeft className="w-4 h-4" /> Volver al Listado
                </Button>
                <Button onClick={handleSaveTanda} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Finalizar y Guardar Tanda'}
                </Button>
            </div>

            <div className="space-y-8">
                {/* 1. Datos Tanda */}
                <section className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-black text-white rounded-lg">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">1. Datos de la Tanda</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Nombre de la Tanda *"
                            placeholder="Ej: Verano 2026 - Primera Entrada"
                            value={tandaNombre}
                            onChange={(e) => setTandaNombre(e.target.value)}
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Fecha de Ingreso *</label>
                            <input
                                type="date"
                                value={tandaFecha}
                                onChange={(e) => setTandaFecha(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>
                </section>

                {/* 2. Agregar Marcas */}
                <section className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">2. Marcas y Productos</h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {marcas.length} marcas agregadas
                        </span>
                    </div>

                    {/* Add Brand Input */}
                    <div className="flex gap-3 items-start mb-8 bg-gray-50 p-4 rounded-lg border">
                        <div className="flex-1">
                            <Input
                                placeholder="Nombre de la Marca (Ej: Adidas, Nike...)"
                                value={newMarcaName}
                                onChange={(e) => { setNewMarcaName(e.target.value); setMarcaError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMarca()}
                            />
                            {marcaError && <p className="text-red-500 text-xs mt-1 animate-pulse font-medium">{marcaError}</p>}
                        </div>
                        <Button onClick={handleAddMarca} variant="outline" className="mt-0.5 border-black text-black hover:bg-black hover:text-white">
                            <Plus className="w-4 h-4 mr-2" /> Agregar Marca
                        </Button>
                    </div>

                    {/* Marcas List */}
                    <div className="space-y-4">
                        {marcas.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                                No hay marcas agregadas. Comienza agregando una arriba.
                            </div>
                        ) : (
                            marcas.map((marca, index) => (
                                <FormularioMarca
                                    key={index}
                                    index={index}
                                    marca={marca}
                                    onUpdate={handleUpdateMarca}
                                    onDelete={handleDeleteMarca}
                                    isEditingInitially={true}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
