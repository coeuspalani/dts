'use client'
import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

export default function OTPInput({ value, onChange, disabled }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits  = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  const update = (idx: number, char: string) => {
    const arr  = digits.slice()
    arr[idx]   = char
    onChange(arr.join(''))
    if (char && idx < 5) inputs.current[idx + 1]?.focus()
  }

  const handleKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) { update(idx, '') }
      else if (idx > 0) { inputs.current[idx - 1]?.focus() }
    } else if (e.key === 'ArrowLeft'  && idx > 0) inputs.current[idx - 1]?.focus()
    else if   (e.key === 'ArrowRight' && idx < 5) inputs.current[idx + 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(text.padEnd(6, '').slice(0, 6))
    inputs.current[Math.min(text.length, 5)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onPaste={handlePaste}
          onKeyDown={e => handleKey(i, e)}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '')
            if (v) update(i, v.slice(-1))
          }}
          className="w-11 h-14 text-center text-xl font-bold font-mono rounded-xl border
            border-white/10 bg-surface2 text-white focus:border-accent focus:outline-none
            focus:ring-2 focus:ring-accent/20 transition-all disabled:opacity-40
            caret-transparent"
        />
      ))}
    </div>
  )
}
