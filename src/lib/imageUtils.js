/**
 * Image Utilities for WebP Conversion and Optimization
 * Converts images to WebP format to reduce file size and optimize storage
 */

/**
 * Converts an image file to WebP format
 * @param {File} file - The image file to convert
 * @param {Object} options - Conversion options
 * @param {number} options.quality - WebP quality (0-1), default 0.85
 * @param {number} options.maxWidth - Maximum width in pixels, default 1920
 * @param {number} options.maxHeight - Maximum height in pixels, default 1920
 * @returns {Promise<File>} - The converted WebP file
 */
export async function convertToWebP(file, options = {}) {
    const {
        quality = 0.85,
        maxWidth = 1920,
        maxHeight = 1920,
        applyWatermark = false
    } = options;

    return new Promise((resolve, reject) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('El archivo debe ser una imagen'));
            return;
        }

        // If already WebP, just resize if needed (and apply watermark if requested)
        if (file.type === 'image/webp') {
            resizeImage(file, maxWidth, maxHeight, quality, applyWatermark)
                .then(resolve)
                .catch(reject);
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = async () => {
                try {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        const aspectRatio = width / height;

                        if (width > height) {
                            width = maxWidth;
                            height = width / aspectRatio;
                        } else {
                            height = maxHeight;
                            width = height * aspectRatio;
                        }
                    }

                    // Create canvas and draw image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    if (applyWatermark) {
                        try {
                            const watermarkImg = await loadWatermarkImage('/watermark.png');
                            const logoWidth = width * 0.6; // 60% of image width
                            const logoHeight = (watermarkImg.height / watermarkImg.width) * logoWidth;
                            
                            const x = (width - logoWidth) / 2;
                            const y = (height - logoHeight) / 2;

                            ctx.globalAlpha = 0.3;
                            ctx.drawImage(watermarkImg, x, y, logoWidth, logoHeight);
                            ctx.globalAlpha = 1.0;
                        } catch (err) {
                            console.error('Error applying watermark:', err);
                        }
                    }

                    // Convert to WebP
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Error al convertir la imagen'));
                                return;
                            }

                            // Create new File object with WebP extension
                            const originalName = file.name.replace(/\.[^/.]+$/, '');
                            const webpFile = new File(
                                [blob],
                                `${originalName}.webp`,
                                { type: 'image/webp' }
                            );

                            resolve(webpFile);
                        },
                        'image/webp',
                        quality
                    );
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Error al cargar la imagen'));
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Resize an existing WebP image
 * @param {File} file - The WebP file to resize
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Quality (0-1)
 * @param {boolean} applyWatermark - Apply watermark
 * @returns {Promise<File>}
 */
async function resizeImage(file, maxWidth, maxHeight, quality, applyWatermark = false) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = async () => {
                let width = img.width;
                let height = img.height;

                // Check if resize or watermark is needed
                if (width <= maxWidth && height <= maxHeight && !applyWatermark) {
                    resolve(file);
                    return;
                }

                // Calculate new dimensions
                const aspectRatio = width / height;

                if (width > height) {
                    width = maxWidth;
                    height = width / aspectRatio;
                } else {
                    height = maxHeight;
                    width = height * aspectRatio;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                if (applyWatermark) {
                    try {
                        const watermarkImg = await loadWatermarkImage('/watermark.png');
                        const logoWidth = width * 0.6; // 60% of image width
                        const logoHeight = (watermarkImg.height / watermarkImg.width) * logoWidth;
                        
                        const x = (width - logoWidth) / 2;
                        const y = (height - logoHeight) / 2;

                        ctx.globalAlpha = 0.3;
                        ctx.drawImage(watermarkImg, x, y, logoWidth, logoHeight);
                        ctx.globalAlpha = 1.0;
                    } catch (err) {
                        console.error('Error applying watermark:', err);
                    }
                }

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Error al redimensionar'));
                            return;
                        }

                        const resizedFile = new File(
                            [blob],
                            file.name,
                            { type: 'image/webp' }
                        );

                        resolve(resizedFile);
                    },
                    'image/webp',
                    quality
                );
            };

            img.onerror = () => reject(new Error('Error al cargar la imagen'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

/**
 * Get file size in a human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Object} - Validation result with isValid and error message
 */
export function validateImageFile(file, maxSizeMB = 10) {
    if (!file) {
        return { isValid: false, error: 'No se seleccionó ningún archivo' };
    }

    if (!file.type.startsWith('image/')) {
        return { isValid: false, error: 'El archivo debe ser una imagen' };
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return {
            isValid: false,
            error: `La imagen no puede superar ${maxSizeMB}MB (tamaño actual: ${formatFileSize(file.size)})`
        };
    }

    return { isValid: true };
}

let cachedWatermark = null;
function loadWatermarkImage(src) {
    return new Promise((resolve, reject) => {
        if (cachedWatermark) {
            resolve(cachedWatermark);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            cachedWatermark = img;
            resolve(img);
        };
        img.onerror = () => reject(new Error('Failed to load watermark image'));
        img.src = src;
    });
}

