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

const schema = z.object({ name: z.string().min(2), phone: z.string().optional(), email: z.union([z.literal(''), z.email()]).optional(), address: z.string().optional(), notes: z.string().optional() })
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
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', email: '', address: '', notes: '' } })
  const intakeForm = useForm<IntakeInput, unknown, IntakeForm>({ resolver: zodResolver(intakeSchema), defaultValues: { quantity: 1, notes: '' } })
  const query = useQuery({ queryKey: ['consignors', search, page], queryFn: async () => (await api.get<ApiCollection<Consignor>>('/consignors', { params: { search, page, per_page: 10 } })).data })

  const close = () => { setOpen(false); setEditing(null); form.reset() }
  const save = useMutation({ mutationFn: (values: Form) => editing ? api.put(`/consignors/${editing.id}`, values) : api.post('/consignors', values), onSuccess: () => { qc.invalidateQueries({ queryKey: ['consignors'] }); close() } })
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/consignors/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['consignors'] }) })
  const intake = useMutation({
    mutationFn: (values: IntakeForm) => api.post(`/consignors/${intakeFor?.id}/intake`, intakeSchema.parse(values)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consignors'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setIntakeFor(null); intakeForm.reset({ quantity: 1, notes: '' }) },
  })
  const edit = (item: Consignor) => { setEditing(item); form.reset({ name: item.name, phone: item.phone ?? '', email: item.email ?? '', address: item.address ?? '', notes: item.notes ?? '' }); setOpen(true) }

  return <main className="dashboard-content"><PageHeader eyebrow="Partners" title="Consignors" description="Register consignors and receive their items in one bulk intake." action="Add consignor" onAction={() => setOpen(true)} />
    <section className="panel"><ResourceToolbar search={search} onSearch={value => { setSearch(value); setPage(1) }} /><div className="table-scroll"><table className="consignor-table"><thead><tr><th>Consignor</th><th>Phone</th><th>Total items</th><th>Stock</th><th>Sold</th><th>Actions</th></tr></thead><tbody>{query.data?.data.map(item => <tr key={item.id}><td><strong>{item.name}</strong><br /><small>{item.email || 'No email'}</small></td><td>{item.phone || '—'}</td><td><strong>{item.products_count ?? 0}</strong></td><td><span className="stock-number">{item.stock_count ?? 0}</span></td><td>{item.sold_count ?? 0}</td><td><div className="row-actions"><button className="intake-action" title="Add entrusted items" onClick={() => { intakeForm.reset({ quantity: 1, notes: '' }); setIntakeFor(item) }}><PackagePlus size={16} /></button><button title="Edit" onClick={() => edit(item)}><Edit3 size={15} /></button><button title="Delete" onClick={() => feedback.confirm({ title: 'Hapus consignor?', description: 'Consignor hanya bisa dihapus jika belum memiliki produk.', confirmLabel: 'Hapus consignor', tone: 'danger', action: () => remove.mutateAsync(item.id) })}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!query.isLoading && !query.data?.data.length && <div className="empty-state">No consignors found.</div>}</div><Pagination page={query.data?.meta?.current_page ?? page} lastPage={query.data?.meta?.last_page ?? 1} total={query.data?.meta?.total ?? 0} onPageChange={setPage} /></section>
    <Modal open={Boolean(intakeFor)} title="Add entrusted items" onClose={() => setIntakeFor(null)}>{intakeFor && <form className="form-grid single" onSubmit={intakeForm.handleSubmit(values => intake.mutate(values))}><div className="intake-summary"><span>CONSIGNOR</span><strong>{intakeFor.name}</strong><p>Sistem akan membuat satu kartu draft untuk setiap barang.</p></div><label>Number of items<Controller name="quantity" control={intakeForm.control} render={({ field }) => <PositiveIntegerInput max={500} placeholder="Masukkan jumlah card" {...field} value={String(field.value ?? '')} />} />{intakeForm.formState.errors.quantity && <small>Enter between 1 and 500 items.</small>}</label><label>Intake notes<textarea placeholder="Optional notes about this intake..." {...intakeForm.register('notes')} /></label>{intake.error && <p className="form-error">{errorMessage(intake.error)}</p>}<div className="form-actions"><button type="button" onClick={() => setIntakeFor(null)}>Cancel</button><button className="primary-button" disabled={intake.isPending}><PackagePlus size={15} />Create product cards</button></div></form>}</Modal>
    <Modal open={open} title={editing ? 'Edit consignor' : 'New consignor'} onClose={close}><form className="form-grid" onSubmit={form.handleSubmit(values => save.mutate(values))}><label>Name<input placeholder="Contoh: Budi Santoso" {...form.register('name')} /></label><label>Phone<input type="tel" placeholder="Contoh: 0812 3456 7890" {...form.register('phone')} /></label><label>Email<input type="email" placeholder="Contoh: budi@email.com" {...form.register('email')} /></label><label className="full">Address<textarea placeholder="Masukkan alamat lengkap consignor" {...form.register('address')} /></label><label className="full">Notes<textarea placeholder="Catatan tambahan (opsional)" {...form.register('notes')} /></label>{save.error && <p className="form-error full">{errorMessage(save.error)}</p>}<div className="form-actions full"><button type="button" onClick={close}>Cancel</button><button className="primary-button" disabled={save.isPending}>Save consignor</button></div></form></Modal>
  </main>
}
