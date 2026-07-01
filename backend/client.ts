
//https://supabase.com/docs/reference/javascript/auth

import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_URL_SECRET!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
})