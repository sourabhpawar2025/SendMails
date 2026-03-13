import { useState, useEffect } from 'react'
import { smtpSendersApi, resultsApi, sendEmailsApi, campaignsApi } from '../api/client'
import CheckboxDropdown from './CheckboxDropdown'

const DEFAULT_SUBJECT = 'Hello {{Title}}'
const DEFAULT_BODY = `Hi {{Title}},

We noticed your contact: {{Email}}, {{Phone}}.

Best regards`

const STEP_LABELS = {
  1: 'Choose Sender',
  2: 'Choose Campaign & Limit',
  3: 'Compose & Send',
}

export default function SendMailModal({ preSelectedSender = null, onClose, onSent }) {
  const [step, setStep] = useState(1)
  const [senders, setSenders] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [selectedSenderIds, setSelectedSenderIds] = useState(() =>
    preSelectedSender ? new Set([preSelectedSender.id]) : new Set()
  )
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [mailLimit, setMailLimit] = useState(50)
  const [recipientIdsToSend, setRecipientIdsToSend] = useState([])
  const [filterLocations, setFilterLocations] = useState([])
  const [filterPairs, setFilterPairs] = useState([])
  const [filtersError, setFiltersError] = useState(null)
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingProgress, setSendingProgress] = useState({ sent: 0, failed: 0, total: 0 })
  const [showAllSentPopup, setShowAllSentPopup] = useState(false)
  const [error, setError] = useState(null)
  const [sendResult, setSendResult] = useState(null)
  const [resultsCount, setResultsCount] = useState(null)
  const [resultsCountLoading, setResultsCountLoading] = useState(false)

  useEffect(() => {
    if (preSelectedSender) setSelectedSenderIds((prev) => new Set([...prev, preSelectedSender.id]))
  }, [preSelectedSender])

  useEffect(() => {
    smtpSendersApi.list()
      .then(({ data }) => setSenders(data.filter((s) => s.is_active)))
      .catch(() => setSenders([]))
  }, [])

  useEffect(() => {
    if (step >= 2) {
      campaignsApi.list()
        .then(({ data }) => setCampaigns(data || []))
        .catch(() => setCampaigns([]))
      resultsApi.filters()
        .then(({ data }) => {
          setFilterLocations(data.locations || [])
          setFilterPairs(data.pairs || [])
          setFiltersError(data.error || null)
        })
        .catch((err) => {
          setFilterLocations([])
          setFilterPairs([])
          setFiltersError(err.response?.data?.error || err.message || 'Failed to load filters')
        })
    }
  }, [step])

  useEffect(() => {
    if (step === 2 && selectedLocations.length > 0) {
      const allowed = new Set(
        filterPairs.filter((p) => selectedLocations.includes(p.location)).map((p) => p.category).filter(Boolean)
      )
      setSelectedCategories((prev) => prev.filter((c) => allowed.has(c)))
    }
  }, [step, selectedLocations.join(','), filterPairs.length])

  // Fetch results count only after campaign is selected; same filters as recipient list (location + category + date range)
  useEffect(() => {
    if (step !== 2 || !selectedCampaign) {
      setResultsCount(null)
      return
    }
    setResultsCountLoading(true)
    const params = {}
    if (selectedLocations.length > 0) params.location = selectedLocations
    if (selectedCategories.length > 0) params.category = selectedCategories
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    resultsApi.count(params)
      .then(({ data }) => setResultsCount(data.count ?? 0))
      .catch(() => setResultsCount(null))
      .finally(() => setResultsCountLoading(false))
  }, [step, selectedCampaign?.id, selectedLocations.join(','), selectedCategories.join(','), dateFrom, dateTo])

  // Keep mailLimit <= resultsCount when count is known (e.g. after filter change)
  useEffect(() => {
    if (resultsCount != null && (Number(mailLimit) || 1) > resultsCount) {
      setMailLimit(Math.max(1, Math.min(500, resultsCount)))
    }
  }, [resultsCount])

  // When entering Compose step, load campaign template for subject/body prefill
  useEffect(() => {
    if (step === 3 && selectedCampaign?.id) {
      campaignsApi.getTemplate(selectedCampaign.id)
        .then(({ data }) => {
          if (data?.subject) setSubject(data.subject)
          if (data?.body) setBody(data.body)
        })
        .catch(() => {})
    }
  }, [step, selectedCampaign?.id])

  const handleGoToCompose = () => {
    const n = Math.max(1, Number(mailLimit) || 1)
    setLoading(true)
    const params = { limit: n }
    if (selectedLocations.length > 0) params.location = selectedLocations
    if (selectedCategories.length > 0) params.category = selectedCategories
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    resultsApi.list(params)
      .then(({ data }) => {
        const list = data || []
        setRecipientIdsToSend(list.slice(0, n).map((r) => r.id))
        setStep(3)
      })
      .catch(() => setRecipientIdsToSend([]))
      .finally(() => setLoading(false))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (selectedSenderIds.size === 0 || recipientIdsToSend.length === 0) return
    setError(null)
    setSendResult(null)
    const totalEmails = recipientIdsToSend.length * selectedSenderIds.size
    setSendingProgress({ sent: 0, failed: 0, total: totalEmails })
    setSending(true)
    let totalSent = 0
    let totalFailed = 0
    let lastError = null
    try {
      const senderIds = Array.from(selectedSenderIds)
      const payloadBase = {
        sender_ids: senderIds,
        subject_template: subject,
        body_template: body,
      }
      if (selectedCampaign?.id) payloadBase.campaign_id = selectedCampaign.id

      for (let i = 0; i < recipientIdsToSend.length; i++) {
        const chunk = [recipientIdsToSend[i]]
        const { data } = await sendEmailsApi.sendNow({ ...payloadBase, recipient_ids: chunk })
        totalSent += data.sent ?? 0
        totalFailed += data.failed ?? 0
        if (data.error_detail) lastError = data.error_detail
        setSendingProgress({ sent: totalSent, failed: totalFailed, total: totalEmails })
      }

      setSendResult({
        sent: totalSent,
        failed: totalFailed,
        message: `Sent: ${totalSent}, Failed: ${totalFailed}`,
        error_detail: lastError,
        recipients_count: recipientIdsToSend.length,
      })
      onSent?.()
      setShowAllSentPopup(true)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const selectedSenders = senders.filter((s) => selectedSenderIds.has(s.id))
  const activeSenders = senders.filter((s) => s.is_active)

  const toggleSender = (sender) => {
    setSelectedSenderIds((prev) => {
      const next = new Set(prev)
      if (next.has(sender.id)) next.delete(sender.id)
      else next.add(sender.id)
      return next
    })
  }

  const stepTitle = `Send mail — Step ${step}: ${STEP_LABELS[step] || step}`

  // Categories for dropdown: when locations selected, only categories for those locations; else all (unique, sorted)
  const categoryOptionsForLocations =
    selectedLocations.length > 0
      ? [...new Set(filterPairs.filter((p) => selectedLocations.includes(p.location)).map((p) => p.category).filter(Boolean))].sort((a, b) => (a || '').localeCompare(b || ''))
      : [...new Set(filterPairs.map((p) => p.category).filter(Boolean))].sort((a, b) => (a || '').localeCompare(b || ''))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-white">{stepTitle}</h2>
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
            {sendResult.recipients_count === 0 && (
              <p className="font-medium text-amber-400">No recipients were found.</p>
            )}
            {sendResult.message}
            {sendResult.error_detail && <div className="mt-1 font-medium">Error: {sendResult.error_detail}</div>}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Select one or more sender accounts. Each recipient will receive one email from every selected sender.</p>
              {activeSenders.length === 0 ? (
                <p className="text-slate-500">No active senders. Add and enable one first.</p>
              ) : (
                <ul className="space-y-1">
                  {activeSenders.map((s) => (
                    <li key={s.id}>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${selectedSenderIds.has(s.id) ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500'}`}>
                        <input
                          type="checkbox"
                          checked={selectedSenderIds.has(s.id)}
                          onChange={() => toggleSender(s)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-medium">{s.sender_name}</span>
                        <span className="text-slate-400">— {s.email}</span>
                        <span className="text-slate-500">({s.smtp_host}:{s.smtp_port})</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={selectedSenderIds.size === 0}
                  className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  Next: Choose Campaign & Limit
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Select a campaign first, then filter by location/category and see the matching count.</p>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Campaign (required)</label>
                <select
                  value={selectedCampaign?.id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null
                    setSelectedCampaign(campaigns.find((c) => c.id === id) || null)
                    if (!id) {
                      setSelectedLocations([])
                      setSelectedCategories([])
                      setResultsCount(null)
                    }
                  }}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                >
                  <option value="">— Select campaign —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
                {!selectedCampaign && (
                  <p className="mt-1 text-xs text-amber-500">Select a campaign to see location, category filters and live recipient count.</p>
                )}
              </div>

              {selectedCampaign && (
                <>
              {filtersError && (
                <div className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
                  Filters could not be loaded: {filtersError}. Location/category dropdowns may be empty. Check that the <code className="rounded bg-slate-700 px-1">results</code> table exists and has <code className="rounded bg-slate-700 px-1">location</code> and <code className="rounded bg-slate-700 px-1">keyword</code> columns.
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-slate-400">Location (multiple selection)</label>
                <CheckboxDropdown
                  label=""
                  options={filterLocations}
                  selected={selectedLocations}
                  onChange={setSelectedLocations}
                  placeholder="Select locations..."
                  searchPlaceholder="Search locations..."
                  hint="Locations from results table (ascending)."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Category (multiple selection)</label>
                <CheckboxDropdown
                  label=""
                  options={categoryOptionsForLocations}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder={selectedLocations.length > 0 ? 'Select categories for chosen location(s)...' : 'Select categories...'}
                  searchPlaceholder="Search categories..."
                  hint={selectedLocations.length > 0 ? 'Categories for selected location(s).' : 'All categories from results.'}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Date from</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value || '')}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">Show data from this date (leave empty for no start limit)</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Date to</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value || '')}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">Show data up to this date (leave empty for no end limit)</p>
                </div>
              </div>
              {/* Total matching count - live from DB, only after campaign selected */}
              <div className="rounded border border-slate-600 bg-slate-800/50 px-3 py-2">
                <p className="text-xs text-slate-400">Total matching recipients (with email) — unique by email</p>
                <p className="mt-0.5 text-lg font-semibold text-amber-400">
                  {resultsCountLoading ? 'Counting…' : resultsCount != null ? resultsCount.toLocaleString() : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Campaign: {selectedCampaign?.name}
                  {selectedLocations.length > 0 && ` · Locations: ${selectedLocations.length} selected`}
                  {selectedCategories.length > 0 && ` · Categories: ${selectedCategories.length} selected`}
                  {(dateFrom || dateTo) && ` · Date range: ${dateFrom || '…'} to ${dateTo || '…'}`}
                  {selectedLocations.length === 0 && selectedCategories.length === 0 && !dateFrom && !dateTo && ' · No location/category/date filter — all results with email'}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Number of mails to send</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={mailLimit}
                  onChange={(e) => setMailLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className={`w-full rounded border px-3 py-2 text-slate-200 ${resultsCount != null && mailLimit > resultsCount ? 'border-amber-500 bg-amber-500/5' : 'border-slate-600 bg-slate-800'}`}
                />
                <p className="mt-1 text-xs text-slate-500">You will send to this many recipients (first N matching your filters). Maximum must not exceed total matching recipients above.</p>
                {resultsCount != null && mailLimit > resultsCount && (
                  <p className="mt-1 text-sm font-medium text-amber-400">
                    Number of mails cannot exceed total matching recipients ({resultsCount.toLocaleString()}). Please enter a value ≤ {resultsCount.toLocaleString()}.
                  </p>
                )}
                {resultsCount != null && resultsCount === 0 && (
                  <p className="mt-1 text-sm text-amber-400">No matching recipients with email — adjust filters or add data to continue.</p>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleGoToCompose}
                  disabled={(resultsCount != null && mailLimit > resultsCount) || resultsCount === 0 || loading}
                  className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading…' : 'Next: Compose & Send'}
                </button>
              </div>
                </>
              )}

              {!selectedCampaign && (
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
                >
                  Back
                </button>
                <button type="button" disabled className="rounded bg-slate-600 px-4 py-2 text-sm text-slate-500 cursor-not-allowed">
                  Select a campaign to continue
                </button>
              </div>
              )}
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSend} className="space-y-4">
              <p className="text-sm text-slate-400">
                Sender(s): <strong className="text-slate-200">{selectedSenders.map((s) => `${s.sender_name} (${s.email})`).join(' · ')}</strong>
                {selectedCampaign && <> · Campaign: <strong className="text-slate-200">{selectedCampaign.name}</strong></>}
                {' '}· Sending to <strong>{recipientIdsToSend.length}</strong> recipient(s) (first {recipientIdsToSend.length} matching your filters). Each will receive <strong>{selectedSenderIds.size}</strong> email(s) (one from each sender).
              </p>

              {sending && (
                <div className="rounded-lg border border-slate-600 bg-slate-800/80 p-4">
                  <p className="mb-2 text-sm font-medium text-slate-300">Sending progress</p>
                  <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-emerald-400">Sent: <strong>{sendingProgress.sent}</strong></span>
                    <span className="text-red-400">Failed: <strong>{sendingProgress.failed}</strong></span>
                    <span className="text-slate-400">Left: <strong>{Math.max(0, sendingProgress.total - sendingProgress.sent - sendingProgress.failed)}</strong></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${sendingProgress.total ? Math.min(100, (100 * (sendingProgress.sent + sendingProgress.failed)) / sendingProgress.total) : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-slate-400">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                  required
                  disabled={sending}
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
                  disabled={sending}
                />
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={sending}
                  className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  {sending ? `Sending… ${sendingProgress.sent + sendingProgress.failed} / ${sendingProgress.total}` : 'Send mail'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showAllSentPopup && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/70 p-4" onClick={() => setShowAllSentPopup(false)}>
          <div
            className="w-full max-w-sm rounded-xl border border-slate-600 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-lg font-medium text-white">All mails have been sent.</p>
            {sendResult && (
              <p className="mt-2 text-center text-sm text-slate-400">
                Sent: {sendResult.sent} · Failed: {sendResult.failed}
              </p>
            )}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllSentPopup(false)}
                className="rounded bg-amber-500 px-6 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
