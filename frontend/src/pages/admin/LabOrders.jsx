/**
 * LabOrders.jsx
 * ──────────────
 * Lab Technician view inside the Admin Dashboard.
 *
 * § 1  Typography  — semantic section headers per spec
 * § 2  Stat cards  — 4 cards reactive to live orders array
 * § 3  Filter bar  — patient/test search + status pipeline filter + reset
 * § 4  Table       — pipeline advance actions, realtime sync
 * § 5  SMS log     — notification terminal
 */

import { useState, useEffect, useCallback } from 'react'
import {
  FlaskConical, CheckCircle, Clock, Loader2, AlertCircle,
  RefreshCw, Search, MessageSquare, ChevronRight, Beaker,
  X, Filter, ClipboardList, TestTube, Microscope,
} from 'lucide-react'
import supabase               from '../../lib/supabaseClient'
import { sendLabResultsReady } from '../../utils/notifications'
import { displayDate }         from '../../utils/dateTime'

// ─────────────────────────────────────────────────────────────────────────────
// § PIPELINE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PIPELINE = [
  { key: 'prescribed',       label: 'Prescribed',       color: 'blue'   },
  { key: 'sample_collected', label: 'Sample Collected',  color: 'amber'  },
  { key: 'processing',       label: 'Processing',        color: 'purple' },
  { key: 'results_ready',    label: 'Results Ready',     color: 'green'  },
]

const NEXT_STATUS = {
  prescribed:       'sample_collected',
  sample_collected: 'processing',
  processing:       'results_ready',
}

const NEXT_LABEL = {
  prescribed:       'Mark Sample Collected',
  sample_collected: 'Mark Processing',
  processing:       '✓ Results Ready',
}

