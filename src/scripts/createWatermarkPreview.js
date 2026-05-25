
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const logoPath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\bbd81ffb-5c81-4d0e-9f4e-71ff606d3d65\\media__1776367068632.png';
const imagePath = 'C:\\Users\\gabri\\.gemini\\antigravity\\brain\\bbd81ffb-5c81-4d0e-9f4e-71ff606d3d65\\media__1776367102709.jpg';
const outputPath = 'C:\\Users\\gabri\\OneDrive\\Desktop\\Prueba antigravity\\ecommerce-web\\watermark_preview.jpg';

async function createPreview() {
    try {
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        // Scale logo to be 60% of image width
        const logoWidth = Math.round(metadata.width * 0.6);

        // Process logo: resize and set transparency
        // Note: ensureAlpha() in older sharp doesn't take value. 
        // We use .composite with a white buffer or just .png({ quality: ... })? No.
        // Let's try the .linear approach or just create a new buffer with alpha.
        
        const logoBuffer = await sharp(logoPath)
            .resize({ width: logoWidth })
            .ensureAlpha()
            .composite([{
                input: Buffer.alloc(1, 255 * 0.3), // 30% alpha
                raw: { width: 1, height: 1, channels: 1 },
                blend: 'dest-in',
                tile: true
            }])
            .png()
            .toBuffer();

        await image
            .composite([{
                input: logoBuffer,
                gravity: 'center'
            }])
            .toFile(outputPath);

        console.log('Preview created at:', outputPath);
    } catch (err) {
        console.error('Error:', err);
    }
}

createPreview();
