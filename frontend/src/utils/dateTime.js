/**
 * dateTime.js
 * -----------
 * Centralised timezone-aware date/time helpers for the MultiCare platform.
 * Timezone: Asia/Karachi (UTC+5, no DST)
 *
 * Key design principle: NEVER pass a plain 'YYYY-MM-DD' string into
 * new Date() — browsers parse it as UTC midnight which rolls back one day.
 * All plain date strings are parsed manually via string splitting.
 */

const TZ  = 'Asia/Karachi'
const pad = n => String(n).padStart(2, '0')

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── PKT formatter factory ─────────────────────────────────────────────────────
function pkFmt(options) {
  return new Intl.DateTimeFormat('en-PK', { timeZone: TZ, ...options })
}

// ── Break a full Date object into PKT components ──────────────────────────────
function pktParts(d) {
  const fmt   = pkFmt({ year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12: false })
  const parts = fmt.formatToParts(d)
  const get   = type => parts.find(p => p.type === type)?.value ?? '00'
  return {
    year:   get('year'),
    month:  get('month'),
    day:    get('day'),
    hour:   get('hour') === '24' ? '00' : get('hour'),
    minute: get('minute'),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY / NOW
// ─────────────────────────────────────────────────────────────────────────────

/** Returns today's date as 'YYYY-MM-DD' in Asia/Karachi time. */
export function todayLocal() {
  const { year, month, day } = pktParts(new Date())
  return `${year}-${month}-${day}`
}

/** Returns current time as 'HH:MM' in Asia/Karachi time. */
export function nowTimeLocal() {
  const { hour, minute } = pktParts(new Date())
  return `${hour}:${minute}`
}

// ─────────────────────────────────────────────────────────────────────────────
// DB CONVERTERS  (for writing to Supabase)
// ─────────────────────────────────────────────────────────────────────────────

export function toLocalDateStr(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value) // already clean
  const { year, month, day } = pktParts(new Date(value))
  return `${year}-${month}-${day}`
}

export function toLocalTimeStr(value) {
  if (!value) return ''
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value))) {
    const [h, m] = String(value).split(':')
    return `${pad(parseInt(h, 10))}:${pad(parseInt(m, 10))}`
  }
  const { hour, minute } = pktParts(new Date(value))
  return `${hour}:${minute}`
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY FORMATTERS  — bulletproof, never throw, never show "Invalid Date"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats any date value to 'DD-Mon-YYYY'  e.g. "04-Jul-2026"
 *
 * Accepts:
 *   'YYYY-MM-DD'        → parsed directly, no Date constructor (no UTC drift)
 *   ISO / timestamp     → parsed via new Date(), displayed in PKT
 *   null/undefined      → '—'
 */
export function displayDate(value) {
  if (!value) return '—'
  try {
    const s = String(value).trim()

    // Most common case: plain 'YYYY-MM-DD' from Supabase — parse by splitting
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [year, month, day] = s.split('-')
      const mIdx = parseInt(month, 10) - 1
      return `${day}-${MONTH_NAMES[mIdx] ?? month}-${year}`
    }

    // Full ISO string — safe to use new Date()
    const d = new Date(s)
    if (isNaN(d.getTime())) return s  // graceful fallback: show raw string

    const { year, month, day } = pktParts(d)
    const mIdx = parseInt(month, 10) - 1
    return `${day}-${MONTH_NAMES[mIdx] ?? month}-${year}`
  } catch {
    return String(value)
  }
}

/**
 * Formats any time value to '10:00 AM' 12-hour format
 *
 * Accepts:
 *   'HH:MM'             → plain 24-hr from Supabase (most common)
 *   'HH:MM:SS'          → with seconds
 *   '10:00 AM'          → already 12-hr, returned as-is
 *   null/undefined      → '—'
 */
export function displayTime(value) {
  if (!value) return '—'
  try {
    const s = String(value).trim()

    // Already in 12-hr format — normalise and return
    if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(s)) {
      const [time, ampm] = s.split(/\s+/)
      const [h, m] = time.split(':')
      return `${pad(parseInt(h, 10))}:${pad(parseInt(m, 10))} ${ampm.toUpperCase()}`
    }

    // Plain 'HH:MM' or 'HH:MM:SS' — parse manually, no Date constructor needed
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      let h = parseInt(s.split(':')[0], 10)
      const m = parseInt(s.split(':')[1], 10)
      const ampm = h >= 12 ? 'PM' : 'AM'
      if (h === 0)       h = 12
      else if (h > 12)   h -= 12
      return `${pad(h)}:${pad(m)} ${ampm}`
    }

    // ISO string fallback
    const d = new Date(s)
    if (isNaN(d.getTime())) return s

    return d.toLocaleTimeString('en-PK', {
      timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch {
    return String(value)
  }
}

/**
 * Combined: '04-Jul-2026 · 10:00 AM'
 */
export function displayDateTime(dateValue, timeValue) {
  if (!dateValue) return '—'
  const d = displayDate(dateValue)
  const t = timeValue ? displayTime(timeValue) : ''
  return t ? `${d} · ${t}` : d
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if a 'YYYY-MM-DD' string equals today in PKT. */
export function isTodayLocal(dateStr) {
  if (!dateStr) return false
  return String(dateStr).trim() === todayLocal()
}

/** Returns true if a 'YYYY-MM-DD' string is strictly in the past (PKT). */
export function isPastDate(dateStr) {
  if (!dateStr) return false
  return String(dateStr).trim() < todayLocal()
}
