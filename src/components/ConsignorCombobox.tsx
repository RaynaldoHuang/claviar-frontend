import { useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type { Consignor } from '@/types'

export function ConsignorCombobox({ consignors, value, onChange, placeholder = 'All consignors' }: { consignors: Consignor[]; value: string; onChange: (id: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('')
  const selected = consignors.find(item => item.id === Number(value))
  const filtered = consignors.filter(item => `${item.name} ${item.phone ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  return <div className={`filter-combobox ${!value && placeholder !== 'All consignors' ? 'required' : ''}`}><button type="button" onClick={() => setOpen(!open)}><span>{selected?.name ?? placeholder}</span>{selected ? <X size={14} onClick={event => { event.stopPropagation(); onChange(''); setOpen(false) }} /> : <ChevronDown size={14} />}</button>{open && <div><label><Search size={14} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search consignor..." /></label><section><button type="button" onClick={() => { onChange(''); setOpen(false) }}>All consignors{!value && <Check size={13} />}</button>{filtered.map(item => <button type="button" key={item.id} onClick={() => { onChange(String(item.id)); setOpen(false); setQuery('') }}><span><strong>{item.name}</strong><small>{item.phone || 'No phone'}</small></span>{item.id === Number(value) && <Check size={13} />}</button>)}</section></div>}</div>
}
