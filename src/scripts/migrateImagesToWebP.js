/**
 * Migration Script: Convert Existing Supabase Images to WebP
 * 
 * This script:
 * 1. Connects to Supabase storage
 * 2. Downloads all images from specified buckets
 * 3. Converts them to WebP format using sharp
 * 4. Uploads the WebP versions
 * 5. Updates database references
 * 6. Generates a detailed report
 * 
 * IMPORTANT: Run this script manually with: node src/scripts/migrateImagesToWebP.js
 * 
 * Required environment variables:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const WEBP_QUALITY = 85;
const MAX_DIMENSION = 1920;

// Buckets to process
const BUCKETS = ['products', 'tanda-fotos'];

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Statistics
const stats = {
    totalImages: 0,
    converted: 0,
    skipped: 0,
    errors: 0,
    spaceSaved: 0,
    errorDetails: []
};

/**
 * Download image from URL
 */
async function downloadImage(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }
    return await response.arrayBuffer();
}

/**
 * Convert image to WebP using sharp
 */
async function convertToWebP(imageBuffer) {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Calculate new dimensions
    let width = metadata.width;
    let height = metadata.height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
            width = MAX_DIMENSION;
            height = Math.round((MAX_DIMENSION / metadata.width) * metadata.height);
        } else {
            height = MAX_DIMENSION;
            width = Math.round((MAX_DIMENSION / metadata.height) * metadata.width);
        }
    }

    // Convert to WebP
    const webpBuffer = await image
        .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

    return webpBuffer;
}

/**
 * Process a single image file
 */
async function processImage(bucket, file) {
    try {
        // Skip if already WebP
        if (file.name.toLowerCase().endsWith('.webp')) {
            console.log(`  ⏭️  Skipping (already WebP): ${file.name}`);
            stats.skipped++;
            return null;
        }

        // Skip non-image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
        const ext = path.extname(file.name).toLowerCase();
        if (!imageExtensions.includes(ext)) {
            console.log(`  ⏭️  Skipping (not an image): ${file.name}`);
            stats.skipped++;
            return null;
        }

        console.log(`  🔄 Converting: ${file.name}`);

        // Get public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.name);
        const imageUrl = urlData.publicUrl;

        // Download image
        const imageBuffer = await downloadImage(imageUrl);
        const originalSize = imageBuffer.byteLength;

        // Convert to WebP
        const webpBuffer = await convertToWebP(Buffer.from(imageBuffer));
        const webpSize = webpBuffer.byteLength;

        // Generate new filename
        const baseName = path.basename(file.name, ext);
        const webpFileName = `${baseName}.webp`;

        // Upload WebP version
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(webpFileName, webpBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) {
            throw uploadError;
        }

        // Calculate savings
        const saved = originalSize - webpSize;
        const savedPercent = Math.round((saved / originalSize) * 100);

        stats.converted++;
        stats.spaceSaved += saved;

        console.log(`  ✅ Converted: ${formatBytes(originalSize)} → ${formatBytes(webpSize)} (${savedPercent}% saved)`);

        return {
            bucket,
            originalName: file.name,
            webpName: webpFileName,
            originalSize,
            webpSize,
            saved
        };
    } catch (error) {
        console.error(`  ❌ Error processing ${file.name}:`, error.message);
        stats.errors++;
        stats.errorDetails.push({ file: file.name, error: error.message });
        return null;
    }
}

/**
 * Update database references for products
 */
async function updateProductReferences(conversions) {
    console.log('\n📝 Updating product image references...');

    const productConversions = conversions.filter(c => c && c.bucket === 'products');

    for (const conversion of productConversions) {
        try {
            // Get products with this image
            const { data: products, error: fetchError } = await supabase
                .from('products')
                .select('id, images')
                .contains('images', [conversion.originalName]);

            if (fetchError) throw fetchError;

            // Update each product
            for (const product of products || []) {
                const updatedImages = product.images.map(img =>
                    img === conversion.originalName ? conversion.webpName : img
                );

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ images: updatedImages })
                    .eq('id', product.id);

                if (updateError) throw updateError;
                console.log(`  ✅ Updated product ${product.id}`);
            }
        } catch (error) {
            console.error(`  ❌ Error updating references for ${conversion.originalName}:`, error.message);
        }
    }
}

/**
 * Update database references for posibles_compras
 */
async function updatePosiblesComprasReferences(conversions) {
    console.log('\n📝 Updating posibles_compras image references...');

    const tandaConversions = conversions.filter(c => c && c.bucket === 'tanda-fotos');

    for (const conversion of tandaConversions) {
        try {
            // Get the public URLs
            const { data: oldUrl } = supabase.storage.from('tanda-fotos').getPublicUrl(conversion.originalName);
            const { data: newUrl } = supabase.storage.from('tanda-fotos').getPublicUrl(conversion.webpName);

            // Update records with this image
            const { error: updateError } = await supabase
                .from('posibles_compras')
                .update({ foto_url: newUrl.publicUrl })
                .eq('foto_url', oldUrl.publicUrl);

            if (updateError) throw updateError;
            console.log(`  ✅ Updated posibles_compras for ${conversion.originalName}`);
        } catch (error) {
            console.error(`  ❌ Error updating references for ${conversion.originalName}:`, error.message);
        }
    }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate final report
 */
function generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total images processed: ${stats.totalImages}`);
    console.log(`✅ Successfully converted: ${stats.converted}`);
    console.log(`⏭️  Skipped (already WebP): ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`💾 Total space saved: ${formatBytes(stats.spaceSaved)}`);

    if (stats.converted > 0) {
        const avgSaved = stats.spaceSaved / stats.converted;
        console.log(`📉 Average savings per image: ${formatBytes(avgSaved)}`);
    }

    if (stats.errorDetails.length > 0) {
        console.log('\n❌ Error Details:');
        stats.errorDetails.forEach(({ file, error }) => {
            console.log(`  - ${file}: ${error}`);
        });
    }

    console.log('='.repeat(60));
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Verify that images display correctly in the application');
    console.log('2. If everything looks good, you can manually delete the original images from Supabase Storage');
    console.log('3. Original images have NOT been deleted automatically for safety');
    console.log('='.repeat(60) + '\n');
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🚀 Starting WebP Migration...\n');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Missing Supabase credentials in environment variables');
        console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
        process.exit(1);
    }

    const allConversions = [];

    // Process each bucket
    for (const bucket of BUCKETS) {
        console.log(`\n📦 Processing bucket: ${bucket}`);
        console.log('-'.repeat(60));

        try {
            // List all files in bucket
            const { data: files, error } = await supabase.storage.from(bucket).list();

            if (error) {
                console.error(`❌ Error listing files in ${bucket}:`, error.message);
                continue;
            }

            if (!files || files.length === 0) {
                console.log(`  ℹ️  No files found in ${bucket}`);
                continue;
            }

            console.log(`  Found ${files.length} files`);
            stats.totalImages += files.length;

            // Process each file
            for (const file of files) {
                const result = await processImage(bucket, file);
                if (result) {
                    allConversions.push(result);
                }
            }
        } catch (error) {
            console.error(`❌ Error processing bucket ${bucket}:`, error.message);
        }
    }

    // Update database references
    if (allConversions.length > 0) {
        await updateProductReferences(allConversions);
        await updatePosiblesComprasReferences(allConversions);
    }

    // Generate report
    generateReport();
}

// Run migration
migrate().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
