import { Plus } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, action, onAction }: { eyebrow: string; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action && <button className="primary-button" onClick={onAction}><Plus size={16} />{action}</button>}</div>
}
