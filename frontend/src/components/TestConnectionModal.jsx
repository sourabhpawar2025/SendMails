import { useState } from 'react'
import { smtpSendersApi } from '../api/client'

export default function TestConnectionModal({ sender, onClose }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleTest = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await smtpSendersApi.testConnection({
        smtp_host: sender.smtp_host,
        smtp_port: sender.smtp_port,
        username: sender.username,
        password,
      })
      setResult(data)
    } catch (e) {
      setResult({
        success: false,
        message: e.response?.data?.detail || e.message || 'Request failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-white">Test SMTP Connection</h2>
        <p className="mb-4 text-sm text-slate-400">{sender.email} — {sender.smtp_host}:{sender.smtp_port}</p>
        <form onSubmit={handleTest} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Password (not stored)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to test"
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          {result && (
            <div
              className={`rounded border px-3 py-2 text-sm ${
                result.success
                  ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300'
                  : 'border-red-800 bg-red-950/50 text-red-300'
              }`}
            >
              {result.message}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-slate-400 hover:text-white">
              Close
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Testing…' : 'Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
