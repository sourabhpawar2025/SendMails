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
  get: (id) => api.get(`/email-logs/${id}`),
}

export const sendEmailsApi = {
  sendNow: (data) => api.post('/send/now', data),
  schedule: (data) => api.post('/send/schedule', data),
}

export const resultsApi = {
  list: (params) => api.get('/results', { params }),
  filters: () => api.get('/results/filters'),
  count: (params) => api.get('/results/count', { params }),
}

export const campaignsApi = {
  list: () => api.get('/campaigns'),
  get: (id) => api.get(`/campaigns/${id}`),
  getTemplate: (campaignId) => api.get(`/campaigns/${campaignId}/template`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.patch(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
}

export const mailTemplatesApi = {
  list: () => api.get('/mail-templates'),
  get: (id) => api.get(`/mail-templates/${id}`),
  create: (data) => api.post('/mail-templates', data),
  update: (id, data) => api.patch(`/mail-templates/${id}`, data),
  delete: (id) => api.delete(`/mail-templates/${id}`),
}

export default api
