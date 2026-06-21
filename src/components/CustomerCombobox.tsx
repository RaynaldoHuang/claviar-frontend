import { useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { Customer } from '@/types'

export function CustomerCombobox({ customers, value, onChange }: { customers: Customer[]; value?: number; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('')
  const selected = customers.find(customer => customer.id === Number(value))
  const filtered = customers.filter(customer => `${customer.name} ${customer.phone ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="customer-combobox"><button type="button" onClick={() => setOpen(!open)}><span>{selected ? <><strong>{selected.name}</strong><small>{selected.phone || 'No phone'}</small></> : 'Select customer'}</span><ChevronDown size={15} /></button>{open && <div className="customer-options"><div><Search size={14} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or phone..." /></div><section>{filtered.map(customer => <button type="button" key={customer.id} onClick={() => { onChange(customer.id); setOpen(false); setQuery('') }}><span><strong>{customer.name}</strong><small>{customer.phone || 'No phone'}</small></span>{customer.id === Number(value) && <Check size={14} />}</button>)}{!filtered.length && <p>No customers found.</p>}</section></div>}</div>
}
