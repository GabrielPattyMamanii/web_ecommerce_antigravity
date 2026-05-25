import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://example.com';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const term = '28395';
    const { data: d1 } = await supabase
        .from('entradas')
        .select('codigo, producto_titulo, marca, codigo_boleta, tanda_nombre')
        .or(`codigo.ilike.%${term}%,producto_titulo.ilike.%${term}%,marca.ilike.%${term}%,codigo_boleta.ilike.%${term}%`);
    console.log(d1);
}
test();
