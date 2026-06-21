export type ToastKind = 'success' | 'error'
export type ToastMessage = { id: number; kind: ToastKind; title: string; description?: string }
export type Confirmation = { title: string; description: string; confirmLabel?: string; tone?: 'danger' | 'primary'; action: () => unknown | Promise<unknown> }

type FeedbackEvent = { type: 'toast'; payload: ToastMessage } | { type: 'confirm'; payload: Confirmation }
const listeners = new Set<(event: FeedbackEvent) => void>()
let sequence = 0

export const feedback = {
  subscribe(listener: (event: FeedbackEvent) => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  toast(kind: ToastKind, title: string, description?: string) { const event: FeedbackEvent = { type: 'toast', payload: { id: ++sequence, kind, title, description } }; listeners.forEach(listener => listener(event)) },
  confirm(payload: Confirmation) { const event: FeedbackEvent = { type: 'confirm', payload }; listeners.forEach(listener => listener(event)) },
}
