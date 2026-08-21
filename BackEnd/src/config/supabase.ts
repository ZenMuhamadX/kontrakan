import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
export const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || 'kontrakan'
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'ktp_kk_bucket'

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
  console.warn('⚠️  [Supabase Warning]: SUPABASE_URL atau SUPABASE_ANON_KEY belum dikonfigurasi dengan benar di file .env')
}

// Inisialisasi Supabase client dengan schema 'kontrakan'
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: SUPABASE_SCHEMA,
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
