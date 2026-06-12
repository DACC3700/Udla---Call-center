import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(url: string, key: string): SupabaseClient {
  supabaseInstance = createClient(url, key)
  return supabaseInstance
}

export function getCurrentClient(): SupabaseClient | null {
  return supabaseInstance
}
