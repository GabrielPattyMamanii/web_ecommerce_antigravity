import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, User, FileText, ChevronLeft, ChevronRight, Package, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';

export function DebtDetailModal({ debtId, onClose }) {
    const [debt, setDebt] = useState(null);
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    useEffect(() => {
        if (debtId) {
            fetchDebtDetails();
        }

        // Lock body scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [debtId]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (selectedImageIndex !== null) {
                    setSelectedImageIndex(null); // Close lightbox first
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, selectedImageIndex]);

    const fetchDebtDetails = async () => {
        setLoading(true);
        try {
            // Fetch Debt
            const { data: debtData, error: debtError } = await supabase
                .from('debts')
                .select('*')
                .eq('id', debtId)
                .single();

            if (debtError) throw debtError;
            setDebt(debtData);

            // Fetch Evidence
            const { data: evidenceData, error: evidenceError } = await supabase
                .from('debt_evidence')
                .select('*')
                .eq('debt_id', debtId);

            if (evidenceError) throw evidenceError;

            // Generate Signed URLs for all evidence
            const evidenceWithUrls = await Promise.all((evidenceData || []).map(async (item) => {
                // If we have a file_path, try to get a signed URL (safer for private buckets)
                if (item.file_path) {
                    const { data, error } = await supabase.storage
                        .from('debt-evidence')
                        .createSignedUrl(item.file_path, 3600); // 1 hour expiry

                    if (!error && data?.signedUrl) {
                        return { ...item, displayUrl: data.signedUrl };
                    }
                }
                // Fallback to stored file_url if available, or empty
                return { ...item, displayUrl: item.file_url };
            }));

            setEvidence(evidenceWithUrls);

        } catch (error) {
            console.error('Error fetching details:', error);
            alert('Error al cargar detalles.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        setSelectedImageIndex((prev) => (prev + 1) % evidence.length);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setSelectedImageIndex((prev) => (prev - 1 + evidence.length) % evidence.length);
    };

    if (!debtId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Detalle de Deuda</h2>
                        {debt && (
                            <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${debt.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>
                                    {debt.status === 'paid' ? 'Pagada' : 'Pendiente'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${debt.direction === 'receivable' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {debt.direction === 'receivable' ? 'Por Cobrar' : 'Por Pagar'}
                                </span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center text-gray-500 animate-pulse">Cargando información...</div>
                    ) : debt && (
                        <div className="space-y-6">
                            {/* Main Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Persona</p>
                                            <p className="font-medium text-lg">{debt.person_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fecha</p>
                                            <p className="font-medium">{new Date(debt.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        {debt.debt_type === 'money' ? (
                                            <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                                        ) : (
                                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                                {debt.debt_type === 'money' ? 'Monto' : 'Detalle del Objeto'}
                                            </p>
                                            {debt.debt_type === 'money' ? (
                                                <p className="font-medium text-lg">
                                                    ${Number(debt.money_amount).toLocaleString('es-AR')} <span className="text-sm text-gray-500">{debt.money_currency}</span>
                                                </p>
                                            ) : (
                                                <div>
                                                    <p className="font-medium text-lg">{debt.item_quantity && `${Number(debt.item_quantity)}x `}{debt.item_name}</p>
                                                    {debt.item_detail && <p className="text-sm text-gray-500 mt-1">{debt.item_detail}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {debt.reason && (
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Motivo</p>
                                                <p className="text-gray-700">{debt.reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Evidence Section */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    📸 Evidencias
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{evidence.length}</span>
                                </h3>

                                {evidence.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {evidence.map((file, index) => (
                                            <div
                                                key={file.id}
                                                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:border-black/20 transition-colors"
                                                onClick={() => setSelectedImageIndex(index)}
                                            >
                                                <img
                                                    src={file.displayUrl}
                                                    alt="Evidencia"
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed text-gray-400 text-sm">
                                        Sin evidencias adjuntas.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>

            {/* Lightbox / Image Viewer */}
            {selectedImageIndex !== null && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setSelectedImageIndex(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        onClick={() => setSelectedImageIndex(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {evidence.length > 1 && (
                        <>
                            <button
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                onClick={handlePrevImage}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                onClick={handleNextImage}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    <img
                        src={evidence[selectedImageIndex].displayUrl}
                        alt="Evidencia Ampliada"
                        className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-medium px-4 py-1 bg-black/50 rounded-full text-sm backdrop-blur-md">
                        {selectedImageIndex + 1} / {evidence.length}
                    </div>
                </div>
            )}
        </div>
    );
}
