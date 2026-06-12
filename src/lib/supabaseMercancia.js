import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Create a separate client with a dedicated storage key
// This ensures that "Mi Mercadería" login/logout does not affect the main app's session
export const supabaseMercancia = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storageKey: 'mercancia.auth.token', // Distinct key
        persistSession: true,
        detectSessionInUrl: false // Avoid conflict with main app redirects
    }
})
