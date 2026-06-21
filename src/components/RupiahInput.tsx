import { forwardRef, type ComponentProps } from 'react'

type Props = Omit<ComponentProps<'input'>, 'onChange' | 'type' | 'value'> & {
  value?: number | string
  onChange: (value: string) => void
}

const formatRupiahInput = (value?: number | string) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '')

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const RupiahInput = forwardRef<HTMLInputElement, Props>(function RupiahInput({ value, onChange, ...props }, ref) {
  return <input
    {...props}
    ref={ref}
    type="text"
    inputMode="numeric"
    value={formatRupiahInput(value)}
    onChange={event => onChange(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
  />
})
