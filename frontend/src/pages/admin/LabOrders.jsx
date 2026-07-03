/**
 * LabOrders.jsx
 * --------------
 * Lab Technician view inside the Admin Dashboard.
 *
 * Shows all lab orders prescribed by doctors.
 * The tech can move each order through the pipeline:
 *
 *   prescribed → sample_collected → processing → results_ready
 *
 * When an order is marked "results_ready", the Postgres trigger
 * (log_sms_on_results_ready) automatically fires and inserts a
 * row into sms_log — simulating a WhatsApp / SMS notification
 * to the patient.
 *
 * Supabase Realtime keeps this table in sync across all open tabs.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  FlaskConical, CheckCircle, Clock, Loader2, AlertCircle,
  RefreshCw, Search, MessageSquare, ChevronRight, Beaker,
} from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { sendLabResultsReady } from '../../utils/notifications'
import { format, parseISO } from 'date-fns'

// ── Status pipeline definition ────────────────────────────────────────────────
const PIPELINE = [
  { key: 'prescribed',       label: 'Prescribed',       color: 'blue'   },
  { key: 'sample_collected', label: 'Sample Collected',  color: 'amber'  },
  { key: 'processing',       label: 'Processing',        color: 'purple' },
  { key: 'results_ready',    label: 'Results Ready',     color: 'green'  },
]

// Next status in pipeline
const NEXT_STATUS = {
  prescribed:       'sample_collected',
  sample_collected: 'processing',
  processing:       'results_ready',
}

// Button label for advancing to next status
const NEXT_LABEL = {
  prescribed:       'Mark Sample Collected',
  sample_collected: 'Mark Processing',
  processing:       '✓ Results Ready',
}

const STATUS_BADGE = {
  prescribed:       'bg-blue-100   text-blue-700   border border-blue-200',
  sample_collected: 'bg-amber-100  text-amber-700  border border-amber-200',
  processing:       'bg-purple-100 text-purple-700 border border-purple-200',
  results_ready:    'bg-green-100  text-green-700  border border-green-200',
}

function StatusBadge({ status }) {
  const label = PIPELINE.find(p => p.key === status)?.label || status
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] || ''}`}>
      {status === 'results_ready' && <CheckCircle size={10} />}
      {status === 'processing'    && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
      {label}
    </span>
  )
}

// ── SMS log panel ─────────────────────────────────────────────────────────────
function SmsLogPanel({ logs, loading }) {
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
          {logs.map((log, i) => (
            <div key={log.id} className="border-b border-slate-800 pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 text-xs">
                  [{format(parseISO(log.sent_at), 'HH:mm:ss')}]
                </span>
                <span className="text-amber-300 text-xs">SMS_DISPATCH</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  log.status === 'sent'      ? 'bg-blue-900 text-blue-300'
                  : log.status === 'delivered' ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
                }`}>{log.status.toUpperCase()}</span>
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

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LabOrders() {
  const [orders,     setOrders]     = useState([])
  const [smsLogs,    setSmsLogs]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [actionId,   setActionId]   = useState(null)
  const [filter,     setFilter]     = useState('all')
  const [search,     setSearch]     = useState('')
  const [toast,      setToast]      = useState(null) // { text, type: 'success'|'error' }

  // ── Fetch lab orders with joined lab + doctor names ────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lab_orders')
      .select(`
        *,
        labs     ( name, test_type, turnaround ),
        doctors  ( name, specialty )
      `)
      .order('prescribed_at', { ascending: false })

    if (!error) setOrders(data || [])
    setLoading(false)
  }, [])

  // ── Fetch SMS log ──────────────────────────────────────────────────────────
  const fetchSmsLogs = useCallback(async () => {
    setLogsLoading(true)
    const { data } = await supabase
      .from('sms_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20)
    setSmsLogs(data || [])
    setLogsLoading(false)
  }, [])

  useEffect(() => { fetchOrders(); fetchSmsLogs() }, [fetchOrders, fetchSmsLogs])

  // ── Supabase Realtime — lab_orders + sms_log ───────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('lab-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_orders' }, () => {
        fetchOrders()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_log' }, () => {
        fetchSmsLogs()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, fetchSmsLogs])

  // ── Advance status ────────────────────────────────────────────────────────
  async function advanceStatus(order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setActionId(order.id)

    const { error } = await supabase
      .from('lab_orders')
      .update({ status: next })
      .eq('id', order.id)

    if (error) console.error('[LabOrders] Update failed:', error.message)
    // Realtime will trigger re-fetch
    setActionId(null)
  }

  // ── Counts per status ────────────────────────────────────────────────────
  const counts = PIPELINE.reduce((acc, p) => {
    acc[p.key] = orders.filter(o => o.status === p.key).length
    return acc
  }, {})

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter
    const term = search.toLowerCase()
    const matchSearch = !term ||
      o.patient_name.toLowerCase().includes(term) ||
      o.patient_phone.includes(term) ||
      (o.labs?.name   || '').toLowerCase().includes(term) ||
      (o.doctors?.name || '').toLowerCase().includes(term)
    return matchFilter && matchSearch
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Pipeline status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {PIPELINE.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
              filter === key ? 'ring-2 ring-[#1E3A8A] ring-offset-1' : ''
            } ${
              color === 'blue'   ? 'bg-blue-50   border-blue-200'   :
              color === 'amber'  ? 'bg-amber-50  border-amber-200'  :
              color === 'purple' ? 'bg-purple-50 border-purple-200' :
                                   'bg-green-50  border-green-200'
            }`}
          >
            {loading
              ? <div className="h-8 w-10 bg-slate-200 rounded animate-pulse mb-1" />
              : <p className={`text-2xl font-extrabold leading-none mb-1 ${
                  color === 'blue'   ? 'text-blue-700'   :
                  color === 'amber'  ? 'text-amber-700'  :
                  color === 'purple' ? 'text-purple-700' : 'text-green-700'
                }`}>{counts[key] ?? 0}</p>
            }
            <p className="text-xs font-medium text-slate-600">{label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
            <FlaskConical size={16} />
            Lab Orders
            <span className="text-xs font-normal text-slate-400">— Click a pipeline card above to filter</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search patient or test…"
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] w-48" />
            </div>
            <button onClick={() => { fetchOrders(); fetchSmsLogs() }}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-[#1E3A8A] transition" title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

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
                    No lab orders found.
                  </td>
                </tr>
              ) : (
                filtered.map(order => {
                  const isUpdating = actionId === order.id
                  const isDone     = order.status === 'results_ready'
                  const nextLabel  = NEXT_LABEL[order.status]

                  return (
                    <tr key={order.id}
                      className={`border-b border-slate-100 transition-colors ${isUpdating ? 'bg-blue-50' : 'hover:bg-slate-50/70'}`}>

                      {/* Patient */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{order.patient_name}</p>
                        <p className="text-xs text-slate-400">{order.patient_phone}</p>
                      </td>

                      {/* Test */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{order.labs?.name || '—'}</p>
                        <p className="text-xs text-indigo-500">{order.labs?.test_type}</p>
                        {order.labs?.turnaround && (
                          <p className="text-xs text-slate-400">{order.labs.turnaround}</p>
                        )}
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3">
                        <p className="text-slate-700 text-sm">{order.doctors?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{order.doctors?.specialty}</p>
                      </td>

                      {/* Prescribed date */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {format(parseISO(order.prescribed_at), 'dd MMM yyyy')}
                        <br />
                        {format(parseISO(order.prescribed_at), 'HH:mm')}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                        {order.status === 'results_ready' && order.results_ready_at && (
                          <p className="text-[10px] text-green-600 mt-1">
                            Ready: {format(parseISO(order.results_ready_at), 'HH:mm dd MMM')}
                          </p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        {isUpdating ? (
                          <Loader2 size={16} className="animate-spin text-[#3B82F6]" />
                        ) : isDone ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <MessageSquare size={12} />
                            <span>SMS Sent</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => advanceStatus(order)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              order.status === 'processing'
                                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-md shadow-green-200'
                                : 'bg-white text-[#1E3A8A] border-[#1E3A8A]/30 hover:bg-[#1E3A8A] hover:text-white'
                            }`}
                          >
                            {nextLabel}
                            {order.status !== 'processing' && <ChevronRight size={11} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
            {filtered.length} of {orders.length} orders
          </div>
        )}
      </div>

      {/* SMS notification terminal */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={15} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700">Notification Log (Mock SMS Terminal)</h3>
          <span className="text-xs text-slate-400">— auto-fired by Postgres trigger on status → results_ready</span>
        </div>
        <SmsLogPanel logs={smsLogs} loading={logsLoading} />
      </div>

    </div>
  )
}
