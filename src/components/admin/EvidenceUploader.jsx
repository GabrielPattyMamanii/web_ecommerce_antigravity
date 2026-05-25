import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';

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
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const file of files) {
                try {
                    // Validate file
                    const validation = validateImageFile(file, 10);
                    if (!validation.isValid) {
                        console.error(`Validation failed for ${file.name}:`, validation.error);
                        errorCount++;
                        continue;
                    }

                    // Convert to WebP
                    const webpFile = await convertToWebP(file, {
                        quality: 0.85,
                        maxWidth: 1920,
                        maxHeight: 1920
                    });

                    // Generate preview URL
                    const previewUrl = URL.createObjectURL(webpFile);

                    newAttachments.push({
                        file: webpFile, // Store the converted WebP file
                        preview: previewUrl,
                        name: webpFile.name,
                        size: webpFile.size,
                        type: webpFile.type
                    });

                    successCount++;
                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    errorCount++;
                }
            }

            setEvidenceFiles(prev => [...prev, ...newAttachments]);

            // Show feedback
            if (successCount > 0) {
                console.log(`✓ ${successCount} imagen(es) optimizada(s) a WebP`);
            }
            if (errorCount > 0) {
                alert(`${errorCount} imagen(es) no pudieron procesarse`);
            }
        } catch (error) {
            console.error('Error selecting files:', error);
            alert('Error al procesar las imágenes');
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