const STATUS_BADGE = {
  prescribed:       'bg-blue-100   text-blue-700   border border-blue-200',
  sample_collected: 'bg-amber-100  text-amber-700  border border-amber-200',
  processing:       'bg-purple-100 text-purple-700 border border-purple-200',
  results_ready:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

// ─────────────────────────────────────────────────────────────────────────────
// § SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const label = PIPELINE.find(p => p.key === status)?.label || status
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] || 'bg-slate-100 text-slate-500'}`}>
      {status === 'results_ready' && <CheckCircle size={10} />}
      {status === 'processing'    && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
      {label}
    </span>
  )
}

/**
 * § 2  Stat Card — spec layout:
 *   bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex items-center justify-between
 */
function StatCard({ label, value, icon: Icon, accentClass, loading }) {
  return (
    <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex items-center justify-between">
      <div>
        {loading
          ? <div className="h-8 w-10 bg-slate-100 rounded animate-pulse mb-1" />
          : <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
        }
        <p className="text-xs font-medium text-slate-500 mt-1.5">{label}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  )
}

/** SMS/WhatsApp notification terminal panel */
function SmsLogPanel({ logs, loading }) {
  // Safe date formatter — avoids Invalid Date crashes
  function fmtTime(str) {
    if (!str) return '??:??:??'
    try {
      const d = new Date(str)
      if (isNaN(d.getTime())) return str
      return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Karachi' })
    } catch { return str }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-5 font-mono text-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-3 text-slate-400 text-xs font-sans">SMS / WhatsApp Notification Terminal</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live
        </span>
      </div>
      {loading ? (
        <p className="text-slate-500 text-xs">Loading logs…</p>
      ) : logs.length === 0 ? (
        <div className="text-slate-500 text-xs space-y-1">
          <p className="text-green-400">$ awaiting notification events…</p>
          <p>When a lab order is marked <span className="text-green-300">results_ready</span>,</p>
          <p>an automated message fires here and to the patient's phone.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="border-b border-slate-800 pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 text-xs">[{fmtTime(log.sent_at)}]</span>
                <span className="text-amber-300 text-xs">SMS_DISPATCH</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  log.status === 'sent'      ? 'bg-blue-900 text-blue-300'
                  : log.status === 'delivered' ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
                }`}>{log.status?.toUpperCase()}</span>
              </div>
              <p className="text-slate-300 text-xs">
                <span className="text-slate-500">TO: </span>
                <span className="text-cyan-400">{log.recipient}</span>
              </p>
              <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                <span className="text-slate-500">MSG: </span>"{log.message}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Table skeleton row */
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// § MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LabOrders() {
  const [orders,      setOrders]      = useState([])
  const [smsLogs,     setSmsLogs]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [actionId,    setActionId]    = useState(null)
  const [pipeFilter,  setPipeFilter]  = useState('all')  // pipeline status filter
  const [search,      setSearch]      = useState('')
  const [dateFilter,  setDateFilter]  = useState('')
  const [toast,       setToast]       = useState(null)

  // ── Fetch lab orders ────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lab_orders')
      .select('*, labs(name, test_type, turnaround), doctors(name, specialty)')
      .order('prescribed_at', { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }, [])

  // ── Fetch SMS logs ──────────────────────────────────────────────────────
  const fetchSmsLogs = useCallback(async () => {
    setLogsLoading(true)
    const { data } = await supabase
      .from('sms_log').select('*')
      .order('sent_at', { ascending: false }).limit(20)
    setSmsLogs(data || [])
    setLogsLoading(false)
  }, [])

  useEffect(() => { fetchOrders(); fetchSmsLogs() }, [fetchOrders, fetchSmsLogs])

  // ── Supabase Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('lab-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_orders' }, () => fetchOrders())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_log' }, () => fetchSmsLogs())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchOrders, fetchSmsLogs])

  // ── Toast helper ────────────────────────────────────────────────────────
  function showToast(text, type = 'success') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 5000)
  }

  // ── Reset all filters ───────────────────────────────────────────────────
  function resetFilters() {
    setSearch('')
    setDateFilter('')
    setPipeFilter('all')
  }

  // ── Advance pipeline status ─────────────────────────────────────────────
  async function advanceStatus(order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setActionId(order.id)

    const { error } = await supabase
      .from('lab_orders').update({ status: next }).eq('id', order.id)

    if (error) {
      showToast('❌ Failed to update lab order status', 'error')
      setActionId(null)
      return
    }

    if (next === 'results_ready') {
      try {
        const result = await sendLabResultsReady(order, order.labs?.name || 'lab test')
        if (result.success) showToast('✅ Lab results updated successfully! Notification dispatched to patient.', 'success')
        else                showToast('✅ Lab results updated successfully! Notification logs routed to monitoring terminal.', 'warning')
      } catch {
        showToast('✅ Lab results updated successfully! Notification logs routed to monitoring terminal.', 'warning')
      }
    }
    setActionId(null)
  }

  // ── § 2  Reactive stat counts ───────────────────────────────────────────
  const prescribedCount    = orders.filter(o => o.status === 'prescribed').length
  const collectedCount     = orders.filter(o => o.status === 'sample_collected').length
  const resultsReadyCount  = orders.filter(o => o.status === 'results_ready').length
  const processingCount    = orders.filter(o => o.status === 'processing').length

  // ── § 3  Filtering ──────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchPipe = pipeFilter === 'all' || o.status === pipeFilter

    const term = search.trim().toLowerCase()
    const matchSearch = !term
      || (o.patient_name          || '').toLowerCase().includes(term)
      || (o.patient_phone         || '').includes(term)
      || (o.labs?.name            || '').toLowerCase().includes(term)
      || (o.doctors?.name         || '').toLowerCase().includes(term)

    // Date filter against prescribed_at (YYYY-MM-DD prefix match)
    const matchDate = !dateFilter
      || (o.prescribed_at || '').startsWith(dateFilter)

    return matchPipe && matchSearch && matchDate
  })

  const hasActiveFilters = search.trim() || dateFilter || pipeFilter !== 'all'

  // ── Safe date formatter ─────────────────────────────────────────────────
  function fmtPrescribed(str) {
    return str ? displayDate(str.split('T')[0]) : '—'
  }
  function fmtPrescribedTime(str) {
    if (!str) return '—'
    try {
      const d = new Date(str)
      if (isNaN(d.getTime())) return '—'
      return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })
    } catch { return '—' }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl animate-fade-in flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600'
          : toast.type === 'warning' ? 'bg-amber-500'
          : 'bg-red-600'
        }`}>
          <MessageSquare size={15} /> {toast.text}
        </div>
      )}

      {/* ── § 2  Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Intake/Prescription Log (slate border) */}
        <StatCard
          label="Prescribed"
          value={prescribedCount}
          icon={ClipboardList}
          accentClass="bg-blue-600"
          loading={loading}
        />
        {/* Card 2 — Pending Pipeline (amber accent) */}
        <StatCard
          label="Sample Collected"
          value={collectedCount}
          icon={TestTube}
          accentClass="bg-amber-500"
          loading={loading}
        />
        {/* Card 3 — Success State (emerald accent) */}
        <StatCard
          label="Results Ready"
          value={resultsReadyCount}
          icon={CheckCircle}
          accentClass="bg-emerald-500"
          loading={loading}
        />
        {/* Card 4 — Processing (amethyst/purple accent) */}
        <StatCard
          label="Processing"
          value={processingCount}
          icon={Microscope}
          accentClass="bg-purple-500"
          loading={loading}
        />
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">

        {/* ── § 1  Section header + Filter bar ── */}
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* § 1 Section header */}
            <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <FlaskConical size={17} className="text-indigo-500" />
              Lab Orders
            </h2>
          </div>

          {/* ── § 3  Filter bar ── */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Patient / test name search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patient or test..."
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition"
              />
            </div>

            {/* Date picker — filters by prescribed date */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-700 transition"
                title="Filter by prescribed date"
              />
            </div>

            {/* Pipeline status dropdown */}
            <select
              value={pipeFilter}
              onChange={e => setPipeFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 bg-white transition"
            >
              <option value="all">All Stages</option>
              {PIPELINE.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>

            {/* Reset / Refresh circular button */}
            <button
              onClick={() => { resetFilters(); fetchOrders(); fetchSmsLogs() }}
              title="Reset filters & refresh"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex-shrink-0"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1"><Filter size={11} /> Active:</span>
              {search.trim() && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                  Search: "{search.trim()}"
                </span>
              )}
              {dateFilter && (
                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-medium">
                  Date: {displayDate(dateFilter)}
                </span>
              )}
              {pipeFilter !== 'all' && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium capitalize">
                  Stage: {PIPELINE.find(p => p.key === pipeFilter)?.label}
                </span>
              )}
              <span className="text-slate-400 ml-1">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
              <button onClick={resetFilters} className="ml-auto text-red-400 hover:text-red-600 font-semibold flex items-center gap-1">
                <X size={11} /> Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {['Patient', 'Test', 'Prescribed By', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Beaker size={28} className="mx-auto mb-2 opacity-30" />
                    {hasActiveFilters ? 'No orders match your filters.' : 'No lab orders found.'}
                  </td>
                </tr>
              ) : filtered.map(order => {
                const isUpdating = actionId === order.id
                const isDone     = order.status === 'results_ready'
                return (
                  <tr key={order.id} className={`border-b border-slate-100 transition-colors ${isUpdating ? 'bg-blue-50' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{order.patient_name}</p>
                      <p className="text-xs text-slate-400">{order.patient_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{order.labs?.name || '—'}</p>
                      <p className="text-xs text-indigo-500">{order.labs?.test_type}</p>
                      {order.labs?.turnaround && <p className="text-xs text-slate-400">{order.labs.turnaround}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 text-sm">{order.doctors?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{order.doctors?.specialty}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      <p className="font-medium text-slate-700">{fmtPrescribed(order.prescribed_at)}</p>
                      <p>{fmtPrescribedTime(order.prescribed_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {isUpdating ? (
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                      ) : isDone ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle size={12} /> Completed
                        </div>
                      ) : (
                        <button
                          onClick={() => advanceStatus(order)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            order.status === 'processing'
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {NEXT_LABEL[order.status]}
                          {order.status !== 'processing' && <ChevronRight size={11} />}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of{' '}
              <span className="font-semibold text-slate-600">{orders.length}</span> orders
            </span>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-red-400 hover:text-red-600 font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── § 5  SMS Notification Terminal ── */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <MessageSquare size={17} className="text-slate-500" />
          Notification Log
          <span className="text-xs font-normal text-slate-400">— auto-fired on status → results_ready</span>
        </h3>
        <SmsLogPanel logs={smsLogs} loading={logsLoading} />
      </div>
    </div>
  )
}
