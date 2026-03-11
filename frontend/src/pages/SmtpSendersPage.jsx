import { useState, useEffect } from 'react'
import { smtpSendersApi } from '../api/client'
import SenderForm from '../components/SenderForm'
import TestConnectionModal from '../components/TestConnectionModal'
import ResultsModal from '../components/ResultsModal'
import SendMailModal from '../components/SendMailModal'

export default function SmtpSendersPage() {
  const [senders, setSenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [testModal, setTestModal] = useState(null)
  const [resultsModalSender, setResultsModalSender] = useState(null)
  const [showSendMailModal, setShowSendMailModal] = useState(false)
  const [sendMailPreselectedSender, setSendMailPreselectedSender] = useState(null)

  const fetchSenders = async () => {
    try {
      setLoading(true)
      const { data } = await smtpSendersApi.list()
      setSenders(data)
      setError(null)
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load senders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSenders()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this SMTP sender?')) return
    try {
      await smtpSendersApi.delete(id)
      fetchSenders()
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Delete failed')
    }
  }

  const handleToggleActive = async (sender) => {
    try {
      await smtpSendersApi.update(sender.id, { is_active: !sender.is_active })
      fetchSenders()
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Update failed')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingId(null)
    fetchSenders()
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
        <h1 className="text-2xl font-bold text-white">SMTP Sender Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setResultsModalSender(true)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            View results
          </button>
          <button
            onClick={() => { setSendMailPreselectedSender(null); setShowSendMailModal(true) }}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Send mail
          </button>
          <button
            onClick={() => { setEditingId(null); setShowForm(true) }}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
          >
            Add Sender
          </button>
        </div>
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Host:Port</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {senders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No SMTP senders. Add one to get started.
                </td>
              </tr>
            ) : (
              senders.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm text-slate-200">{s.sender_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{s.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{s.smtp_host}:{s.smtp_port}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setTestModal(s)}
                        className="text-sm text-amber-400 hover:text-amber-300"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => { setSendMailPreselectedSender(s); setShowSendMailModal(true) }}
                        className="text-sm text-sky-400 hover:text-sky-300"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => { setEditingId(s.id); setShowForm(true) }}
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="text-sm text-slate-400 hover:text-white"
                      >
                        {s.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
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
        <SenderForm
          senderId={editingId}
          senders={senders}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          onSuccess={handleFormSuccess}
        />
      )}

      {testModal && (
        <TestConnectionModal
          sender={testModal}
          onClose={() => setTestModal(null)}
        />
      )}

      {resultsModalSender && (
        <ResultsModal
          sender={resultsModalSender === true ? null : resultsModalSender}
          onClose={() => setResultsModalSender(null)}
        />
      )}

      {showSendMailModal && (
        <SendMailModal
          preSelectedSender={sendMailPreselectedSender}
          onClose={() => { setShowSendMailModal(false); setSendMailPreselectedSender(null) }}
          onSent={() => setShowSendMailModal(false)}
        />
      )}
    </div>
  )
}
