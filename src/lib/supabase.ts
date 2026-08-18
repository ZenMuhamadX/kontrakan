import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "http://192.168.1.230:8000"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODU5MDU4NDQsImV4cCI6MTk0MzU4NTg0NH0.BcT887GDJO9c1wAFSS-d2tkmVcIFmQ41_XW0b1qWr7U"

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL and Service Role Key are required. Please add them to your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'kontrakan'
  }
})
