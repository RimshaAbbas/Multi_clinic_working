/**
 * api.js — Axios instance and typed API helpers
 * All requests go to /api (proxied to http://localhost:5000 by Vite in dev).
 */

import axios from 'axios'

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — normalise errors
api.interceptors.response.use(
  res => res,
  err => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.msg ||
      err.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(message))
  }
)

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch available time slots for a doctor on a specific date.
 * @param {number} doctorId
 * @param {string} date  YYYY-MM-DD
 * @returns {Promise<string[]>} available slot strings
 */
export async function fetchAvailableSlots(doctorId, date) {
  const res = await api.get('/slots', { params: { doctorId, date } })
  return res.data.available || []
}

/**
 * Submit a new appointment booking.
 * @param {object} payload
 * @returns {Promise<{id: string, data: object}>}
 */
export async function createAppointment(payload) {
  const res = await api.post('/appointments', payload)
  return res.data
}

/**
 * Get a single appointment by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getAppointment(id) {
  const res = await api.get(`/appointments/${id}`)
  return res.data.data
}

/**
 * Cancel an appointment.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function cancelAppointment(id) {
  const res = await api.patch(`/appointments/${id}/cancel`)
  return res.data
}

/**
 * Submit a general inquiry.
 * @param {object} payload  { name, email, phone?, subject, message }
 * @returns {Promise<{id: string}>}
 */
export async function submitInquiry(payload) {
  const res = await api.post('/inquiries', payload)
  return res.data
}

export default api
