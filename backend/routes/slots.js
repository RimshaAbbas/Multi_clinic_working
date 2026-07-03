import { Router } from 'express'
import { query, validationResult } from 'express-validator'
import { appointments, DOCTORS, ALL_TIME_SLOTS } from '../data/store.js'

const router = Router()

/**
 * GET /api/slots?doctorId=1&date=2025-07-10
 *
 * Returns the available (not-yet-booked) time slots for a given doctor + date.
 */
router.get(
  '/',
  [
    query('doctorId').notEmpty().isInt().withMessage('doctorId must be an integer.'),
    query('date').notEmpty().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD.'),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const doctorId = parseInt(req.query.doctorId)
    const date     = req.query.date

    // Validate doctor exists
    const doctor = DOCTORS.find(d => d.id === doctorId)
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' })
    }

    // Validate date is not in the past
    if (new Date(date) < new Date(new Date().toDateString())) {
      return res.status(400).json({ success: false, message: 'Date cannot be in the past.', available: [] })
    }

    // Find booked slots for this doctor on this date
    const bookedSlots = appointments
      .filter(a => a.doctorId === doctorId && a.date === date && a.status !== 'cancelled')
      .map(a => a.time)

    const available = ALL_TIME_SLOTS.filter(slot => !bookedSlots.includes(slot))

    return res.json({
      success:   true,
      doctorId,
      date,
      all:       ALL_TIME_SLOTS,
      booked:    bookedSlots,
      available,
    })
  }
)

export default router
