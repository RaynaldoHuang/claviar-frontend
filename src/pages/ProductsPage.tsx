import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Edit3, ImageIcon, ShoppingBag, X } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { currency } from '@/lib/format'
import type { ApiCollection, Consignor, Customer, Lookup, Order, Product } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { StatusBadge } from '@/components/StatusBadge'
import { feedback } from '@/components/feedback-store'
import { CustomerCombobox } from '@/components/CustomerCombobox'
import { ConsignorCombobox } from '@/components/ConsignorCombobox'

const numeric = z.union([z.number(), z.string().min(1)])
const optionalNumeric = z.union([numeric, z.literal('')]).optional()
const schema = z.object({
  code: z.string().min(2), name: z.string().min(2), consignor_id: numeric,
  category_id: numeric, brand_id: optionalNumeric, purchase_price: numeric,
  selling_price: numeric, condition: z.string().min(2),
  status: z.enum(['available', 'reserved', 'sold', 'returned']), description: z.string().optional(),
}).refine(value => Number(value.selling_price) >= Number(value.purchase_price), {
  path: ['selling_price'], message: 'Selling price must be above purchase price',
})
type Form = z.infer<typeof schema>
type SelectedImage = { file: File; url: string }
const defaultProductForm: Form = {
  code: '', name: '', consignor_id: '', category_id: '', brand_id: '',
  purchase_price: 0, selling_price: 0, condition: 'Excellent',
  status: 'available', description: '',
}
const saleSchema = z.object({
  name: z.string().min(2), description: z.string().optional(),
  purchase_price: numeric, sale_price: numeric,
  customer_id: optionalNumeric,
  payment_method: z.string().min(2), sold_at: z.string().min(1),
}).refine(value => Number(value.sale_price) >= Number(value.purchase_price), { path: ['sale_price'], message: 'Sale price must be at least the initial price' })
type SaleForm = z.infer<typeof saleSchema>

