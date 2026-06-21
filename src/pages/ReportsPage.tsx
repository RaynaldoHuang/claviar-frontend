import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileBarChart, PackageCheck, ReceiptText, TrendingUp, WalletCards } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { currency, shortDate, titleCase } from '@/lib/format'
import type { Product } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { DateRangeFilter } from '@/components/DatePicker'
import { Pagination } from '@/components/Pagination'

const reportTypes = ['sales', 'revenue', 'profit', 'product-status', 'consignors'] as const
type ReportType = (typeof reportTypes)[number]
type ReportSale = { id: number; product: Product; customer_name: string; customer_phone?: string; sale_price: number; payment_method: string; sold_at: string }
type FinancialReport = { total?: number; transactions?: number; revenue?: number; cost?: number; profit?: number; items: ReportSale[] }
type StatusRow = { status: string; total: number }
type ConsignorRow = { id: number; name: string; products_count: number; payouts_sum_amount?: number }

function SalesTable({ items, showProfit = false }: { items: ReportSale[]; showProfit?: boolean }) {
  const [page, setPage] = useState(1)
  const lastPage = Math.max(Math.ceil(items.length / 10), 1)
  const safePage = Math.min(page, lastPage)
  const rows = items.slice((safePage - 1) * 10, safePage * 10)
  return <><div className="table-scroll"><table className="report-table"><thead><tr><th>Product</th><th>Consignor</th><th>Customer</th><th>Payment</th><th>Sold at</th>{showProfit && <th>Initial price</th>}<th>Sale price</th>{showProfit && <th>Profit</th>}</tr></thead><tbody>{rows.map(sale => <tr key={sale.id}><td><strong>{sale.product?.name ?? 'Unnamed product'}</strong><br /><small>{sale.product?.code}</small></td><td>{sale.product?.consignor?.name ?? '—'}</td><td><strong>{sale.customer_name}</strong><br /><small>{sale.customer_phone || 'No phone'}</small></td><td>{sale.payment_method}</td><td>{shortDate(sale.sold_at)}</td>{showProfit && <td>{currency(sale.product?.purchase_price ?? 0)}</td>}<td><strong>{currency(sale.sale_price)}</strong></td>{showProfit && <td className="profit-cell">{currency(sale.sale_price - (sale.product?.purchase_price ?? 0))}</td>}</tr>)}</tbody></table>{!items.length && <div className="empty-state">No transactions found for this period.</div>}</div><Pagination page={safePage} lastPage={lastPage} total={items.length} onPageChange={setPage} /></>
}

