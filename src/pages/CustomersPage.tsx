import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit3, Eye, ImageIcon, Phone, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { currency, shortDate } from '@/lib/format'
import type { ApiCollection, Customer } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { feedback } from '@/components/feedback-store'
import { PositiveIntegerInput } from '@/components/PositiveIntegerInput'
import { Pagination } from '@/components/Pagination'

const schema = z.object({ name: z.string().min(2), phone: z.union([z.literal(''), z.string().min(8)]).optional(), notes: z.string().optional() })
type CustomerForm = z.infer<typeof schema>

export function CustomersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [urlParams] = useSearchParams()
  const [search, setSearch] = useState(() => urlParams.get('search') ?? '')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [ordering, setOrdering] = useState<Customer | null>(null)
  const [orderQuantity, setOrderQuantity] = useState('1')
  const form = useForm<CustomerForm>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', notes: '' } })
  const customers = useQuery({ queryKey: ['customers', search, page], queryFn: async () => (await api.get<ApiCollection<Customer>>('/customers', { params: { search, page, per_page: 10 } })).data })
  const openDetail = async (customer: Customer) => { const { data } = await api.get<{ data: Customer }>(`/customers/${customer.id}`); setViewing(data.data) }
  const closeForm = () => { setFormOpen(false); setEditing(null); form.reset({ name: '', phone: '', notes: '' }) }
  const edit = (customer: Customer) => { setEditing(customer); form.reset({ name: customer.name, phone: customer.phone ?? '', notes: customer.notes ?? '' }); setFormOpen(true) }
  const save = useMutation({ mutationFn: (values: CustomerForm) => editing ? api.put(`/customers/${editing.id}`, values) : api.post('/customers', values), onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); closeForm() } })
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/customers/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }) })

  return <main className="dashboard-content"><PageHeader eyebrow="Buyers" title="Customers" description="Manage customer data and review every product they purchased." action="Add customer" onAction={() => { form.reset({ name: '', phone: '', notes: '' }); setFormOpen(true) }} />
    <section className="customer-kpis"><article><span>Registered customers</span><strong>{customers.data?.meta?.total ?? customers.data?.data.length ?? 0}</strong><small>Available in the sale dropdown</small></article><article><span>Visible customer spending</span><strong>{currency(customers.data?.data.reduce((sum, customer) => sum + Number(customer.total_spent), 0) ?? 0)}</strong><small>Across this page</small></article></section>
    <section className="panel customer-panel"><ResourceToolbar search={search} onSearch={value => { setSearch(value); setPage(1) }} /><div className="table-scroll customer-desktop-table"><table><thead><tr><th>Customer</th><th>Phone</th><th>Purchases</th><th>Total spent</th><th>Last purchase</th><th>Actions</th></tr></thead><tbody>{customers.data?.data.map(customer => <tr key={customer.id}><td><div className="customer-cell"><span className="avatar tiny">{customer.name.slice(0, 2).toUpperCase()}</span><strong>{customer.name}</strong></div></td><td>{customer.phone || "—"}</td><td>{customer.purchases_count}</td><td><strong>{currency(customer.total_spent)}</strong></td><td>{shortDate(customer.last_purchase_at)}</td><td><div className="row-actions"><button className="intake-action" title="Create order" onClick={() => { setOrdering(customer); setOrderQuantity('1') }}><ShoppingCart size={15} /></button><button title="View purchases" onClick={() => openDetail(customer)}><Eye size={15} /></button><button title="Edit customer" onClick={() => edit(customer)}><Edit3 size={15} /></button><button title="Delete customer" onClick={() => feedback.confirm({ title: 'Delete customer?', description: 'Customers with purchase history cannot be deleted.', confirmLabel: 'Delete customer', tone: 'danger', action: () => remove.mutateAsync(customer.id) })}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
      <div className="customer-mobile-list">{customers.data?.data.map(customer => <button key={customer.id} onClick={() => openDetail(customer)}><span className="avatar">{customer.name.slice(0, 2).toUpperCase()}</span><span><strong>{customer.name}</strong><small><Phone size={11} />{customer.phone || "—"}</small><small><ShoppingBag size={11} />{customer.purchases_count} purchases</small></span><b>{currency(customer.total_spent)}</b></button>)}</div>{!customers.isLoading && !customers.data?.data.length && <div className="empty-state">No customers found.</div>}<Pagination page={customers.data?.meta?.current_page ?? page} lastPage={customers.data?.meta?.last_page ?? 1} total={customers.data?.meta?.total ?? 0} onPageChange={setPage} />
    </section>
    <Modal open={Boolean(ordering)} title="Choose product cards" onClose={() => setOrdering(null)}>{ordering && <div className="form-grid single"><div className="intake-summary"><span>CUSTOMER</span><strong>{ordering.name}</strong><p>Cards may come from different consignors and use one payment.</p></div><label>Number of product cards<PositiveIntegerInput max={50} value={orderQuantity} onChange={setOrderQuantity} placeholder="Masukkan jumlah card" /></label><div className="form-actions"><button onClick={() => setOrdering(null)}>Cancel</button><button className="primary-button" disabled={!orderQuantity} onClick={() => navigate("/products?order_customer=" + ordering.id + "&quantity=" + orderQuantity)}><ShoppingCart size={15} />Select {orderQuantity || 0} cards</button></div></div>}</Modal>
    <Modal open={formOpen} title={editing ? 'Edit customer' : 'New customer'} onClose={closeForm}><form className="form-grid single" onSubmit={form.handleSubmit(values => save.mutate(values))}><label>Customer name<input placeholder="Full name" {...form.register('name')} />{form.formState.errors.name && <small>Name must contain at least 2 characters.</small>}</label><label>Phone number<input type="tel" placeholder="08..." {...form.register('phone')} />{form.formState.errors.phone && <small>Enter a valid phone number.</small>}</label><label>Notes<textarea placeholder="Optional customer notes..." {...form.register('notes')} /></label>{save.error && <p className="form-error">{errorMessage(save.error)}</p>}<div className="form-actions"><button type="button" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={save.isPending}>Save customer</button></div></form></Modal>
    <Modal open={Boolean(viewing)} title="Customer details" onClose={() => setViewing(null)}>{viewing && <div className="customer-detail"><div className="customer-detail-header"><span className="avatar">{viewing.name.slice(0, 2).toUpperCase()}</span><div><h3>{viewing.name}</h3><p><Phone size={12} />{viewing.phone || "No phone"}</p></div><div><span>TOTAL SPENT</span><strong>{currency(viewing.total_spent)}</strong></div></div><div className="customer-purchase-heading"><div><span>PURCHASE HISTORY</span><h4>{viewing.purchases_count} products purchased</h4></div></div><div className="customer-purchases">{viewing.purchases?.map(purchase => <article key={purchase.id}>{purchase.product.image ? <img src={purchase.product.image} alt={purchase.product.name} /> : <span className="purchase-placeholder"><ImageIcon size={18} /></span>}<div><strong>{purchase.product.name}</strong><small>{purchase.product.code}</small><p>{shortDate(purchase.sold_at)} · {purchase.payment_method}</p></div><b>{currency(purchase.sale_price)}</b></article>)}</div>{!viewing.purchases?.length && <div className="empty-state">No purchase history.</div>}<div className="detail-actions"><button onClick={() => setViewing(null)}>Close</button><button className="primary-button" onClick={() => { const customer = viewing; setViewing(null); edit(customer) }}><Edit3 size={15} />Edit customer</button></div></div>}</Modal>
  </main>
}
