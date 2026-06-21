import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api, errorMessage } from '@/api/client'
import { authStore } from '@/stores/auth-store'
import { feedback } from '@/components/feedback-store'
import type { User } from '@/types'

const schema = z.object({ email: z.email('Email tidak valid'), password: z.string().min(8, 'Minimal 8 karakter') })
type LoginInput = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate(); const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(schema), defaultValues: { email: 'admin@claviar.test', password: 'password' } })
  const submit = async (values: LoginInput) => { setError(''); try { const { data } = await api.post<{ token: string; user: User }>('/auth/login', values); authStore.set(data.token, data.user); feedback.toast('success', 'Login berhasil', `Selamat datang kembali, ${data.user.name}.`); navigate('/') } catch (e) { setError(errorMessage(e)) } }
  return <main className="login-page"><section className="login-card"><div className="login-brand"><div className="brand-mark"><Box size={21} /></div><div><strong>Claviar</strong><span>Preloved Management System</span></div></div><div className="login-copy"><p>INTERNAL ACCESS</p><h1>Welcome back</h1><span>Sign in to manage your preloved business.</span></div><form className="form-grid single" onSubmit={handleSubmit(submit)}><label>Email address<input type="email" {...register('email')} />{errors.email && <small>{errors.email.message}</small>}</label><label>Password<input type="password" {...register('password')} />{errors.password && <small>{errors.password.message}</small>}</label>{error && <p className="form-error">{error}</p>}<button className="primary-button submit-button" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="spin" size={16} />}Sign in</button></form><p className="login-hint">Default: admin@claviar.test / password</p></section></main>
}
