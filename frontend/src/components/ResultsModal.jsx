import { useState, useEffect } from 'react'
import { resultsApi, sendEmailsApi } from '../api/client'

const COLS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'email', label: 'Email' },
  { key: 'phones', label: 'Phones' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'link', label: 'Link' },
]

const DEFAULT_SUBJECT = 'Hello {{Title}}'
const DEFAULT_BODY = `Hi {{Title}},

We noticed your contact: {{Email}}, {{Phone}}.

Best regards`

export default function ResultsModal({ sender, onClose }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [withEmailOnly, setWithEmailOnly] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  const fetchResults = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await resultsApi.list({ limit: 2000, with_email_only: withEmailOnly })
      setRecords(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [withEmailOnly])

  const handleSendToFirst = async () => {
    if (!sender) return
    setSendResult(null)
    setError(null)
    setSending(true)
    try {
      const { data } = await sendEmailsApi.sendNow({
        sender_id: sender.id,
        subject_template: DEFAULT_SUBJECT,
        body_template: DEFAULT_BODY,
        limit: 1,
      })
      setSendResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white">
              Results table (scraperdb) — {records.length} record{records.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={withEmailOnly}
                  onChange={(e) => setWithEmailOnly(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-amber-500"
                />
                With email only
              </label>
              <button
                type="button"
                onClick={fetchResults}
                className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
              >
                Refresh
              </button>
              {sender && (
                <button
                  type="button"
                  onClick={handleSendToFirst}
                  disabled={sending}
                  className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send emails to these'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
          {error && (
            <div className="mx-4 mt-2 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {sendResult && (
            <div className={`mx-4 mt-2 rounded border px-3 py-2 text-sm ${sendResult.failed > 0 ? 'border-red-800 bg-red-950/50 text-red-300' : 'border-emerald-800 bg-emerald-950/50 text-emerald-300'}`}>
              {sendResult.message}
              {sendResult.error_detail && (
                <div className="mt-1 font-medium">Error: {sendResult.error_detail}</div>
              )}
            </div>
          )}
          <div className="overflow-auto p-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-700 text-left text-sm">
                <thead>
                  <tr>
                    {COLS.map((c) => (
                      <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium text-slate-400">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} className="px-3 py-8 text-center text-slate-500">
                        No records in results table.
                      </td>
                    </tr>
                  ) : (
                    records.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/50">
                        {COLS.map((c) => (
                          <td key={c.key} className="max-w-[200px] truncate px-3 py-2 text-slate-300" title={row[c.key]}>
                            {row[c.key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
