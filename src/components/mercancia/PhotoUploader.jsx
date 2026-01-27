import React, { useRef } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

export function PhotoUploader({ photos, onPhotosChange, maxPhotos = 5 }) {
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
            return isImage && isValidSize;
        });

        const remainingSlots = maxPhotos - photos.length;
        const filesToAdd = validFiles.slice(0, remainingSlots);

        if (filesToAdd.length < validFiles.length) {
            alert(`Solo puedes agregar ${remainingSlots} foto(s) más. Límite: ${maxPhotos} fotos.`);
        }

        if (filesToAdd.length > 0) {
            const newPhotos = [...photos, ...filesToAdd];
            onPhotosChange(newPhotos);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemovePhoto = (index) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        onPhotosChange(newPhotos);
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                    Fotos <span className="text-muted-foreground/60 font-normal">(Opcional)</span>
                </label>
                <span className="text-xs text-muted-foreground">
                    {photos.length}/{maxPhotos} fotos
                </span>
            </div>

            <div className="flex flex-col gap-4">
                {/* Upload Button */}
                <button
                    type="button"
                    onClick={handleButtonClick}
                    disabled={photos.length >= maxPhotos}
                    className={`
                        flex flex-col items-center justify-center gap-2 p-8 
                        border-2 border-dashed rounded-xl transition-all
                        ${photos.length >= maxPhotos
                            ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
                            : 'border-input bg-muted/10 hover:border-primary hover:bg-primary/5 cursor-pointer'
                        }
                    `}
                >
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                        {photos.length === 0 ? 'Adjuntar Fotos' : 'Agregar más fotos'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        JPG, PNG, WebP (máx. 5MB)
                    </span>
                </button>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Photo Previews */}
                {photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photos.map((photo, index) => (
                            <div
                                key={index}
                                className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted"
                            >
                                <img
                                    src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(index)}
                                    className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full p-1 transition-all hover:scale-110 z-10"
                                    title="Eliminar foto"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
