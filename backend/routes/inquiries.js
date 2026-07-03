import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { inquiries } from '../data/store.js'

const router = Router()

/**
 * POST /api/inquiries
 * Accepts general contact form submissions.
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').trim().notEmpty().isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('phone').optional({ checkFalsy: true }),
    body('subject').trim().notEmpty().withMessage('Subject is required.'),
    body('message').trim().notEmpty().isLength({ min: 10 }).withMessage('Message must be at least 10 characters.'),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { name, email, phone, subject, message } = req.body

    const inquiry = {
      id:          uuidv4().slice(0, 8).toUpperCase(),
      name,
      email,
      phone:       phone || null,
      subject,
      message,
      status:      'open',
      createdAt:   new Date().toISOString(),
    }

    inquiries.push(inquiry)

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been received. We will respond within 24 hours.',
      id:      inquiry.id,
    })
  }
)

// GET /api/inquiries (admin use)
router.get('/', (req, res) => {
  res.json({ success: true, count: inquiries.length, data: inquiries })
})

export default router
