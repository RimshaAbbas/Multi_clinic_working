import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

const QUICK_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/doctors', label: 'Our Doctors' },
  { to: '/book',    label: 'Book Appointment' },
  { to: '/contact', label: 'Contact Us' },
]

const SERVICES = [
  'Dental Care', 'Dermatology', 'Physiotherapy',
  'Cardiology', 'Ophthalmology', 'General Medicine',
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#1E3A8A] text-white mt-20">
      {/* Main footer body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold leading-none block">MultiCare</span>
              <span className="text-[10px] text-blue-200 tracking-widest uppercase leading-none">Clinics</span>
            </div>
          </div>
          <p className="text-sm text-blue-200 leading-relaxed mb-5">
            Delivering trusted, compassionate medical care across 3 conveniently located branches in Karachi.
          </p>
          {/* Social icons */}
          <div className="flex gap-3">
            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-8 h-8 bg-white/10 hover:bg-[#3B82F6] rounded-lg flex items-center justify-center transition-colors duration-200"
                aria-label="social"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-blue-200 mb-4">Quick Links</h3>
          <ul className="space-y-2.5">
            {QUICK_LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="text-sm text-blue-100 hover:text-white hover:translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-[#3B82F6] flex-shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-blue-200 mb-4">Specializations</h3>
          <ul className="space-y-2.5">
            {SERVICES.map(s => (
              <li key={s} className="text-sm text-blue-100 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#3B82F6] flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-blue-200 mb-4">Contact Us</h3>
          <ul className="space-y-3.5 text-sm text-blue-100">
            <li className="flex gap-2.5">
              <MapPin size={15} className="mt-0.5 flex-shrink-0 text-[#60A5FA]" />
              <span>12 Medical Boulevard, City Centre, Karachi 74200</span>
            </li>
            <li className="flex gap-2.5">
              <Phone size={15} className="flex-shrink-0 text-[#60A5FA]" />
              <span>+92 21 111 222 333</span>
            </li>
            <li className="flex gap-2.5">
              <Mail size={15} className="flex-shrink-0 text-[#60A5FA]" />
              <span>info@multicare.pk</span>
            </li>
            <li className="flex gap-2.5">
              <Clock size={15} className="flex-shrink-0 text-[#60A5FA]" />
              <span>Mon–Sat: 9:00 AM – 8:00 PM</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-blue-300">
          <span>© {year} MultiCare Clinics. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
