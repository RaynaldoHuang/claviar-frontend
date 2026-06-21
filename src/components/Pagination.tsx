import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
  perPage?: number
}

export function Pagination({ page, lastPage, total, onPageChange, perPage = 10 }: Props) {
  const safeLastPage = Math.max(lastPage, 1)
  const safePage = Math.min(Math.max(page, 1), safeLastPage)
  const first = total ? ((safePage - 1) * perPage) + 1 : 0
  const last = Math.min(safePage * perPage, total)

  return <div className="table-pagination">
    <span>Showing {first}–{last} of {total}</span>
    <div>
      <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
      <strong>{safePage} / {safeLastPage}</strong>
      <button type="button" disabled={safePage >= safeLastPage} onClick={() => onPageChange(safePage + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
    </div>
  </div>
}
