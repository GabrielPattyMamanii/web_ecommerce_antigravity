import React, { useRef, useState } from 'react';
import { convertToWebP } from '../../lib/imageUtils';

export function AvatarUploader({ onImageUpload, children }) {
    const fileInputRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsProcessing(true);

            // Convert to WebP
            const webpFile = await convertToWebP(file, {
                maxWidth: 400,
                maxHeight: 400,
                quality: 0.8
            });

            // Convert to Base64 for local storage display
            const reader = new FileReader();
            reader.onloadend = () => {
                onImageUpload(reader.result);
                setIsProcessing(false);
            };
            reader.readAsDataURL(webpFile);

        } catch (error) {
            console.error('Error processing avatar:', error);
            alert('Error al procesar la imagen');
            setIsProcessing(false);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClick = () => {
        if (!isProcessing) {
            fileInputRef.current?.click();
        }
    };

    return (
        <>
            <div
                onClick={handleClick}
                className={`cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            >
                {children}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
        </>
    );
}
