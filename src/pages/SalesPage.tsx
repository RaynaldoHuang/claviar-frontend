import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { currency, shortDate } from '@/lib/format'
import type { ApiCollection, Sale } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { StatusBadge } from '@/components/StatusBadge'
import { DateRangeFilter } from '@/components/DatePicker'
import { Pagination } from '@/components/Pagination'

export function SalesPage() {
  const [urlParams] = useSearchParams()
  const [search, setSearch] = useState(() => urlParams.get('search') ?? '')
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const sales = useQuery({ queryKey: ['sales', search, from, to, page], queryFn: async () => (await api.get<ApiCollection<Sale>>('/sales', { params: { search, from: from || undefined, to: to || undefined, page, per_page: 10 } })).data })

  return <main className="dashboard-content">
    <PageHeader eyebrow="Transactions" title="Sales history" description="Sales are recorded automatically when a draft product card is completed." />
    <section className="panel"><ResourceToolbar search={search} onSearch={value => { setSearch(value); setPage(1) }} filter={<DateRangeFilter from={from} to={to} onFromChange={value => { setFrom(value); setPage(1) }} onToChange={value => { setTo(value); setPage(1) }} />} /><div className="table-scroll"><table><thead><tr><th>Product</th><th>Customer</th><th>Phone</th><th>Sale price</th><th>Payment</th><th>Date</th><th>Status</th></tr></thead><tbody>{sales.data?.data.map(sale => <tr key={sale.id}><td><strong>{sale.product.name ?? 'Unnamed product'}</strong><br /><small>{sale.product.code}</small></td><td>{sale.customer_name}</td><td>{sale.customer_phone || '—'}</td><td><strong>{currency(sale.sale_price)}</strong></td><td>{sale.payment_method}</td><td>{shortDate(sale.sold_at)}</td><td><StatusBadge status="paid" /></td></tr>)}</tbody></table>{!sales.isLoading && !sales.data?.data.length && <div className="empty-state">No sales recorded.</div>}</div><Pagination page={sales.data?.meta?.current_page ?? page} lastPage={sales.data?.meta?.last_page ?? 1} total={sales.data?.meta?.total ?? 0} onPageChange={setPage} /></section>
  </main>
}
