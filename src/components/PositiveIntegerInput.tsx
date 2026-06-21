import { forwardRef, type ComponentProps } from 'react'

type Props = Omit<ComponentProps<'input'>, 'onChange' | 'type' | 'value'> & {
  value?: number | string
  onChange: (value: string) => void
  max?: number
}

export const PositiveIntegerInput = forwardRef<HTMLInputElement, Props>(function PositiveIntegerInput({ value, onChange, max, ...props }, ref) {
  return <input
    {...props}
    ref={ref}
    type="text"
    inputMode="numeric"
    pattern="[1-9][0-9]*"
    value={value ?? ''}
    onChange={event => {
      const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '')
      const bounded = digits && max ? String(Math.min(Number(digits), max)) : digits
      onChange(bounded)
    }}
  />
})
