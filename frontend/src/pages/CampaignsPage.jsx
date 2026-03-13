import { useState, useEffect } from 'react'
import { campaignsApi } from '../api/client'
import CampaignForm from '../components/CampaignForm'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const { data } = await campaignsApi.list()
      setCampaigns(data)
      setError(null)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return
    try {
      await campaignsApi.delete(id)
      fetchCampaigns()
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Delete failed')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingId(null)
    fetchCampaigns()
  }

  const statusBadgeClass = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'active') return 'bg-emerald-900/50 text-emerald-400'
    if (s === 'paused') return 'bg-amber-900/50 text-amber-400'
    if (s === 'completed') return 'bg-slate-700 text-slate-400'
    if (s === 'in progress') return 'bg-sky-900/50 text-sky-400'
    return 'bg-slate-700 text-slate-400'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Campaign Management</h1>
        <button
          onClick={() => { setEditingId(null); setShowForm(true) }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
        >
          Add Campaign
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 shadow">
        <table className="min-w-full divide-y divide-slate-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No campaigns. Add one to get started.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm text-slate-200">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{c.type}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-400" title={c.description}>
                    {c.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(c.status)}`}>
                      {c.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setEditingId(c.id); setShowForm(true) }}
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CampaignForm
          campaignId={editingId}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
