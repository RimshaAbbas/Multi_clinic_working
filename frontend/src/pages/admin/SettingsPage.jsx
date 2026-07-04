/**
 * SettingsPage.jsx
 * ─────────────────
 * Admin panel for customising hospital branding & contact details.
 *
 * Features
 * ─────────────────────────────────────────────────────────────────────────
 *  • Reads from / writes to `hospital_settings` Supabase table
 *  • Logo file upload → Supabase Storage bucket 'avatars/branding/'
 *  • On save, calls SettingsContext.refresh() → entire UI re-themes instantly
 *  • Inline colour picker + hex input + live preview bar
 *  • Full validation with field-level errors
 */

import { useState, useEffect, useRef } from 'react'
import {
  Save, Loader2, CheckCircle, AlertCircle, RefreshCw,
  Palette, Building2, Phone, Upload, ImageIcon, X,
} from 'lucide-react'
import supabase        from '../../lib/supabaseClient'
import { useSettings } from '../../context/SettingsContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidHex(str) {
  return /^#[0-9A-Fa-f]{6}$/.test(str)
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <Icon size={15} className="text-slate-600" />
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

// ── Labelled field with error ─────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint  && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

// ── Colour picker + hex input + live swatch ───────────────────────────────────
function ColorField({ label, value, onChange, error }) {
  return (
    <Field label={label} hint="6-digit hex, e.g. #1E3A8A" error={error}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={isValidHex(value) ? value : '#1E3A8A'}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#1E3A8A"
          maxLength={7}
          className={`input-field flex-1 font-mono ${error ? 'border-red-400' : ''}`}
        />
        {isValidHex(value) && (
          <div
            className="w-10 h-10 rounded-xl border border-slate-200 flex-shrink-0 shadow-sm"
            style={{ backgroundColor: value }}
            title="Live preview"
          />
        )}
      </div>
    </Field>
  )
}

// ── Logo Upload Card ──────────────────────────────────────────────────────────
/**
 * Uploads to Supabase Storage bucket: avatars/branding/<filename>
 * Returns the public URL and calls onUploaded(url) to update parent state.
 *
 * Setup: create a public bucket called 'avatars' in Supabase Storage,
 * or change BUCKET below to an existing bucket name.
 */
const BUCKET = 'avatars'

