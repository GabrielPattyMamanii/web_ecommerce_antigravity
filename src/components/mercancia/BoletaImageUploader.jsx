import React, { useRef, useState } from 'react';
import { Camera, X, Image as ImageIcon, Upload, Download } from 'lucide-react';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';

export function BoletaImageUploader({ imageUrl, onImageChange, boletaName = '', readOnly = false }) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(imageUrl || null);

    const handleFileSelect = async (files) => {
        const file = files?.[0];
        if (!file) return;

        try {
            // Validate file
            const validation = validateImageFile(file, 10);
            if (!validation.isValid) {
                alert(validation.error);
                return;
            }

            // Convert to WebP
            const webpFile = await convertToWebP(file, {
                quality: 0.85,
                maxWidth: 1920,
                maxHeight: 1920
            });

            // Create preview URL
            const preview = URL.createObjectURL(webpFile);
            setPreviewUrl(preview);

            // Pass file to parent
            onImageChange(webpFile);

            console.log(`✓ Imagen optimizada a WebP (${Math.round((1 - webpFile.size / file.size) * 100)}% reducción)`);
        } catch (error) {
            console.error('Error converting image:', error);
            alert(`Error al procesar la imagen: ${error.message}`);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleInputChange = (e) => {
        handleFileSelect(e.target.files);
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        onImageChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const openLightbox = () => {
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const handleDownload = async () => {
        const imageToDownload = previewUrl || imageUrl;
        if (!imageToDownload) return;

        try {
            const response = await fetch(imageToDownload);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${boletaName || 'boleta'}_imagen.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Error al descargar la imagen');
        }
    };

    const handleKeyDown = (e) => {
        if (!lightboxOpen) return;
        if (e.key === 'Escape') closeLightbox();
    };

    React.useEffect(() => {
        if (lightboxOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [lightboxOpen]);

    // Update preview when imageUrl prop changes
    React.useEffect(() => {
        setPreviewUrl(imageUrl || null);
    }, [imageUrl]);

    if (readOnly && !previewUrl) {
        return (
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Imagen de Boleta
                </label>
                <div className="p-6 rounded-xl border border-gray-800 bg-black/20 text-center">
                    <span className="text-gray-500 text-sm">Sin imágenes adjuntas</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Imagen de Boleta
                {!readOnly && <span className="text-gray-500 font-normal">(Opcional)</span>}
            </label>

            {!previewUrl ? (
                /* Upload Area - Only shown if not readOnly */
                !readOnly && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200
                            ${isDragging
                                ? 'border-[#49EBBD] bg-[#49EBBD]/10 scale-[1.02]'
                                : 'border-gray-700 bg-black/20 hover:border-[#49EBBD]/50 hover:bg-[#49EBBD]/5'
                            }
                        `}
                    >
                        <button
                            type="button"
                            onClick={handleButtonClick}
                            className="w-full p-6 flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <div className={`
                                p-3 rounded-full transition-all
                                ${isDragging
                                    ? 'bg-[#49EBBD] text-black scale-110'
                                    : 'bg-[#49EBBD]/10 text-[#49EBBD]'
                                }
                            `}>
                                <Upload className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-white">
                                    Adjuntar imagen de boleta
                                </div>
                                <div className="text-xs text-gray-400">
                                    Arrastra un archivo o haz clic • JPG, PNG, WebP (máx. 10MB)
                                </div>
                            </div>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleInputChange}
                            className="hidden"
                        />
                    </div>
                )
            ) : (
                /* Image Preview */
                <div className="relative group rounded-xl overflow-hidden border-2 border-gray-700 bg-black/40 shadow-lg hover:shadow-xl transition-all duration-200 w-full max-w-sm">
                    <img
                        src={previewUrl}
                        alt={`${boletaName} - Imagen`}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={openLightbox}
                    />

                    {/* Delete Button - Only shown if not readOnly */}
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 bg-red-500/95 hover:bg-red-500 text-white rounded-full p-2 transition-all hover:scale-110 shadow-lg opacity-0 group-hover:opacity-100 z-10"
                            title="Eliminar imagen"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Hover Overlay */}
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3 cursor-pointer"
                        onClick={openLightbox}
                    >
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                            <ImageIcon className="w-4 h-4" />
                            <span>Ver imagen completa</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxOpen && previewUrl && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
                    onClick={closeLightbox}
                >
                    <div className="fixed top-5 right-5 flex flex-col gap-3 z-[9999]">
                        <button
                            onClick={closeLightbox}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium shadow-md hover:bg-red-700 transition-colors bg-[#dc3545]"
                        >
                            <X className="w-4 h-4" />
                            <span>Salir</span>
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload();
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium shadow-md hover:bg-green-700 transition-colors bg-[#28a745]"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar</span>
                        </button>
                    </div>

                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-[90vw] max-h-[90vh]"
                    >
                        <img
                            src={previewUrl}
                            alt={`${boletaName} - Imagen`}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
