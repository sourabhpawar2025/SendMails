import { useState, useEffect } from 'react'
import { mailTemplatesApi } from '../api/client'
import MailTemplateForm from '../components/MailTemplateForm'

export default function MailTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data } = await mailTemplatesApi.list()
      setTemplates(data || [])
      setError(null)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    try {
      await mailTemplatesApi.delete(id)
      fetchTemplates()
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Delete failed')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingId(null)
    fetchTemplates()
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
        <h1 className="text-2xl font-bold text-white">Mail Templates</h1>
        <button
          onClick={() => { setEditingId(null); setShowForm(true) }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
        >
          Add Template
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">From</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">To</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Campaigns</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No mail templates. Add one and link it to campaigns to use when sending mail.
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-200">{t.name}</td>
                  <td className="max-w-[120px] truncate px-4 py-3 text-sm text-slate-400" title={t.from_field}>
                    {t.from_field || '—'}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 text-sm text-slate-400" title={t.to_field}>
                    {t.to_field || '—'}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-300" title={t.subject}>
                    {t.subject || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {(t.campaigns || []).length === 0
                      ? '—'
                      : (t.campaigns || []).map((c) => c.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setEditingId(t.id); setShowForm(true) }}
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
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
        <MailTemplateForm
          templateId={editingId}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
