import { useState, useEffect } from 'react'
import { mailTemplatesApi, campaignsApi } from '../api/client'

export default function MailTemplateForm({ templateId, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [fromField, setFromField] = useState('')
  const [toField, setToField] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [campaignIds, setCampaignIds] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    campaignsApi.list()
      .then(({ data }) => setCampaigns(data || []))
      .catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    if (templateId) {
      mailTemplatesApi.get(templateId)
        .then(({ data }) => {
          setName(data.name || '')
          setFromField(data.from_field || '')
          setToField(data.to_field || '')
          setSubject(data.subject || '')
          setBody(data.body || '')
          setCampaignIds((data.campaigns || []).map((c) => c.id))
        })
        .catch(() => setError('Failed to load template'))
    }
  }, [templateId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        name,
        from_field: fromField,
        to_field: toField,
        subject,
        body,
        campaign_ids: campaignIds,
      }
      if (templateId) {
        await mailTemplatesApi.update(templateId, payload)
      } else {
        await mailTemplatesApi.create(payload)
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

  const toggleCampaign = (id) => {
    setCampaignIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {templateId ? 'Edit Mail Template' : 'Add Mail Template'}
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Link this template to one or more campaigns. When you send mail for a campaign, you can use its templates for From, To, Subject and body.
        </p>
        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Template name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="e.g. Welcome email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">From (display or placeholder e.g. &#123;&#123;sender_email&#125;&#125;)</label>
            <input
              type="text"
              value={fromField}
              onChange={(e) => setFromField(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">To (display e.g. Recipients)</label>
            <input
              type="text"
              value={toField}
              onChange={(e) => setToField(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Email subject (placeholders: &#123;&#123;Title&#125;&#125;, &#123;&#123;Email&#125;&#125;, etc.)"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={6}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
              placeholder="Email body. Use &#123;&#123;Title&#125;&#125;, &#123;&#123;Email&#125;&#125;, &#123;&#123;Phone&#125;&#125;, etc."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Campaigns (select campaigns this template will be used for)</label>
            <div className="max-h-40 overflow-auto rounded border border-slate-600 bg-slate-800/50 p-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-slate-500">No campaigns. Create campaigns first.</p>
              ) : (
                <ul className="space-y-1">
                  {campaigns.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={campaignIds.includes(c.id)}
                          onChange={() => toggleCampaign(c.id)}
                          className="rounded border-slate-600 bg-slate-800 text-amber-500"
                        />
                        {c.name} ({c.type})
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              When you send mail and choose a campaign, you can pick a template linked to that campaign.
            </p>
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
              {loading ? 'Saving…' : templateId ? 'Update' : 'Add Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
