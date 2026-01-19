import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

export function EvidenceUploader({ evidenceFiles, setEvidenceFiles, maxFiles = 10 }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        if (evidenceFiles.length + files.length > maxFiles) {
            alert(`Solo puedes subir un máximo de ${maxFiles} imágenes.`);
            return;
        }

        setUploading(true);
        const newAttachments = [];

        try {
            for (const file of files) {
                // Generate preview URL immediately for better UX
                const previewUrl = URL.createObjectURL(file);

                newAttachments.push({
                    file, // Keep the file object for actual upload later (if we decided to upload on save) 
                    // OR upload immediately. The prompt said "Al crear: insertar debt ... subir imágenes". 
                    // So we might just want to store the File object here and upload in the parent Form on submit.
                    // HOWEVER, for better UX with large files, standard practice is to upload on select or keep as File. 
                    // Given the requirement "Upload images on create", we will store the FILE here and upload in the parent form submission 
                    // to ensure we have the debt_id effectively linked or we upload to a temp folder.
                    // Let's stick to storing the File object and Preview URL.
                    preview: previewUrl,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }

            setEvidenceFiles(prev => [...prev, ...newAttachments]);
        } catch (error) {
            console.error('Error selecting files:', error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeFile = (index) => {
        setEvidenceFiles(prev => {
            const newFiles = [...prev];
            // Revoke object URL to avoid memory leaks
            if (newFiles[index].preview) {
                URL.revokeObjectURL(newFiles[index].preview);
            }
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Evidencia (Opcional)
                </label>
                <span className="text-xs text-gray-500">
                    {evidenceFiles.length}/{maxFiles} imágenes
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {evidenceFiles.map((file, index) => (
                    <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                            src={file.preview || file.url} // Handle both new uploads (preview) and existing files (url)
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {evidenceFiles.length < maxFiles && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors aspect-square text-gray-400 hover:text-gray-600"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Upload className="w-6 h-6 mb-2" />
                                <span className="text-xs font-medium text-center">Subir Foto</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}
