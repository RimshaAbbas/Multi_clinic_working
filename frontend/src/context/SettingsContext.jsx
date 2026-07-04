/**
 * SettingsContext.jsx
 * ───────────────────
 * Global provider that loads `hospital_settings` from Supabase on mount
 * and exposes them to every component via useSettings().
 *
 * Also applies CSS custom properties to :root so Tailwind inline-style
 * overrides work everywhere without prop-drilling:
 *   --color-primary   → primary_color  (e.g. #1E3A8A)
 *   --color-accent    → accent_color   (e.g. #3B82F6)
 *
 * Usage
 * ──────
 *   const { settings, loading, refresh } = useSettings()
 *   // settings.hospital_name, settings.primary_color, settings.logo_url …
 *
 *   // Dynamic inline style example:
 *   <div style={{ backgroundColor: settings.primary_color }} />
 *
 *   // Or use the CSS variable in Tailwind arbitrary value:
 *   <div className="bg-[var(--color-primary)]" />
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

// ── Defaults (shown while loading or if DB row is missing) ───────────────────
const DEFAULTS = {
  hospital_name:  'MultiCare Clinics',
  tagline:        'Your Health, Our Priority',
  primary_color:  '#1E3A8A',
  accent_color:   '#3B82F6',
  logo_url:       null,
  support_phone:  '+92-21-111-222-333',
  support_email:  'info@multicare.pk',
}

// ── Context ──────────────────────────────────────────────────────────────────
const SettingsContext = createContext({
  settings: DEFAULTS,
  loading:  true,
  refresh:  () => {},
})

// ── CSS variable injector ─────────────────────────────────────────────────────
function applyTheme(settings) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', settings.primary_color || DEFAULTS.primary_color)
  root.style.setProperty('--color-accent',  settings.accent_color  || DEFAULTS.accent_color)
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading,  setLoading]  = useState(true)

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('hospital_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.warn('[Settings] Could not load hospital_settings:', error.message)
      applyTheme(DEFAULTS)
    } else if (data) {
      const merged = { ...DEFAULTS, ...data }
      setSettings(merged)
      applyTheme(merged)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSettings() {
  return useContext(SettingsContext)
}
