import { getSupabaseClient } from './supabaseClient'

export function isSupabaseConfigured() {
  return getSupabaseClient() != null
}
