import { supabase } from './supabase';

const DOLAR_STORAGE_KEY = 'antigravity_dolar_api';
const SUPABASE_CLAVE = 'dolar_config';

function readCache() {
    try { return JSON.parse(localStorage.getItem(DOLAR_STORAGE_KEY) || '{}'); }
    catch { return {}; }
}

function writeCache(config) {
    try { localStorage.setItem(DOLAR_STORAGE_KEY, JSON.stringify(config)); }
    catch { /* ignore */ }
}

export function loadDolarConfigLocal() {
    return readCache();
}

export async function loadDolarConfigFromDB() {
    const { data } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', SUPABASE_CLAVE)
        .maybeSingle();
    if (data?.valor && typeof data.valor === 'object') {
        writeCache(data.valor);
        return data.valor;
    }
    return readCache();
}

export async function saveDolarConfig(config) {
    writeCache(config);
    await supabase
        .from('configuracion')
        .upsert({ clave: SUPABASE_CLAVE, valor: config });
}
