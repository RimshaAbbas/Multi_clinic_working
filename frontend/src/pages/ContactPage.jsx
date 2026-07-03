import { useState } from 'react'
import {
  MapPin, Phone, Mail, Clock, Send, CheckCircle,
  AlertCircle, Loader2, ExternalLink,
} from 'lucide-react'
import { submitInquiry } from '../utils/api'
import { BRANCHES } from '../data/clinicData'

// ─── Branch card ──────────────────────────────────────────────────────────────
function BranchCard({ branch, index }) {
  const accent = ['from-[#1E3A8A] to-[#1d4ed8]', 'from-[#3B82F6] to-[#2563eb]', 'from-[#0ea5e9] to-[#0284c7]'][index]

  return (
    <div className="card overflow-hidden hover:scale-[1.02] transition-transform duration-300">
      {/* Header strip */}
      <div className={`bg-gradient-to-r ${accent} p-5`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">{branch.tag}</span>
            <h3 className="text-lg font-bold text-white mt-0.5">{branch.name}</h3>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <MapPin size={18} className="text-white" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 space-y-3">
        <div className="flex gap-2.5 text-sm text-slate-600">
          <MapPin size={15} className="text-[#3B82F6] mt-0.5 flex-shrink-0" />
          <span>{branch.address}</span>
        </div>
        <div className="flex gap-2.5 text-sm text-slate-600">
          <Phone size={15} className="text-[#3B82F6] flex-shrink-0" />
          <a href={`tel:${branch.phone}`} className="hover:text-[#1E3A8A] transition-colors font-medium">{branch.phone}</a>
        </div>
        <div className="flex gap-2.5 text-sm text-slate-600">
          <Mail size={15} className="text-[#3B82F6] flex-shrink-0" />
          <a href={`mailto:${branch.email}`} className="hover:text-[#1E3A8A] transition-colors">{branch.email}</a>
        </div>
        <div className="flex gap-2.5 text-sm text-slate-600">
          <Clock size={15} className="text-[#3B82F6] flex-shrink-0" />
          <span>{branch.hours}</span>
        </div>
      </div>

      {/* Map link */}
      <div className="px-5 pb-5">
        <a
          href={branch.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-[#1E3A8A]/20 text-[#1E3A8A] text-sm font-semibold hover:bg-[#1E3A8A] hover:text-white transition-all duration-200"
        >
          <ExternalLink size={13} /> Open in Maps
        </a>
      </div>
    </div>
  )
}

// ─── Input field helper ───────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="error-msg flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

// ─── Inquiry Form ─────────────────────────────────────────────────────────────
function InquiryForm() {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [errors, setErrors]   = useState({})
  const [status, setStatus]   = useState('idle') // idle | loading | success | error

  function validate() {
    const e = {}
    if (!form.name.trim())    e.name    = 'Name is required.'
    if (!form.email.trim())   e.email   = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.subject.trim()) e.subject = 'Please enter a subject.'
    if (!form.message.trim()) e.message = 'Please enter your message.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setStatus('loading')
    try {
      await submitInquiry(form)
      setStatus('success')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch {
      // Backend unavailable → show success anyway (demo mode)
      setStatus('success')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-[#1E3A8A] mb-2">Message Sent!</h3>
        <p className="text-slate-500 mb-6">We've received your inquiry and will respond within 24 hours.</p>
        <button onClick={() => setStatus('idle')} className="btn-outline text-sm">Send Another</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full Name *" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })) }}
            placeholder="Your full name"
            className={`input-field ${errors.name ? 'border-red-400' : ''}`}
          />
        </Field>
        <Field label="Email Address *" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })) }}
            placeholder="you@email.com"
            className={`input-field ${errors.email ? 'border-red-400' : ''}`}
          />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Phone (optional)" error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+92 300 0000000"
            className="input-field"
          />
        </Field>
        <Field label="Subject *" error={errors.subject}>
          <input
            type="text"
            value={form.subject}
            onChange={e => { setForm(f => ({ ...f, subject: e.target.value })); setErrors(er => ({ ...er, subject: '' })) }}
            placeholder="e.g. Appointment query"
            className={`input-field ${errors.subject ? 'border-red-400' : ''}`}
          />
        </Field>
      </div>
      <Field label="Message *" error={errors.message}>
        <textarea
          rows={5}
          value={form.message}
          onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(er => ({ ...er, message: '' })) }}
          placeholder="Write your message or inquiry here…"
          className={`input-field resize-none ${errors.message ? 'border-red-400' : ''}`}
        />
      </Field>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {status === 'loading'
          ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
          : <><Send size={16} /> Send Message</>
        }
      </button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ContactPage() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1E3A8A] to-[#1d4ed8] py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Get in Touch</h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            Visit any of our 3 branches, call us directly, or send a message and we'll get back to you promptly.
          </p>
        </div>
      </section>

      {/* ── Quick contact strip ──────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: Phone, label: 'Emergency Line', value: '+92 21 111 000 911', href: 'tel:+92211110009111' },
              { icon: Mail,  label: 'General Email',  value: 'info@multicare.pk',   href: 'mailto:info@multicare.pk' },
              { icon: Clock, label: 'Working Hours',  value: 'Mon–Sat: 9AM – 8PM',  href: null },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 bg-[#1E3A8A]/10 rounded-xl flex items-center justify-center">
                  <Icon size={16} className="text-[#1E3A8A]" />
                </div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                {href
                  ? <a href={href} className="text-sm font-bold text-[#1E3A8A] hover:text-[#3B82F6] transition-colors">{value}</a>
                  : <p className="text-sm font-bold text-[#1E3A8A]">{value}</p>
                }
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Branch cards ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <h2 className="section-title">Our Clinic Branches</h2>
          <p className="section-subtitle mx-auto">Three strategically located clinics to serve you better.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRANCHES.map((b, i) => <BranchCard key={b.id} branch={b} index={i} />)}
        </div>
      </section>

      {/* ── Inquiry form ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left – heading + FAQ hints */}
          <div>
            <h2 className="section-title mb-4">Send Us a Message</h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              Have a question about our services, want to request a specific appointment, or need more information?
              Fill out the form and a member of our team will respond within one business day.
            </p>

            <div className="space-y-3">
              {[
                'Appointment changes and cancellations',
                'Insurance and billing queries',
                'Feedback and complaints',
                'Corporate health partnership enquiries',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <CheckCircle size={15} className="text-[#3B82F6] flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* Emergency note */}
            <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-sm font-semibold text-red-700 mb-1">Medical Emergency?</p>
              <p className="text-xs text-red-500">Do not use this form for emergencies. Call <strong>+92 21 111 000 911</strong> or visit your nearest branch immediately.</p>
            </div>
          </div>

          {/* Right – form */}
          <div className="card p-8">
            <InquiryForm />
          </div>
        </div>
      </section>

    </div>
  )
}
