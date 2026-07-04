/**
 * smsGateway.js
 * ─────────────
 * Production SMS / WhatsApp gateway module.
 *
 * Routing strategy (checked in order):
 *   1. Supabase Edge Function  — `send-whatsapp`  (primary, already deployed)
 *   2. Twilio REST API         — fallback if edge function is unreachable
 *   3. Infobip REST API        — second fallback
 *
 * Environment variables (frontend/.env)
 * ──────────────────────────────────────
 *   VITE_SUPABASE_URL              (already set)
 *   VITE_SUPABASE_ANON_KEY         (already set)
 *
 *   -- Twilio (optional fallback) --
 *   VITE_TWILIO_ACCOUNT_SID        e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   VITE_TWILIO_AUTH_TOKEN         e.g. your_auth_token
 *   VITE_TWILIO_FROM_NUMBER        e.g. +15005550006
 *
 *   -- Infobip (optional fallback) --
 *   VITE_INFOBIP_API_KEY           e.g. your_infobip_api_key
 *   VITE_INFOBIP_BASE_URL          e.g. https://XXXXX.api.infobip.com
 *   VITE_INFOBIP_FROM_NUMBER       e.g. InfoSMS
 *
 * Usage
 * ─────
 *   import { sendSMS } from './smsGateway'
 *   const result = await sendSMS('+923001234567', 'Dear Patient, ...')
 *   // result: { success: boolean, messageId?: string, provider: string, error?: string }
 */

import supabase from '../lib/supabaseClient'

// ── Phone number normalizer ───────────────────────────────────────────────────
// Strips spaces, dashes, parentheses; ensures leading +
function normalizePhone(raw) {
  if (!raw) return ''
  const digits = raw.replace(/[\s\-().]/g, '').replace(/^\+/, '')
  // Pakistani numbers: 03xx → 923xx
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`
  return `+${digits}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 1: Supabase Edge Function (UltraMsg / WhatsApp)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaEdgeFunction(phone, message) {
  const { data, error } = await supabase.functions.invoke('send-whatsapp', {
    body: { phone, message },
  })

  if (error) return { success: false, error: error.message, provider: 'edge' }
  if (!data?.success) return { success: false, error: data?.error || 'Edge fn failure', provider: 'edge' }
  return { success: true, messageId: data.messageId, provider: 'edge' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 2: Twilio SMS REST API
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaTwilio(phone, message) {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID
  const authToken  = import.meta.env.VITE_TWILIO_AUTH_TOKEN
  const from       = import.meta.env.VITE_TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !from) {
    return { success: false, error: 'Twilio credentials not configured', provider: 'twilio' }
  }

  // Twilio messages endpoint
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  // Basic auth header: base64(accountSid:authToken)
  const credentials = btoa(`${accountSid}:${authToken}`)

  const body = new URLSearchParams({
    To:   normalizePhone(phone),
    From: from,
    Body: message,
  })

  try {
    const res  = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body,
    })
    const json = await res.json()

    if (res.ok && json.sid) {
      return { success: true, messageId: json.sid, provider: 'twilio' }
    }
    return {
      success:  false,
      error:    json.message || `HTTP ${res.status}`,
      provider: 'twilio',
    }
  } catch (err) {
    return { success: false, error: String(err), provider: 'twilio' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 3: Infobip SMS REST API
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaInfobip(phone, message) {
  const apiKey  = import.meta.env.VITE_INFOBIP_API_KEY
  const baseUrl = import.meta.env.VITE_INFOBIP_BASE_URL
  const from    = import.meta.env.VITE_INFOBIP_FROM_NUMBER || 'MultiCare'

  if (!apiKey || !baseUrl) {
    return { success: false, error: 'Infobip credentials not configured', provider: 'infobip' }
  }

  const payload = {
    messages: [{
      from,
      destinations: [{ to: normalizePhone(phone) }],
      text: message,
    }],
  }

  try {
    const res  = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method:  'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    const msgId = json.messages?.[0]?.messageId

    if (res.ok && msgId) {
      return { success: true, messageId: msgId, provider: 'infobip' }
    }
    return {
      success:  false,
      error:    json.requestError?.serviceException?.text || `HTTP ${res.status}`,
      provider: 'infobip',
    }
  } catch (err) {
    return { success: false, error: String(err), provider: 'infobip' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: sendSMS  — tries providers in order, logs result
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send an SMS/WhatsApp message to a patient.
 *
 * @param {string} phone   - Raw phone number (Pakistani or international)
 * @param {string} message - Plain-text or WhatsApp-markdown message body
 * @returns {Promise<{ success: boolean, messageId?: string, provider: string, error?: string }>}
 */
export async function sendSMS(phone, message) {
  const normalized = normalizePhone(phone)

  if (!normalized || normalized.length < 8) {
    console.warn('[SMS] Invalid phone number:', phone)
    return { success: false, error: 'Invalid phone number', provider: 'none' }
  }

  // ── Try Edge Function first ───────────────────────────────────────────────
  const edgeResult = await sendViaEdgeFunction(normalized, message)
  if (edgeResult.success) {
    console.log(`[SMS] Sent via ${edgeResult.provider} to ${normalized}`)
    return edgeResult
  }
  console.warn(`[SMS] Edge function failed: ${edgeResult.error} — trying Twilio`)

  // ── Fallback: Twilio ──────────────────────────────────────────────────────
  const twilioResult = await sendViaTwilio(normalized, message)
  if (twilioResult.success) {
    console.log(`[SMS] Sent via ${twilioResult.provider} to ${normalized}`)
    return twilioResult
  }
  console.warn(`[SMS] Twilio failed: ${twilioResult.error} — trying Infobip`)

  // ── Fallback: Infobip ─────────────────────────────────────────────────────
  const infobipResult = await sendViaInfobip(normalized, message)
  if (infobipResult.success) {
    console.log(`[SMS] Sent via ${infobipResult.provider} to ${normalized}`)
    return infobipResult
  }

  console.error('[SMS] All providers failed:', { edgeResult, twilioResult, infobipResult })
  return {
    success:  false,
    error:    `All providers failed. Last error: ${infobipResult.error}`,
    provider: 'none',
  }
}
