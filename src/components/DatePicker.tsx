import { useState } from 'react'
import { format, isValid, parse } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { CalendarDays, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { Popover } from 'radix-ui'
import 'react-day-picker/style.css'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
}

const selectedDate = (value: string) => {
  const date = parse(value, 'yyyy-MM-dd', new Date())
  return value && isValid(date) ? date : undefined
}

export function DatePicker({ value, onChange, placeholder = 'Select date', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const selected = selectedDate(value)

  return <Popover.Root open={open} onOpenChange={setOpen}>
    <div className="date-picker">
      <Popover.Trigger asChild><button type="button" className="date-picker-trigger"><CalendarDays size={14} /><span>{selected ? format(selected, 'dd MMM yyyy', { locale: enUS }) : placeholder}</span></button></Popover.Trigger>
      {value && <button type="button" className="date-picker-clear" onClick={() => onChange('')} aria-label="Clear date"><X size={12} /></button>}
    </div>
    <Popover.Portal>
      <Popover.Content className="date-picker-popover" sideOffset={7} align="start" collisionPadding={16} avoidCollisions>
        <DayPicker
          animate
          mode="single"
          locale={enUS}
          selected={selected}
          disabled={disabled}
          onSelect={date => { if (date) { onChange(format(date, 'yyyy-MM-dd')); setOpen(false) } }}
        />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}

export function DateRangeFilter({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (value: string) => void; onToChange: (value: string) => void }) {
  const fromDate = selectedDate(from)
  const toDate = selectedDate(to)

  return <div className="date-range-filter">
    <label><span>From</span><DatePicker value={from} onChange={onFromChange} placeholder="Start date" disabled={date => Boolean(toDate && date > toDate)} /></label>
    <label><span>To</span><DatePicker value={to} onChange={onToChange} placeholder="End date" disabled={date => Boolean(fromDate && date < fromDate)} /></label>
  </div>
}
