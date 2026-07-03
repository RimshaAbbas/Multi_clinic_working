import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Calendar, MapPin, Award, Filter, X } from 'lucide-react'
import { DOCTORS, BRANCHES, SPECIALIZATIONS } from '../data/clinicData'

// ─── Doctor Profile Card ──────────────────────────────────────────────────────
function DoctorCard({ doctor }) {
  const specColor = SPECIALIZATIONS.find(s => s.id === doctor.specialty)?.color || 'from-blue-500 to-blue-600'

  return (
    <div className="card p-6 flex flex-col gap-4 hover:scale-[1.02] transition-all duration-300 group">

      {/* Avatar + name */}
      <div className="flex items-start gap-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${specColor} flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md`}>
          {doctor.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-base leading-tight">{doctor.name}</h3>
          <p className="text-[#3B82F6] text-sm font-medium mt-0.5">{doctor.specialtyLabel}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">{doctor.branchName} Branch</span>
          </div>
        </div>
        {/* Rating badge */}
        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          {doctor.rating}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span className="flex items-center gap-1.5">
            <Award size={13} className="text-[#3B82F6]" />
            {doctor.qualification}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span className="text-xs">{doctor.experience} experience</span>
          <span className="text-xs text-slate-400">{doctor.reviews} reviews</span>
        </div>
      </div>

      {/* Bio */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{doctor.bio}</p>

      {/* Availability chip */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
        <span className="text-xs text-slate-500">Available: <span className="font-medium text-slate-700">{doctor.availability}</span></span>
      </div>

      {/* Action */}
      <Link
        to={`/book?doctor=${doctor.id}&branch=${doctor.branch}`}
        className="btn-primary text-sm text-center flex items-center justify-center gap-2 mt-auto"
      >
        <Calendar size={14} /> Book with {doctor.name.split(' ')[1]}
      </Link>
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
        active
          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md'
          : 'bg-white text-slate-600 border-slate-200 hover:border-[#3B82F6] hover:text-[#3B82F6]'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const [search,   setSearch]   = useState('')
  const [branch,   setBranch]   = useState('all')
  const [specialty, setSpecialty] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return DOCTORS.filter(d => {
      const matchBranch    = branch    === 'all' || d.branch  === branch
      const matchSpecialty = specialty === 'all' || d.specialty === specialty
      const matchSearch    = search.trim() === '' ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialtyLabel.toLowerCase().includes(search.toLowerCase())
      return matchBranch && matchSpecialty && matchSearch
    })
  }, [branch, specialty, search])

  const clearFilters = () => {
    setSearch('')
    setBranch('all')
    setSpecialty('all')
  }

  const hasActiveFilters = search || branch !== 'all' || specialty !== 'all'

  return (
    <div className="min-h-screen">

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1E3A8A] to-[#1d4ed8] py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/3" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Our Medical Team</h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto mb-8">
            Meet our verified, experienced specialists across all branches and disciplines.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or specialty…"
              className="input-field pl-10 pr-10 shadow-lg"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 sticky top-[88px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

          {/* Mobile filter toggle */}
          <div className="flex items-center justify-between md:hidden mb-3">
            <button
              onClick={() => setShowFilters(o => !o)}
              className="flex items-center gap-2 text-sm font-medium text-[#1E3A8A]"
            >
              <Filter size={15} /> Filters {hasActiveFilters && <span className="w-2 h-2 bg-[#3B82F6] rounded-full" />}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 flex items-center gap-1">
                <X size={12} /> Clear all
              </button>
            )}
          </div>

          <div className={`space-y-3 md:space-y-0 md:flex md:items-center md:gap-6 ${showFilters ? 'block' : 'hidden md:flex'}`}>

            {/* Branch filter */}
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 md:hidden">Branch</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="All Branches" active={branch === 'all'} onClick={() => setBranch('all')} />
                {BRANCHES.map(b => (
                  <Chip key={b.id} label={b.name.replace('MultiCare ', '')} active={branch === b.id} onClick={() => setBranch(b.id)} />
                ))}
              </div>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-200" />

            {/* Specialty filter */}
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 md:hidden">Specialty</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="All Specialties" active={specialty === 'all'} onClick={() => setSpecialty('all')} />
                {SPECIALIZATIONS.map(s => (
                  <Chip key={s.id} label={s.label} active={specialty === s.id} onClick={() => setSpecialty(s.id)} />
                ))}
              </div>
            </div>

            {/* Clear button — desktop */}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="hidden md:flex ml-auto items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-500 text-sm">
            Showing <span className="font-semibold text-[#1E3A8A]">{filtered.length}</span> doctor{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(d => <DoctorCard key={d.id} doctor={d} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No doctors found</h3>
            <p className="text-slate-400 mb-4">Try adjusting your filters or search term.</p>
            <button onClick={clearFilters} className="btn-outline text-sm">Clear Filters</button>
          </div>
        )}
      </section>

    </div>
  )
}
