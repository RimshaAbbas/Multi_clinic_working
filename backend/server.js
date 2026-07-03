/**
 * MultiCare Clinics — Express API Server
 *
 * Endpoints:
 *   GET    /api/health                    — Health check
 *   GET    /api/slots?doctorId&date       — Available time slots
 *   POST   /api/appointments             — Create appointment
 *   GET    /api/appointments             — List all appointments
 *   GET    /api/appointments/:id         — Get single appointment
 *   PATCH  /api/appointments/:id/cancel  — Cancel appointment
 *   POST   /api/inquiries               — Submit inquiry
 *   GET    /api/inquiries               — List all inquiries
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import appointmentsRouter from './routes/appointments.js'
import slotsRouter        from './routes/slots.js'
import inquiriesRouter    from './routes/inquiries.js'

const app  = express()
const PORT = process.env.PORT || 5000

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet())

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})
app.use('/api', limiter)

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false }))

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

app.use('/api/appointments', appointmentsRouter)
app.use('/api/slots',        slotsRouter)
app.use('/api/inquiries',    inquiriesRouter)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` })
})

// ── Global error handler ──────────────────────────────────────────────────────
// Express 5: error handlers still use 4 arguments; next must be declared even if unused
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.stack)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message,
  })
})

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥  MultiCare API running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health\n`)
})

export default app
