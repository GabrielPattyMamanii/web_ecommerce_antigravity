
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

let env = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) env[key.trim()] = val.trim();
    });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function debugProducts() {
    console.log('--- Debugging Products ---')

    // Fetch ALL products (ignoring published filter if possible, but anon might be restricted)
    // We'll try to fetch everything we can see
    const { data, error } = await supabase
        .from('products')
        .select('id, name, published, category_id, created_at')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all products:', error)
        return
    }

    console.log(`Found ${data.length} products accessible to Anon role:`)
    data.forEach(p => {
        console.log(`[${p.published ? 'VISIBLE' : 'HIDDEN'}] ${p.name} (ID: ${p.id}) - Created: ${p.created_at}`)
    })
}

debugProducts()
