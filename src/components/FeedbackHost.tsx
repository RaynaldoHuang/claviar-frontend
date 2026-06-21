import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle, X, XCircle } from 'lucide-react'
import { feedback, type Confirmation, type ToastMessage } from './feedback-store'

export function FeedbackHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => feedback.subscribe(event => {
    if (event.type === 'confirm') return setConfirmation(event.payload)
    setToasts(current => [...current, event.payload])
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== event.payload.id)), 4200)
  }), [])

  const approve = async () => {
    if (!confirmation) return
    setProcessing(true)
    try { await confirmation.action(); setConfirmation(null) } catch { /* API errors are displayed by the toast interceptor. */ } finally { setProcessing(false) }
  }

  return <>
    <div className="toast-region" aria-live="polite">{toasts.map(toast => <article className={`toast-card ${toast.kind}`} key={toast.id}>{toast.kind === 'success' ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<div><strong>{toast.title}</strong>{toast.description && <p>{toast.description}</p>}</div><button onClick={() => setToasts(items => items.filter(item => item.id !== toast.id))}><X size={15} /></button></article>)}</div>
    {confirmation && <div className="confirm-layer" role="alertdialog" aria-modal="true"><button className="modal-backdrop" onClick={() => !processing && setConfirmation(null)} aria-label="Batal" /><section className="confirm-card"><div className={`confirm-icon ${confirmation.tone ?? 'danger'}`}><AlertTriangle size={21} /></div><div className="confirm-copy"><h2>{confirmation.title}</h2><p>{confirmation.description}</p></div><div className="confirm-actions"><button disabled={processing} onClick={() => setConfirmation(null)}>Batal</button><button disabled={processing} className={confirmation.tone ?? 'danger'} onClick={approve}>{processing && <LoaderCircle className="spin" size={15} />}{confirmation.confirmLabel ?? 'Hapus'}</button></div></section></div>}
  </>
}
