import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { appointments, DOCTORS, BRANCHES, ALL_TIME_SLOTS } from '../data/store.js'

const router = Router()

// ── Validation middleware helper ──────────────────────────────────────────────
function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }
  next()
}

// ── POST /api/appointments — create a new booking ─────────────────────────────
router.post(
  '/',
  [
    body('branchId')
      .notEmpty().withMessage('Branch is required.')
      .custom(v => BRANCHES.some(b => b.id === v)).withMessage('Invalid branch.'),

    body('doctorId')
      .notEmpty().withMessage('Doctor is required.')
      .isInt().withMessage('Doctor ID must be an integer.')
      .custom(v => DOCTORS.some(d => d.id === parseInt(v))).withMessage('Invalid doctor.'),

    body('date')
      .notEmpty().withMessage('Date is required.')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD.')
      .custom(v => new Date(v) >= new Date(new Date().toDateString())).withMessage('Date cannot be in the past.'),

    body('time')
      .notEmpty().withMessage('Time slot is required.')
      .custom(v => ALL_TIME_SLOTS.includes(v)).withMessage('Invalid time slot.'),

    body('name').trim().notEmpty().withMessage('Patient name is required.'),

    body('phone')
      .trim().notEmpty().withMessage('Phone number is required.')
      .matches(/^[0-9+\s\-()]{7,15}$/).withMessage('Enter a valid phone number.'),

    body('email')
      .optional({ checkFalsy: true })
      .isEmail().withMessage('Enter a valid email address.')
      .normalizeEmail(),

    body('reason').trim().notEmpty().withMessage('Reason for visit is required.'),
  ],
  handleValidation,
  (req, res) => {
    const { branchId, doctorId, date, time, name, phone, email, reason } = req.body

    // Check for double-booking
    const conflict = appointments.find(
      a => a.doctorId === parseInt(doctorId) && a.date === date && a.time === time && a.status !== 'cancelled'
    )
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'This time slot has already been booked. Please choose another.',
      })
    }

    const doctor = DOCTORS.find(d => d.id === parseInt(doctorId))
    const branch = BRANCHES.find(b => b.id === branchId)

    const appointment = {
      id:          uuidv4().slice(0, 8).toUpperCase(),
      branchId,
      branchName:  branch.name,
      doctorId:    parseInt(doctorId),
      doctorName:  doctor.name,
      specialty:   doctor.specialty,
      date,
      time,
      patientName: name,
      phone,
      email:       email || null,
      reason,
      status:      'confirmed',
      createdAt:   new Date().toISOString(),
    }

    appointments.push(appointment)

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      id:      appointment.id,
      data:    appointment,
    })
  }
)

// ── GET /api/appointments — list all (admin/debug) ────────────────────────────
router.get('/', (req, res) => {
  res.json({ success: true, count: appointments.length, data: appointments })
})

// ── GET /api/appointments/:id — get single appointment ────────────────────────
router.get(
  '/:id',
  [param('id').notEmpty()],
  handleValidation,
  (req, res) => {
    const appt = appointments.find(a => a.id === req.params.id.toUpperCase())
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' })
    res.json({ success: true, data: appt })
  }
)

// ── PATCH /api/appointments/:id/cancel ────────────────────────────────────────
router.patch(
  '/:id/cancel',
  [param('id').notEmpty()],
  handleValidation,
  (req, res) => {
    const appt = appointments.find(a => a.id === req.params.id.toUpperCase())
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' })
    if (appt.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment already cancelled.' })
    }
    appt.status = 'cancelled'
    appt.cancelledAt = new Date().toISOString()
    res.json({ success: true, message: 'Appointment cancelled.', data: appt })
  }
)

export default router
