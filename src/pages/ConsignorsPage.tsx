import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, PackagePlus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { ApiCollection, Consignor } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Modal } from '@/components/Modal'
import { ResourceToolbar } from '@/components/ResourceToolbar'
import { feedback } from '@/components/feedback-store'
import { PositiveIntegerInput } from '@/components/PositiveIntegerInput'
import { Pagination } from '@/components/Pagination'

const schema = z.object({ name: z.string().min(2), phone: z.string().optional(), email: z.union([z.literal(''), z.email()]).optional(), address: z.string().optional(), notes: z.string().optional(), stock_status: z.enum(['', 'available', 'sold_out', 'returned', 'not_ready']).optional(), is_active: z.enum(['true', 'false']) })
const intakeSchema = z.object({ quantity: z.coerce.number().int().min(1).max(500), notes: z.string().optional() })
type Form = z.infer<typeof schema>
type IntakeInput = z.input<typeof intakeSchema>
type IntakeForm = z.output<typeof intakeSchema>

export function ConsignorsPage() {
  const qc = useQueryClient()
  const [urlParams] = useSearchParams()
  const [search, setSearch] = useState(() => urlParams.get('search') ?? '')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Consignor | null>(null)
  const [intakeFor, setIntakeFor] = useState<Consignor | null>(null)
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', email: '', address: '', notes: '', stock_status: '', is_active: 'true' } })
  const intakeForm = useForm<IntakeInput, unknown, IntakeForm>({ resolver: zodResolver(intakeSchema), defaultValues: { quantity: 1, notes: '' } })
  const query = useQuery({ queryKey: ['consignors', search, page], queryFn: async () => (await api.get<ApiCollection<Consignor>>('/consignors', { params: { search, page, per_page: 10 } })).data })

  const close = () => { setOpen(false); setEditing(null); form.reset() }
  const save = useMutation({ mutationFn: (values: Form) => { const payload = { ...values, stock_status: values.stock_status || null, is_active: values.is_active === 'true' }; return editing ? api.put(`/consignors/${editing.id}`, payload) : api.post('/consignors', payload) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['consignors'] }); close() } })
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/consignors/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['consignors'] }) })
  const intake = useMutation({
    mutationFn: (values: IntakeForm) => api.post(`/consignors/${intakeFor?.id}/intake`, intakeSchema.parse(values)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consignors'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setIntakeFor(null); intakeForm.reset({ quantity: 1, notes: '' }) },
  })
  const edit = (item: Consignor) => { setEditing(item); form.reset({ name: item.name, phone: item.phone ?? '', email: item.email ?? '', address: item.address ?? '', notes: item.notes ?? '', stock_status: item.stock_status ?? '', is_active: item.is_active === false ? 'false' : 'true' }); setOpen(true) }
  const requestRemoval = (item: Consignor) => {
    if (!item.can_delete) {
      feedback.toast('error', 'Consignor tidak dapat dihapus', 'Consignor yang memiliki penjualan, payout, atau order aktif harus dipertahankan sebagai riwayat.')
      return
    }

    const itemDescription = (item.products_count ?? 0) > 0 ? ` ${item.products_count} kartu barang yang belum terjual juga akan dihapus.` : ''
    feedback.confirm({ title: `Hapus ${item.name}?`, description: `Consignor ini belum memiliki riwayat transaksi.${itemDescription} Penghapusan bersifat permanen.`, confirmLabel: 'Ya, hapus permanen', tone: 'danger', action: () => remove.mutateAsync(item.id) })
  }

  const stockStatus = (item: Consignor) => {
    if (item.is_active === false) return <span className="inventory-status empty">Nonaktif</span>
    if (item.stock_status === 'available') return <span className="inventory-status available">Masih tersedia</span>
    if (item.stock_status === 'sold_out') return <span className="inventory-status sold-out">Habis</span>
    if (item.stock_status === 'returned') return <span className="inventory-status returned">Dikembalikan</span>
    if (item.stock_status === 'not_ready') return <span className="inventory-status draft">Belum siap</span>
    if ((item.ready_count ?? 0) > 0) return <span className="inventory-status available">Tersisa {item.ready_count}</span>
    if ((item.reserved_count ?? 0) > 0) return <span className="inventory-status reserved">Sedang dipesan</span>
    if ((item.sold_count ?? 0) > 0) return <span className="inventory-status sold-out">Habis</span>
    if ((item.draft_count ?? 0) > 0) return <span className="inventory-status draft">Belum siap</span>
    if ((item.products_count ?? 0) > 0) return <span className="inventory-status sold-out">Habis</span>
    return <span className="inventory-status empty">Belum ada barang</span>
  }

  return <main className="dashboard-content"><PageHeader eyebrow="Partners" title="Consignors" description="Register consignors and receive their items in one bulk intake." action="Add consignor" onAction={() => setOpen(true)} />
    <section className="panel"><ResourceToolbar search={search} onSearch={value => { setSearch(value); setPage(1) }} /><div className="table-scroll"><table className="consignor-table"><thead><tr><th>Consignor</th><th>Phone</th><th>Total items</th><th>Ready to sell</th><th>Status</th><th>Sold</th><th>Actions</th></tr></thead><tbody>{query.data?.data.map(item => <tr key={item.id}><td><strong>{item.name}</strong><br /><small>{item.email || 'No email'}</small></td><td>{item.phone || '—'}</td><td><strong>{item.products_count ?? 0}</strong></td><td><span className="stock-number">{item.stock_status === 'sold_out' || item.stock_status === 'returned' ? 0 : (item.ready_count ?? 0)}</span></td><td>{stockStatus(item)}</td><td>{item.sold_count ?? 0}</td><td><div className="row-actions"><button className="intake-action" title="Add entrusted items" onClick={() => { intakeForm.reset({ quantity: 1, notes: '' }); setIntakeFor(item) }}><PackagePlus size={16} /></button><button title="Edit" onClick={() => edit(item)}><Edit3 size={15} /></button><button className={!item.can_delete ? 'delete-disabled' : undefined} title={item.can_delete ? 'Delete' : 'Tidak dapat dihapus karena memiliki riwayat transaksi atau order aktif'} aria-disabled={!item.can_delete} onClick={() => requestRemoval(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!query.isLoading && !query.data?.data.length && <div className="empty-state">No consignors found.</div>}</div><Pagination page={query.data?.meta?.current_page ?? page} lastPage={query.data?.meta?.last_page ?? 1} total={query.data?.meta?.total ?? 0} onPageChange={setPage} /></section>
    <Modal open={Boolean(intakeFor)} title="Add entrusted items" onClose={() => setIntakeFor(null)}>{intakeFor && <form className="form-grid single" onSubmit={intakeForm.handleSubmit(values => intake.mutate(values))}><div className="intake-summary"><span>CONSIGNOR</span><strong>{intakeFor.name}</strong><p>Sistem akan membuat satu kartu draft untuk setiap barang.</p></div><label>Number of items<Controller name="quantity" control={intakeForm.control} render={({ field }) => <PositiveIntegerInput max={500} placeholder="Masukkan jumlah card" {...field} value={String(field.value ?? '')} />} />{intakeForm.formState.errors.quantity && <small>Enter between 1 and 500 items.</small>}</label><label>Intake notes<textarea placeholder="Optional notes about this intake..." {...intakeForm.register('notes')} /></label>{intake.error && <p className="form-error">{errorMessage(intake.error)}</p>}<div className="form-actions"><button type="button" onClick={() => setIntakeFor(null)}>Cancel</button><button className="primary-button" disabled={intake.isPending}><PackagePlus size={15} />Create product cards</button></div></form>}</Modal>
    <Modal open={open} title={editing ? 'Edit consignor' : 'New consignor'} onClose={close}><form className="form-grid" onSubmit={form.handleSubmit(values => save.mutate(values))}><label>Name<input placeholder="Contoh: Budi Santoso" {...form.register('name')} /></label><label>Phone<input type="tel" placeholder="Contoh: 0812 3456 7890" {...form.register('phone')} /></label><label>Email<input type="email" placeholder="Contoh: budi@email.com" {...form.register('email')} /></label><label>Status akun<select {...form.register('is_active')}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label><label>Status stok<select {...form.register('stock_status')}><option value="">Ikuti stok otomatis</option><option value="available">Masih tersedia</option><option value="sold_out">Habis</option><option value="returned">Barang dikembalikan</option><option value="not_ready">Belum siap dijual</option></select></label><label className="full">Address<textarea placeholder="Masukkan alamat lengkap consignor" {...form.register('address')} /></label><label className="full">Notes<textarea placeholder="Catatan tambahan (opsional)" {...form.register('notes')} /></label>{save.error && <p className="form-error full">{errorMessage(save.error)}</p>}<div className="form-actions full"><button type="button" onClick={close}>Cancel</button><button className="primary-button" disabled={save.isPending}>Save consignor</button></div></form></Modal>
  </main>
}
