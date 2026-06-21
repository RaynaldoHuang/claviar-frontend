import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { currency, shortDate } from '@/lib/format'
import type { ApiCollection, Sale } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { StatusBadge } from '@/components/StatusBadge'

export function SalesPage() {
  const [urlParams] = useSearchParams()
  const [search, setSearch] = useState(() => urlParams.get('search') ?? '')
  const sales = useQuery({ queryKey: ['sales', search], queryFn: async () => (await api.get<ApiCollection<Sale>>('/sales', { params: { search } })).data })

  return <main className="dashboard-content">
    <PageHeader eyebrow="Transactions" title="Sales history" description="Sales are recorded automatically when a draft product card is completed." />
    <section className="panel"><ResourceToolbar search={search} onSearch={setSearch} /><div className="table-scroll"><table><thead><tr><th>Product</th><th>Customer</th><th>Phone</th><th>Sale price</th><th>Payment</th><th>Date</th><th>Status</th></tr></thead><tbody>{sales.data?.data.map(sale => <tr key={sale.id}><td><strong>{sale.product.name ?? 'Unnamed product'}</strong><br /><small>{sale.product.code}</small></td><td>{sale.customer_name}</td><td>{sale.customer_phone || '—'}</td><td><strong>{currency(sale.sale_price)}</strong></td><td>{sale.payment_method}</td><td>{shortDate(sale.sold_at)}</td><td><StatusBadge status="paid" /></td></tr>)}</tbody></table>{!sales.isLoading && !sales.data?.data.length && <div className="empty-state">No sales recorded.</div>}</div></section>
  </main>
}
