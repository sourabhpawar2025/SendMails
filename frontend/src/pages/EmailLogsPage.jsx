import { useState, useEffect } from 'react'
import { emailLogsApi, smtpSendersApi } from '../api/client'

export default function EmailLogsPage() {
  const [logs, setLogs] = useState([])
  const [senders, setSenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    sender_email: '',
    status: '',
    date_from: '',
    date_to: '',
    limit: 50,
  })

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filters.sender_email) params.sender_email = filters.sender_email
      if (filters.status) params.status = filters.status
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      if (filters.limit) params.limit = filters.limit
      const { data } = await emailLogsApi.list(params)
      setLogs(data)
      setError(null)
    } catch (e) {
      const res = e.response?.data
      const msg = res?.detail ?? e.message ?? 'Failed to load logs'
      const extra = res?.traceback ? ` (${res.type || 'Error'})` : ''
      setError(Array.isArray(msg) ? msg.join(' ') : msg + extra)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filters.sender_email, filters.status, filters.date_from, filters.date_to, filters.limit])

  useEffect(() => {
    smtpSendersApi.list().then(({ data }) => setSenders(data)).catch(() => {})
  }, [])

  const formatDate = (d) => {
    if (d == null || d === '') return '—'
    const date = typeof d === 'string' ? new Date(d) : new Date(d)
    if (isNaN(date.getTime())) return String(d)
    // Backend now sends IST (Asia/Kolkata); display as-is in Indian format
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: true,
    })
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Email Logs & Tracking</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Sender</label>
          <select
            value={filters.sender_email}
            onChange={(e) => setFilters((f) => ({ ...f, sender_email: e.target.value }))}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="">All</option>
            {senders.map((s) => (
              <option key={s.id} value={s.email}>{s.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="">All</option>
            <option value="Sent">Sent</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">From date</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">To date</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Limit</label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value) }))}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        <button
          onClick={fetchLogs}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 shadow">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Sent Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No email logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-slate-300">{log.sender_email}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{log.recipient_email}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{formatDate(log.sent_time)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status === 'Sent'
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
