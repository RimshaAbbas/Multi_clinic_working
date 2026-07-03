/**
 * LabConfigurations.jsx
 * ----------------------
 * Manage the clinic's lab test catalogue.
 * Staff can add new tests and toggle availability.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, FlaskConical, CheckCircle, XCircle,
  Loader2, AlertCircle, X, Save,
} from 'lucide-react'
import supabase from '../../lib/supabaseClient'

const LAB_CATEGORIES = [
  'Hematology', 'Biochemistry', 'Microbiology', 'Endocrinology',
  'Immunology', 'Cardiology', 'Radiology', 'Pathology', 'Urology',
]

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

// ── Add Lab modal ─────────────────────────────────────────────────────────────
function AddLabModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', test_type: '', description: '', price: '', turnaround: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    if (!form.name.trim() || !form.test_type) {
      setError('Test name and category are required.')
      return
    }
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('labs').insert([{
      name:        form.name.trim(),
      test_type:   form.test_type,
      description: form.description.trim() || null,
      price:       form.price ? parseFloat(form.price) : 0,
      turnaround:  form.turnaround.trim() || '24 hours',
      is_active:   true,
    }])

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-[#1E3A8A]">Add Lab Test</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Test Name *</label>
              <input className="input-field" placeholder="e.g. Complete Blood Count" value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input-field" value={form.test_type}
                onChange={e => setForm(f => ({...f, test_type: e.target.value}))}>
                <option value="">— Select —</option>
                {LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price (Rs.)</label>
              <input className="input-field" type="number" min="0" placeholder="800" value={form.price}
                onChange={e => setForm(f => ({...f, price: e.target.value}))} />
            </div>
            <div>
              <label className="label">Turnaround Time</label>
              <input className="input-field" placeholder="e.g. 4 hours" value={form.turnaround}
                onChange={e => setForm(f => ({...f, turnaround: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={2} className="input-field resize-none" placeholder="Brief description of the test…"
              value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline text-sm px-5 py-2.5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Test
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LabConfigurations() {
  const [labs,       setLabs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const fetchLabs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('labs').select('*').order('name')
    setLabs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLabs() }, [fetchLabs])

  async function toggleActive(lab) {
    setTogglingId(lab.id)
    await supabase.from('labs').update({ is_active: !lab.is_active }).eq('id', lab.id)
    await fetchLabs()
    setTogglingId(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
          <FlaskConical size={17} /> Lab Test Catalogue
        </h2>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-2 py-2.5 px-4">
          <Plus size={15} /> Add Lab Test
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Test Name', 'Category', 'Price', 'Turnaround', 'Description', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(4)].map((_, i) => <SkeletonRow key={i} />) : (
                labs.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No lab tests configured yet.</td></tr>
                ) : (
                  labs.map(lab => (
                    <tr key={lab.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FlaskConical size={13} className="text-indigo-600" />
                          </div>
                          <p className="font-semibold text-slate-800">{lab.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-indigo-600 font-medium">{lab.test_type}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">
                        {lab.price > 0 ? `Rs. ${lab.price}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{lab.turnaround}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate"
                        title={lab.description}>{lab.description || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(lab)}
                          disabled={togglingId === lab.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            lab.is_active
                              ? 'bg-green-50 text-green-600 border-green-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                              : 'bg-red-50 text-red-500 border-red-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                          }`}
                        >
                          {togglingId === lab.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : lab.is_active
                              ? <><CheckCircle size={11} />Active</>
                              : <><XCircle size={11} />Inactive</>
                          }
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AddLabModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchLabs() }} />}
    </div>
  )
}
