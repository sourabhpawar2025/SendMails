import { useState } from 'react'
import { sendEmailsApi } from '../api/client'

const PLACEHOLDERS = '{{Title}}, {{Email}}, {{Phone}}, {{Instagram}}, {{Facebook}}, {{Twitter}}, {{Category}}, {{Location}}'

export default function SendEmailModal({ sender, onClose, onSent }) {
  const [subject, setSubject] = useState('Hello {{Title}}')
  const [body, setBody] = useState(
    'Hi {{Title}},\n\nWe noticed your contact: {{Email}}, {{Phone}}.\n\nBest regards'
  )
  const [limit, setLimit] = useState(100)
  const [schedule, setSchedule] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSend = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const payload = {
        sender_id: sender.id,
        subject_template: subject,
        body_template: body,
        limit,
      }
      if (schedule) {
        const { data } = await sendEmailsApi.schedule(payload)
        setResult({ scheduled: true, message: data.message })
      } else {
        const { data } = await sendEmailsApi.sendNow(payload)
        setResult({ sent: data.sent, failed: data.failed, message: data.message })
      }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Send failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-white">Send Emails</h2>
        <p className="mb-4 text-sm text-slate-400">
          Using: {sender.email}. Recipients from <strong>results</strong> (email IS NOT NULL).
        </p>
        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {result && (
          <div className="mb-4 rounded border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
            {result.scheduled ? result.message : `${result.message}`}
          </div>
        )}
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Subject template</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Hello {{Title}}"
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Body template</label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
            <p className="mt-1 text-xs text-slate-500">Placeholders: {PLACEHOLDERS}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Max recipients</label>
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="schedule"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-amber-500"
            />
            <label htmlFor="schedule" className="text-sm text-slate-300">
              Queue with Celery (async) instead of send now
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-slate-400 hover:text-white">
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Sending…' : schedule ? 'Schedule Send' : 'Send Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
