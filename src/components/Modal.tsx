import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null
  return <div className="modal-layer" role="dialog" aria-modal="true"><button className="modal-backdrop" onClick={onClose} aria-label="Tutup" /><section className="modal-card"><div className="modal-header"><div><span>CLAVIAR</span><h2>{title}</h2></div><button onClick={onClose}><X size={19} /></button></div>{children}</section></div>
}
