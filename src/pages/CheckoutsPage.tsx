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

export function CheckoutsPage() {
  const [search, setSearch] = useState('')
  const [consignorFilter, setConsignorFilter] = useState('')
  const [viewing, setViewing] = useState<Checkout | null>(null)
  const consignors = useQuery({ queryKey: ['consignors', 'options'], queryFn: async () => (await api.get<ApiCollection<Consignor>>('/consignors', { params: { per_page: 100 } })).data.data })
  const checkouts = useQuery({ queryKey: ['checkouts', search, consignorFilter], queryFn: async () => (await api.get<{ data: Checkout[] }>('/checkouts', { params: { search, consignor_id: consignorFilter || undefined } })).data.data })

  return <main className="dashboard-content">
    <PageHeader eyebrow="Sales" title="Customer purchases" description="Each row represents one completed checkout and payment." />
    <div className="product-filters"><ResourceToolbar search={search} onSearch={setSearch} filter={<ConsignorCombobox consignors={consignors.data ?? []} value={consignorFilter} onChange={setConsignorFilter} />} /></div>
    <section className="panel"><div className="panel-heading"><div><h2>Checkout history</h2><p>Payments from the same customer remain separated</p></div><span className="table-count">{checkouts.data?.length ?? 0} checkouts</span></div>
      <div className="table-scroll desktop-product-table"><table className="products-table customer-purchase-groups"><thead><tr><th>Checkout</th><th>Customer</th><th>Phone</th><th>Items</th><th>Payment total</th><th>Paid at</th><th>Action</th></tr></thead><tbody>{checkouts.data?.map(checkout => <tr key={checkout.id}><td><strong>{checkout.code}</strong><br /><small>{checkout.payment_method}</small></td><td><strong>{checkout.customer.name}</strong></td><td>{checkout.customer.phone || '—'}</td><td>{checkout.items_count} items</td><td><strong>{currency(checkout.total_amount)}</strong></td><td>{shortDate(checkout.paid_at)}</td><td><button className="table-text-action" onClick={() => setViewing(checkout)}><Eye size={15} />View checkout</button></td></tr>)}</tbody></table></div>
      <div className="mobile-product-list">{checkouts.data?.map(checkout => <button className="customer-purchase-group-card" key={checkout.id} onClick={() => setViewing(checkout)}><span className="avatar">{checkout.customer.name.slice(0, 2).toUpperCase()}</span><span><strong>{checkout.customer.name}</strong><small>{checkout.code} · {checkout.payment_method}</small><small>{checkout.items_count} items · {shortDate(checkout.paid_at)}</small></span><b>{currency(checkout.total_amount)}</b></button>)}</div>
      {!checkouts.isLoading && !checkouts.data?.length && <div className="empty-state">No completed checkouts yet.</div>}
    </section>
    <Modal open={Boolean(viewing)} title="Checkout details" onClose={() => setViewing(null)}>{viewing && <div className="customer-detail">
      <div className="customer-detail-header"><span className="avatar">{viewing.customer.name.slice(0, 2).toUpperCase()}</span><div><h3>{viewing.customer.name}</h3><p>{viewing.code} · {viewing.payment_method} · {shortDate(viewing.paid_at)}</p></div><div><span>PAYMENT TOTAL</span><strong>{currency(viewing.total_amount)}</strong></div></div>
      <div className="customer-purchase-heading"><span>ITEMS IN THIS CHECKOUT</span><h4>{viewing.items_count} products</h4></div>
      <div className="customer-purchases">{viewing.items.map(item => <article key={item.id}>{item.product.image ? <img src={item.product.image} alt={item.product.name} /> : <span className="purchase-placeholder"><ImageIcon size={18} /></span>}<div><strong>{item.product.name}</strong><small>{item.product.code}</small><p>Consignor: {item.product.consignor || '—'}</p></div><b>{currency(item.sale_price)}</b></article>)}</div>
      <div className="detail-actions"><button onClick={() => setViewing(null)}>Close</button></div>
    </div>}</Modal>
  </main>
}
