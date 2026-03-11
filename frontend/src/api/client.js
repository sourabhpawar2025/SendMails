import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const smtpSendersApi = {
  list: () => api.get('/smtp-senders'),
  get: (id) => api.get(`/smtp-senders/${id}`),
  create: (data) => api.post('/smtp-senders', data),
  update: (id, data) => api.patch(`/smtp-senders/${id}`, data),
  delete: (id) => api.delete(`/smtp-senders/${id}`),
  testConnection: (data) => api.post('/smtp-senders/test-connection', data),
}

export const emailLogsApi = {
  list: (params) => api.get('/email-logs', { params }),
}

export const sendEmailsApi = {
  sendNow: (data) => api.post('/send/now', data),
  schedule: (data) => api.post('/send/schedule', data),
}

export const resultsApi = {
  list: (params) => api.get('/results', { params }),
}

export default api
