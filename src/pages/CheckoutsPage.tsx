import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, ImageIcon } from 'lucide-react'
import { api } from '@/api/client'
import type { ApiCollection, Checkout, Consignor } from '@/types'
import { currency, shortDate } from '@/lib/format'
import { ConsignorCombobox } from '@/components/ConsignorCombobox'
import { Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { DateRangeFilter } from '@/components/DatePicker'
import { Pagination } from '@/components/Pagination'

export function CheckoutsPage() {
  const [search, setSearch] = useState('')
  const [consignorFilter, setConsignorFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<Checkout | null>(null)
  const consignors = useQuery({ queryKey: ['consignors', 'options'], queryFn: async () => (await api.get<ApiCollection<Consignor>>('/consignors', { params: { per_page: 100 } })).data.data })
  const checkouts = useQuery({ queryKey: ['checkouts', search, consignorFilter, from, to], queryFn: async () => (await api.get<{ data: Checkout[] }>('/checkouts', { params: { search, consignor_id: consignorFilter || undefined, from: from || undefined, to: to || undefined } })).data.data })
  const checkoutRows = checkouts.data ?? []
  const paginatedCheckouts = checkoutRows.slice((page - 1) * 10, page * 10)
  const lastPage = Math.max(Math.ceil(checkoutRows.length / 10), 1)

  return <main className="dashboard-content">
    <PageHeader eyebrow="Sales" title="Customer purchases" description="Each row represents one completed checkout and payment." />
    <div className="product-filters"><ResourceToolbar search={search} onSearch={value => { setSearch(value); setPage(1) }} filter={<div className="history-filters"><ConsignorCombobox consignors={consignors.data ?? []} value={consignorFilter} onChange={value => { setConsignorFilter(value); setPage(1) }} /><DateRangeFilter from={from} to={to} onFromChange={value => { setFrom(value); setPage(1) }} onToChange={value => { setTo(value); setPage(1) }} /></div>} /></div>
    <section className="panel"><div className="panel-heading"><div><h2>Checkout history</h2><p>Payments from the same customer remain separated</p></div><span className="table-count">{checkoutRows.length} checkouts</span></div>
      <div className="table-scroll desktop-product-table"><table className="products-table customer-purchase-groups"><thead><tr><th>Checkout</th><th>Customer</th><th>Phone</th><th>Items</th><th>Payment total</th><th>Paid at</th><th>Action</th></tr></thead><tbody>{paginatedCheckouts.map(checkout => <tr key={checkout.id}><td><strong>{checkout.code}</strong><br /><small>{checkout.payment_method}</small></td><td><strong>{checkout.customer.name}</strong></td><td>{checkout.customer.phone || '—'}</td><td>{checkout.items_count} items</td><td><strong>{currency(checkout.total_amount)}</strong></td><td>{shortDate(checkout.paid_at)}</td><td><button className="table-text-action" onClick={() => setViewing(checkout)}><Eye size={15} />View checkout</button></td></tr>)}</tbody></table></div>
      <div className="mobile-product-list">{paginatedCheckouts.map(checkout => <button className="customer-purchase-group-card" key={checkout.id} onClick={() => setViewing(checkout)}><span className="avatar">{checkout.customer.name.slice(0, 2).toUpperCase()}</span><span><strong>{checkout.customer.name}</strong><small>{checkout.code} · {checkout.payment_method}</small><small>{checkout.items_count} items · {shortDate(checkout.paid_at)}</small></span><b>{currency(checkout.total_amount)}</b></button>)}</div>
      {!checkouts.isLoading && !checkoutRows.length && <div className="empty-state">No completed checkouts yet.</div>}<Pagination page={page} lastPage={lastPage} total={checkoutRows.length} onPageChange={setPage} />
    </section>
    <Modal open={Boolean(viewing)} title="Checkout details" onClose={() => setViewing(null)}>{viewing && <div className="customer-detail">
      <div className="customer-detail-header"><span className="avatar">{viewing.customer.name.slice(0, 2).toUpperCase()}</span><div><h3>{viewing.customer.name}</h3><p>{viewing.code} · {viewing.payment_method} · {shortDate(viewing.paid_at)}</p></div><div><span>PAYMENT TOTAL</span><strong>{currency(viewing.total_amount)}</strong></div></div>
      <div className="customer-purchase-heading"><span>ITEMS IN THIS CHECKOUT</span><h4>{viewing.items_count} products</h4></div>
      <div className="customer-purchases">{viewing.items.map(item => <article key={item.id}>{item.product.image ? <img src={item.product.image} alt={item.product.name} /> : <span className="purchase-placeholder"><ImageIcon size={18} /></span>}<div><strong>{item.product.name}</strong><small>{item.product.code}</small><p>Consignor: {item.product.consignor || '—'}</p></div><b>{currency(item.sale_price)}</b></article>)}</div>
      <div className="detail-actions"><button onClick={() => setViewing(null)}>Close</button></div>
    </div>}</Modal>
  </main>
}
