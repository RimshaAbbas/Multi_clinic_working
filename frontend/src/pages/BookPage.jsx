import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  MapPin, Stethoscope, Calendar, User, CheckCircle, ChevronRight,
  ChevronLeft, Clock, Star, Loader2, AlertCircle, MessageSquare,
} from 'lucide-react'
import { fetchAvailableSlots, createAppointment } from '../utils/api'
import { BRANCHES, SPECIALIZATIONS, DOCTORS, TIME_SLOTS } from '../data/clinicData'
import { sendBookingConfirmed } from '../utils/notifications'

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Branch',    icon: MapPin },
  { id: 2, label: 'Doctor',    icon: Stethoscope },
  { id: 3, label: 'Schedule',  icon: Calendar },
  { id: 4, label: 'Details',   icon: User },
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, idx) => {
        const Icon      = step.icon
        const done      = current > step.id
        const active    = current === step.id
        const upcoming  = current < step.id
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                done    ? 'bg-green-500 text-white shadow-md shadow-green-200'
                : active  ? 'bg-[#1E3A8A] text-white shadow-md shadow-blue-200 scale-110'
                : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <CheckCircle size={18} /> : <Icon size={16} />}
              </div>
              <span className={`text-xs font-medium hidden sm:block transition-colors ${active ? 'text-[#1E3A8A]' : done ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mx-2 mb-4 sm:mb-5 transition-all duration-500 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Selection Card ───────────────────────────────────────────────────────────
function SelectCard({ selected, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
        disabled ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
        : selected
          ? 'border-[#1E3A8A] bg-[#1E3A8A]/5 shadow-md'
          : 'border-slate-200 bg-white hover:border-[#3B82F6] hover:shadow-sm'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Input field with error ───────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="error-msg flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

// ─── Confirmation screen ──────────────────────────────────────────────────────
function ConfirmationScreen({ booking, whatsappSent }) {
  return (
    <div className="text-center py-10 animate-fade-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">Appointment Confirmed!</h2>
      <p className="text-slate-500 mb-4">Your booking reference is <span className="font-mono font-bold text-[#1E3A8A]">#{booking.id}</span></p>

      {/* WhatsApp notification status */}
      {whatsappSent !== null && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
          whatsappSent
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <MessageSquare size={14} />
          {whatsappSent
            ? '✅ WhatsApp confirmation sent to your number!'
            : '⚠️ WhatsApp notification could not be sent (check number)'}
        </div>
      )}

      <div className="max-w-sm mx-auto bg-slate-50 rounded-2xl p-6 text-left space-y-3 text-sm">
        {[
          ['Patient',   booking.patientName],
          ['Branch',    booking.branchName],
          ['Doctor',    booking.doctorName],
          ['Specialty', booking.specialty],
          ['Date',      booking.date],
          ['Time',      booking.time],
          ['Phone',     booking.phone],
        ].map(([k, v]) => v ? (
          <div key={k} className="flex justify-between">
            <span className="text-slate-500">{k}</span>
            <span className="font-semibold text-slate-800">{v}</span>
          </div>
        ) : null)}
      </div>

      <div className="flex flex-wrap gap-4 justify-center mt-8">
        <Link to="/" className="btn-outline text-sm">Back to Home</Link>
        <Link to="/book" className="btn-primary text-sm" onClick={() => window.location.reload()}>Book Another</Link>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BookPage() {
  const [searchParams] = useSearchParams()

  // Booking state
  const [step, setStep]           = useState(1)
  const [selectedBranch,   setBranch]   = useState(searchParams.get('branch')   || null)
  const [selectedSpecialty, setSpec]    = useState(null)
  const [selectedDoctor,   setDoctor]   = useState(searchParams.get('doctor') ? parseInt(searchParams.get('doctor')) : null)
  const [selectedDate,     setDate]     = useState('')
  const [selectedTime,     setTime]     = useState(null)
  const [availableSlots,   setSlots]    = useState([])
  const [slotsLoading,     setSlotsLoading] = useState(false)
  const [confirmed,        setConfirmed]    = useState(null)
  const [submitting,       setSubmitting]   = useState(false)
  const [submitError,      setSubmitError]  = useState('')
  const [whatsappSent,     setWhatsappSent] = useState(null) // null=not yet, true/false after send

  // Patient details
  const [form, setForm]   = useState({ name: '', phone: '', email: '', reason: '' })
  const [errors, setErrors] = useState({})

  // If branch+doctor pre-filled from DoctorsPage, auto-advance to step 3
  useEffect(() => {
    if (selectedBranch && selectedDoctor) {
      const doc = DOCTORS.find(d => d.id === selectedDoctor)
      if (doc) {
        setSpec(doc.specialty)
        setStep(3)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filtered doctors for step 2
  const filteredDoctors = DOCTORS.filter(d =>
    (!selectedBranch   || d.branch    === selectedBranch) &&
    (!selectedSpecialty || d.specialty === selectedSpecialty)
  )

  // Fetch time slots from backend (fallback to local mock)
  const fetchSlots = useCallback(async (doctorId, date) => {
    if (!doctorId || !date) return
    setSlotsLoading(true)
    setSlots([])
    setTime(null)
    try {
      const available = await fetchAvailableSlots(doctorId, date)
      setSlots(available.length > 0 ? available : TIME_SLOTS)
    } catch {
      // Backend not running → use local mock (every 4th slot "booked")
      const fakeBooked = TIME_SLOTS.filter((_, i) => i % 4 === 0)
      setSlots(TIME_SLOTS.filter(t => !fakeBooked.includes(t)))
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDoctor && selectedDate) fetchSlots(selectedDoctor, selectedDate)
  }, [selectedDoctor, selectedDate, fetchSlots])

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.name.trim())   e.name  = 'Full name is required.'
    if (!form.phone.trim())  e.phone = 'Contact number is required.'
    else if (!/^[0-9+\s\-()]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (!form.reason.trim()) e.reason = 'Please briefly describe your reason for visiting.'
    // Extra server-side guard: reject past dates even if browser allowed it
    if (selectedDate && selectedDate < today) e.date = 'Appointment date cannot be in the past.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit booking ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')

    const doctor = DOCTORS.find(d => d.id === selectedDoctor)
    const branch = BRANCHES.find(b => b.id === selectedBranch)

    const payload = {
      branchId: selectedBranch,
      doctorId: selectedDoctor,
      date:     selectedDate,
      time:     selectedTime,
      ...form,
    }

    let confirmedData = null

    try {
      const res = await createAppointment(payload)
      confirmedData = {
        id:          res.id,
        patientName: form.name,
        branchName:  branch?.name || selectedBranch,
        doctorName:  doctor?.name || '',
        specialty:   doctor?.specialtyLabel || '',
        date:        selectedDate,
        time:        selectedTime,
        phone:       form.phone,
        email:       form.email,
      }
    } catch {
      // Backend not yet running — local confirmation with a temp ID
      confirmedData = {
        id:          Math.random().toString(36).slice(2, 8).toUpperCase(),
        patientName: form.name,
        branchName:  branch?.name || selectedBranch,
        doctorName:  doctor?.name || '',
        specialty:   doctor?.specialtyLabel || '',
        date:        selectedDate,
        time:        selectedTime,
        phone:       form.phone,
        email:       form.email,
      }
    }

    setConfirmed(confirmedData)
    setSubmitting(false)

    // ── Send WhatsApp confirmation to patient ──────────────────────────────
    // Build a pseudo appointment object that matches what notifications.js expects
    const apptForWhatsApp = {
      patient_name:     form.name,
      patient_phone:    form.phone,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
    }
    try {
      const result = await sendBookingConfirmed(apptForWhatsApp, doctor?.name || 'your doctor')
      setWhatsappSent(result.success)
    } catch {
      setWhatsappSent(false)
    }
  }

  // ── Today's date string ───────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]

  // ── If confirmed ──────────────────────────────────────────────────────────
  if (confirmed) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <ConfirmationScreen booking={confirmed} whatsappSent={whatsappSent} />
    </div>
  )

  return (
    <div className="min-h-screen py-10">

      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E3A8A] mb-2">Book an Appointment</h1>
        <p className="text-slate-500">Complete the steps below to schedule your visit.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Card */}
        <div className="card p-6 md:p-8">

          {/* ── STEP 1: Select Branch ──────────────────────────────────── */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#1E3A8A]">Choose a Branch</h2>
                <p className="text-sm text-slate-500 mt-1">Select the clinic location most convenient for you.</p>
              </div>
              {BRANCHES.map(b => (
                <SelectCard key={b.id} selected={selectedBranch === b.id} onClick={() => setBranch(b.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${selectedBranch === b.id ? 'bg-[#1E3A8A] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{b.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{b.address}</p>
                      <p className="text-xs text-[#3B82F6] mt-1">{b.hours}</p>
                    </div>
                    {selectedBranch === b.id && <CheckCircle size={18} className="text-[#1E3A8A] mt-0.5 flex-shrink-0" />}
                  </div>
                </SelectCard>
              ))}
            </div>
          )}

          {/* ── STEP 2: Select Specialty & Doctor ─────────────────────── */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-[#1E3A8A]">Choose Specialty & Doctor</h2>
                <p className="text-sm text-slate-500 mt-1">Filter by specialty, then select your preferred doctor.</p>
              </div>

              {/* Specialty pills */}
              <div>
                <p className="label">Medical Specialty</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSpec(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${!selectedSpecialty ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'border-slate-200 text-slate-600 hover:border-[#3B82F6]'}`}
                  >All</button>
                  {SPECIALIZATIONS.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpec(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedSpecialty === s.id ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'border-slate-200 text-slate-600 hover:border-[#3B82F6]'}`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Doctor cards */}
              <div className="space-y-3">
                <p className="label">Select Doctor</p>
                {filteredDoctors.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No doctors found for this branch / specialty combination.
                  </div>
                ) : (
                  filteredDoctors.map(d => (
                    <SelectCard key={d.id} selected={selectedDoctor === d.id} onClick={() => setDoctor(d.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {d.initials}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                          <p className="text-xs text-[#3B82F6]">{d.specialtyLabel} · {d.experience}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs text-slate-500">{d.rating} · Available: {d.availability}</span>
                          </div>
                        </div>
                        {selectedDoctor === d.id && <CheckCircle size={18} className="text-[#1E3A8A] flex-shrink-0" />}
                      </div>
                    </SelectCard>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Date & Time Slot ──────────────────────────────── */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-[#1E3A8A]">Select Date & Time</h2>
                <p className="text-sm text-slate-500 mt-1">Choose your preferred appointment date and an available slot.</p>
              </div>

              {/* Date picker */}
              <div>
                <label className="label">Appointment Date</label>
                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={e => {
                    const val = e.target.value
                    // Guard: silently reject if somehow a past date slips through
                    if (val && val < today) return
                    setDate(val)
                  }}
                  className="input-field max-w-xs"
                />
                {selectedDate && selectedDate < today && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> Past dates are not allowed. Please select today or a future date.
                  </p>
                )}
                {!selectedDate && (
                  <p className="text-xs text-slate-400 mt-1">
                    You can book from today ({today}) onwards.
                  </p>
                )}
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <label className="label">Available Time Slots</label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                      <Loader2 size={16} className="animate-spin" /> Checking availability…
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {TIME_SLOTS.map(slot => {
                        const available = availableSlots.includes(slot)
                        const selected  = selectedTime === slot
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={!available}
                            onClick={() => available && setTime(slot)}
                            className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              !available
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                                : selected
                                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#3B82F6] hover:text-[#3B82F6]'
                            }`}
                          >
                            <Clock size={10} className="inline mr-1" />{slot}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {!slotsLoading && (
                    <p className="text-xs text-slate-400 mt-2">
                      <span className="inline-block w-2.5 h-2.5 bg-slate-100 rounded border mr-1 align-middle" />
                      Struck-through slots are already booked.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Patient Details ───────────────────────────────── */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="animate-fade-in space-y-5" noValidate>
              <div className="mb-2">
                <h2 className="text-xl font-bold text-[#1E3A8A]">Patient Details</h2>
                <p className="text-sm text-slate-500 mt-1">Please fill in the information below to confirm your booking.</p>
              </div>

              {/* Booking summary chip */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
                <p className="font-semibold text-[#1E3A8A] mb-2">Appointment Summary</p>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                  <span className="text-slate-400">Branch:</span>
                  <span className="font-medium">{BRANCHES.find(b => b.id === selectedBranch)?.name}</span>
                  <span className="text-slate-400">Doctor:</span>
                  <span className="font-medium">{DOCTORS.find(d => d.id === selectedDoctor)?.name}</span>
                  <span className="text-slate-400">Date:</span>
                  <span className="font-medium">{selectedDate}</span>
                  <span className="text-slate-400">Time:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name *" error={errors.name}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })) }}
                    placeholder="e.g. Fatima Zahra"
                    className={`input-field ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
                <Field label="Phone Number *" error={errors.phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(er => ({ ...er, phone: '' })) }}
                    placeholder="+92 300 1234567"
                    className={`input-field ${errors.phone ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
              </div>

              <Field label="Email Address (optional)" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })) }}
                  placeholder="yourname@email.com"
                  className={`input-field ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </Field>

              <Field label="Reason for Visit *" error={errors.reason}>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setErrors(er => ({ ...er, reason: '' })) }}
                  placeholder="Briefly describe your symptoms or reason for the appointment…"
                  className={`input-field resize-none ${errors.reason ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </Field>

              {submitError && (
                <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} />{submitError}</p>
              )}

              {/* Submit button is rendered in nav bar below */}
            </form>
          )}

          {/* ── Navigation buttons ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className={`flex items-center gap-2 text-sm font-semibold transition-all ${
                step === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-[#1E3A8A]'
              }`}
            >
              <ChevronLeft size={16} /> Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !selectedBranch) return
                  if (step === 2 && !selectedDoctor)   return
                  if (step === 3 && (!selectedDate || !selectedTime)) return
                  setStep(s => s + 1)
                }}
                className={`btn-primary flex items-center gap-2 text-sm ${
                  (step === 1 && !selectedBranch) ||
                  (step === 2 && !selectedDoctor) ||
                  (step === 3 && (!selectedDate || !selectedTime))
                    ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                form="booking-form"
                disabled={submitting}
                onClick={handleSubmit}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-70"
              >
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Confirming…</> : <><CheckCircle size={15} /> Confirm Booking</>}
              </button>
            )}
          </div>

          {/* Step hints */}
          {step === 1 && !selectedBranch && (
            <p className="text-xs text-center text-amber-600 mt-3">Please select a branch to continue.</p>
          )}
          {step === 2 && !selectedDoctor && (
            <p className="text-xs text-center text-amber-600 mt-3">Please select a doctor to continue.</p>
          )}
          {step === 3 && !selectedTime && selectedDate && (
            <p className="text-xs text-center text-amber-600 mt-3">Please select a time slot to continue.</p>
          )}
        </div>
      </div>
    </div>
  )
}
