/**
 * notifications.js
 * ─────────────────
 * High-level notification functions used throughout the app.
 *
 * All messages are routed through smsGateway.js which tries:
 *   1. Supabase Edge Function (UltraMsg/WhatsApp)
 *   2. Twilio SMS (fallback)
 *   3. Infobip SMS (second fallback)
 *
 * Message templates follow the spec:
 *   - Appointment confirmed:
 *       "Dear [Name], your appointment with Doctor [Name] is confirmed
 *        for [Date] at [Time]."
 *   - Lab results ready:
 *       "Dear [Name], your lab results for [Test] are ready.
 *        Please visit MultiCare Clinic to collect them."
 *
 * Each function also writes a row to the `sms_log` table so the admin
 * terminal in LabOrders.jsx shows a live feed of all dispatched messages.
 */

import supabase       from '../lib/supabaseClient'
import { sendSMS }    from './smsGateway'
import { displayDate, displayTime } from './dateTime'

// ── 1. Booking Confirmed ──────────────────────────────────────────────────────
/**
 * Sends an SMS/WhatsApp to the patient when their appointment is confirmed.
 *
 * @param {object} appointment  - Row from the `appointments` table
 *   Required fields: patient_name, patient_phone, appointment_date, appointment_time
 * @param {string} doctorName   - Full name of the doctor (e.g. "Dr. Sara Ahmed")
 * @returns {Promise<{ success: boolean, provider: string, error?: string }>}
 */
export async function sendBookingConfirmed(appointment, doctorName) {
  const name   = appointment.patient_name   || 'Patient'
  const phone  = appointment.patient_phone  || ''
  const date   = displayDate(appointment.appointment_date)
  const time   = displayTime(appointment.appointment_time)
  const doctor = doctorName || 'your doctor'

  // Structured message per spec
  const message =
    `✅ *Appointment Confirmed — MultiCare Clinic*\n\n` +
    `Dear ${name},\n\n` +
    `Your appointment with *${doctor}* has been confirmed.\n\n` +
    `📅 Date: *${date}*\n` +
    `🕐 Time: *${time}*\n\n` +
    `Please arrive 10 minutes early.\n` +
    `For queries: *+92-21-111-222-333*`

  const result = await sendSMS(phone, message)

  // Log to sms_log table (non-blocking)
  supabase.from('sms_log').insert([{
    recipient:      phone,
    message,
    status:         result.success ? 'delivered' : 'failed',
    provider:       result.provider,
    appointment_id: appointment.id || null,
  }]).catch(() => {})

  return result
}

// ── 2. Lab Results Ready ──────────────────────────────────────────────────────
/**
 * Sends an SMS/WhatsApp to the patient when lab results are ready.
 *
 * @param {object} labOrder  - Row from the `lab_orders` table
 *   Required fields: patient_name, patient_phone, id
 * @param {string} testName  - Human-readable test name (e.g. "Complete Blood Count")
 * @returns {Promise<{ success: boolean, provider: string, error?: string }>}
 */
export async function sendLabResultsReady(labOrder, testName) {
  const name  = labOrder.patient_name  || 'Patient'
  const phone = labOrder.patient_phone || ''
  const test  = testName || 'lab test'

  // Structured message per spec
  const message =
    `🔬 *Lab Results Ready — MultiCare Clinic*\n\n` +
    `Dear ${name},\n\n` +
    `Your lab results for *${test}* are ready.\n\n` +
    `Please visit *MultiCare Clinic* to collect your report.\n\n` +
    `For queries: *+92-21-111-222-333*\n` +
    `_MultiCare Clinic Management System_`

  const result = await sendSMS(phone, message)

  // Update the sms_log row that the DB trigger may have inserted
  if (labOrder.id) {
    supabase.from('sms_log')
      .update({
        status:   result.success ? 'delivered' : 'failed',
        provider: result.provider,
      })
      .eq('lab_order_id', labOrder.id)
      .catch(() => {})
  }

  return result
}
