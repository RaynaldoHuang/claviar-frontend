import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, CircleDollarSign, Package, ShoppingBag, Users } from 'lucide-react'
import { api } from '@/api/client'
import { currency, shortDate } from '@/lib/format'
import type { Dashboard } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'

const empty: Dashboard = { total_products: 0, available_products: 0, sold_products: 0, total_consignors: 0, monthly_revenue: 0, monthly_profit: 0, trend: [], recent_sales: [] }
export function DashboardPage() {
  const { data = empty, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<{ data: Dashboard }>('/dashboard')).data.data })
  const stats = [{ label: 'Total products', value: data.total_products, icon: Package }, { label: 'Available products', value: data.available_products, icon: ShoppingBag }, { label: 'Total consignors', value: data.total_consignors, icon: Users }, { label: 'Monthly revenue', value: currency(data.monthly_revenue), icon: CircleDollarSign }]
  const max = Math.max(...data.trend.map(item => item.revenue), 1)
  return <main className="dashboard-content"><PageHeader eyebrow="Dashboard" title="Preloved at a glance" description="Monitor inventory, sales, and consignor performance from one place." />
    <section className="stats-grid">{stats.map(({ label, value, icon: Icon }) => <article className="stat-card" key={label}><div className="stat-title"><p>{label}</p><span><Icon size={16} /></span></div><div className="stat-row"><strong>{isLoading ? '—' : value}</strong><span className="positive"><ArrowUpRight size={14} />Live</span></div><small>Updated from current records</small></article>)}</section>
    <section className="content-grid"><article className="panel revenue-panel"><div className="panel-heading"><div><h2>Revenue overview</h2><p>Sales revenue for the last six months</p></div><strong>{currency(data.monthly_profit)} profit</strong></div><div className="bar-chart">{data.trend.length ? data.trend.map(item => <div className="bar-column" key={item.month}><div className="bar-value">{currency(item.revenue)}</div><div className="bar" style={{ height: `${Math.max((item.revenue / max) * 150, 4)}px` }} /><span>{item.month}</span></div>) : <div className="empty-state">Sales trend will appear after your first transaction.</div>}</div></article>
      <article className="panel quick-panel"><div className="panel-heading"><div><h2>Inventory health</h2><p>Current product distribution</p></div></div><div className="health-list"><div><span>Available</span><strong>{data.available_products}</strong></div><div><span>Sold</span><strong>{data.sold_products}</strong></div><div><span>Other status</span><strong>{Math.max(data.total_products - data.available_products - data.sold_products, 0)}</strong></div></div></article></section>
    <section className="panel orders-panel"><div className="panel-heading"><div><h2>Recent sales</h2><p>Latest completed preloved transactions</p></div></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Customer</th><th>Payment</th><th>Sale price</th><th>Sold at</th><th>Status</th></tr></thead><tbody>{data.recent_sales.length ? data.recent_sales.map(sale => <tr key={sale.id}><td><strong>{sale.product?.name}</strong><br /><small>{sale.product?.code}</small></td><td>{sale.customer_name}</td><td>{sale.payment_method}</td><td><strong>{currency(sale.sale_price)}</strong></td><td>{shortDate(sale.sold_at)}</td><td><StatusBadge status="paid" /></td></tr>) : <tr><td colSpan={6}><div className="empty-state">No sales recorded yet.</div></td></tr>}</tbody></table></div></section>
  </main>
}
