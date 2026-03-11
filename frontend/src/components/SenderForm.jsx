import { useState, useEffect } from 'react'
import { smtpSendersApi } from '../api/client'

const PLACEHOLDERS = '{{Title}}, {{Email}}, {{Phone}}, {{Instagram}}, {{Facebook}}, {{Twitter}}, {{Category}}, {{Location}}'

export default function SenderForm({ senderId, senders, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    sender_name: '',
    email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    username: '',
    password: '',
    is_active: true,
  })

  useEffect(() => {
    if (senderId) {
      smtpSendersApi.get(senderId).then(({ data }) => {
        setForm({
          sender_name: data.sender_name,
          email: data.email,
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          username: data.username,
          password: '', // never prefill
          is_active: data.is_active,
        })
      }).catch(() => setError('Failed to load sender'))
    }
  }, [senderId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (senderId) {
        const payload = {
          sender_name: form.sender_name,
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          username: form.username,
          is_active: form.is_active,
        }
        if (form.password) payload.password = form.password
        await smtpSendersApi.update(senderId, payload)
      } else {
        await smtpSendersApi.create(form)
      }
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {senderId ? 'Edit SMTP Sender' : 'Add SMTP Sender'}
        </h2>
        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Sender name</label>
            <input
              required
              value={form.sender_name}
              onChange={(e) => setForm((f) => ({ ...f, sender_name: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={!!senderId}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 disabled:opacity-60"
            />
            {senderId && <p className="mt-0.5 text-xs text-slate-500">Email cannot be changed</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">SMTP host</label>
            <input
              required
              value={form.smtp_host}
              onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">SMTP port</label>
            <input
              required
              type="number"
              min={1}
              max={65535}
              value={form.smtp_port}
              onChange={(e) => setForm((f) => ({ ...f, smtp_port: Number(e.target.value) }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Password {senderId && '(leave blank to keep current)'}
            </label>
            <input
              type="password"
              required={!senderId}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder={senderId ? '••••••••' : ''}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 text-amber-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Saving…' : senderId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