export function ReportsPage() {
  const [type, setType] = useState<ReportType>('sales')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reportPage, setReportPage] = useState(1)
  const query = useQuery({ queryKey: ['report', type, from, to], queryFn: async () => (await api.get(`/reports/${type}`, { params: { from: from || undefined, to: to || undefined } })).data.data })
  const financial = !Array.isArray(query.data) && query.data ? query.data as FinancialReport : null
  const sales = (type === 'sales' ? query.data : financial?.items) as ReportSale[] | undefined
  const statuses = type === 'product-status' && Array.isArray(query.data) ? query.data as StatusRow[] : []
  const consignors = type === 'consignors' && Array.isArray(query.data) ? query.data as ConsignorRow[] : []
  const totalProducts = statuses.reduce((sum, item) => sum + Number(item.total), 0)
  const consignorRows = consignors.slice((reportPage - 1) * 10, reportPage * 10)

  return <main className="dashboard-content report-page"><PageHeader eyebrow="Insights" title="Reports" description="Review sales, revenue, profit, product status, and consignor performance." />
    <section className="panel report-controls"><div className="report-tabs">{reportTypes.map(item => <button className={type === item ? 'active' : ''} onClick={() => { setType(item); setReportPage(1) }} key={item}>{titleCase(item)}</button>)}</div><div className="date-filters"><DateRangeFilter from={from} to={to} onFromChange={value => { setFrom(value); setReportPage(1) }} onToChange={value => { setTo(value); setReportPage(1) }} /><button className="select-button report-print" onClick={() => window.print()}><Download size={14} />Print report</button></div></section>

    {query.isLoading ? <section className="panel report-feedback"><FileBarChart size={26} /><strong>Preparing report...</strong><p>Please wait while Claviar compiles the data.</p></section> : query.error ? <section className="panel report-feedback error"><FileBarChart size={26} /><strong>Report could not be loaded</strong><p>{errorMessage(query.error)}</p></section> : <>
      {type === 'sales' && <><section className="report-kpis"><article><span><ReceiptText size={16} />Transactions</span><strong>{sales?.length ?? 0}</strong><small>Completed sales in selected period</small></article><article><span><WalletCards size={16} />Sales value</span><strong>{currency(sales?.reduce((sum, sale) => sum + Number(sale.sale_price), 0) ?? 0)}</strong><small>Total customer payments</small></article></section><section className="panel report-data"><div className="panel-heading"><div><h2>Sales details</h2><p>Every completed transaction in this period</p></div></div><SalesTable items={sales ?? []} /></section></>}

      {type === 'revenue' && <><section className="report-kpis"><article><span><TrendingUp size={16} />Total revenue</span><strong>{currency(financial?.total ?? 0)}</strong><small>Gross sales value</small></article><article><span><ReceiptText size={16} />Transactions</span><strong>{financial?.transactions ?? financial?.items?.length ?? 0}</strong><small>Completed sales</small></article><article><span><TrendingUp size={16} />Average sale</span><strong>{currency((financial?.total ?? 0) / Math.max(financial?.transactions ?? 0, 1))}</strong><small>Revenue per transaction</small></article></section><section className="panel report-data"><div className="panel-heading"><div><h2>Revenue details</h2><p>Transactions contributing to gross revenue</p></div></div><SalesTable items={financial?.items ?? []} /></section></>}

      {type === 'profit' && <><section className="report-kpis"><article><span><WalletCards size={16} />Revenue</span><strong>{currency(financial?.revenue ?? 0)}</strong><small>Total sales value</small></article><article><span><ReceiptText size={16} />Consignor cost</span><strong>{currency(financial?.cost ?? 0)}</strong><small>Total initial product price</small></article><article className="highlight"><span><TrendingUp size={16} />Gross profit</span><strong>{currency(financial?.profit ?? 0)}</strong><small>Revenue minus consignor cost</small></article></section><section className="panel report-data"><div className="panel-heading"><div><h2>Profit details</h2><p>Profit contribution for each sold product</p></div></div><SalesTable items={financial?.items ?? []} showProfit /></section></>}

      {type === 'product-status' && <><section className="report-kpis"><article><span><PackageCheck size={16} />Total product cards</span><strong>{totalProducts}</strong><small>All inventory statuses</small></article>{statuses.map(item => <article key={item.status}><span><StatusBadge status={item.status} /></span><strong>{item.total}</strong><small>{totalProducts ? Math.round((Number(item.total) / totalProducts) * 100) : 0}% of all products</small><div className="status-progress"><i style={{ width: `${totalProducts ? (Number(item.total) / totalProducts) * 100 : 0}%` }} /></div></article>)}</section></>}

      {type === 'consignors' && <section className="panel report-data"><div className="panel-heading"><div><h2>Consignor report</h2><p>Inventory and payout summary by consignor</p></div><span className="table-count">{consignors.length} consignors</span></div><div className="table-scroll"><table className="report-table"><thead><tr><th>Consignor</th><th>Total products</th><th>Total payouts</th></tr></thead><tbody>{consignorRows.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.products_count}</td><td><strong>{currency(item.payouts_sum_amount ?? 0)}</strong></td></tr>)}</tbody></table>{!consignors.length && <div className="empty-state">No consignor data available.</div>}</div><Pagination page={reportPage} lastPage={Math.max(Math.ceil(consignors.length / 10), 1)} total={consignors.length} onPageChange={setReportPage} /></section>}
    </>}
  </main>
}
