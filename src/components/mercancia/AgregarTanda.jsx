
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Layers, Calculator, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { FormularioMarca } from './FormularioMarca';

export function AgregarTanda() {
    const navigate = useNavigate();
    const { tandaNombre: tandaNombreParam } = useParams();
    const isEditing = Boolean(tandaNombreParam);
    const [loading, setLoading] = useState(false);
    const [originalTandaNombre, setOriginalTandaNombre] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        gastos: '',
        marcas: []
    });

    const [newMarcaName, setNewMarcaName] = useState('');
    const [newMarcaBoleta, setNewMarcaBoleta] = useState('');

    const [marcaError, setMarcaError] = useState('');

    // Refs for navigation
    const dateRef = useRef(null);
    const gastosRef = useRef(null);
    const marcaNameRef = useRef(null);
    const marcaBoletaRef = useRef(null);

    // Generic Enter Handler
    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    useEffect(() => {
        if (isEditing && tandaNombreParam) {
            fetchTandaDetails(decodeURIComponent(tandaNombreParam));
        }
    }, [isEditing, tandaNombreParam]);

    const fetchTandaDetails = async (nombre) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', nombre);

            if (error) throw error;
            if (data && data.length > 0) {
                const first = data[0];
                const grouped = {};
                data.forEach(row => {
                    if (!grouped[row.marca]) {
                        grouped[row.marca] = {
                            id: Date.now() + Math.random(),
                            nombre: row.marca,
                            codigo_boleta: row.codigo_boleta || '',
                            collapsed: true,
                            productos: []
                        };
                    }
                    grouped[row.marca].productos.push({
                        producto_titulo: row.producto_titulo,
                        cantidad_docenas: row.cantidad_docenas,
                        precio_docena: row.precio_docena || 0,
                        codigo: row.codigo,
                        observaciones: row.observaciones || ''
                    });
                });
                setFormData({
                    nombre: first.tanda_nombre,
                    fechaIngreso: first.tanda_fecha,
                    gastos: first.gastos || '',
                    marcas: Object.values(grouped)
                });
                setOriginalTandaNombre(first.tanda_nombre);
            }
        } catch (err) {
            alert("Error al cargar la tanda");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMarca = () => {
        if (!newMarcaName.trim()) return;
        if (formData.marcas.some(m => m.nombre.toLowerCase() === newMarcaName.trim().toLowerCase())) {
            setMarcaError('⚠️ Esta marca ya existe.');
            return;
        }
        const newMarca = {
            id: Date.now(),
            nombre: newMarcaName.trim(),
            codigo_boleta: newMarcaBoleta.trim(),
            productos: [],
            collapsed: false
        };
        setFormData(prev => ({ ...prev, marcas: [...prev.marcas, newMarca] }));
        setNewMarcaName('');
        setNewMarcaBoleta('');
        setMarcaError('');
    };

    const handleUpdateMarca = (index, updatedMarca) => {
        const newMarcas = [...formData.marcas];
        newMarcas[index] = updatedMarca;
        setFormData(prev => ({ ...prev, marcas: newMarcas }));
    };

    const handleDeleteMarca = (index) => {
        if (!confirm('¿Eliminar esta marca?')) return;
        setFormData(prev => ({ ...prev, marcas: prev.marcas.filter((_, i) => i !== index) }));
    };

    const resumen = useMemo(() => {
        let totalProductos = 0;
        let totalDocenas = 0;
        let valorEstimado = 0;
        formData.marcas.forEach(m => {
            totalProductos += m.productos.length;
            m.productos.forEach(p => {
                const doc = parseFloat(p.cantidad_docenas) || 0;
                const precio = parseFloat(p.precio_docena) || 0;
                totalDocenas += doc;
                valorEstimado += (doc * precio);
            });
        });
        return { totalProductos, totalDocenas, valorEstimado };
    }, [formData.marcas]);

    const handleSave = async () => {
        if (!formData.nombre.trim()) { alert("Nombre de tanda requerido"); return; }
        if (formData.marcas.length === 0) { alert("Agregue al menos una marca"); return; }
        setLoading(true);
        try {
            const entriesToInsert = [];
            formData.marcas.forEach(marca => {
                marca.productos.forEach(prod => {
                    entriesToInsert.push({
                        tanda_nombre: formData.nombre,
                        tanda_fecha: formData.fechaIngreso,
                        marca: marca.nombre,
                        producto_titulo: prod.producto_titulo,
                        cantidad_docenas: prod.cantidad_docenas,
                        precio_docena: prod.precio_docena,
                        codigo: prod.codigo,
                        observaciones: prod.observaciones,
                        codigo_boleta: marca.codigo_boleta,
                        gastos: formData.gastos || 0
                    });
                });
            });

            if (entriesToInsert.length === 0 && !confirm("¿Guardar tanda vacía?")) {
                setLoading(false); return;
            }

            if (isEditing) {
                await supabase.from('entradas').delete().eq('tanda_nombre', originalTandaNombre);
            }
            if (entriesToInsert.length > 0) {
                const { error } = await supabase.from('entradas').insert(entriesToInsert);
                if (error) throw error;
            }

            alert("✅ Tanda guardada exitosamente");
            navigate('/admin/mercancia');
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tanda-form-page compact">
            <div className="tanda-header compact">
                <div className="header-left">
                    <button onClick={() => navigate('/admin/mercancia')} className="back-button compact">
                        ← Volver
                    </button>
                    <div className="header-title-group">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {isEditing ? '✏️ Editar Tanda' : '✨ Nueva Tanda'}
                        </h1>
                    </div>
                </div>

                <div className="header-actions">
                    {/* "Finalizar" button now uses 'draft' style (white bg, colored border) but with green text/border potentially to indicate success action? Or indigo per 'draft' style? I will use the Indigo Draft Style for clean look as requested */}
                    <button
                        className="btn-save-draft"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        <Save size={18} /> {loading ? 'Guardando...' : 'Finalizar y Guardar Tanda'}
                    </button>
                </div>
            </div>

            <div className="tanda-form-container compact">
                {/* 1. INFO TANDA */}
                <div className="form-section compact">
                    <div className="info-grid compact">
                        <div className="flex-2">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre Tanda *</label>
                            <input
                                className="tanda-name-input compact"
                                placeholder="Ej: Verano 2026..."
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                onKeyDown={(e) => handleKeyDown(e, dateRef)}
                                autoFocus
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha *</label>
                            <input
                                type="date"
                                className="date-input compact"
                                value={formData.fechaIngreso}
                                onChange={e => setFormData({ ...formData, fechaIngreso: e.target.value })}
                                ref={dateRef}
                                onKeyDown={(e) => handleKeyDown(e, gastosRef)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Gastos ($)</label>
                            <input
                                type="number"
                                className="gastos-input compact"
                                placeholder="0"
                                value={formData.gastos}
                                onChange={e => setFormData({ ...formData, gastos: e.target.value })}
                                ref={gastosRef}
                                onKeyDown={(e) => handleKeyDown(e, marcaNameRef)}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. MARCAS Y PRODUCTOS */}
                <div className="form-section compact">
                    {/* Add Brand Form */}
                    <div className="add-marca-form compact">
                        <input
                            className="marca-name-input compact"
                            placeholder="Nueva Marca..."
                            value={newMarcaName}
                            onChange={e => { setNewMarcaName(e.target.value); setMarcaError(''); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    marcaBoletaRef.current?.focus();
                                }
                            }}
                            ref={marcaNameRef}
                        />
                        <input
                            className="marca-boleta-input compact"
                            placeholder="Nº Boleta"
                            value={newMarcaBoleta}
                            onChange={e => setNewMarcaBoleta(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMarca();
                                    // Focus back to name after add
                                    setTimeout(() => marcaNameRef.current?.focus(), 10);
                                }
                            }}
                            ref={marcaBoletaRef}
                        />
                        <button className="btn-add-marca compact" onClick={handleAddMarca}>
                            <Plus size={16} />
                        </button>
                    </div>
                    {marcaError && <div className="text-red-500 text-xs px-2 mb-2">{marcaError}</div>}

                    {/* Marcas List */}
                    <div className="marcas-list compact">
                        {formData.marcas.map((marca, idx) => (
                            <FormularioMarca
                                key={marca.id || idx}
                                index={idx}
                                marca={marca}
                                onUpdate={handleUpdateMarca}
                                onDelete={handleDeleteMarca}
                                isEditingInitially={!marca.collapsed}
                            />
                        ))}
                    </div>
                </div>

                {/* 3. SUMMARY */}
                <div className="summary-section compact">
                    <div className="summary-grid compact">
                        <div className="summary-item compact">
                            <div className="summary-label">Prods</div>
                            <div className="summary-value">{resumen.totalProductos}</div>
                        </div>
                        <div className="summary-item compact">
                            <div className="summary-label">Doc.</div>
                            <div className="summary-value">{resumen.totalDocenas}</div>
                        </div>
                        <div className="summary-item compact">
                            <div className="summary-label">Estimado</div>
                            <div className="summary-value currency">
                                ${resumen.valorEstimado.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
