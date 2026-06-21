import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp, Eye, ImageIcon, WalletCards } from 'lucide-react'
import { api } from '@/api/client'
import { currency, shortDate } from '@/lib/format'
import type { ApiCollection, OutstandingPayout, Payout, PayoutItem } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { StatusBadge } from '@/components/StatusBadge'
import { feedback } from '@/components/feedback-store'
import { Pagination } from '@/components/Pagination'

function ItemTable({ items }: { items: PayoutItem[] }) {
  const [page, setPage] = useState(1)
  const rows = items.slice((page - 1) * 10, page * 10)
  return <><div className="settlement-items"><table><thead><tr><th>Product</th><th>Customer</th><th>Sold at</th><th>Consignor price</th><th>Sale price</th><th>Profit</th></tr></thead><tbody>{rows.map(item => <tr key={item.sale_id}><td><div className="settlement-product">{item.image ? <img src={item.image} alt={item.name} /> : <span><ImageIcon size={15} /></span>}<div><strong>{item.name}</strong><small>{item.code}</small></div></div></td><td><strong>{item.customer_name}</strong><br /><small>{item.customer_phone || 'No phone'} · {item.payment_method || '—'}</small></td><td>{shortDate(item.sold_at)}</td><td><strong>{currency(item.consignor_price)}</strong></td><td>{currency(item.sale_price)}</td><td className="profit-cell">{currency(item.profit ?? item.sale_price - item.consignor_price)}</td></tr>)}</tbody></table></div><Pagination page={page} lastPage={Math.max(Math.ceil(items.length / 10), 1)} total={items.length} onPageChange={setPage} /></>
}

export function PayoutsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [viewing, setViewing] = useState<Payout | null>(null)
  const outstanding = useQuery({ queryKey: ['payouts', 'outstanding'], queryFn: async () => (await api.get<{ data: OutstandingPayout[] }>('/payouts/outstanding')).data.data })
  const history = useQuery({ queryKey: ['payouts', 'history', status, page], queryFn: async () => (await api.get<ApiCollection<Payout>>('/payouts', { params: { status, page, per_page: 10 } })).data })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['payouts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) }
  const createPayout = useMutation({ mutationFn: (consignorId: number) => api.post('/payouts', { consignor_id: consignorId }), onSuccess: refresh })
  const markPaid = useMutation({ mutationFn: (id: number) => api.patch(`/payouts/${id}/mark-paid`), onSuccess: refresh })
  const loadDetail = async (payout: Payout) => { const { data } = await api.get<{ data: Payout }>(`/payouts/${payout.id}`); setViewing(data.data) }

  return <main className="dashboard-content"><PageHeader eyebrow="Finance" title="Consignor payouts" description="Settle the total initial price of sold items without counting a sale twice." />
    <section className="outstanding-section"><div className="section-heading"><div><span>READY TO SETTLE</span><h2>Unpaid sold items</h2></div><strong>{outstanding.data?.length ?? 0} consignors</strong></div>
      <div className="settlement-list">{outstanding.data?.map(group => <article className="settlement-card" key={group.consignor.id}><div className="settlement-summary"><div className="settlement-person"><span className="avatar">{group.consignor.name.slice(0, 2).toUpperCase()}</span><div><strong>{group.consignor.name}</strong><small>{group.items_count} sold items · {group.consignor.phone || 'No phone'}</small></div></div><div className="settlement-metrics"><div><span>Sales value</span><strong>{currency(group.total_sale_value)}</strong></div><div className="payout-total"><span>Amount to payout</span><strong>{currency(group.total_amount)}</strong></div></div><div className="settlement-buttons"><button onClick={() => setExpanded(current => current === group.consignor.id ? null : group.consignor.id)}>{expanded === group.consignor.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}Details</button><button className="primary-button" onClick={() => feedback.confirm({ title: `Create payout for ${group.consignor.name}?`, description: `${group.items_count} sold items with a total payout of ${currency(group.total_amount)} will be locked into one payout.`, confirmLabel: 'Create payout', tone: 'primary', action: () => createPayout.mutateAsync(group.consignor.id) })}><WalletCards size={15} />Create payout</button></div></div>{expanded === group.consignor.id && <ItemTable items={group.items} />}</article>)}</div>
      {!outstanding.isLoading && !outstanding.data?.length && <div className="panel empty-settlement"><Check size={22} /><strong>All consignors are settled</strong><p>No unpaid sold items are waiting for payout.</p></div>}
    </section>
    <section className="panel payout-history"><div className="panel-heading"><div><h2>Payout history</h2><p>Pending and completed consignor settlements</p></div></div><ResourceToolbar search="" onSearch={() => {}} filter={<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select>} /><div className="table-scroll"><table><thead><tr><th>Consignor</th><th>Items</th><th>Amount</th><th>Status</th><th>Created</th><th>Paid at</th><th>Actions</th></tr></thead><tbody>{history.data?.data.map(payout => <tr key={payout.id}><td><strong>{payout.consignor.name}</strong></td><td>{payout.items_count ?? 0}</td><td><strong>{currency(payout.amount)}</strong></td><td><StatusBadge status={payout.status} /></td><td>{shortDate(payout.created_at)}</td><td>{shortDate(payout.paid_at)}</td><td><div className="row-actions"><button title="View payout details" onClick={() => loadDetail(payout)}><Eye size={15} /></button>{payout.status === 'pending' && <button className="paid-action" title="Mark as paid" onClick={() => feedback.confirm({ title: 'Mark this payout as paid?', description: `${currency(payout.amount)} for ${payout.consignor.name} will be marked as paid.`, confirmLabel: 'Yes, mark paid', tone: 'primary', action: () => markPaid.mutateAsync(payout.id) })}><Check size={15} /></button>}</div></td></tr>)}</tbody></table>{!history.isLoading && !history.data?.data.length && <div className="empty-state">No payout history found.</div>}</div><Pagination page={history.data?.meta?.current_page ?? page} lastPage={history.data?.meta?.last_page ?? 1} total={history.data?.meta?.total ?? 0} onPageChange={setPage} /></section>
    <Modal open={Boolean(viewing)} title="Payout details" onClose={() => setViewing(null)}>{viewing && <div className="payout-detail"><div className="payout-detail-summary"><div><span>CONSIGNOR</span><strong>{viewing.consignor.name}</strong></div><div><span>TOTAL PAYOUT</span><strong>{currency(viewing.amount)}</strong></div><StatusBadge status={viewing.status} /></div><ItemTable items={viewing.items ?? []} /><div className="detail-actions"><button onClick={() => setViewing(null)}>Close</button></div></div>}</Modal>
  </main>
}