function LogoUploadCard({ currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type and size (max 2 MB)
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (PNG, JPG, SVG, WebP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2 MB.')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const ext      = file.name.split('.').pop()
      const fileName = `hospital-logo-${Date.now()}.${ext}`
      const filePath = `branding/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      // Get the permanent public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath)

      onUploaded(publicUrl)
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Current logo preview */}
      {currentUrl && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <img
            src={currentUrl}
            alt="Current logo"
            onError={e => { e.target.style.display = 'none' }}
            className="h-12 w-12 object-contain rounded-lg border border-slate-200 bg-white p-1"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700">Current Logo</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUrl}</p>
          </div>
        </div>
      )}

      {/* Drop zone / file picker */}
      <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-all p-6 ${
        uploading
          ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400'
      }`}>
        <div className="flex flex-col items-center gap-2 text-center">
          {uploading
            ? <Loader2 size={24} className="animate-spin text-blue-500" />
            : <Upload size={24} className="text-slate-400" />
          }
          <p className="text-sm font-semibold text-slate-600">
            {uploading ? 'Uploading to cloud storage…' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-slate-400">PNG, JPG, SVG, WebP — max 2 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> {uploadError}
        </p>
      )}

      {/* Fallback: paste URL directly */}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer hover:text-slate-600 select-none">Or paste a direct image URL instead</summary>
        <input
          type="url"
          defaultValue={currentUrl}
          onBlur={e => { if (e.target.value.trim()) onUploaded(e.target.value.trim()) }}
          placeholder="https://example.com/logo.png"
          className="input-field mt-2 text-xs"
        />
      </details>
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, refresh } = useSettings()

  const [form, setForm] = useState({
    hospital_name:  '',
    tagline:        '',
    primary_color:  '#1E3A8A',
    accent_color:   '#3B82F6',
    logo_url:       '',
    support_phone:  '',
    support_email:  '',
  })

  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [dbError, setDbError] = useState('')
  const [rowId,   setRowId]   = useState(null)

  // Populate form from SettingsContext when it loads
  useEffect(() => {
    if (!settings) return
    setForm({
      hospital_name:  settings.hospital_name  || '',
      tagline:        settings.tagline         || '',
      primary_color:  settings.primary_color   || '#1E3A8A',
      accent_color:   settings.accent_color    || '#3B82F6',
      logo_url:       settings.logo_url        || '',
      support_phone:  settings.support_phone   || '',
      support_email:  settings.support_email   || '',
    })
    setRowId(settings.id || null)
  }, [settings])

  // ── Generic field setter ─────────────────────────────────────────────────
  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
    setSaved(false)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.hospital_name.trim())      e.hospital_name = 'Hospital name is required.'
    if (!isValidHex(form.primary_color)) e.primary_color = 'Enter a valid hex colour (e.g. #1E3A8A).'
    if (!isValidHex(form.accent_color))  e.accent_color  = 'Enter a valid hex colour (e.g. #3B82F6).'
    if (form.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.support_email))
      e.support_email = 'Enter a valid email address.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Save to Supabase ─────────────────────────────────────────────────────
  async function handleSave(e) {
    e?.preventDefault()
    if (!validate()) return
    setSaving(true)
    setDbError('')
    setSaved(false)

    const payload = {
      hospital_name:  form.hospital_name.trim(),
      primary_color:  form.primary_color,
      tagline:        form.tagline.trim(),
      accent_color:   form.accent_color,
      logo_url:       form.logo_url.trim() || null,
      support_phone:  form.support_phone.trim(),
      support_email:  form.support_email.trim(),
    }

    let error

    if (rowId) {
      ;({ error } = await supabase
        .from('hospital_settings')
        .update(payload)
        .eq('id', rowId))
    } else {
      const res = await supabase
        .from('hospital_settings')
        .insert([payload])
        .select()
        .single()
      error = res.error
      if (res.data) setRowId(res.data.id)
    }

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('schema cache')) {
        setDbError(
          'A column is missing from the database table. Run the SQL patch at ' +
          'frontend/src/db/patch_hospital_settings.sql in Supabase SQL Editor, then retry.'
        )
      } else {
        setDbError(`Save failed: ${error.message}`)
      }
      setSaving(false)
      return
    }

    // Refresh global context → navbar, hero, dashboard re-theme instantly
    await refresh()
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 4000)
  }

  const previewPrimary = isValidHex(form.primary_color) ? form.primary_color : '#1E3A8A'
  const previewAccent  = isValidHex(form.accent_color)  ? form.accent_color  : '#3B82F6'

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Customization</h2>
          <p className="text-sm font-medium text-slate-400 mt-0.5">
            Changes apply instantly across the full platform.
          </p>
        </div>
        <button
          onClick={() => { refresh(); setSaved(false) }}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
          title="Reload settings from database"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Error banner ── */}
      {dbError && (
        <div className="flex items-start gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{dbError}</span>
        </div>
      )}

      {/* ── Success banner ── */}
      {saved && (
        <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm font-medium">
          <CheckCircle size={16} />
          Branding modifications saved! Changes propagated across the system.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6" noValidate>

        {/* ── § Hospital Identity ── */}
        <Section title="Hospital Identity" icon={Building2}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Hospital Identity Title *" error={errors.hospital_name}>
              <input
                type="text"
                value={form.hospital_name}
                onChange={e => set('hospital_name', e.target.value)}
                placeholder="MultiCare Clinics"
                className={`input-field ${errors.hospital_name ? 'border-red-400' : ''}`}
              />
            </Field>
            <Field label="Marketing Tagline Phrase" hint="Shown in hero section and navbar">
              <input
                type="text"
                value={form.tagline}
                onChange={e => set('tagline', e.target.value)}
                placeholder="Your Health, Our Priority"
                className="input-field"
              />
            </Field>
          </div>
        </Section>

        {/* ── § Logo Upload ── */}
        <Section title="Hospital System Logo" icon={ImageIcon}>
          <LogoUploadCard
            currentUrl={form.logo_url}
            onUploaded={url => set('logo_url', url)}
          />
        </Section>

        {/* ── § Brand Colours ── */}
        <Section title="Brand Colours" icon={Palette}>
          {/* Live colour preview bar */}
          <div className="flex rounded-xl overflow-hidden h-10 border border-slate-200 shadow-sm mb-2">
            <div className="flex-1 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: previewPrimary }}>Primary</div>
            <div className="flex-1 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: previewAccent }}>Accent</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <ColorField
              label="Primary Design Color *"
              value={form.primary_color}
              onChange={v => set('primary_color', v)}
              error={errors.primary_color}
            />
            <ColorField
              label="Accent Secondary Color *"
              value={form.accent_color}
              onChange={v => set('accent_color', v)}
              error={errors.accent_color}
            />
          </div>
        </Section>

        {/* ── § Contact Details ── */}
        <Section title="Contact Details" icon={Phone}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Support Phone">
              <input
                type="tel"
                value={form.support_phone}
                onChange={e => set('support_phone', e.target.value)}
                placeholder="+92-21-111-222-333"
                className="input-field"
              />
            </Field>
            <Field label="Support Email" error={errors.support_email}>
              <input
                type="email"
                value={form.support_email}
                onChange={e => set('support_email', e.target.value)}
                placeholder="info@multicare.pk"
                className={`input-field ${errors.support_email ? 'border-red-400' : ''}`}
              />
            </Field>
          </div>
        </Section>

        {/* ── Save button ── */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white rounded-xl transition-all shadow-sm disabled:opacity-60"
            style={{ backgroundColor: previewPrimary }}
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Committing modifications…</>
              : saved
                ? <><CheckCircle size={15} /> Saved!</>
                : <><Save size={15} /> Save Theme & Refresh System Settings</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
