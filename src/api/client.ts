import axios from 'axios'
import { authStore } from '@/stores/auth-store'
import { feedback } from '@/components/feedback-store'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api', headers: { Accept: 'application/json' } })

api.interceptors.request.use((config) => {
  const token = authStore.token()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => {
  const method = response.config.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !response.config.url?.includes('/auth/login')) {
    const title = method === 'DELETE' ? 'Data berhasil dihapus' : method === 'PATCH' ? 'Status berhasil diperbarui' : 'Data berhasil disimpan'
    feedback.toast('success', title, response.data?.message ?? 'Perubahan berhasil diproses oleh sistem.')
  }
  return response
}, (error) => {
  const message = error.response?.data?.message ?? Object.values(error.response?.data?.errors ?? {}).flat().join(' ') ?? 'Permintaan tidak dapat diproses.'
  if (error.response?.status !== 401 || location.pathname === '/login') feedback.toast('error', 'Terjadi kesalahan', String(message))
  if (error.response?.status === 401) { authStore.clear(); if (location.pathname !== '/login') location.href = '/login' }
  return Promise.reject(error)
})

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? Object.values(error.response?.data?.errors ?? {}).flat().join(' ') ?? 'Terjadi kesalahan.'
  return 'Terjadi kesalahan.'
}