export function ProductsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [urlParams] = useSearchParams()
  const orderCustomerId = Number(urlParams.get('order_customer') || 0)
  const requestedQuantity = Math.max(1, Number(urlParams.get('quantity') || 1))
  const [search, setSearch] = useState(() => urlParams.get('search') ?? '')
  const [cardStatus, setCardStatus] = useState('')
  const [consignorFilter, setConsignorFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [viewing, setViewing] = useState<Product | null>(null)
  const [sellingDraft, setSellingDraft] = useState<Product | null>(null)
  const [saleImages, setSaleImages] = useState<SelectedImage[]>([])
  const [saleCoverIndex, setSaleCoverIndex] = useState(0)
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('Transfer')
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: defaultProductForm })
  const saleForm = useForm<SaleForm>({ resolver: zodResolver(saleSchema), defaultValues: { name: '', description: '', purchase_price: 0, sale_price: 0, customer_id: '', payment_method: 'Transfer', sold_at: new Date().toISOString().slice(0, 16) } })
  const selectedCustomerId = useWatch({ control: saleForm.control, name: 'customer_id' })

  const products = useQuery({ queryKey: ['products', search, cardStatus, consignorFilter], queryFn: async () => (await api.get<ApiCollection<Product>>('/products', { params: { search, status: cardStatus === 'sold' ? 'sold' : undefined, is_draft: cardStatus === 'draft' ? 1 : cardStatus === 'sold' ? 0 : undefined, consignor_id: consignorFilter, per_page: 100 } })).data })
  const consignors = useQuery({ queryKey: ['consignors', 'options'], queryFn: async () => (await api.get<ApiCollection<Consignor>>('/consignors', { params: { per_page: 100 } })).data.data })
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<{ data: Lookup[] }>('/categories')).data.data })
  const brands = useQuery({ queryKey: ['brands'], queryFn: async () => (await api.get<{ data: Lookup[] }>('/brands')).data.data })
  const customers = useQuery({ queryKey: ['customers', 'options'], queryFn: async () => (await api.get<ApiCollection<Customer>>('/customers', { params: { per_page: 100 } })).data.data })
  const orders = useQuery({ queryKey: ['orders'], queryFn: async () => (await api.get<{ data: Order[] }>('/orders')).data.data })
  const orderCustomer = customers.data?.find(customer => customer.id === orderCustomerId)
  const selectedCustomer = customers.data?.find(customer => customer.id === Number(selectedCustomerId))
  const draftProducts = products.data?.data.filter(product => product.is_draft) ?? []

  const clearImages = () => { selectedImages.forEach(image => URL.revokeObjectURL(image.url)); setSelectedImages([]); setCoverIndex(0) }
  const close = () => { clearImages(); setOpen(false); setEditing(null); form.reset({ ...defaultProductForm }) }
  const selectFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list).filter(file => file.type.startsWith('image/'))
    if (selectedImages.length + incoming.length > 10) { feedback.toast('error', 'Terlalu banyak gambar', 'Maksimal 10 gambar untuk setiap produk.'); return }
    setSelectedImages(current => [...current, ...incoming.map(file => ({ file, url: URL.createObjectURL(file) }))])
  }
  const removePreview = (index: number) => {
    URL.revokeObjectURL(selectedImages[index].url)
    setSelectedImages(current => current.filter((_, itemIndex) => itemIndex !== index))
    setCoverIndex(current => current === index ? 0 : current > index ? current - 1 : current)
  }
  const openSale = (product: Product, orderId: number) => {
    saleImages.forEach(image => URL.revokeObjectURL(image.url))
    setSaleImages([]); setSaleCoverIndex(0); setSellingDraft(product); setActiveOrderId(orderId)
    saleForm.reset({ name: '', description: '', purchase_price: 0, sale_price: 0, customer_id: orderCustomerId || '', payment_method: 'Transfer', sold_at: new Date().toISOString().slice(0, 16) })
  }
  const closeSale = () => { saleImages.forEach(image => URL.revokeObjectURL(image.url)); setSaleImages([]); setSellingDraft(null); setSaleCoverIndex(0); setActiveOrderId(null) }

  const save = useMutation({
    mutationFn: async (values: Form) => {
      const data = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== '') data.append(key, String(value))
      })
      selectedImages.forEach(image => data.append('images[]', image.file))
      data.append('cover_index', String(coverIndex))
      if (editing) { data.append('_method', 'PUT'); return api.post(`/products/${editing.id}`, data) }
      return api.post('/products', data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); close() },
  })
  const completeSale = useMutation({
    mutationFn: async (values: SaleForm) => {
      if (!sellingDraft) throw new Error('No draft selected')
      const data = new FormData()
      Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') data.append(key, String(value)) })
      saleImages.forEach(image => data.append('images[]', image.file)); data.append('cover_index', String(saleCoverIndex))
      return activeOrderId ? api.post(`/orders/${activeOrderId}/items/${sellingDraft.id}`, data) : api.post(`/products/${sellingDraft.id}/complete-sale`, data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['consignors'] }); qc.invalidateQueries({ queryKey: ['checkouts'] }); qc.invalidateQueries({ queryKey: ['customers'] }); closeSale() },
  })
  const createOrder = useMutation({ mutationFn: () => api.post('/orders', { customer_id: orderCustomerId, product_ids: selectedCards }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['products'] }); setSelectedCards([]); navigate('/products') } })
  const payOrder = useMutation({ mutationFn: () => api.post(`/orders/${payingOrder?.id}/pay`, { payment_method: paymentMethod }), onSuccess: () => { qc.invalidateQueries(); setPayingOrder(null) } })
  const removeOrderItem = useMutation({ mutationFn: ({ orderId, productId }: { orderId: number; productId: number }) => api.delete(`/orders/${orderId}/items/${productId}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['products'] }) } })
  const toggleCard = (id: number) => setSelectedCards(current => current.includes(id) ? current.filter(item => item !== id) : current.length < requestedQuantity ? [...current, id] : current)
  const edit = (product: Product) => {
    setEditing(product)
    form.reset({ code: product.code, name: product.name ?? '', consignor_id: product.consignor?.id, category_id: product.category?.id ?? '', brand_id: product.brand?.id ?? '', purchase_price: product.purchase_price ?? 0, selling_price: product.selling_price ?? 0, condition: product.condition ?? 'Excellent', status: product.status === 'pending' ? 'reserved' : product.status, description: product.description ?? '' })
    setOpen(true)
  }

  return <main className="dashboard-content">
    <PageHeader eyebrow="Inventory" title="Product cards" description="Complete a draft card only when an entrusted item is sold." />
    <div className="product-filters"><ResourceToolbar search={search} onSearch={setSearch} filter={<div className="filter-selects"><ConsignorCombobox consignors={consignors.data ?? []} value={consignorFilter} onChange={setConsignorFilter} placeholder={orderCustomerId > 0 ? 'Choose consignor first' : 'All consignors'} /><select value={cardStatus} onChange={event => setCardStatus(event.target.value)}><option value="">All product cards</option><option value="draft">Waiting for sale</option><option value="sold">Sold</option></select></div>} /></div>
    {orderCustomerId > 0 && <div className="order-selection-bar"><div><span>CREATE ORDER FOR</span><strong>{orderCustomer?.name ?? 'Customer'} · {consignorFilter ? `Select ${requestedQuantity} cards` : 'Choose a consignor before selecting cards'}</strong></div><b>{selectedCards.length}/{requestedQuantity} selected</b><button onClick={() => createOrder.mutate()} disabled={selectedCards.length !== requestedQuantity}>Create pending order</button><button onClick={() => navigate('/products')}>Cancel</button></div>}
    {(orders.data?.filter(order => order.status === 'pending').length ?? 0) > 0 && <section className="pending-orders"><div className="section-heading"><div><span>PENDING PAYMENT</span><h2>Active orders</h2></div></div>{orders.data?.filter(order => order.status === 'pending').map(order => <article className="pending-order-card" key={order.id}><div><span>{order.code}</span><strong>{order.customer.name}</strong><small>{order.items.filter(item => item.completed_at).length}/{order.items.length} item details completed</small></div><div className="pending-order-items">{order.items.map(item => <div className="pending-order-item" key={item.id}><button className={item.completed_at ? 'complete' : ''} onClick={() => !item.completed_at && openSale(item.product, order.id)}><ShoppingBag size={15} /><span>{item.product.name ?? item.product.code}</span>{item.completed_at ? <Check size={14} /> : <b>Complete</b>}</button><button className="remove-order-item" title="Remove from order" onClick={() => feedback.confirm({ title: 'Remove card from this order?', description: 'The card will return to the available product card list.', confirmLabel: 'Remove card', tone: 'danger', action: () => removeOrderItem.mutateAsync({ orderId: order.id, productId: item.product.id }) })}><X size={14} /></button></div>)}</div><div className="pending-order-footer"><strong>{currency(order.total_amount ?? 0)}</strong><button disabled={order.items.some(item => !item.completed_at)} onClick={() => { setPayingOrder(order); setPaymentMethod('Transfer') }}>Pay order</button></div></article>)}</section>}
    {draftProducts.length > 0 && <section className="draft-section"><div className="section-heading"><div><span>WAITING FOR ORDER</span><h2>Draft product cards</h2></div><strong>{draftProducts.length} cards</strong></div><div className="draft-grid">{draftProducts.map(product => <article className={`draft-card ${selectedCards.includes(product.id) ? 'selected' : ''} ${orderCustomerId > 0 && !consignorFilter ? 'selection-disabled' : ''}`} key={product.id} onClick={() => orderCustomerId > 0 && consignorFilter && toggleCard(product.id)}><div className="draft-icon">{selectedCards.includes(product.id) ? <Check size={20} /> : <ShoppingBag size={20} />}</div><div className="draft-copy"><span>{product.code}</span><strong>Unlisted item</strong><small>{product.consignor?.name}</small></div>{orderCustomerId > 0 ? <button type="button" disabled={!consignorFilter}>{selectedCards.includes(product.id) ? 'Selected' : consignorFilter ? 'Select card' : 'Choose consignor first'}</button> : <button type="button" onClick={() => navigate('/customers')}>Choose customer first</button>}</article>)}</div></section>}
    <Modal open={Boolean(payingOrder)} title="Confirm one payment" onClose={() => setPayingOrder(null)}>{payingOrder && <div className="form-grid single"><div className="intake-summary"><span>ORDER</span><strong>{payingOrder.code} · {payingOrder.customer.name}</strong><p>{payingOrder.items.length} items from one or more consignors · {currency(payingOrder.total_amount)}</p></div><label>Payment method<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option>Transfer</option><option>Cash</option><option>QRIS</option><option>Debit Card</option></select></label><div className="form-actions"><button onClick={() => setPayingOrder(null)}>Cancel</button><button className="primary-button" onClick={() => payOrder.mutate()} disabled={payOrder.isPending}>Confirm payment & mark sold</button></div></div>}</Modal>
    <Modal open={Boolean(sellingDraft)} title={activeOrderId ? 'Complete pending item' : 'Complete item'} onClose={closeSale}>{sellingDraft && <form className="form-grid sale-completion-form" onSubmit={saleForm.handleSubmit(values => completeSale.mutate(values))}>
      <div className="sale-draft-context full"><div><span>DRAFT CARD</span><strong>{sellingDraft.code}</strong></div><div><span>CONSIGNOR</span><strong>{sellingDraft.consignor?.name}</strong></div></div>
      <label className="full">Product name<input placeholder="e.g. Vintage leather bag" {...saleForm.register('name')} />{saleForm.formState.errors.name && <small>Product name is required.</small>}</label>
      <label>Initial price<input type="number" min="0" {...saleForm.register('purchase_price')} />{saleForm.formState.errors.purchase_price && <small>Enter a valid initial price.</small>}</label><label>Sale price<input type="number" min="0" {...saleForm.register('sale_price')} />{saleForm.formState.errors.sale_price && <small>{saleForm.formState.errors.sale_price.message}</small>}</label>
      {!activeOrderId && <><label>Customer<input type="hidden" {...saleForm.register('customer_id')} /><CustomerCombobox customers={customers.data ?? []} value={Number(selectedCustomerId) || undefined} onChange={id => saleForm.setValue('customer_id', id, { shouldValidate: true })} /></label><label>Customer phone<input value={selectedCustomer?.phone ?? ''} placeholder="Optional" readOnly /></label></>}
      <label className="upload-field full"><Camera size={17} /><span>{saleImages.length ? 'Add more images' : 'Upload product images (optional)'}</span><small>You can save this item without an image</small><input type="file" accept="image/*" capture="environment" multiple onChange={event => { const incoming = Array.from(event.target.files ?? []).slice(0, 10 - saleImages.length); setSaleImages(current => [...current, ...incoming.map(file => ({ file, url: URL.createObjectURL(file) }))]); event.target.value = '' }} /></label>
      {saleImages.length > 0 && <div className="image-previews full"><div className="preview-heading"><div><strong>Image preview</strong><span>{saleImages.length} selected</span></div><small>Click to set the cover image</small></div><div className="preview-grid">{saleImages.map((image, index) => <div className={`preview-item ${saleCoverIndex === index ? 'cover' : ''}`} key={image.url} onClick={() => setSaleCoverIndex(index)}><img src={image.url} alt={`Preview ${index + 1}`} />{saleCoverIndex === index && <span className="cover-badge"><Check size={11} />Cover</span>}<button type="button" onClick={event => { event.stopPropagation(); URL.revokeObjectURL(image.url); setSaleImages(current => current.filter((_, itemIndex) => itemIndex !== index)); setSaleCoverIndex(0) }}><X size={14} /></button></div>)}</div></div>}
      <label className="full">Description<textarea placeholder="Optional product details..." {...saleForm.register('description')} /></label>{completeSale.error && <p className="form-error full">{errorMessage(completeSale.error)}</p>}
      <div className="form-actions full"><button type="button" onClick={closeSale}>Cancel</button><button className="primary-button" disabled={completeSale.isPending}>{activeOrderId ? 'Save item details' : 'Complete item'}</button></div>
    </form>}</Modal>
    <Modal open={Boolean(viewing)} title="Product details" onClose={() => setViewing(null)}>{viewing && <div className="product-detail">
      <div className="detail-gallery">{viewing.images?.length ? viewing.images.map(image => <div className={image.is_cover ? 'detail-image cover' : 'detail-image'} key={image.id}><img src={image.url} alt={viewing.name ?? viewing.code} />{image.is_cover && <span>Cover</span>}</div>) : <div className="detail-image empty"><ImageIcon size={28} /><span>No images</span></div>}</div>
      <div className="detail-title"><div><span>{viewing.code}</span><h3>{viewing.name ?? 'Unlisted item'}</h3></div><StatusBadge status={viewing.status} /></div>
      <dl className="detail-grid"><div><dt>Consignor</dt><dd>{viewing.consignor?.name ?? '—'}</dd></div><div><dt>Category</dt><dd>{viewing.category?.name ?? '—'}</dd></div><div><dt>Brand</dt><dd>{viewing.brand?.name ?? 'No brand'}</dd></div><div><dt>Condition</dt><dd>{viewing.condition ?? '—'}</dd></div><div><dt>Purchase price</dt><dd>{currency(viewing.purchase_price ?? 0)}</dd></div><div><dt>Selling price</dt><dd>{currency(viewing.selling_price ?? 0)}</dd></div><div><dt>Estimated profit</dt><dd className="profit">{currency((viewing.selling_price ?? 0) - (viewing.purchase_price ?? 0))}</dd></div><div><dt>Images</dt><dd>{viewing.images?.length ?? 0} files</dd></div></dl>
      <div className="detail-description"><span>Description</span><p>{viewing.description || 'No description provided.'}</p></div>
      <div className="detail-actions"><button onClick={() => setViewing(null)}>Close</button><button className="primary-button" onClick={() => { const product = viewing; setViewing(null); edit(product) }}><Edit3 size={15} />Edit product</button></div>
    </div>}</Modal>
    <Modal open={open} title={editing ? 'Edit product' : 'New product'} onClose={close}><form className="form-grid" onSubmit={form.handleSubmit(values => save.mutate(values))}>
      <label>Product code<input {...form.register('code')} /></label><label>Product name<input {...form.register('name')} /></label>
      <label>Consignor<select {...form.register('consignor_id')}><option value="">Select consignor</option>{consignors.data?.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Category<select {...form.register('category_id')}><option value="">Select category</option>{categories.data?.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Brand<select {...form.register('brand_id')}><option value="">No brand</option>{brands.data?.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Condition<input {...form.register('condition')} /></label>
      <label>Purchase price<input type="number" {...form.register('purchase_price')} /></label><label>Selling price<input type="number" {...form.register('selling_price')} />{form.formState.errors.selling_price && <small>{form.formState.errors.selling_price.message}</small>}</label>
      <input type="hidden" {...form.register('status')} />
      <label className="upload-field"><Camera size={17} /><span>{selectedImages.length ? 'Add more images' : 'Choose product images'}</span><small>JPG, PNG, WEBP · max. 10 files</small><input type="file" accept="image/*" capture="environment" multiple onChange={event => { selectFiles(event.target.files); event.target.value = '' }} /></label>
      {editing?.images?.length && !selectedImages.length ? <div className="existing-images full"><p>Current images</p><div>{editing.images.map(image => <img key={image.id} src={image.url} alt={editing.name ?? editing.code} />)}</div></div> : null}
      {selectedImages.length > 0 && <div className="image-previews full"><div className="preview-heading"><div><strong>Image preview</strong><span>{selectedImages.length} image selected</span></div><small>Click an image to set it as cover</small></div><div className="preview-grid">{selectedImages.map((image, index) => <div className={`preview-item ${coverIndex === index ? 'cover' : ''}`} key={image.url} onClick={() => setCoverIndex(index)}><img src={image.url} alt={`Preview ${index + 1}`} />{coverIndex === index && <span className="cover-badge"><Check size={11} />Cover</span>}<button type="button" onClick={event => { event.stopPropagation(); removePreview(index) }} aria-label="Remove image"><X size={14} /></button><p title={image.file.name}>{image.file.name}</p></div>)}</div></div>}
      <label className="full">Description<textarea {...form.register('description')} /></label>{save.error && <p className="form-error full">{errorMessage(save.error)}</p>}
      <div className="form-actions full"><button type="button" onClick={close}>Cancel</button><button className="primary-button" disabled={save.isPending}>Save product</button></div>
    </form></Modal>
  </main>
}
