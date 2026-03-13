import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import SmtpSendersPage from './pages/SmtpSendersPage'
import EmailLogsPage from './pages/EmailLogsPage'
import CampaignsPage from './pages/CampaignsPage'
import MailTemplatesPage from './pages/MailTemplatesPage'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen">
        <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <span className="text-lg font-semibold text-amber-400">
                SMTP Email Sender
              </span>
              <div className="flex gap-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-700 text-amber-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  SMTP Senders
                </NavLink>
                <NavLink
                  to="/logs"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-700 text-amber-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  Email Logs
                </NavLink>
                <NavLink
                  to="/campaigns"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-700 text-amber-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  Campaigns
                </NavLink>
                <NavLink
                  to="/mail-templates"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-700 text-amber-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  Mail Templates
                </NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<SmtpSendersPage />} />
            <Route path="/logs" element={<EmailLogsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/mail-templates" element={<MailTemplatesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
