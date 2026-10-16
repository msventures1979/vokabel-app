// Supabase-Zugang. URL und Publishable Key sind für den Browser gedacht und dürfen öffentlich sein;
// die Daten schützen die Zugriffsregeln (Row Level Security) in der Datenbank.
// Werte aus .env (VITE_SUPABASE_URL, VITE_SUPABASE_KEY) haben Vorrang.
const FALLBACK_URL = 'https://kvhdrkqmzyfhyvvolakg.supabase.co'
const FALLBACK_KEY = 'sb_publishable_TDK72TSpQ_e49vwHJ6M44w_-_MTTOu8'

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY || FALLBACK_KEY
export const SYNC_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY)
