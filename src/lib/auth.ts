import { supabase } from './supabase'

const APP_SESSION_KEY = 'nofap:session'

export interface AppSession {
  id: string
  name: string
}

/** Sesión anónima de Supabase: da un auth.uid() real, sin pedir credenciales. */
export async function ensureAnonymousSession(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return

  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

/** Sesión de la app (qué usuario es este dispositivo) — separada de la de Supabase. */
export function getAppSession(): AppSession | null {
  const raw = localStorage.getItem(APP_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppSession
  } catch {
    return null
  }
}

export function setAppSession(session: AppSession): void {
  localStorage.setItem(APP_SESSION_KEY, JSON.stringify(session))
}
