import { supabase } from '../lib/supabase';

// IMPORTANT: This must match EXACTLY the value stored in old_entradas.tanda_nombre
// Confirmed via live DB query 2026-03-05: value is all lowercase 'tandas viejas'
const TANDAS_VIEJAS_NOMBRE = 'tandas viejas';

export const pricingService = {
    /**
     * Fetches a summary of all Tandas from entradas + old_entradas, including metrics.
     * Joins with tanda_settings to get configured status.
     */
    async getTandasSummary() {
        try {
            // 1. Fetch all distinct tandas from entradas
            const { data: entradas, error } = await supabase
                .from('entradas')
                .select('tanda_nombre, tanda_fecha, marca, cantidad_docenas, producto_titulo');

            if (error) throw error;

            // 2. Fetch from old_entradas (Tandas Viejas)
            // Confirmed real schema: old_entradas HAS tanda_fecha, codigo_boleta, marca, cantidad_docenas
            // Extra columns vs entradas: precio_docena_pay_chile, costo_docena_envio, total_gasto, 'precio total gastado'
            // Missing vs entradas: observaciones, fotos, bultos, propietario, marca_id
            const { data: oldEntradas, error: oldError } = await supabase
                .from('old_entradas')
                .select('tanda_nombre, tanda_fecha, marca, cantidad_docenas, producto_titulo');

            // old_entradas may not exist or may be empty — treat errors as empty
            const oldEntradasData = (!oldError && oldEntradas) ? oldEntradas : [];

            // 3. Fetch all settings to match
            const { data: settings, error: settingsError } = await supabase
                .from('tanda_settings')
                .select('*');

            if (settingsError) throw settingsError;

            // 4. Combine both sources
            const allEntradas = [...entradas, ...oldEntradasData];

            // 5. Aggregate data
            const summary = Object.values(allEntradas.reduce((acc, curr) => {
                if (!acc[curr.tanda_nombre]) {
                    acc[curr.tanda_nombre] = {
                        tanda_nombre: curr.tanda_nombre,
                        tanda_fecha: curr.tanda_fecha || null,
                        marcas: new Set(),
                        productos: 0,
                        total_docenas: 0,
                        has_settings: !!settings.find(s => s.tanda_nombre === curr.tanda_nombre),
                        isOldEntrada: curr.tanda_nombre === TANDAS_VIEJAS_NOMBRE
                    };
                }
                acc[curr.tanda_nombre].marcas.add(curr.marca);
                acc[curr.tanda_nombre].productos += 1;
                acc[curr.tanda_nombre].total_docenas += (curr.cantidad_docenas || 0);
                return acc;
            }, {}));

            // Convert Set to count and format
            return summary.map(item => ({
                ...item,
                marcas_count: item.marcas.size,
                marcas: undefined // remove Set needed for aggregation
            }));

        } catch (error) {
            console.error('Error in getTandasSummary:', error);
            throw error;
        }
    },

    /**
     * Fetches full details for a specific Tanda, including products and current settings.
     * When tandaNombre is 'tandas viejas' (exact casing), fetches from old_entradas instead of entradas.
     * Merges with Catalog Product status.
     */
    async getTandaDetails(tandaNombre) {
        try {
            // Choose source table: old_entradas for "tandas viejas", entradas for everything else
            const sourceTable = tandaNombre === TANDAS_VIEJAS_NOMBRE ? 'old_entradas' : 'entradas';

            const [{ data: entradas, error: entradasError }, { data: settings, error: settingsError }, { data: tandaRow }] = await Promise.all([
                supabase
                    .from(sourceTable)
                    .select('*')
                    .eq('tanda_nombre', tandaNombre),
                supabase
                    .from('tanda_settings')
                    .select('*')
                    .eq('tanda_nombre', tandaNombre)
                    .single(),
                supabase
                    .from('tandas')
                    .select('parametros')
                    .eq('nombre', tandaNombre)
                    .maybeSingle()
            ]);

            if (entradasError) throw entradasError;

            // It's okay if settings don't exist yet (first time viewing)
            const currentSettings = settings || {
                cotizacion_dolar: null,
                indice_ganancia_tipo: 'personalizado',
                indice_ganancia_valor: 1.5 // Default
            };

            // Fetch Catalog Products to check publication status
            const codes = (entradas || []).map(e => e.codigo).filter(Boolean);
            let catalogProducts = [];
            if (codes.length > 0) {
                const { data: catalogData, error: catalogError } = await supabase
                    .from('products')
                    .select('id, code, published, retail_price')
                    .in('code', codes);
                if (!catalogError) catalogProducts = catalogData || [];
            }

            // Merge Data
            const products = (entradas || []).map(entrada => {
                const catalogProduct = catalogProducts.find(cp => cp.code === entrada.codigo);
                return {
                    ...entrada,
                    catalog_product_id: catalogProduct?.id || null,
                    is_published: catalogProduct?.published || false,
                    current_catalog_price: catalogProduct?.retail_price || 0
                };
            });

            return {
                settings: currentSettings,
                products,
                isOldEntrada: tandaNombre === TANDAS_VIEJAS_NOMBRE,
                tandaParametros: tandaRow?.parametros || {}
            };

        } catch (error) {
            console.error('Error in getTandaDetails:', error);
            throw error;
        }
    },

    /**
     * Saves or updates Tanda Settings (Dollar rate, Margin)
     */
    async saveTandaSettings(tandaNombre, settings) {
        try {
            // Check if exists
            const { data: existing } = await supabase
                .from('tanda_settings')
                .select('id')
                .eq('tanda_nombre', tandaNombre)
                .single();

            let result;
            if (existing) {
                result = await supabase
                    .from('tanda_settings')
                    .update({
                        cotizacion_dolar: settings.cotizacion_dolar,
                        indice_ganancia_tipo: settings.indice_ganancia_tipo,
                        indice_ganancia_valor: settings.indice_ganancia_valor
                    })
                    .eq('tanda_nombre', tandaNombre);
            } else {
                result = await supabase
                    .from('tanda_settings')
                    .insert([{
                        tanda_nombre: tandaNombre,
                        cotizacion_dolar: settings.cotizacion_dolar,
                        indice_ganancia_tipo: settings.indice_ganancia_tipo,
                        indice_ganancia_valor: settings.indice_ganancia_valor
                    }]);
            }

            if (result.error) throw result.error;
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    },

    /**
     * Toggles product publication status in Catalog.
     * If publishing, creates or updates the product record.
     * If unpublishing, just updates 'published' to false.
     */
    async toggleProductPublication(productData, shouldPublish) {
        try {
            const {
                codigo,
                producto_titulo,
                marca,
                observaciones,
                precio_venta_pesos,
                entrada_id
            } = productData;

            // 1. Check if product exists in catalog
            const { data: existingProduct } = await supabase
                .from('products')
                .select('id')
                .eq('code', codigo)
                .single();

            if (shouldPublish) {
                // UPSERT / CREATE logic
                const payload = {
                    name: producto_titulo,
                    description: observaciones || `Producto de marca ${marca}`,
                    retail_price: precio_venta_pesos,
                    code: codigo,
                    published: true,
                };

                if (existingProduct) {
                    const { error } = await supabase
                        .from('products')
                        .update(payload)
                        .eq('id', existingProduct.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('products')
                        .insert([payload]);
                    if (error) throw error;
                }

            } else {
                // HIDE logic
                if (existingProduct) {
                    const { error } = await supabase
                        .from('products')
                        .update({ published: false })
                        .eq('id', existingProduct.id);
                    if (error) throw error;
                }
            }

            return true;

        } catch (error) {
            console.error('Error toggling publication:', error);
            throw error;
        }
    }
};
