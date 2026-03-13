import { useState, useEffect } from 'react'
import { campaignsApi } from '../api/client'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Progress' },
]

export default function CampaignForm({ campaignId, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (campaignId) {
      campaignsApi.get(campaignId)
        .then(({ data }) => {
          setName(data.name || '')
          setType(data.type || '')
          setDescription(data.description || '')
          setStatus(data.status || 'active')
        })
        .catch(() => setError('Failed to load campaign'))
    }
  }, [campaignId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = { name, type, description, status }
      if (campaignId) {
        await campaignsApi.update(campaignId, payload)
      } else {
        await campaignsApi.create(payload)
      }
      onSuccess?.()
      onClose?.()
    } catch (e) {
      const detail = e.response?.data
      const msg = typeof detail === 'object' && detail !== null
        ? (detail.detail || Object.values(detail).flat().join(' '))
        : (e.response?.data?.detail || e.message || 'Failed to save')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {campaignId ? 'Edit Campaign' : 'Add Campaign'}
        </h2>
        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Name of the Campaign</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Campaign name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Type of Campaign</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="e.g. Email, Newsletter"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Description of Campaign</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Brief description"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
              {loading ? 'Saving…' : campaignId ? 'Update' : 'Add Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
