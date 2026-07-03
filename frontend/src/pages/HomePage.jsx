import { Link } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import {
  Calendar, ChevronRight, Shield, Clock, Award, Users,
  MapPin, Stethoscope, Star, ArrowRight, CheckCircle,
} from 'lucide-react'
import { METRICS, SPECIALIZATIONS, DOCTORS, BRANCHES } from '../data/clinicData'

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, suffix }) {
  return (
    <div className="glass-card rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
      <p className="text-3xl md:text-4xl font-extrabold text-[#1E3A8A] leading-none">
        {value}<span className="text-[#3B82F6]">{suffix}</span>
      </p>
      <p className="text-sm text-slate-500 mt-2 font-medium">{label}</p>
    </div>
  )
}

// ─── Specialization Card ──────────────────────────────────────────────────────
function SpecCard({ icon, label, color }) {
  return (
    <Link to="/doctors" className="group card p-6 flex flex-col items-center text-center gap-3 hover:scale-105 transition-all duration-300 cursor-pointer">
      <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:shadow-lg transition-shadow`}>
        {icon}
      </div>
      <p className="font-semibold text-slate-700 group-hover:text-[#1E3A8A] transition-colors">{label}</p>
      <span className="text-xs text-[#3B82F6] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        View doctors <ArrowRight size={11} />
      </span>
    </Link>
  )
}

// ─── Doctor feature card ──────────────────────────────────────────────────────
function FeaturedDoctorCard({ doctor }) {
  return (
    <div className="card p-6 flex items-start gap-4 hover:scale-[1.02] transition-transform duration-300">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
        {doctor.initials}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 truncate">{doctor.name}</h3>
        <p className="text-xs text-[#3B82F6] font-medium">{doctor.specialtyLabel}</p>
        <p className="text-xs text-slate-400 mt-0.5">{doctor.branchName} Branch</p>
        <div className="flex items-center gap-1 mt-2">
          <Star size={11} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-slate-700">{doctor.rating}</span>
          <span className="text-xs text-slate-400">({doctor.reviews} reviews)</span>
        </div>
      </div>
    </div>
  )
}

// ─── Why choose us feature ────────────────────────────────────────────────────
const WHY_US = [
  { icon: Shield,      title: 'Verified Specialists', desc: 'All doctors are PMDC-registered and fully credentialed.' },
  { icon: Clock,       title: 'Flexible Scheduling',   desc: 'Book online 24/7 and choose from multiple time slots.' },
  { icon: Award,       title: 'Award-Winning Care',    desc: 'Recognized for excellence in patient care since 2012.' },
  { icon: Stethoscope, title: 'Multi-Speciality',      desc: 'One platform for 6 medical specializations across 3 branches.' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const featuredDoctors = DOCTORS.slice(0, 4)

  return (
    <div className="overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A]/8 via-transparent to-[#3B82F6]/5 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left – copy */}
            <div className="space-y-7 animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-[#1E3A8A]/10 text-[#1E3A8A] text-xs font-semibold px-4 py-2 rounded-full border border-[#1E3A8A]/20">
                <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-pulse" />
                Karachi's Trusted Multi-Branch Medical Network
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1E3A8A] leading-[1.1]">
                Your Health,
                <span className="block text-[#3B82F6]">Our Priority</span>
              </h1>

              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Book appointments with verified specialists across our 3 conveniently located branches.
                Expert care in Dental, Dermatology, Physiotherapy, Cardiology, and more — all in one place.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/book" className="btn-primary flex items-center gap-2 text-base">
                  <Calendar size={18} />
                  Book Appointment
                </Link>
                <Link to="/doctors" className="btn-outline flex items-center gap-2 text-base">
                  Meet Our Doctors <ChevronRight size={18} />
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-5 pt-2">
                {['PMDC Registered', '24/7 Support', 'ISO Certified', 'Cashless Payments'].map(badge => (
                  <span key={badge} className="flex items-center gap-1.5 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-[#3B82F6]" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Right – floating info card */}
            <div className="relative hidden lg:block animate-fade-in">
              <div className="absolute -top-8 -left-8 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-[#1E3A8A]/10 rounded-full blur-3xl" />

              <div className="relative glass-card rounded-3xl p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[#1E3A8A]">Quick Book</p>
                    <p className="text-xs text-slate-400">Available today</p>
                  </div>
                </div>

                {/* Branch pills */}
                {BRANCHES.map(b => (
                  <Link
                    key={b.id}
                    to="/book"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-[#1E3A8A]/5 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-[#3B82F6]" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{b.name}</p>
                        <p className="text-[11px] text-slate-400">{b.tag}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#3B82F6] transition-colors" />
                  </Link>
                ))}

                <Link to="/book" className="btn-secondary w-full text-center block text-sm">
                  Select a Branch & Book →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {METRICS.map(m => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </section>

      {/* ── Specializations ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="section-title">Our Specializations</h2>
          <p className="section-subtitle mx-auto">
            Comprehensive medical care delivered by certified specialists across 6 disciplines.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {SPECIALIZATIONS.map(s => (
            <SpecCard key={s.id} {...s} />
          ))}
        </div>
      </section>

      {/* ── Why MultiCare ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1E3A8A] to-[#1d4ed8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Why Choose MultiCare?</h2>
            <p className="text-blue-200 mt-3 text-lg">Built around what matters most — your wellbeing.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_US.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors duration-300">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-blue-200 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Doctors ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title">Featured Doctors</h2>
            <p className="text-slate-500 mt-2">Meet some of our top-rated specialists.</p>
          </div>
          <Link to="/doctors" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#3B82F6] hover:text-[#1E3A8A] transition-colors">
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredDoctors.map(d => (
            <FeaturedDoctorCard key={d.id} doctor={d} />
          ))}
        </div>
        <div className="text-center mt-6">
          <Link to="/doctors" className="btn-outline inline-flex items-center gap-2">
            <Users size={16} /> See All Doctors
          </Link>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-[#3B82F6] to-[#1E3A8A] rounded-3xl p-10 md:p-14 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Book Your Appointment?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Select your branch, pick your specialist, choose a time — done in under 2 minutes.
            </p>
            <Link to="/book" className="inline-flex items-center gap-2 bg-white text-[#1E3A8A] font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              <Calendar size={20} /> Book an Appointment Now
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
