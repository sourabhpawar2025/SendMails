import { useState, useEffect } from 'react'
import { smtpSendersApi, resultsApi, sendEmailsApi } from '../api/client'

const DEFAULT_SUBJECT = 'Hello {{Title}}'
const DEFAULT_BODY = `Hi {{Title}},

We noticed your contact: {{Email}}, {{Phone}}.

Best regards`

export default function SendMailModal({ preSelectedSender = null, onClose, onSent }) {
  const [step, setStep] = useState(1)
  const [senders, setSenders] = useState([])
  const [recipients, setRecipients] = useState([])
  const [selectedSender, setSelectedSender] = useState(preSelectedSender)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [sendResult, setSendResult] = useState(null)

  useEffect(() => {
    if (preSelectedSender) setSelectedSender(preSelectedSender)
  }, [preSelectedSender])

  useEffect(() => {
    smtpSendersApi.list()
      .then(({ data }) => setSenders(data.filter((s) => s.is_active)))
      .catch(() => setSenders([]))
  }, [])

  useEffect(() => {
    if (step >= 2) {
      setLoading(true)
      resultsApi.list({ limit: 2000, with_email_only: true })
        .then(({ data }) => setRecipients(data))
        .catch(() => setRecipients([]))
        .finally(() => setLoading(false))
    }
  }, [step])

  const toggleRecipient = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllRecipients = () => {
    if (selectedIds.size === recipients.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(recipients.map((r) => r.id)))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!selectedSender || selectedIds.size === 0) return
    setError(null)
    setSendResult(null)
    setSending(true)
    try {
      const { data } = await sendEmailsApi.sendNow({
        sender_id: selectedSender.id,
        subject_template: subject,
        body_template: body,
        recipient_ids: Array.from(selectedIds),
      })
      setSendResult(data)
      onSent?.()
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const activeSenders = senders.filter((s) => s.is_active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-white">
            Send mail — Step {step}: {step === 1 ? 'Choose Sender' : step === 2 ? 'Choose Receiver(s)' : 'Compose & Send'}
          </h2>
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-2 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {sendResult && (
          <div className={`mx-4 mt-2 rounded border px-3 py-2 text-sm ${sendResult.failed > 0 ? 'border-red-800 bg-red-950/50 text-red-300' : 'border-emerald-800 bg-emerald-950/50 text-emerald-300'}`}>
            {sendResult.message}
            {sendResult.error_detail && <div className="mt-1 font-medium">Error: {sendResult.error_detail}</div>}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Select the sender account to use:</p>
              {activeSenders.length === 0 ? (
                <p className="text-slate-500">No active senders. Add and enable one first.</p>
              ) : (
                <ul className="space-y-1">
                  {activeSenders.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSender(s)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition ${selectedSender?.id === s.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500'}`}
                      >
                        <span className="font-medium">{s.sender_name}</span>
                        <span className="ml-2 text-slate-400">— {s.email}</span>
                        <span className="ml-2 text-slate-500">({s.smtp_host}:{s.smtp_port})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!selectedSender}
                  className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  Next: Choose Receiver
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Select recipients (from results table, with email):</p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
              ) : recipients.length === 0 ? (
                <p className="text-slate-500">No recipients with email in results table.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllRecipients}
                      className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
                    >
                      {selectedIds.size === recipients.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <span className="text-sm text-slate-500">{selectedIds.size} selected</span>
                  </div>
                  <div className="max-h-64 overflow-auto rounded border border-slate-700">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-800">
                        <tr>
                          <th className="w-10 px-2 py-2" />
                          <th className="px-2 py-2 text-slate-400">ID</th>
                          <th className="px-2 py-2 text-slate-400">Title</th>
                          <th className="px-2 py-2 text-slate-400">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map((r) => (
                          <tr key={r.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                            <td className="px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(r.id)}
                                onChange={() => toggleRecipient(r.id)}
                                className="rounded border-slate-600 bg-slate-800 text-amber-500"
                              />
                            </td>
                            <td className="px-2 py-1 text-slate-400">{r.id}</td>
                            <td className="max-w-[200px] truncate px-2 py-1 text-slate-300" title={r.title}>{r.title || '—'}</td>
                            <td className="px-2 py-1 text-slate-300">{r.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={selectedIds.size === 0}
                      className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                    >
                      Next: Compose & Send
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSend} className="space-y-4">
              <p className="text-sm text-slate-400">
                Sender: <strong className="text-slate-200">{selectedSender?.sender_name}</strong> ({selectedSender?.email}). Sending to <strong>{selectedIds.size}</strong> recipient(s).
              </p>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Body (placeholders: &#123;&#123;Title&#125;&#125;, &#123;&#123;Email&#125;&#125;, &#123;&#123;Phone&#125;&#125;, etc.)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                  required
                />
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send mail'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
