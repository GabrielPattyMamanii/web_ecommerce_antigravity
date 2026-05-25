import React, { useRef, useState } from 'react';
import { Camera, X, Image as ImageIcon, Upload, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { convertToWebP, validateImageFile } from '../../lib/imageUtils';

export function BrandPhotoUploader({ photos = [], onPhotosChange, maxPhotos = 5, brandName = '' }) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleFileSelect = async (files) => {
        const fileArray = Array.from(files || []);

        const remainingSlots = maxPhotos - photos.length;
        if (fileArray.length > remainingSlots) {
            alert(`Solo puedes agregar ${remainingSlots} foto(s) más. Límite: ${maxPhotos} fotos.`);
        }

        const filesToProcess = fileArray.slice(0, remainingSlots);
        const convertedFiles = [];
        let totalOriginalSize = 0;
        let totalWebPSize = 0;

        for (const file of filesToProcess) {
            try {
                // Validate file
                const validation = validateImageFile(file, 10);
                if (!validation.isValid) {
                    console.error(`Validation failed for ${file.name}:`, validation.error);
                    alert(validation.error);
                    continue;
                }

                totalOriginalSize += file.size;

                // Convert to WebP
                const webpFile = await convertToWebP(file, {
                    quality: 0.85,
                    maxWidth: 1920,
                    maxHeight: 1920
                });

                totalWebPSize += webpFile.size;
                convertedFiles.push(webpFile);
            } catch (error) {
                console.error(`Error converting ${file.name}:`, error);
                alert(`Error al procesar ${file.name}: ${error.message}`);
            }
        }

        if (convertedFiles.length > 0) {
            const newPhotos = [...photos, ...convertedFiles];
            onPhotosChange(newPhotos);

            // Show compression feedback
            if (totalOriginalSize > 0) {
                const savedPercent = Math.round((1 - totalWebPSize / totalOriginalSize) * 100);
                console.log(`✓ ${convertedFiles.length} foto(s) optimizada(s) a WebP (${savedPercent}% reducción)`);
            }
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleInputChange = (e) => {
        handleFileSelect(e.target.files);
    };

    const handleRemovePhoto = (index) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        onPhotosChange(newPhotos);
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

    const openLightbox = (index) => {
        setCurrentImageIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const goToPrevious = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentImageIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const handleDownload = async () => {
        const photo = photos[currentImageIndex];
        const imageUrl = typeof photo === 'string' ? photo : URL.createObjectURL(photo);

        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${brandName || 'foto'}_${currentImageIndex + 1}.jpg`;
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
        if (e.key === 'ArrowLeft') goToPrevious();
        if (e.key === 'ArrowRight') goToNext();
    };

    React.useEffect(() => {
        if (lightboxOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [lightboxOpen, currentImageIndex]);

    return (
        <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Fotos de la Marca
                    <span className="text-muted-foreground/60 font-normal">(Opcional)</span>
                </label>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {photos.length}/{maxPhotos}
                </span>
            </div>

            <div className="space-y-3">
                {/* Upload Area */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200
                        ${isDragging
                            ? 'border-primary bg-primary/10 scale-[1.02]'
                            : photos.length >= maxPhotos
                                ? 'border-border bg-muted/20 opacity-50'
                                : 'border-input bg-muted/5 hover:border-primary/50 hover:bg-primary/5'
                        }
                    `}
                >
                    <button
                        type="button"
                        onClick={handleButtonClick}
                        disabled={photos.length >= maxPhotos}
                        className={`
                            w-full p-4 flex items-center justify-center gap-3 transition-all
                            ${photos.length >= maxPhotos ? 'cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        <div className={`
                            p-2 rounded-full transition-all
                            ${isDragging
                                ? 'bg-primary text-primary-foreground scale-110'
                                : 'bg-primary/10 text-primary'
                            }
                        `}>
                            <Upload className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-foreground">
                                {photos.length === 0
                                    ? 'Adjuntar fotos de la marca'
                                    : 'Agregar más fotos'
                                }
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Arrastra archivos o haz clic • JPG, PNG, WebP (máx. 5MB)
                            </div>
                        </div>
                    </button>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleInputChange}
                        className="hidden"
                    />
                </div>

                {/* Photo Grid */}
                {photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {photos.map((photo, index) => (
                            <div
                                key={index}
                                className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                            >
                                <img
                                    src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                                    alt={`${brandName} - Foto ${index + 1}`}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => openLightbox(index)}
                                />

                                {/* Delete Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemovePhoto(index);
                                    }}
                                    className="absolute top-1.5 right-1.5 bg-destructive/95 hover:bg-destructive text-destructive-foreground rounded-full p-1.5 transition-all hover:scale-110 shadow-lg opacity-0 group-hover:opacity-100 z-10"
                                    title="Eliminar foto"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>

                                {/* Hover Overlay */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2 cursor-pointer"
                                    onClick={() => openLightbox(index)}
                                >
                                    <div className="flex items-center gap-1 text-white text-xs font-medium">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span>Ver foto {index + 1}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxOpen && photos.length > 0 && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
                    onClick={closeLightbox}
                >
                    {/* Floating Buttons - Fixed Position Top Right */}
                    <div className="fixed top-5 right-5 flex flex-col gap-3 z-[9999]">
                        {/* Close Button */}
                        <button
                            onClick={closeLightbox}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium shadow-md transition-colors"
                            style={{
                                backgroundColor: '#dc3545',
                                fontSize: '15px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                            title="Cerrar (Esc)"
                        >
                            <X className="w-4 h-4" />
                            <span>Salir</span>
                        </button>

                        {/* Download Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload();
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium shadow-md transition-colors"
                            style={{
                                backgroundColor: '#28a745',
                                fontSize: '15px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                            title="Descargar imagen"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar</span>
                        </button>
                    </div>

                    {/* Navigation Buttons - Left & Right Sides */}
                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToPrevious();
                                }}
                                className="fixed left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-110 z-[9998]"
                                title="Anterior (←)"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToNext();
                                }}
                                className="fixed right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-110 z-[9998]"
                                title="Siguiente (→)"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}

                    {/* Document Viewer */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-[90vw] max-h-[90vh]"
                    >
                        <img
                            src={typeof photos[currentImageIndex] === 'string'
                                ? photos[currentImageIndex]
                                : URL.createObjectURL(photos[currentImageIndex])
                            }
                            alt={`${brandName} - Foto ${currentImageIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />

                        {/* Image Counter - Bottom Left */}
                        {photos.length > 1 && (
                            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                {currentImageIndex + 1} / {photos.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
