import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EvidenceUploader } from '../../components/admin/EvidenceUploader';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export function DebtForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { session } = useAuth();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditing);

    // Form State
    const [formData, setFormData] = useState({
        person_name: '',
        date: new Date().toISOString().split('T')[0], // Default today in YYYY-MM-DD
        reason: '',
        direction: 'receivable', // 'receivable' | 'payable'
        debt_type: 'money', // 'money' | 'item'
        money_amount: '',
        money_currency: 'ARS',
        item_name: '',
        item_quantity: '',
        item_detail: '',
        status: 'pending'
    });

    const [evidenceFiles, setEvidenceFiles] = useState([]); // Stores new files directly or objects with preview
    const [existingEvidence, setExistingEvidence] = useState([]); // Stores existing files from DB

    useEffect(() => {
        if (isEditing) {
            fetchDebt();
        }
    }, [id]);

    const fetchDebt = async () => {
        try {
            const { data, error } = await supabase
                .from('debts')
                .select('*, debt_evidence(*)')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Format date for input
            const formattedDate = data.date ? new Date(data.date).toISOString().split('T')[0] : '';

            setFormData({
                person_name: data.person_name,
                date: formattedDate,
                reason: data.reason || '',
                direction: data.direction || 'receivable',
                debt_type: data.debt_type,
                money_amount: data.money_amount || '',
                money_currency: data.money_currency || 'ARS',
                item_name: data.item_name || '',
                item_quantity: data.item_quantity || '',
                item_detail: data.item_detail || '',
                status: data.status
            });

            // Set existing evidence for display
            if (data.debt_evidence) {
                setExistingEvidence(data.debt_evidence.map(e => ({
                    id: e.id,
                    url: e.file_url,
                    file_path: e.file_path,
                    name: 'Imagen guardada'
                })));
            }

        } catch (error) {
            console.error('Error fetching debt:', error);
            alert('Error al cargar la deuda.');
            navigate('/admin/debts');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation
            if (!formData.person_name || !formData.date) {
                throw new Error('Nombre y fecha son obligatorios');
            }
            if (formData.debt_type === 'money' && (!formData.money_amount || formData.money_amount <= 0)) {
                throw new Error('El monto debe ser mayor a 0');
            }
            if (formData.debt_type === 'item' && !formData.item_name) {
                throw new Error('El nombre del objeto es obligatorio');
            }

            const debtData = {
                owner_id: session.user.id,
                person_name: formData.person_name,
                date: formData.date,
                reason: formData.reason,
                direction: formData.direction,
                debt_type: formData.debt_type,
                money_amount: formData.debt_type === 'money' ? formData.money_amount : null,
                money_currency: formData.debt_type === 'money' ? formData.money_currency : null,
                item_name: formData.debt_type === 'item' ? formData.item_name : null,
                item_quantity: formData.debt_type === 'item' ? (formData.item_quantity || null) : null,
                item_detail: formData.debt_type === 'item' ? formData.item_detail : null,
                status: formData.status
            };

            let debtId = id;

            if (isEditing) {
                const { error } = await supabase
                    .from('debts')
                    .update(debtData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('debts')
                    .insert(debtData)
                    .select()
                    .single();
                if (error) throw error;
                debtId = data.id;
            }

            // Handle New Evidence Uploads
            if (evidenceFiles.length > 0) {
                for (const fileObj of evidenceFiles) {
                    const file = fileObj.file; // This is the actual File object
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${session.user.id}/${debtId}/${Math.random()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('debt-evidence')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error('Error uploading file:', uploadError);
                        alert(`Error subiendo imagen: ${uploadError.message}`);
                        continue;
                    }

                    // Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('debt-evidence')
                        .getPublicUrl(fileName);

                    // Insert into DB
                    const { error: insertError } = await supabase.from('debt_evidence').insert({
                        debt_id: debtId,
                        owner_id: session.user.id,
                        file_path: fileName,
                        file_url: publicUrl
                    });

                    if (insertError) {
                        console.error('Error saving evidence record:', insertError);
                        alert(`Error guardando registro de imagen: ${insertError.message}`);
                    }
                }
            }

            navigate('/admin/debts');

        } catch (error) {
            console.error('Error saving debt:', error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExistingEvidence = async (evidenceId, filePath, index) => {
        if (!confirm('¿Eliminar esta imagen?')) return;

        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('debt-evidence')
                .remove([filePath]);

            if (storageError) throw storageError;

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from('debt_evidence')
                .delete()
                .eq('id', evidenceId);

            if (dbError) throw dbError;

            // 3. Update State
            setExistingEvidence(prev => prev.filter((_, i) => i !== index));

        } catch (error) {
            console.error('Error deleting evidence:', error);
            alert('Error al eliminar imagen');
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este registro? Se borrarán también las evidencias.')) return;
        setLoading(true);
        try {
            if (existingEvidence.length > 0) {
                const paths = existingEvidence.map(e => e.file_path);
                await supabase.storage.from('debt-evidence').remove(paths);
            }

            const { error } = await supabase
                .from('debts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            navigate('/admin/debts');
        } catch (error) {
            console.error('Error deleting debt:', error);
            alert('Error al eliminar');
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl text-left">
            <div className="mb-6 flex items-center justify-between">
                <Button variant="ghost" className="pl-0 gap-2" onClick={() => navigate('/admin/debts')}>
                    <ArrowLeft className="w-4 h-4" /> Volver
                </Button>
                {isEditing && (
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </Button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Deuda' : 'Nueva Deuda / Anotación'}</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Direction - NEW FIELD */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Dirección *</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${formData.direction === 'receivable' ? 'bg-green-50 border-green-500 ring-1 ring-green-500 text-green-700 font-bold' : 'bg-white hover:bg-gray-50 border-gray-200'}`}>
                                <input
                                    type="radio"
                                    name="direction"
                                    value="receivable"
                                    checked={formData.direction === 'receivable'}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                📥 Por cobrar (Me deben)
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${formData.direction === 'payable' ? 'bg-red-50 border-red-500 ring-1 ring-red-500 text-red-700 font-bold' : 'bg-white hover:bg-gray-50 border-gray-200'}`}>
                                <input
                                    type="radio"
                                    name="direction"
                                    value="payable"
                                    checked={formData.direction === 'payable'}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                📤 Por pagar (Yo debo)
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Persona *"
                            name="person_name"
                            value={formData.person_name}
                            onChange={handleChange}
                            placeholder="Nombre de quien debe"
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Fecha *</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                                required
                            />
                        </div>
                    </div>

                    <Input
                        label="Motivo / Descripción"
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        placeholder="Por qué se generó esta deuda..."
                    />

                    {/* Type Selector */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Deuda</label>
                        <div className="flex gap-4">
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${formData.debt_type === 'money' ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="debt_type"
                                    value="money"
                                    checked={formData.debt_type === 'money'}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                💵 Dinero
                            </label>
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${formData.debt_type === 'item' ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="debt_type"
                                    value="item"
                                    checked={formData.debt_type === 'item'}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                📦 Objeto
                            </label>
                        </div>
                    </div>

                    {/* Conditional Fields */}
                    {formData.debt_type === 'money' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                label="Monto *"
                                name="money_amount"
                                value={formData.money_amount}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                                min="0"
                                step="0.01"
                            />
                            <Input
                                label="Moneda"
                                name="money_currency"
                                value={formData.money_currency}
                                onChange={handleChange}
                                placeholder="ARS"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <Input
                                        label="Objeto *"
                                        name="item_name"
                                        value={formData.item_name}
                                        onChange={handleChange}
                                        placeholder="Ej: Taladro"
                                        required
                                    />
                                </div>
                                <Input
                                    type="number"
                                    label="Cantidad"
                                    name="item_quantity"
                                    value={formData.item_quantity}
                                    onChange={handleChange}
                                    placeholder="1"
                                />
                            </div>
                            <textarea
                                name="item_detail"
                                value={formData.item_detail}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Detalles, estado, marca, etc..."
                                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-sm"
                            />
                        </div>
                    )}

                    <hr />

                    {/* Existing Evidence (Edit Mode) */}
                    {isEditing && existingEvidence.length > 0 && (
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Evidencia Guardada</label>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                {existingEvidence.map((file, index) => (
                                    <div key={file.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={file.url} alt="Evidence" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteExistingEvidence(file.id, file.file_path, index)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Evidence Uploader */}
                    <EvidenceUploader
                        evidenceFiles={evidenceFiles}
                        setEvidenceFiles={setEvidenceFiles}
                        maxFiles={10 - existingEvidence.length}
                    />

                    <div className="pt-4">
                        <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Registro'} <Save className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
