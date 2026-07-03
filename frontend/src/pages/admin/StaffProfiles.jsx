/**
 * StaffProfiles.jsx
 * ------------------
 * Displays all staff members from the `profiles` table.
 * Shows name, role badge, and join date.
 * Admins can see all roles; receptionists see only their own.
 */

import { useState, useEffect } from 'react'
import { User, Shield, Clock, Users, AlertCircle } from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO } from 'date-fns'

const ROLE_STYLES = {
  admin:         'bg-purple-100 text-purple-700 border border-purple-200',
  receptionist:  'bg-blue-100   text-blue-700   border border-blue-200',
  doctor:        'bg-teal-100   text-teal-700   border border-teal-200',
}
const ROLE_ICONS = {
  admin:        Shield,
  receptionist: Clock,
  doctor:       User,
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  )
}

export default function StaffProfiles() {
  const { user, profile: currentProfile } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })

      if (err) {
        setError('Could not load staff profiles. Check RLS policies.')
      } else {
        setProfiles(data || [])
      }
      setLoading(false)
    }
    fetchProfiles()
  }, [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
          <Users size={17} /> Staff Profiles
        </h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          New accounts created via Supabase Auth Dashboard
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
        ) : profiles.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
            No staff profiles found.
          </div>
        ) : (
          profiles.map(p => {
            const Icon    = ROLE_ICONS[p.role] || User
            const isMe    = p.id === user?.id
            const initial = (p.full_name || p.role)[0]?.toUpperCase()

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                  isMe ? 'border-[#1E3A8A]/30 ring-2 ring-[#1E3A8A]/10' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full rounded-xl object-cover" />
                      : initial
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 truncate">{p.full_name || 'Unnamed'}</p>
                      {isMe && <span className="text-[10px] font-bold text-[#3B82F6] bg-blue-50 px-1.5 py-0.5 rounded-full">You</span>}
                    </div>

                    {/* Role badge */}
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${ROLE_STYLES[p.role] || 'bg-slate-100 text-slate-500'}`}>
                        <Icon size={10} /> {p.role}
                      </span>
                    </div>

                    {/* Joined */}
                    <p className="text-[11px] text-slate-400 mt-2">
                      Joined {p.created_at ? format(parseISO(p.created_at), 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">Adding Staff</p>
        <p>Go to <strong>Supabase Dashboard → Authentication → Users → Invite User</strong>.</p>
        <p className="mt-1">Set the <code>role</code> via the SQL editor or in the profiles table after their first login.</p>
      </div>
    </div>
  )
}
