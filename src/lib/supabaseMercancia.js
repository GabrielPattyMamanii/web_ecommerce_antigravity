import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

// Create a separate client with a dedicated storage key
// This ensures that "Mi Mercadería" login/logout does not affect the main app's session
export const supabaseMercancia = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storageKey: 'mercancia.auth.token', // Distinct key
        persistSession: true,
        detectSessionInUrl: false // Avoid conflict with main app redirects
    }
})
